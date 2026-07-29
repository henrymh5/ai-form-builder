import { expect, test } from "@playwright/test";

/**
 * Public form E2E (plan §15): publish a form, then visit its public URL in
 * a fresh (unauthenticated) browser context, fill it out, and submit.
 */
test("a published form is publicly reachable, fillable, and submits successfully", async ({
  page,
  browser,
}) => {
  const email = `e2e-public-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Public Form Owner");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Public Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Dein Name");
  await page.getByLabel("Pflichtfeld").click();
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  await page.goto("/dashboard");
  const formCard = page.getByTestId("form-card").filter({ hasText: "Public Form" });
  await formCard.getByRole("button", { name: "Aktionen" }).click();
  const href = await page
    .getByRole("menuitem", { name: "Vorschau öffnen" })
    .getAttribute("href");
  expect(href).toBeTruthy();
  const publicUrl = href!.replace(/\?preview=1$/, "");

  // Fresh, unauthenticated browser context — a real anonymous visitor.
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();

  await anonPage.goto(publicUrl);
  await expect(anonPage.getByLabel(/Dein Name/)).toBeVisible();

  await anonPage.getByLabel(/Dein Name/).fill("Ada Lovelace");
  await anonPage.getByRole("button", { name: "Weiter" }).click();

  await expect(anonPage.getByRole("heading", { name: "Vielen Dank!" })).toBeVisible();
  await expect(anonPage.getByText(/Wird gesendet|Testantwort|Vorschau-Ende/)).toHaveCount(0);

  await anonContext.close();
});

test("an unknown slug returns 404 with a friendly not-found page", async ({ browser }) => {
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  const response = await anonPage.goto("/f/this-slug-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(anonPage.getByRole("heading", { name: "Formular nicht gefunden" })).toBeVisible();
  await anonContext.close();
});

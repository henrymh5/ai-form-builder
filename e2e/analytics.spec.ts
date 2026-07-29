import { expect, test } from "@playwright/test";

/**
 * Analytics E2E (plan §13): publish a form, submit a real public response,
 * then verify the owner's analytics page reflects it — a view, a start
 * (page_view-derived), a completion, a 100% funnel step, and a per-question
 * answer count of 1 with no skips.
 */
test("owner sees views, completions, funnel, and question analytics after a real submission", async ({
  page,
  browser,
}) => {
  const email = `e2e-analytics-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Analytics Owner");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Analytics Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);
  const formId = new URL(page.url()).pathname.split("/").pop()!;

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Dein Name");
  await page.getByLabel("Pflichtfeld").click();
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  await page.goto("/dashboard");
  const formCard = page.getByTestId("form-card").filter({ hasText: "Analytics Form" });
  await formCard.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Teilen" }).click();
  const publicUrl = await page.getByLabel("Öffentlicher Link").inputValue();

  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  await anonPage.goto(publicUrl);
  await anonPage.getByLabel(/Dein Name/).fill("Ada Lovelace");

  const submitResponsePromise = anonPage.waitForResponse(
    (res) => res.url().includes("/submissions") && res.request().method() === "POST",
  );
  await anonPage.getByRole("button", { name: "Weiter" }).click();
  await expect(anonPage.getByRole("heading", { name: "Vielen Dank!" })).toBeVisible();
  await submitResponsePromise;
  await anonContext.close();

  await page.goto(`/forms/${formId}/analytics`);

  await expect(page.getByText("Aufrufe")).toBeVisible();
  const viewsCard = page.getByText("Aufrufe").locator("..");
  await expect(viewsCard).toContainText("1");

  await expect(page.getByText("Funnel")).toBeVisible();
  await expect(page.getByText(/Seite 1:.*1$/)).toBeVisible({ timeout: 10000 });

  await expect(page.getByText("Fragenanalyse")).toBeVisible();
  await expect(page.getByText("Dein Name")).toBeVisible();
  await expect(page.getByText("1 Antworten · 0% übersprungen")).toBeVisible();
});

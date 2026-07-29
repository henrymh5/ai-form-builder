import { expect, test } from "@playwright/test";

/**
 * Response management E2E (plan §8 Antwortverwaltung): publish a form,
 * submit a real public response as an anonymous visitor, then verify the
 * form owner can see it in the responses list, open the detail view
 * (rendered against the response's own version), and archive/delete it.
 */
test("owner can view, archive, and delete a submitted response", async ({ page, browser }) => {
  const email = `e2e-responses-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Responses Owner");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Responses Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);
  const formUrl = page.url();
  const formId = new URL(formUrl).pathname.split("/").pop()!;

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Dein Name");
  await page.getByLabel("Pflichtfeld").click();
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  await page.goto("/dashboard");
  const formCard = page.getByTestId("form-card").filter({ hasText: "Responses Form" });
  await formCard.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Teilen" }).click();
  const publicUrl = await page.getByLabel("Öffentlicher Link").inputValue();

  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  await anonPage.goto(publicUrl);
  await anonPage.getByLabel(/Dein Name/).fill("Grace Hopper");

  // Submission is fire-and-forget from the renderer's perspective (the
  // ending shows immediately via local state, independent of the
  // in-flight POST) — wait for the actual submissions response here so
  // closing the context below can't abort the request before the DB
  // write lands.
  const submitResponsePromise = anonPage.waitForResponse(
    (res) => res.url().includes("/submissions") && res.request().method() === "POST",
  );
  await anonPage.getByRole("button", { name: "Weiter" }).click();
  await expect(anonPage.getByRole("heading", { name: "Vielen Dank!" })).toBeVisible();
  await submitResponsePromise;
  await anonContext.close();

  await page.goto(`/forms/${formId}/responses`);
  await expect(page.getByRole("cell", { name: /\d{2}\.\d{2}\.\d{4}/ }).first()).toBeVisible({
    timeout: 10000,
  });

  await page.getByRole("cell", { name: /\d{2}\.\d{2}\.\d{4}/ }).first().getByRole("link").click();
  await expect(page).toHaveURL(/\/responses\/[0-9a-f-]+$/);
  await expect(page.getByText("Dein Name")).toBeVisible();
  await expect(page.getByText("Grace Hopper")).toBeVisible();

  await page.getByRole("button", { name: "Archivieren" }).click();
  await expect(page.getByText("Archiviert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Löschen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+\/responses$/, { timeout: 10000 });
});

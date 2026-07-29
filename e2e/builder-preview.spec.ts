import { expect, test } from "@playwright/test";

/** Preview / test mode E2E (plan §13). */
test("preview dialog lets the creator fill the form and reach the ending, in mobile or desktop", async ({
  page,
}) => {
  const email = `e2e-preview-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Preview Test User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Preview Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Dein Name");
  await page.getByLabel("Pflichtfeld").click();

  await page.getByRole("button", { name: "Vorschau" }).click();
  await expect(page.getByText("Antwortpfad:")).toBeVisible();

  await page.getByRole("button", { name: "Mobile Ansicht" }).click();
  await expect(page.getByLabel(/Dein Name/)).toBeVisible();

  await page.getByLabel(/Dein Name/).fill("Ada");
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page.getByRole("heading", { name: "Vielen Dank!" })).toBeVisible();
  await expect(page.getByText(/Testantwort/)).toBeVisible();
});

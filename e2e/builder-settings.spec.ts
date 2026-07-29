import { expect, test } from "@playwright/test";

/** Page settings + form-level settings E2E (plan §7). */
test("editing page title/description via the settings icon updates the tab", async ({ page }) => {
  const email = `e2e-pgset-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Page Settings User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Page Settings Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.hover("text=Seite 1");
  await page.getByTitle("Seiteneinstellungen").click();
  await expect(page.getByText("Seiteneinstellungen")).toBeVisible();

  await page.getByLabel("Überschrift").fill("Kontaktdaten");
  await expect(page.getByRole("tab", { name: "Kontaktdaten" })).toBeVisible();
});

test("changing the progress display mode in form settings persists", async ({ page }) => {
  const email = `e2e-fmset-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Form Settings User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Form Settings Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByLabel("Fortschrittsanzeige").click();
  await page.getByRole("option", { name: "„Schritt X von Y“" }).click();
  await page.getByLabel("Zurück-Button erlauben").click();

  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });
});

import { expect, test } from "@playwright/test";

/** Theme Editor E2E (plan §10). */
test("changing the primary color updates the live preview and persists", async ({ page }) => {
  const email = `e2e-theme-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Theme User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Theme Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Design" }).click();
  await expect(page.getByText("Live-Vorschau")).toBeVisible();

  await page.getByLabel("Primärfarbe", { exact: true }).fill("#ff0000");
  await expect(page.getByRole("button", { name: "Weiter" })).toHaveCSS(
    "background-color",
    "rgb(255, 0, 0)",
  );

  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });
});

test("a low-contrast color combination shows an accessibility warning", async ({ page }) => {
  const email = `e2e-theme-a11y-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Theme A11y User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Theme A11y Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Design" }).click();
  await page.getByLabel("Textfarbe", { exact: true }).fill("#eeeeee");
  await page.getByLabel("Hintergrundfarbe", { exact: true }).fill("#ffffff");

  await expect(page.getByText(/zu wenig Kontrast/)).toBeVisible();
});

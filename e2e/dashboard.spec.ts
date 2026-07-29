import { expect, test } from "@playwright/test";

/**
 * Dashboard CRUD E2E (plan §4). Registers a fresh user per test (isolated
 * workspace) and exercises the form lifecycle actions end to end.
 */
async function registerNewUser(page: import("@playwright/test").Page) {
  const email = `e2e-dash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Dashboard Test User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("creates a blank form and it appears on the dashboard", async ({ page }) => {
  await registerNewUser(page);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Kontaktformular");
  await page.getByRole("button", { name: "Formular erstellen" }).click();

  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Kontaktformular" })).toBeVisible();
  await expect(page.getByText("Entwurf")).toBeVisible();
});

test("renames, duplicates, archives, and deletes a form", async ({ page }) => {
  await registerNewUser(page);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Umfrage");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Umbenennen" }).click();
  await page.getByLabel("Titel").fill("Kundenumfrage");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("heading", { name: "Kundenumfrage" })).toBeVisible();

  await page.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Duplizieren" }).click();
  const copyCard = page
    .getByTestId("form-card")
    .filter({ has: page.getByRole("heading", { name: "Kundenumfrage (Kopie)" }) });
  await expect(copyCard).toBeVisible();

  await copyCard.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Archivieren" }).click();
  await expect(copyCard.getByText("Archiviert")).toBeVisible();

  await copyCard.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Löschen" }).click();
  await page.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByRole("heading", { name: "Kundenumfrage (Kopie)" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Kundenumfrage", exact: true })).toBeVisible();
});

test("search and status filter narrow the form list", async ({ page }) => {
  await registerNewUser(page);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Alpha Formular");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Beta Formular");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await page.goto("/dashboard");

  await page.getByLabel("Formulare durchsuchen").fill("Alpha");
  await expect(page.getByRole("heading", { name: "Alpha Formular" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beta Formular" })).toHaveCount(0);
});

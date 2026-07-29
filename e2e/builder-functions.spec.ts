import { expect, test } from "@playwright/test";

/** Builder functions E2E (plan §6): undo/redo, autosave, page duplication. */
async function registerAndCreateForm(page: import("@playwright/test").Page, title: string) {
  const email = `e2e-fn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Builder Fn User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill(title);
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);
}

test("undo removes the last added field, redo brings it back", async ({ page }) => {
  await registerAndCreateForm(page, "Undo Redo Form");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await expect(page.locator("label", { hasText: "Kurzer Text" })).toBeVisible();

  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(page.getByText("Ziehe ein Feld aus der linken Seitenleiste")).toBeVisible();

  await page.getByRole("button", { name: "Wiederholen" }).click();
  await expect(page.locator("label", { hasText: "Kurzer Text" })).toBeVisible();
});

test("undo/redo buttons are disabled when there's nothing to undo/redo", async ({ page }) => {
  await registerAndCreateForm(page, "Undo Redo Disabled Form");

  await expect(page.getByRole("button", { name: "Rückgängig" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Wiederholen" })).toBeDisabled();
});

test("autosave shows saving then saved status, and persists across reload", async ({ page }) => {
  await registerAndCreateForm(page, "Autosave Form");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Persisted Label");

  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.reload();
  await expect(page.locator("label", { hasText: "Persisted Label" })).toBeVisible();
  await page.locator("label", { hasText: "Persisted Label" }).click();
  await expect(page.getByLabel("Sichtbare Frage")).toHaveValue("Persisted Label");
});

test("duplicating a page creates a second tab with copied fields under new IDs", async ({
  page,
}) => {
  await registerAndCreateForm(page, "Duplicate Page Form");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.hover("text=Seite 1");
  await page.getByTitle("Seite duplizieren").click();

  await expect(page.getByRole("button", { name: "Seite 2" })).toBeVisible();
  await page.getByRole("button", { name: "Seite 2" }).click();
  await expect(page.locator("label", { hasText: "Kurzer Text" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

/** Conditional logic editor E2E (plan §8). */
async function registerAndCreateForm(page: import("@playwright/test").Page, title: string) {
  const email = `e2e-cond-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Conditions User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill(title);
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);
}

test("adds a condition and it appears in the conditions panel", async ({ page }) => {
  await registerAndCreateForm(page, "Conditions Form 1");

  await page.getByRole("button", { name: "Einfachauswahl" }).click();

  await page.getByRole("button", { name: "Bedingungen" }).click();
  await page.getByRole("button", { name: "Bedingung hinzufügen" }).click();

  await expect(page.getByText("Wenn")).toBeVisible();
  await expect(page.getByText("Dann:")).toBeVisible();
});

test("removing a condition clears the panel", async ({ page }) => {
  await registerAndCreateForm(page, "Conditions Form 2");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByRole("button", { name: "Bedingungen" }).click();
  await page.getByRole("button", { name: "Bedingung hinzufügen" }).click();

  await page.getByRole("button", { name: "Bedingung entfernen" }).click();

  await expect(page.getByText("Noch keine Bedingungen angelegt.")).toBeVisible();
});

test("conditions button shows a warning badge for an unreachable page", async ({ page }) => {
  await registerAndCreateForm(page, "Conditions Form 3");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByRole("button", { name: "Seite", exact: true }).click();

  await page.getByRole("button", { name: "Bedingungen" }).click();
  await page.getByRole("button", { name: "Bedingung hinzufügen" }).click();

  const thenRow = page.locator("div", { hasText: "Dann:" }).last();
  await thenRow.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "zu Seite springen" }).click();
  await thenRow.getByRole("combobox").last().click();
  await page.getByRole("option", { name: "Seite 1" }).click();

  await expect(page.locator("button", { hasText: "Bedingungen" }).locator("span")).toBeVisible();
});

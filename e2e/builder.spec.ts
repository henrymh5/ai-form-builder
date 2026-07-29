import { expect, test } from "@playwright/test";

/** Visual form builder E2E (plan §5): palette -> canvas -> properties panel. */
async function registerAndCreateForm(page: import("@playwright/test").Page, title: string) {
  const email = `e2e-builder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Builder Test User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill(title);
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);
}

test("clicking a palette item adds a field to the canvas", async ({ page }) => {
  await registerAndCreateForm(page, "Builder Form 1");

  await page.getByRole("button", { name: "Kurzer Text" }).click();

  await expect(page.getByText("Eigenschaften")).toBeVisible();
  await expect(page.getByLabel("Sichtbare Frage")).toHaveValue("Kurzer Text");
});

test("editing the label in the properties panel updates the canvas", async ({ page }) => {
  await registerAndCreateForm(page, "Builder Form 2");

  await page.getByRole("button", { name: "E-Mail" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Deine E-Mail-Adresse");

  await expect(page.getByText("Deine E-Mail-Adresse")).toBeVisible();
});

test("marking a field required shows the asterisk", async ({ page }) => {
  await registerAndCreateForm(page, "Builder Form 3");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Pflichtfeld").click();

  await expect(page.locator("label", { hasText: "Kurzer Text" }).locator("span")).toHaveText("*");
});

test("duplicating a field via the quick action creates a second field", async ({ page }) => {
  await registerAndCreateForm(page, "Builder Form 4");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByTitle("Duplizieren", { exact: true }).click();

  // 1 palette entry + 2 canvas fields = 3.
  await expect(page.getByText("Kurzer Text", { exact: true })).toHaveCount(3);
});

test("deleting a field via the quick action removes it", async ({ page }) => {
  await registerAndCreateForm(page, "Builder Form 5");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByTitle("Löschen").click();

  await expect(page.getByText("Ziehe ein Feld aus der linken Seitenleiste")).toBeVisible();
});

test("adding a page creates a new tab and fields stay scoped to their page", async ({ page }) => {
  await registerAndCreateForm(page, "Builder Form 6");

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByRole("button", { name: "Seite", exact: true }).click();

  await expect(page.getByRole("button", { name: "Seite 2" })).toBeVisible();
  await expect(page.getByText("Ziehe ein Feld aus der linken Seitenleiste")).toBeVisible();

  await page.getByRole("button", { name: "Seite 1" }).click();
  await expect(page.locator("label", { hasText: "Kurzer Text" })).toBeVisible();
});

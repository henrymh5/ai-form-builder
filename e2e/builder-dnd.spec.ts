import { expect, test } from "@playwright/test";

/**
 * Real pointer-based drag-and-drop E2E (plan §6). dnd-kit uses pointer
 * events, not the native HTML5 drag-and-drop API, so this simulates a drag
 * via raw mouse move/down/up rather than Playwright's `dragTo()` (which only
 * works with native HTML5 DnD).
 */
test("dragging a field's grip handle reorders fields within a page", async ({ page }) => {
  const email = `e2e-dnd-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("DnD Test User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("DnD Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Field A");
  await page.getByRole("button", { name: "E-Mail" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Field B");

  const rows = page.locator('[aria-label="Feld verschieben"]');
  await expect(rows).toHaveCount(2);

  const firstHandle = rows.nth(0);
  const secondHandle = rows.nth(1);
  const firstBox = (await firstHandle.boundingBox())!;
  const secondBox = (await secondHandle.boundingBox())!;

  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height + 10, {
    steps: 10,
  });
  await page.mouse.up();

  const labels = page.locator("label.text-sm.font-medium");
  await expect(labels.nth(0)).toContainText("Field B");
  await expect(labels.nth(1)).toContainText("Field A");
});

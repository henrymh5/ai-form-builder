import { expect, test } from "@playwright/test";

/** Publish + version history E2E (plan §14). */
test("publishing a form creates version 1 and shows it in version history", async ({ page }) => {
  const email = `e2e-publish-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Publish Test User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Publish Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Kurzer Text" }).click();

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Versionen" }).click();
  await expect(page.getByText("Version 1")).toBeVisible();
});

test("editing after publish and restoring an old version reverts the draft", async ({ page }) => {
  const email = `e2e-restore-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Restore Test User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Restore Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Original Frage");
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  // The autosave status now flips to "saving" the instant a change is
  // detected (not only once the debounce timer fires ~1s later) — waiting
  // for that transition first proves THIS edit started a fresh save cycle,
  // so the "Gespeichert" that follows can't be stale text left over from
  // the PREVIOUS save (which was racing the version-restore below).
  await page.getByLabel("Sichtbare Frage").fill("Geänderte Frage");
  await expect(page.locator('[data-autosave-status="saving"]')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Versionen" }).click();
  await page.getByText("Version 1").click();
  await expect(page.getByText(/Frage geändert/)).toBeVisible();

  await page.getByRole("button", { name: "Version wiederherstellen" }).click();
  await expect(page.locator("label", { hasText: "Original Frage" })).toBeVisible();
});

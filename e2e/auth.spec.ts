import { expect, test } from "@playwright/test";

/**
 * Register -> Dashboard E2E (plan §16 Phase-3 DoD). Requires the local
 * Supabase stack running (`pnpm exec supabase start`) — hits the real auth
 * flow, signup trigger, and RLS-gated dashboard/workspace pages.
 */
test("a new user can register and lands on the dashboard with their workspace", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "test-password-123!";
  const displayName = "E2E Test User";

  await page.goto("/register");
  await page.getByLabel("Name").fill(displayName);
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Konto erstellen" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Formulare" })).toBeVisible();
  await expect(page.getByText("Noch keine Formulare")).toBeVisible();

  await page.getByRole("link", { name: "Workspace" }).click();
  await expect(page).toHaveURL(/\/workspace/);
  await expect(page.getByRole("heading", { name: `${displayName}s Workspace` })).toBeVisible();
  await expect(page.getByText(displayName).first()).toBeVisible();

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("an unauthenticated user is redirected away from the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("a user can log in and log out", async ({ page }) => {
  const email = `e2e-login-${Date.now()}@example.com`;
  const password = "test-password-123!";

  await page.goto("/register");
  await page.getByLabel("Name").fill("Login Test User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

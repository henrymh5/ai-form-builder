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
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
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

test("a signed-in user is sent to the dashboard from the auth pages and the homepage CTA", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Anmelden" })).toBeVisible();

  const email = `e2e-signedin-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Signed In User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Visiting the auth pages while signed in bounces straight back to the dashboard.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/register");
  await expect(page).toHaveURL(/\/dashboard/);

  // The homepage swaps its auth CTAs for a dashboard link.
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Zum Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Anmelden" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Kostenlos ausprobieren" })).toHaveCount(0);

  await page.getByRole("link", { name: "Zum Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
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

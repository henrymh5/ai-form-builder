import { expect, test } from "@playwright/test";

// Placeholder smoke test proving the Playwright scaffold works end to end.
// Real flows (registration, builder, publish, submission — plan §15) land
// starting Phase 3.
test("homepage renders and links to the token demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "FormCraft" })).toBeVisible();

  await page.getByRole("link", { name: "Design-Token-Übersicht ansehen" }).click();
  await expect(page).toHaveURL(/\/dev\/tokens/);
  await expect(page.getByRole("heading", { name: "Design Tokens" })).toBeVisible();
});

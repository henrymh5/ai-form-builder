import { expect, test } from "@playwright/test";

/**
 * Embed E2E (plan §12 DoD "Demo-Hostseite zeigt Auto-Height + Submit-Event"):
 * publish a form, load the static demo host page (`public/examples/embed-demo.html`,
 * which loads `embed.js`), fill the embedded form inside its iframe, submit,
 * and verify the host receives `formapp:submitted` (and a resize event) via
 * `embed.js`'s CustomEvent re-dispatch.
 */
test("embed.js mounts an iframe, resizes it, and forwards the submit event to the host page", async ({
  page,
  browser,
}) => {
  const email = `e2e-embed-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Embed Form Owner");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Embed Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Dein Name");
  await page.getByLabel("Pflichtfeld").click();
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  await page.goto("/dashboard");
  const formCard = page.getByTestId("form-card").filter({ hasText: "Embed Form" });
  await formCard.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Teilen" }).click();
  const publicUrl = await page.getByLabel("Öffentlicher Link").inputValue();
  const slug = new URL(publicUrl).pathname.replace(/^\/f\//, "");
  expect(slug).toBeTruthy();

  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  await anonPage.goto(`/examples/embed-demo.html?slug=${encodeURIComponent(slug)}`);

  const iframe = anonPage.frameLocator("iframe");
  await expect(iframe.getByLabel(/Dein Name/)).toBeVisible();

  await expect(anonPage.locator("[data-event='ready']")).toHaveCount(1, { timeout: 10000 });

  await iframe.getByLabel(/Dein Name/).fill("Ada Lovelace");
  await iframe.getByRole("button", { name: "Weiter" }).click();

  await expect(anonPage.locator("[data-event='submitted']")).toHaveCount(1, { timeout: 10000 });
  // ResizeObserver naturally fires more than once as content settles/layout
  // shifts — the DoD only requires evidence of auto-resize, not an exact count.
  await expect(anonPage.locator("[data-event='resized']").first()).toBeVisible({ timeout: 10000 });

  await anonContext.close();
});

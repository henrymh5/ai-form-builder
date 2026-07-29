import { expect, test } from "@playwright/test";

/**
 * Version-rendering correctness E2E (plan §21 item 17): publish v1, submit
 * a real public response against it, then edit the question label and
 * publish v2. The public page must now show v2's wording, while the old
 * response's detail view must still render v1's original label — this is
 * the core guarantee behind storing `form_version_id` on every session and
 * every response instead of always reading the form's current definition.
 */
test("publishing v2 updates the public page while an old response still renders against v1", async ({
  page,
  browser,
}) => {
  const email = `e2e-version-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Version Owner");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Version Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);
  const formId = new URL(page.url()).pathname.split("/").pop()!;

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Frage V1");
  await page.getByLabel("Pflichtfeld").click();
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  await page.goto("/forms");
  const formCard = page.getByTestId("form-card").filter({ hasText: "Version Form" });
  await formCard.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Teilen" }).click();
  const publicUrl = await page.getByLabel("Öffentlicher Link").inputValue();

  // Submit a real response against v1.
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  await anonPage.goto(publicUrl);
  await expect(anonPage.getByLabel(/Frage V1/)).toBeVisible();
  await anonPage.getByLabel(/Frage V1/).fill("Antwort auf V1");
  const submitResponsePromise = anonPage.waitForResponse(
    (res) => res.url().includes("/submissions") && res.request().method() === "POST",
  );
  await anonPage.getByRole("button", { name: "Weiter" }).click();
  await expect(anonPage.getByRole("heading", { name: "Vielen Dank!" })).toBeVisible();
  await submitResponsePromise;
  await anonContext.close();

  // Edit the question and publish v2.
  await page.goto(`/forms/${formId}`);
  await page.getByText("Frage V1").click();
  await page.getByLabel("Sichtbare Frage").fill("Frage V2");
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  // Public page now shows v2's wording.
  const anonContext2 = await browser.newContext();
  const anonPage2 = await anonContext2.newPage();
  await anonPage2.goto(publicUrl);
  await expect(anonPage2.getByLabel(/Frage V2/)).toBeVisible();
  await expect(anonPage2.getByLabel(/Frage V1/)).toHaveCount(0);
  await anonContext2.close();

  // The old response's detail view still renders v1's original label and answer.
  await page.goto(`/forms/${formId}/responses`);
  await page
    .getByRole("cell", { name: /\d{2}\.\d{2}\.\d{4}/ })
    .first()
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/responses\/[0-9a-f-]+$/);
  await expect(page.getByText("Frage V1")).toBeVisible();
  await expect(page.getByText("Antwort auf V1")).toBeVisible();
  await expect(page.getByText("Frage V2")).toHaveCount(0);
  await expect(page.getByText("Formularversion 1")).toBeVisible();
});

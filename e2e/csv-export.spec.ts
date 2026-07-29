import { expect, test } from "@playwright/test";

/**
 * CSV export E2E (plan §8/§14/§25): publish a form, submit a real public
 * response, then hit the authenticated export endpoint directly and check
 * the response is a well-formed CSV containing the answer and the correct
 * headers — with UTF-8 BOM and Content-Disposition set for a real download.
 */
test("owner can download a CSV export containing the submitted answer", async ({
  page,
  browser,
}) => {
  const email = `e2e-csv-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("CSV Owner");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("CSV Form");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+/);
  const formId = new URL(page.url()).pathname.split("/").pop()!;

  await page.getByRole("button", { name: "Kurzer Text" }).click();
  await page.getByLabel("Sichtbare Frage").fill("Dein Name");
  await page.getByLabel("Pflichtfeld").click();
  await expect(page.getByText("Gespeichert")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Veröffentlicht!")).toBeVisible({ timeout: 10000 });

  await page.goto("/dashboard");
  const formCard = page.getByTestId("form-card").filter({ hasText: "CSV Form" });
  await formCard.getByRole("button", { name: "Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Teilen" }).click();
  const publicUrl = await page.getByLabel("Öffentlicher Link").inputValue();

  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  await anonPage.goto(publicUrl);
  await anonPage.getByLabel(/Dein Name/).fill("Grace Hopper");

  const submitResponsePromise = anonPage.waitForResponse(
    (res) => res.url().includes("/submissions") && res.request().method() === "POST",
  );
  await anonPage.getByRole("button", { name: "Weiter" }).click();
  await expect(anonPage.getByRole("heading", { name: "Vielen Dank!" })).toBeVisible();
  await submitResponsePromise;
  await anonContext.close();

  await page.goto(`/forms/${formId}/responses`);
  await expect(page.getByRole("cell", { name: /\d{2}\.\d{2}\.\d{4}/ }).first()).toBeVisible({
    timeout: 10000,
  });

  // Use the authenticated `page`'s own session cookies for the export
  // request — this is the same authenticated fetch the "CSV exportieren"
  // link performs, just made directly so the raw bytes can be inspected.
  const exportResponse = await page.request.get(`/api/forms/${formId}/responses/export`);
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-type"]).toContain("text/csv");
  expect(exportResponse.headers()["content-disposition"]).toContain("attachment");

  const body = await exportResponse.body();
  const text = body.toString("utf-8");

  expect(text.codePointAt(0)).toBe(0xfeff);
  expect(text).toContain("Eingang,Status,Bearbeitungszeit (s),Dein Name");
  expect(text).toContain("Grace Hopper");
  expect(text).toContain("Abgeschlossen");
});

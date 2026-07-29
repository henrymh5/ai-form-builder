import { expect, test } from "@playwright/test";

/**
 * AI generation waiting screen (plan §11). The generation endpoint is stubbed so the test
 * never calls the real Claude API — what's under test is the navigation and waiting UX,
 * not the model output.
 */
async function registerNewUser(page: import("@playwright/test").Page) {
  const email = `e2e-gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Generate Test User");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("test-password-123!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function submitPrompt(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByRole("button", { name: /Mit KI erstellen/ }).click();
  await page
    .getByLabel("Beschreibe dein Formular")
    .fill("Ein Anfrageformular für eine Webagentur mit Budget und Kontaktdaten.");
  await page.getByRole("button", { name: "Formular generieren" }).click();
}

test("the user waits on a dedicated page and is moved to the builder when generation finishes", async ({
  page,
}) => {
  await registerNewUser(page);

  // Create a real form so the stub can hand back an id the builder can actually open.
  await page.getByRole("button", { name: "Neues Formular" }).click();
  await page.getByLabel("Titel").fill("Zielformular");
  await page.getByRole("button", { name: "Formular erstellen" }).click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]{36}/);
  const formId = page.url().split("/forms/")[1];

  // Hold the response open so the waiting state is observable, then release it.
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/ai/generate-form", async (route) => {
    await released;
    await route.fulfill({ status: 200, json: { formId } });
  });

  await page.goto("/forms");
  await submitPrompt(page);

  // Navigation happens immediately — the dialog no longer blocks on the request.
  await expect(page).toHaveURL(/\/forms\/generate/);
  await expect(page.getByRole("heading", { name: "Dein Formular entsteht" })).toBeVisible();
  await expect(page.getByText("Deine Beschreibung wird gelesen …")).toBeVisible();

  release();
  await expect(page).toHaveURL(new RegExp(`/forms/${formId}$`));
  await expect(page.getByRole("tablist")).toBeVisible();

  // The waiting screen was replaced, not pushed — going back must not return to it.
  await page.goBack();
  await expect(page).not.toHaveURL(/\/forms\/generate/);
});

test("a failed generation shows the error with a retry option", async ({ page }) => {
  await registerNewUser(page);

  await page.route("**/api/ai/generate-form", (route) =>
    route.fulfill({
      status: 429,
      json: { error: { code: "RATE_LIMITED", message: "Zu viele Anfragen." } },
    }),
  );

  await submitPrompt(page);

  await expect(page).toHaveURL(/\/forms\/generate/);
  await expect(
    page.getByRole("heading", { name: "Formular konnte nicht generiert werden" }),
  ).toBeVisible();
  await expect(page.getByText("Zu viele Anfragen.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Erneut versuchen" })).toBeVisible();
});

test("opening the waiting page without a pending prompt returns to the form list", async ({
  page,
}) => {
  await registerNewUser(page);

  await page.goto("/forms/generate");

  await expect(page).toHaveURL(/\/forms$/);
});

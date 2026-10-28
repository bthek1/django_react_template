import { expect, type Page, test } from "@playwright/test";

// Each test registers its own user, so reruns against the same e2e database are safe.
function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const PASSWORD = "Str0ng-e2e-passw0rd";

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("sign up, log in, see the app shell, then sign out", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);

  await logIn(page, email);
  await expect(page).toHaveURL(/\/demo\/chart$/);
  await expect(page.getByRole("heading", { name: "Chart Demo" })).toBeVisible();
  await expect(page.getByRole("banner").getByText(email)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("access_token")))
    .toBeNull();
});

test("wrong password shows an error and stays on login", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);

  await logIn(page, email, "not-the-password");
  await expect(page.getByText("Invalid credentials. Please try again.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

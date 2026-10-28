import { expect, test } from "@playwright/test";

test("landing page links to sign in and sign up", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
});

test("login page reaches the backend API", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByText("API connected")).toBeVisible();
});

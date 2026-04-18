import { expect, test } from "@playwright/test";

test.describe("ProactiveUI — dashboard", () => {
  test("landing page shows Sign in / Sign up CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "ProactiveUI" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("dashboard empty-state renders file list controls", async ({ page }) => {
    // The PROACTIVEUI_DEV_BYPASS_AUTH flag set in playwright.config.ts
    // lets us reach /dashboard without a real session. No DB is
    // configured in CI, so file operations will fail — we only assert
    // that the static shell renders correctly.
    await page.goto("/dashboard");

    // Left file-list column
    await expect(
      page.getByRole("button", { name: /New Python file/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /New LaTeX file/i }),
    ).toBeVisible();

    // Centre welcome panel shown when no file is selected
    await expect(page.getByText(/Welcome to ProactiveUI/i)).toBeVisible();
    await expect(page.getByText(/No file selected/i)).toBeVisible();

    // Right-hand agents column
    await expect(page.getByRole("heading", { name: /Agents/i })).toBeVisible();
    await expect(page.getByText(/No active agents\./i)).toBeVisible();
  });
});

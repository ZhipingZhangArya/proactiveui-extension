import { expect, test } from "@playwright/test";

test.describe("ProactiveUI — dashboard intent flow", () => {
  test("landing page shows Sign in / Sign up CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "ProactiveUI" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("analyze Python line surfaces step intent + action buttons", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Wait for Monaco to mount — a .view-line element exists once the
    // editor model is ready. Then give it a moment to finish layout
    // before we interact with it.
    await page.locator(".monaco-editor .view-line").first().waitFor({
      state: "visible",
    });
    await page.waitForTimeout(300);

    // Idle copy before any analysis
    await expect(page.getByText(/Place the cursor on a line/i)).toBeVisible();

    // Monaco defaults cursor to (1, 1) on mount — no need to click first.
    await page.getByRole("button", { name: "Analyze current line" }).click();

    // Detected intent chip and action buttons appear
    await expect(page.getByText(/Detected intent:/i)).toBeVisible({
      timeout: 10_000,
    });
    // semanticType value is lowercase in the DOM; the uppercase CSS class
    // only affects rendering.
    await expect(page.getByText(/Detected intent:.*step/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Write Code" }),
    ).toBeVisible();
  });

  test("switching to LaTeX swaps the initial document", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "LaTeX" }).click();
    await expect(page.locator(".monaco-editor")).toContainText("\\section");
  });
});

/** EXAMPLE end-to-end + accessibility test. Runs in both Playwright projects (desktop + 320px reflow). */
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, expectNoHorizontalScroll } from "./helpers/a11y";

test.describe("home page", () => {
  test("is never cached (rendered on the server for every request)", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toMatch(/no-store/);
  });

  test("has no critical/serious accessibility violations", async ({ page }) => {
    await page.goto("/");
    await expectNoA11yViolations(page);
  });

  test("does not scroll horizontally", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalScroll(page);
  });
});

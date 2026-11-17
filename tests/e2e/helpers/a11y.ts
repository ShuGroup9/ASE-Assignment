import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.2 AA rule sets checked by axe.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Fails the test if axe finds critical or serious accessibility problems on the current page.
export async function expectNoA11yViolations(page: Page, options: { exclude?: string[] } = {}) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);

  const { violations } = await builder.analyze();
  const serious = violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(" ")) }));

  expect(serious, "axe found critical/serious accessibility violations").toEqual([]);
}

// Fails if the page scrolls sideways (WCAG 1.4.10 reflow). Most useful in the reflow-320 project.
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow, "page scrolls horizontally").toBe(false);
}

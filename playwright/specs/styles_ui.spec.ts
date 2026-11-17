import {expect, openPage, readOnlyTest} from "../lib/test.ts";

/** Rules of the app's stylesheet that its components rely on, checked on icons put into the page. */

readOnlyTest("a dimmed icon stays dimmed under a text colour utility", {tag: "@ui"}, async ({page}) => {
  await openPage(page, "/");
  await expect(page.locator("form").first()).toBeVisible();
  // Tailwind generates only the utilities that the app's code uses, so this one has to be in use.
  const colorUtility = "text-red-700";
  const colors = await page.evaluate((colorUtility) => {
    const colorOf = (classes: string) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", classes);
      document.body.append(svg);
      const color = getComputedStyle(svg).color;
      svg.remove();
      return color;
    };
    return {
      plain: colorOf(""),
      dimmed: colorOf("dimmed"),
      utility: colorOf(colorUtility),
      utilityDimmed: colorOf(`${colorUtility} dimmed`),
      inlineUtility: colorOf(`inlineIcon ${colorUtility}`),
      inlineUtilityDimmed: colorOf(`inlineIcon ${colorUtility} dimmed`),
    };
  }, colorUtility);
  // Otherwise the checks below would pass with no rule applied at all.
  expect(colors.dimmed).not.toBe(colors.plain);
  expect(colors.utility).not.toBe(colors.plain);
  expect(colors.utility).not.toBe(colors.dimmed);
  expect(colors.inlineUtility).toBe(colors.utility);
  // The dimming wins over the colour utility on the same icon.
  expect(colors.utilityDimmed).toBe(colors.dimmed);
  expect(colors.inlineUtilityDimmed).toBe(colors.dimmed);
});

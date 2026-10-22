import { expect, it } from "vitest";
import { paginate } from "./pagination";
import { sample } from "./sample";
it("uses single-story pages on phones", () => {
  expect(paginate(sample.articles, true).every((p) => p.length === 1)).toBe(
    true,
  );
});
it("preserves all text and links when a long story spans pages", () => {
  const original = {
    ...sample.articles[2],
    summary: Array.from({ length: 800 }, (_, i) => `word${i}`).join(" "),
  };
  const pages = paginate([original], true);
  expect(pages.length).toBeGreaterThan(1);
  expect(
    pages
      .flat()
      .map((s) => s.summary)
      .join(" "),
  ).toBe(original.summary);
  expect(pages.flat().every((s) => s.url === original.url)).toBe(true);
});
it("keeps illustrated lead stories on their own page", () =>
  expect(paginate(sample.articles, false)[0]).toHaveLength(1));

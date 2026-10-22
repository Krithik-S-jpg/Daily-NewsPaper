import { describe, it, expect } from "vitest";
import { sample } from "./sample";
describe("Public demonstration edition", () => {
  it("is explicitly historical and every story has an attributable HTTPS source", () => {
    expect(sample.sample).toBe(true);
    expect(sample.date).toBe("2022-07-12");
    for (const story of sample.articles) {
      expect(new URL(story.url).protocol).toBe("https:");
      expect(story.source.length).toBeGreaterThan(0);
    }
  });
  it("has unique bookmark identities", () =>
    expect(new Set(sample.articles.map((a) => a.id)).size).toBe(
      sample.articles.length,
    ));
});

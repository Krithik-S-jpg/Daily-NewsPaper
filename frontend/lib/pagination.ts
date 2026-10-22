import type { Story } from "./types";
// Split long text instead of shrinking it or silently clipping a fixed paper page.
export function paginate(articles: Story[], single: boolean): Story[][] {
  const pieces: Story[] = [];
  for (const story of articles) {
    const words = story.summary.split(/\s+/);
    let chunk = "";
    let part = 0;
    const flush = () => {
      if (chunk) {
        pieces.push({
          ...story,
          headline: story.headline + (part ? " (continued)" : ""),
          summary: chunk,
          image: part ? undefined : story.image,
        });
        part++;
        chunk = "";
      }
    };
    for (const word of words) {
      if ((chunk + " " + word).length > 650) flush();
      chunk += (chunk ? " " : "") + word;
    }
    flush();
    if (!words.length) pieces.push(story);
  }
  const pages: Story[][] = [];
  for (const story of pieces) {
    const last = pages.at(-1);
    if (
      !single &&
      last?.length === 1 &&
      !last[0].image &&
      !story.image &&
      last[0].summary.length + story.summary.length < 850 &&
      last[0].headline.length + story.headline.length < 170
    )
      last.push(story);
    else pages.push([story]);
  }
  return pages;
}

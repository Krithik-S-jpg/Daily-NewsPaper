import type { Story } from "@/lib/types";

export const supplements: Story[] = [
  {
    id: "extra-fiction",
    headline: "The last light in the bookshop",
    category: "A little story",
    summary: "Original short fiction · A two-minute escape",
    source: "Daybreak",
    url: "",
    published_at: null,
  },
  {
    id: "extra-puzzles",
    headline: "A little pause. A little puzzle.",
    category: "The puzzle corner",
    summary: "Three small challenges for a curious mind",
    source: "Daybreak",
    url: "",
    published_at: null,
  },
  {
    id: "extra-slow",
    headline: "Notice the extraordinary ordinary",
    category: "The slow page",
    summary: "Make a little room for wonder",
    source: "Daybreak",
    url: "",
    published_at: null,
  },
];

export function enrichPages(pages: Story[][]): Story[][] {
  const result: Story[][] = [];
  let extra = 0;
  pages.forEach((page, index) => {
    result.push(page);
    if ((index + 1) % 2 === 0 && extra < supplements.length)
      result.push([supplements[extra++]]);
  });
  while (extra < supplements.length) result.push([supplements[extra++]]);
  return result;
}

export function Supplement({ id }: { id: string }) {
  if (id === "extra-fiction")
    return (
      <article className="supplement fiction">
        <div className="eyebrow accent">
          THE READING NOOK · ORIGINAL FICTION
        </div>
        <h3>The last light in the bookshop</h3>
        <p>
          Every evening, Mira left one book in the window, open to a page she
          loved. Every morning, someone had slipped a note beneath the door:{" "}
          <em>One more page, please.</em>
        </p>
        <p>
          On Friday she stayed late. At nine, a bus driver stopped outside. He
          read the window, smiled, and reached for a pencil.
        </p>
        <p>“You could come inside,” she said.</p>
        <p>“I only have three minutes between routes.”</p>
        <p>
          So Mira put a chair beside the window. On Saturday, there were two
          chairs. By winter, the shortest book club in town had seven
          members—and nobody ever asked anyone to read faster.
        </p>
        <div className="supplement-note">
          THE SMALL QUESTION
          <br />
          <strong>Which book would you leave in the window?</strong>
        </div>
      </article>
    );
  if (id === "extra-puzzles")
    return (
      <article className="supplement">
        <div className="eyebrow accent">PENCILS OUT · NO TIMER NEEDED</div>
        <h3>
          A little pause.
          <br />A little puzzle.
        </h3>
        <div className="puzzle-block">
          <span className="puzzle-number">01 / WORD PLAY</span>
          <h4>Morning scramble</h4>
          <div className="letter-tiles" aria-label="Letters R E P A P">
            {"REPAP".split("").map((letter, i) => (
              <span key={i}>{letter}</span>
            ))}
          </div>
          <p>Rearrange these letters into something you are reading.</p>
          <details>
            <summary>Reveal the word</summary>
            <p>
              <strong>PAPER.</strong> A good companion for a slow morning.
            </p>
          </details>
        </div>
        <div className="puzzle-block">
          <span className="puzzle-number">02 / NUMBER TRAIL</span>
          <h4>What comes next?</h4>
          <div className="number-trail">
            2 · 6 · 12 · 20 · <strong>?</strong>
          </div>
          <details>
            <summary>Reveal the pattern</summary>
            <p>
              <strong>30.</strong> Add 4, then 6, then 8, then 10. Each term is
              n × (n + 1).
            </p>
          </details>
        </div>
        <div className="puzzle-block">
          <span className="puzzle-number">03 / A SMALL RIDDLE</span>
          <p>
            I have cities but no houses, forests but no trees, and rivers but no
            water. What am I?
          </p>
          <details>
            <summary>Reveal the answer</summary>
            <p>
              <strong>A map.</strong>
            </p>
          </details>
        </div>
      </article>
    );
  return (
    <article className="supplement">
      <div className="eyebrow accent">OFF THE CLOCK · A MOMENT FOR YOU</div>
      <h3>Notice the extraordinary ordinary</h3>
      <h4>The five-minute field trip</h4>
      <p>
        Choose a window, a doorstep, or a familiar corner. Find three things you
        usually walk past: a shifting shadow, a leaf’s edge, a reflection. Give
        each one a headline.
      </p>
      <blockquote>
        “Local leaf catches the first light. Whole street carries on unaware.”
      </blockquote>
      <div className="supplement-note">
        <span className="puzzle-number">YOUR TINY CREATIVE CHALLENGE</span>
        <p>Write a six-word story about a fresh start.</p>
        <strong>Our attempt: “Closed the suitcase. Opened the bakery.”</strong>
      </div>
      <p className="art-credit">Original writing prompts · No right answers</p>
    </article>
  );
}

"use client";
import { useState } from "react";
import {
  Sun,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Mail,
  Download,
  Rss,
} from "lucide-react";
import Reader from "./Reader";
import { sample } from "@/lib/sample";
export default function Welcome() {
  const [reading, setReading] = useState(false),
    [saved, setSaved] = useState<string[]>([]);
  return (
    <div className="welcome">
      <header>
        <a className="brand" href="/">
          <Sun size={25} />
          daybreak.
        </a>
        <nav>
          <a href="/#signin">Sign in</a>
          <a className="button primary" href="/?join=true">
            Make it yours <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <main>
        <div className="welcome-intro">
          <span className="eyebrow accent">
            FOR THE CURIOUS. NOT THE ALGORITHM.
          </span>
          <h1>
            The world keeps moving.
            <br />
            <em>Take a moment to read it.</em>
          </h1>
          <p>
            Your interests, your trusted sources, one thoughtfully composed
            newspaper. A quieter way to begin the day.
          </p>
          <div>
            <a className="button primary" href="/?join=true">
              Create your newspaper <ArrowRight size={16} />
            </a>
            <button className="button quiet" onClick={() => setReading(true)}>
              Explore a sample <BookOpen size={16} />
            </button>
          </div>
        </div>
        <section className="welcome-paper">
          <div className="paper-topline">
            <span>YOUR INTERESTS. YOUR SOURCES. YOUR DAYBREAK.</span>
            <span>THE DISCOVERY EDITION</span>
          </div>
          <div className="masthead">
            Daybreak<span>✳</span>
          </div>
          <div className="welcome-spread">
            <div>
              <span className="eyebrow accent">
                A HISTORICAL SAMPLE · JULY 12, 2022
              </span>
              <h2>
                A new window
                <br />
                into the universe.
              </h2>
              <p>{sample.articles[0].summary}</p>
              <button className="text-button" onClick={() => setReading(true)}>
                Open the actual reader <ArrowRight size={15} />
              </button>
            </div>
            <figure>
              <img
                src="/webb.jpg"
                alt="The Cosmic Cliffs in the Carina Nebula"
              />
              <figcaption>
                NASA, ESA, CSA, and STScI. Historical sample, not today’s news.
              </figcaption>
            </figure>
          </div>
        </section>
        <div className="welcome-features">
          {[
            {
              icon: Rss,
              title: "Follow what matters.",
              copy: "Choose public feeds, repositories, and supported channels. Original sources stay with every story.",
            },
            {
              icon: BookOpen,
              title: "Turn a page. Not a feed.",
              copy: "A real page-folding reader, with a readable mobile edition and an accessible text mode.",
            },
            {
              icon: Mail,
              title: "Make morning a ritual.",
              copy: "Set a local time and let the configured backend gather your daily edition. Email is entirely your choice.",
            },
            {
              icon: Download,
              title: "Take the paper with you.",
              copy: "Download a print-ready PDF or save an encrypted edition for reading offline on your device.",
            },
          ].map((f) => (
            <article key={f.title}>
              <f.icon size={24} strokeWidth={1.3} />
              <h3>{f.title}</h3>
              <p>{f.copy}</p>
            </article>
          ))}
        </div>
        <section className="welcome-outro">
          <Sun size={35} strokeWidth={1} />
          <h2>
            A little less noise.
            <br />A little more perspective.
          </h2>
          <a className="button primary" href="/?join=true">
            Begin your morning <ArrowRight size={16} />
          </a>
        </section>
      </main>
      <footer>
        <span>Daybreak. Made for a world worth reading.</span>
        <a href="/">Explore the reading room ↗</a>
      </footer>
      {reading && (
        <Reader
          edition={sample}
          bookmarks={saved}
          toggleBookmark={(id) =>
            setSaved((s) =>
              s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
            )
          }
          onClose={() => setReading(false)}
          onPdf={() => {
            location.href = "/?print=sample";
          }}
        />
      )}
    </div>
  );
}

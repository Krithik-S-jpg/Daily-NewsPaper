"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Radio,
} from "lucide-react";
import type { Edition } from "@/lib/types";
import { Article } from "./Reader";
import { supabase } from "@/lib/supabase";

export function EditionOverview({
  edition,
  saved,
  sourceCount,
  onExplore,
}: {
  edition: Edition;
  saved: number;
  sourceCount: number;
  onExplore: () => void;
}) {
  return (
    <section className="edition-overview" aria-label="Edition overview">
      <div className="edition-overview-title">
        <span className="eyebrow">YOUR DAILY LENS</span>
        <h2>See the bigger picture.</h2>
        <p>
          {edition.sample
            ? "Explore a historical sample, with original sources and real imagery."
            : "A personal edition drawn from the sources you follow."}
        </p>
        <button onClick={onExplore}>
          Explore every story <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="edition-stat">
        <BookOpen size={22} />
        <strong>{edition.articles.length}</strong>
        <span>Stories in this edition</span>
      </div>
      <div className="edition-stat">
        <Bookmark size={22} />
        <strong>{saved}</strong>
        <span>Saved for later</span>
      </div>
      <div className="edition-stat">
        <Radio size={22} />
        <strong>{sourceCount}</strong>
        <span>Connected sources</span>
      </div>
    </section>
  );
}

export function StoryExplorer({
  editions,
  bookmarks,
  toggleBookmark,
}: {
  editions: Edition[];
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All stories");
  const [savedOnly, setSavedOnly] = useState(false);
  const [order, setOrder] = useState("edition");
  const stories = useMemo(
    () =>
      Array.from(
        new Map(
          editions.flatMap((e) => e.articles).map((s) => [s.id, s]),
        ).values(),
      ),
    [editions],
  );
  const categories = [
    "All stories",
    ...new Set(stories.map((s) => s.category)),
  ];
  const filtered = stories.filter(
    (s) =>
      (category === "All stories" || s.category === category) &&
      (!savedOnly || bookmarks.includes(s.id)) &&
      `${s.headline} ${s.summary} ${s.source}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (order === "newest")
    filtered.sort(
      (a, b) =>
        (Date.parse(b.published_at || "") || 0) -
        (Date.parse(a.published_at || "") || 0),
    );
  return (
    <section className="explorer">
      <div className="explore-heading">
        <span className="eyebrow">THE CURIOSITY INDEX</span>
        <h1>
          Follow a thought.
          <br />
          <em>Find something new.</em>
        </h1>
        <p>
          Browse your editions by subject, find a source, or build your reading
          list.
        </p>
      </div>
      {editions.every((e) => e.sample) && (
        <p className="sample-banner">
          Historical sample · These stories demonstrate the reader; they are not
          today’s headlines.
        </p>
      )}
      <div className="explore-tools">
        <label className="explore-search">
          <Search size={19} />
          <input
            aria-label="Search stories"
            placeholder="Search stories, ideas, or publishers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="explore-sort">
          <SlidersHorizontal size={17} />
          <select
            aria-label="Sort stories"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="edition">Edition order</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        <button
          className={savedOnly ? "filter-save selected" : "filter-save"}
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly(!savedOnly)}
        >
          <Bookmark size={16} /> Saved only
        </button>
      </div>
      <div className="category-tabs" aria-label="Filter by topic">
        {categories.map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            className={category === c ? "selected" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="result-count" role="status">
        {filtered.length} {filtered.length === 1 ? "story" : "stories"} to
        explore
      </p>
      <div className="explore-grid">
        {filtered.map((s, i) => (
          <div
            className={`explore-card ${i === 0 && s.image ? "featured" : ""}`}
            key={s.id}
          >
            <Article
              story={s}
              saved={bookmarks.includes(s.id)}
              onBookmark={toggleBookmark}
            />
            <div className="card-meta">
              {Math.max(1, Math.ceil(s.summary.split(/\s+/).length / 200))} min
              read{" "}
              <span>
                {s.published_at
                  ? new Date(s.published_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Evergreen reading"}
              </span>
            </div>
          </div>
        ))}
      </div>
      {!filtered.length && (
        <div className="explore-empty">
          <Search size={30} />
          <h2>No stories match yet.</h2>
          <p>Try another phrase or broaden your filters.</p>
          <button
            className="button primary"
            onClick={() => {
              setQuery("");
              setCategory("All stories");
              setSavedOnly(false);
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </section>
  );
}

type Health = { database: string; auth: boolean; ai: boolean; email: boolean };
export function ServiceStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    setBusy(true);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/health/ready`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (r) => {
        if (![200, 503].includes(r.status)) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setHealth(data);
          setMessage("");
        }
      })
      .catch(() => {
        if (active) {
          setHealth(null);
          setMessage("Backend unavailable. Start the API, then check again.");
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
    // A manual retry triggers a fresh readiness check.
  }, [attempt]);
  return (
    <section className="service-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR CONNECTIONS</span>
          <h3>Ready when you are.</h3>
        </div>
        <button
          className="button quiet"
          onClick={() => setAttempt((a) => a + 1)}
          disabled={busy}
        >
          <RefreshCw size={15} className={busy ? "spin" : ""} />
          {busy ? "Checking…" : "Check status"}
        </button>
      </div>
      <div className="service-grid">
        {[
          ["Frontend", "Running"],
          ["Account setup", supabase ? "Configured" : "Needs Supabase keys"],
          ["Database", health?.database || "Not checked"],
          [
            "AI summaries",
            health?.ai ? "Configured · unverified" : "Source excerpts",
          ],
          [
            "Email delivery",
            health?.email ? "Configured · unverified" : "Not configured",
          ],
        ].map(([label, status]) => (
          <div key={label}>
            <CheckCircle2 size={16} />
            <span>{label}</span>
            <strong>{status}</strong>
          </div>
        ))}
      </div>
      <p role="status">
        {message ||
          "Configuration is checked separately from live provider delivery. No secret keys are shown here."}
      </p>
    </section>
  );
}

"use client";
import { ArrowUpRight, ArrowRight, BookOpen } from "lucide-react";
import type { Edition } from "@/lib/types";
import MediaFigure from "./MediaFigure";
export default function CoverStage({
  edition,
  onRead,
  onExplore,
}: {
  edition: Edition;
  onRead: () => void;
  onExplore: () => void;
}) {
  const lead = edition.articles[0];
  if (!lead) return null;
  return (
    <section className="cover-stage" aria-label="Featured edition">
      <div className="cover-visual">
        {lead.image && <MediaFigure story={lead} />}
        <div className="cover-copy">
          <span className="cover-kicker">
            {edition.sample
              ? "THE DISCOVERY EDITION · HISTORICAL SAMPLE"
              : edition.date}
          </span>
          <h2>{lead.headline}</h2>
          <p>{lead.summary}</p>
          <button className="cover-open" onClick={onRead}>
            <BookOpen size={19} /> Open edition <ArrowUpRight size={20} />
          </button>
          <span className="cover-credit">Reporting from {lead.source}</span>
        </div>
      </div>
      <aside className="cover-index">
        <div className="cover-index-title">
          <span>INSIDE THIS EDITION</span>
          <span>0{edition.articles.length}</span>
        </div>
        <h3>
          A little curiosity
          <br />
          <em>goes a long way.</em>
        </h3>
        {edition.articles.slice(1, 4).map((s, i) => (
          <button className="cover-index-story" key={s.id} onClick={onExplore}>
            <span className="index-number">0{i + 2}</span>
            <span>
              <small>{s.category}</small>
              <strong>{s.headline}</strong>
            </span>
            <ArrowUpRight size={17} />
          </button>
        ))}
        <button className="cover-browse" onClick={onExplore}>
          Browse all stories <ArrowRight size={17} />
        </button>
        <div className="cover-note">
          <span>THE SLOW DOWN</span>
          <p>
            Stories, small puzzles,
            <br />
            and room to wonder.
          </p>
          <button onClick={onRead}>Take a reading break ↗</button>
        </div>
      </aside>
    </section>
  );
}

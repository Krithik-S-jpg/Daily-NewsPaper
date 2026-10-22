"use client";
import { useEffect, useRef, useState } from "react";
import { PageFlip } from "page-flip";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ExternalLink,
  Maximize,
  Type,
  Columns2,
  List,
  Download,
  Link as LinkIcon,
  HardDriveDownload,
  X,
} from "lucide-react";
import type { Edition, Story } from "@/lib/types";
import { paginate } from "@/lib/pagination";
import { useModalFocus } from "@/lib/modal-focus";
import { seal } from "../public/offline-crypto.js";
import { enrichPages, Supplement } from "./Supplement";
import MediaFigure, { bindMediaPreviews } from "./MediaFigure";
import { ThemeControl } from "./Theme";
import { api } from "@/lib/supabase";
export function Article({
  story,
  lead = false,
  saved,
  onBookmark,
}: {
  story: Story;
  lead?: boolean;
  saved: boolean;
  onBookmark: (id: string) => void;
}) {
  return (
    <article className={lead ? "story lead-story" : "story"}>
      <div className="eyebrow accent">{story.category}</div>
      <h3>{story.headline}</h3>
      {story.image && <MediaFigure story={story} />}
      <p>{story.summary}</p>
      {story.summary_kind && (
        <small className="summary-kind">
          {story.summary_kind === "ai_summary"
            ? "AI summary"
            : "Source excerpt"}
        </small>
      )}
      <div className="story-source">
        <a href={story.url} target="_blank" rel="noreferrer">
          {story.source} <ExternalLink size={11} />
        </a>
        <button
          data-bookmark={story.id}
          aria-label={saved ? "Remove bookmark" : "Bookmark story"}
          onClick={() => onBookmark(story.id)}
        >
          <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
export default function Reader({
  edition,
  bookmarks,
  toggleBookmark,
  onClose,
  onPdf,
  syncProgress = false,
}: {
  edition: Edition;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  onClose: () => void;
  onPdf: () => void;
  syncProgress?: boolean;
}) {
  const book = useRef<HTMLDivElement>(null),
    template = useRef<HTMLDivElement>(null),
    shell = useRef<HTMLDivElement>(null),
    scrollArea = useRef<HTMLDivElement>(null),
    flip = useRef<PageFlip | null>(null);
  const bookmarkAction = useRef(toggleBookmark);
  useModalFocus(shell);
  bookmarkAction.current = toggleBookmark;
  const [page, setPage] = useState(0),
    [plain, setPlain] = useState(false),
    [large, setLarge] = useState(false),
    [contents, setContents] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [offlineSave, setOfflineSave] = useState(false),
    [saving, setSaving] = useState(false);
  const [single, setSingle] = useState(false);
  const [spread, setSpread] = useState(false);
  const [remoteReady, setRemoteReady] = useState("");
  const positionKey = `${edition.id}:${single ? "phone" : "spread"}`;
  const pages = enrichPages(paginate(edition.articles, single));
  useEffect(() => {
    const media = matchMedia("(max-width:650px)");
    const change = () => setSingle(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlain(true);
  }, []);
  useEffect(() => {
    if (!syncProgress) return;
    let active = true;
    api(`/api/reading/${edition.id}?mode=${single ? "phone" : "spread"}`)
      .then((data) => {
        if (active && typeof data.page === "number") {
          try {
            localStorage.setItem(
              `daybreak-position:${positionKey}`,
              String(data.page),
            );
          } catch {}
        }
      })
      .catch(() => {
        if (active)
          setFeedback(
            "Cloud reading position is unavailable. Using this device’s saved position.",
          );
      })
      .finally(() => {
        if (active) setRemoteReady(positionKey);
      });
    return () => {
      active = false;
    };
  }, [edition.id, single, syncProgress, positionKey]);
  useEffect(() => {
    if (plain || !book.current || !template.current) return;
    if (syncProgress && remoteReady !== positionKey) return;
    // The library owns a separate subtree; it never reparents React-owned nodes.
    const host = document.createElement("div");
    host.className = "flipbook";
    book.current.appendChild(host);
    const nodes = Array.from(template.current.children).map(
      (n) => n.cloneNode(true) as HTMLElement,
    );
    nodes.forEach((n) => host.appendChild(n));
    const progressKey = `daybreak-position:${edition.id}:${single ? "phone" : "spread"}`;
    let initial = 0;
    try {
      initial = Math.max(
        0,
        Math.min(
          nodes.length - 1,
          Number(localStorage.getItem(progressKey)) || 0,
        ),
      );
    } catch {}
    setPage(initial);
    const engine = new PageFlip(host, {
      width: single ? Math.max(280, window.innerWidth - 40) : 480,
      height: single ? 790 : 760,
      size: "stretch",
      minWidth: 280,
      maxWidth: 550,
      minHeight: 700,
      maxHeight: 880,
      maxShadowOpacity: 0.55,
      showCover: false,
      mobileScrollSupport: true,
      usePortrait: true,
      flippingTime: 1100,
      showPageCorners: true,
      disableFlipByClick: true,
      drawShadow: true,
      autoSize: true,
      startPage: initial,
      useMouseEvents: true,
    });
    engine.loadFromHTML(nodes);
    const media = bindMediaPreviews(host);
    engine.on("changeState", (e) => {
      host.dataset.turning = String(e.data !== "read");
      if (e.data !== "read") media.stopAll();
    });
    setSpread(engine.getOrientation() === "landscape");
    engine.on("changeOrientation", (e) => setSpread(e.data === "landscape"));
    let syncTimer: ReturnType<typeof setTimeout> | undefined;
    let pendingPage: number | null = null;
    const savePosition = () => {
      if (pendingPage === null) return;
      const current = pendingPage;
      pendingPage = null;
      void api(`/api/reading/${edition.id}`, {
        method: "PUT",
        body: JSON.stringify({
          mode: single ? "phone" : "spread",
          page: current,
        }),
      }).catch(() =>
        setFeedback(
          "Position saved on this device; cloud sync is unavailable.",
        ),
      );
    };
    engine.on("flip", (e) => {
      const current = Number(e.data);
      setPage(current);
      try {
        localStorage.setItem(progressKey, String(current));
      } catch {}
      if (syncProgress) {
        pendingPage = current;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(savePosition, 800);
      }
      scrollArea.current?.scrollTo({ top: 0 });
    });
    flip.current = engine;
    const clicked = (e: MouseEvent) => {
      const button = (e.target as HTMLElement).closest("[data-bookmark]");
      if (button) bookmarkAction.current(button.getAttribute("data-bookmark")!);
    };
    host.addEventListener("click", clicked);
    const guard = (event: Event) => {
      if (event.type === "touchstart" && (event.target as HTMLElement).closest(".page-stories")) {
        event.stopPropagation();
        return;
      }
      if ((event.target as HTMLElement).closest("button,a,details,summary"))
        event.stopPropagation();
    };
    host.addEventListener("mousedown", guard, true);
    host.addEventListener("touchstart", guard, true);
    return () => {
      flip.current = null;
      host.removeEventListener("click", clicked);
      host.removeEventListener("mousedown", guard, true);
      host.removeEventListener("touchstart", guard, true);
      engine.destroy();
      media.destroy();
      clearTimeout(syncTimer);
      if (syncProgress) savePosition();
    };
  }, [plain, edition, single, syncProgress, remoteReady, positionKey]);
  useEffect(() => {
    book.current?.querySelectorAll("[data-bookmark]").forEach((b) => {
      const saved = bookmarks.includes(b.getAttribute("data-bookmark")!);
      b.setAttribute(
        "aria-label",
        saved ? "Remove bookmark" : "Bookmark story",
      );
      b.querySelector("svg")?.setAttribute(
        "fill",
        saved ? "currentColor" : "none",
      );
    });
  }, [bookmarks]);
  function turn(direction: number) {
    if (direction > 0) flip.current?.flipNext();
    else flip.current?.flipPrev();
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea,select,summary"))
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        flip.current?.flipNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        flip.current?.flipPrev();
      }
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div
      className={`reader ${large ? "large-text" : ""}`}
      ref={shell}
      role="dialog"
      aria-label="Newspaper reader"
      aria-modal="true"
    >
      <div className="reader-toolbar">
        <button onClick={onClose}>
          <X size={18} /> Close reader
        </button>
        <span>{edition.sample ? "SAMPLE EDITION" : edition.title}</span>
        <div>
          <ThemeControl />
          <button
            aria-label="Change text size"
            onClick={() => {
              setLarge(!large);
              setPlain(true);
            }}
          >
            <Type size={18} />
          </button>
          <button
            aria-label="Toggle semantic reading mode"
            onClick={() => setPlain(!plain)}
          >
            {plain ? <Columns2 size={18} /> : <List size={18} />}
          </button>
          <button
            aria-label="Table of contents"
            onClick={() => setContents(!contents)}
          >
            <List size={18} />
          </button>
          <button
            aria-label="Full screen"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void shell.current?.requestFullscreen().catch(() => {});
            }}
          >
            <Maximize size={18} />
          </button>
          <button onClick={onPdf}>
            <Download size={17} /> PDF
          </button>
          <button
            aria-label="Copy edition link"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  edition.sample
                    ? location.origin
                    : `${location.origin}/?edition=${edition.id}`,
                );
                setFeedback(
                  edition.sample
                    ? "Sample link copied."
                    : "Private link copied. Only your signed-in account can open it.",
                );
              } catch {
                setFeedback(
                  "Clipboard unavailable. Copy this page address from your browser.",
                );
              }
            }}
          >
            <LinkIcon size={17} />
          </button>
          <button
            aria-label="Save offline"
            onClick={() => setOfflineSave(!offlineSave)}
          >
            <HardDriveDownload size={17} />
          </button>
        </div>
      </div>
      <div
        className="reader-scroll"
        ref={scrollArea}
        tabIndex={0}
        aria-label="Scrollable newspaper pages"
      >
        <div className="reader-intro">
          <span>THE DAYBREAK READING ROOM</span>
          <p>
            A little more wonder.<em> A little less scrolling.</em>
          </p>
          <small>
            Hover or tap a picture to bring it to life · Drag a corner to turn
            the page
          </small>
        </div>
        {feedback && (
          <div className="reader-feedback" role="status">
            {feedback}
            <button
              aria-label="Dismiss reader message"
              onClick={() => setFeedback("")}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {offlineSave && (
          <form
            className="offline-save"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const passphrase = String(new FormData(form).get("passphrase"));
              setSaving(true);
              try {
                const encrypted = await seal(
                  JSON.stringify(edition),
                  passphrase,
                );
                localStorage.setItem(
                  `daybreak-offline:${edition.id}`,
                  JSON.stringify(encrypted),
                );
                form.reset();
                setOfflineSave(false);
                setFeedback(
                  "Encrypted edition saved on this device. Open the offline library to read it without a connection.",
                );
              } catch (err) {
                setFeedback((err as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              Protect this offline copy
              <input
                name="passphrase"
                type="password"
                minLength={12}
                required
                placeholder="Passphrase · at least 12 characters"
                autoComplete="off"
              />
            </label>
            <p>
              This passphrase stays on your device and is needed to unlock the
              saved edition. It cannot be recovered.
            </p>
            <button className="button primary" disabled={saving}>
              {saving ? "Encrypting…" : "Save encrypted copy"}
            </button>
            <a href="/offline.html">Open offline library ↗</a>
          </form>
        )}
        {contents && (
          <nav className="contents">
            {pages.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setPage(i);
                  flip.current?.flip(i);
                  if (plain)
                    document
                      .getElementById(`reader-page-${i}`)
                      ?.scrollIntoView();
                  setContents(false);
                }}
              >
                <span className="thumbnail-brand">Daybreak</span>
                <span>{p[0].headline}</span>
                <small>
                  {String(i + 1).padStart(2, "0")} · {p[0].category}
                </small>
              </button>
            ))}
          </nav>
        )}
        <div className="book-stage">
          {syncProgress && remoteReady !== positionKey && !plain && (
            <p className="reader-loading" role="status">
              Finding your place…
            </p>
          )}
          {plain ? (
            <div className="semantic-pages">
              {pages.map((stories, i) => (
                <section
                  key={i}
                  id={`reader-page-${i}`}
                  className={`newspaper-page paper-tone-${i % 4}`}
                >
                  <PageContent
                    edition={edition}
                    stories={stories}
                    index={i}
                    bookmarks={bookmarks}
                    toggle={toggleBookmark}
                  />
                </section>
              ))}
            </div>
          ) : (
            <div className="book-host">
              <div ref={book} />
              <div ref={template} hidden>
                {pages.map((stories, i) => (
                  <div key={i} className={`newspaper-page paper-tone-${i % 4}`}>
                    <PageContent
                      edition={edition}
                      stories={stories}
                      index={i}
                      bookmarks={bookmarks}
                      toggle={toggleBookmark}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {!plain && (
        <div className="reader-bottom">
          <button
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => turn(-1)}
          >
            <ArrowLeft size={19} />
          </button>
          <span>
            Page {page + 1} of {pages.length}
          </span>
          <progress value={page + 1} max={pages.length} />
          <button
            aria-label="Next page"
            disabled={page >= pages.length - (spread ? 2 : 1)}
            onClick={() => turn(1)}
          >
            <ArrowRight size={19} />
          </button>
          <small>Use arrow keys or drag a page corner</small>
        </div>
      )}
    </div>
  );
}
function PageContent({
  edition,
  stories,
  index,
  bookmarks,
  toggle,
}: {
  edition: Edition;
  stories: Story[];
  index: number;
  bookmarks: string[];
  toggle: (id: string) => void;
}) {
  return (
    <>
      <div className="page-kicker">
        <span>{edition.sample ? "THE SAMPLE EDITION" : edition.date}</span>
        <span>VOL. {edition.id.slice(0, 6)}</span>
      </div>
      <h2 className="paper-brand">Daybreak</h2>
      <div className="paper-subtitle">
        <span>A WORLD WORTH READING</span>
        <span>✳ {stories[0]?.category}</span>
      </div>
      <div className="page-stories">
        {stories.map((story, i) =>
          story.id.startsWith("extra-") ? (
            <Supplement key={story.id} id={story.id} />
          ) : (
            <Article
              key={story.id}
              story={story}
              lead={i === 0}
              saved={bookmarks.includes(story.id)}
              onBookmark={toggle}
            />
          ),
        )}
      </div>
      <footer className="page-footer">
        <span>
          DAYBREAK ·{" "}
          {edition.sample ? "Historical sample · July 12, 2022" : edition.date}
        </span>
        <span>{index + 1}</span>
      </footer>
    </>
  );
}

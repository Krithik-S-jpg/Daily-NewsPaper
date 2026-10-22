"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  PageTitle,
  SearchBox,
  Empty,
  SourceForm,
  PreferencesForm,
  Auth,
  ModalFrame,
} from "./Controls";
import type { User } from "@supabase/supabase-js";
import {
  Sun,
  Newspaper,
  Archive,
  Compass,
  Settings,
  Bookmark,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronDown,
  Check,
  Download,
  RefreshCw,
  Menu,
  X,
  LogOut,
  Rss,
  Github,
  Clock,
  BookOpen,
  SlidersHorizontal,
  WifiOff,
} from "lucide-react";
import Reader, { Article } from "./Reader";
import MediaFigure from "./MediaFigure";
import { ThemeControl } from "./Theme";
import { StoryExplorer, EditionOverview, ServiceStatus } from "./Workspace";
import CoverStage from "./CoverStage";
import { sample } from "@/lib/sample";
import { supabase, api } from "@/lib/supabase";
import {
  defaults,
  type Edition,
  type Preferences,
  type Source,
} from "@/lib/types";
const sections = [
  "Overview",
  "My newspaper",
  "Archive",
  "Following",
  "Discover",
  "Explore stories",
  "Bookmarks",
  "Settings",
];
const icons = [
  Sun,
  Newspaper,
  Archive,
  Rss,
  Compass,
  Search,
  Bookmark,
  Settings,
];
const topics = [
  "Technology",
  "Artificial intelligence",
  "Open source",
  "Science",
  "World news",
  "Business",
  "Finance",
  "Football",
  "Gaming",
  "Culture",
  "Education",
];
const recommendations = [
  {
    name: "NASA Science",
    kind: "rss",
    url: "https://www.nasa.gov/feed/",
    category: "Science",
    description:
      "A wider perspective. Discoveries, missions, and the people exploring our universe.",
  },
  {
    name: "GitHub · Next.js",
    kind: "github",
    url: "https://github.com/vercel/next.js",
    category: "Open source",
    description:
      "Follow releases from the React framework, straight from its maintainers.",
  },
  {
    name: "BBC World",
    kind: "rss",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "World news",
    description:
      "International reporting and perspectives from around the world.",
  },
];
export default function Daybreak() {
  const owner = useRef<string | null>(null);
  const [archiveOffset, setArchiveOffset] = useState<number | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [nextRun, setNextRun] = useState<string | null>(null),
    [deliveryStatus, setDeliveryStatus] = useState("No delivery yet");
  const [view, setView] = useState("Overview"),
    [user, setUser] = useState<User | null>(null),
    [edition, setEdition] = useState<Edition>(sample),
    [editions, setEditions] = useState<Edition[]>([]),
    [prefs, setPrefs] = useState<Preferences>(defaults),
    [sources, setSources] = useState<Source[]>([]),
    [bookmarks, setBookmarks] = useState<string[]>([]),
    [reader, setReader] = useState(false),
    [auth, setAuth] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [sidebar, setSidebar] = useState(false),
    [onboard, setOnboard] = useState(false),
    [step, setStep] = useState(0),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [job, setJob] = useState<string | null>(null),
    [offline, setOffline] = useState(false);
  const notify = useCallback((message: string) => {
    setNotice(message);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("join"))
      setAuth("Create account");
    if (location.hash === "#signin") setAuth("Sign in");
    if (new URLSearchParams(location.search).get("print") === "sample") {
      window.print();
      history.replaceState(null, "", location.pathname);
    }
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js");
    const change = () => setOffline(!navigator.onLine);
    change();
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    if (supabase) {
      void supabase.auth.getUser().then(({ data }) => {
        owner.current = data.user?.id ?? null;
        setUser(data.user);
      });
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        owner.current = session?.user.id ?? null;
        setUser(session?.user ?? null);
        if (event === "PASSWORD_RECOVERY") setAuth("New password");
      });
      return () => {
        data.subscription.unsubscribe();
        window.removeEventListener("online", change);
        window.removeEventListener("offline", change);
      };
    }
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, []);
  const load = useCallback(async () => {
    const requestedOwner = owner.current;
    try {
      const data = await api("/api/me");
      if (!requestedOwner || owner.current !== requestedOwner) return;
      setPrefs({ ...defaults, ...data.preferences });
      setSources(data.sources);
      setEditions(data.editions);
      setArchiveOffset(data.editions.length === 100 ? 100 : null);
      let sampleSaved: string[] = [];
      try {
        sampleSaved = JSON.parse(
          localStorage.getItem("daybreak-sample-bookmarks") || "[]",
        );
      } catch {}
      setBookmarks([...new Set([...data.bookmarks, ...sampleSaved])]);
      setNextRun(data.next_run_at);
      setDeliveryStatus(data.delivery_status);
      if (
        data.latest_job &&
        !["completed", "failed"].includes(data.latest_job.status)
      ) {
        setJob(data.latest_job.id);
        setBusy(true);
      }
      if (data.editions.length) {
        const selected = data.editions.find(
          (e: Edition) =>
            e.id === new URLSearchParams(location.search).get("edition"),
        );
        setEdition(selected || data.editions[0]);
        if (selected) setReader(true);
      }
      const linked = new URLSearchParams(location.search).get("edition");
      if (linked && !data.editions.some((e: Edition) => e.id === linked)) {
        const selected = await api(
          `/api/editions/${encodeURIComponent(linked)}`,
        );
        if (owner.current !== requestedOwner) return;
        setEdition(selected);
        setReader(true);
      }
      if (!data.onboarded) setOnboard(true);
    } catch (e) {
      notify((e as Error).message);
    }
  }, [notify]);
  useEffect(() => {
    setEdition(sample);
    setEditions([]);
    setArchiveOffset(null);
    setSources([]);
    try {
      setBookmarks(
        JSON.parse(localStorage.getItem("daybreak-sample-bookmarks") || "[]"),
      );
    } catch {
      setBookmarks([]);
    }
    setPrefs(defaults);
    setNextRun(null);
    setDeliveryStatus("No delivery yet");
    setReader(false);
    setOnboard(false);
    setJob(null);
    setBusy(false);
    if (user) void load();
  }, [user, load]);
  useEffect(() => {
    if (!job) return;
    const timer = setInterval(async () => {
      try {
        const data = await api(`/api/jobs/${job}`);
        notify(`Edition ${data.status}${data.error ? `: ${data.error}` : ""}`);
        if (["completed", "failed"].includes(data.status)) {
          setJob(null);
          setBusy(false);
          if (data.status === "completed") void load();
        }
      } catch (e) {
        notify((e as Error).message);
        setJob(null);
        setBusy(false);
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [job, load, notify]);
  async function generate() {
    if (!user) {
      setAuth("Create account");
      return;
    }
    setBusy(true);
    try {
      const data = await api("/api/generate", { method: "POST" });
      setJob(data.id);
      notify("Your edition is queued. You can safely leave this page.");
    } catch (e) {
      setBusy(false);
      notify((e as Error).message);
    }
  }
  async function savePreferences() {
    if (!user) {
      setAuth("Create account");
      return false;
    }
    try {
      await api("/api/preferences", {
        method: "PUT",
        body: JSON.stringify(prefs),
      });
      notify("Your preferences have been saved.");
      return true;
    } catch (e) {
      notify((e as Error).message);
      return false;
    }
  }
  async function follow(source: Omit<Source, "id" | "enabled">) {
    if (!user) {
      setAuth("Create account");
      return;
    }
    try {
      await api("/api/sources", {
        method: "POST",
        body: JSON.stringify(source),
      });
      await load();
      notify(`${source.name} added to your sources.`);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function toggleBookmark(id: string) {
    const next = bookmarks.includes(id)
      ? bookmarks.filter((b) => b !== id)
      : [...bookmarks, id];
    const isSampleStory = sample.articles.some((s) => s.id === id);
    if (!isSampleStory) {
      try {
        await api(`/api/bookmarks/${id}`, {
          method: bookmarks.includes(id) ? "DELETE" : "POST",
        });
      } catch (e) {
        notify((e as Error).message);
        return;
      }
    }
    setBookmarks(next);
    if (isSampleStory) {
      try {
        localStorage.setItem(
          "daybreak-sample-bookmarks",
          JSON.stringify(
            next.filter((id) => sample.articles.some((s) => s.id === id)),
          ),
        );
      } catch {}
      notify(
        next.includes(id)
          ? "Story saved to your reading list."
          : "Story removed from your reading list.",
      );
    }
  }
  function pdf() {
    if (edition.sample) {
      window.print();
      notify("Choose “Save as PDF” in the print dialog.");
    } else {
      void (async () => {
        try {
          const session = await supabase?.auth.getSession();
          const r = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/editions/${edition.id}/pdf`,
            {
              headers: {
                Authorization: `Bearer ${session?.data.session?.access_token}`,
              },
            },
          );
          if (!r.ok) throw new Error("PDF could not be generated.");
          const url = URL.createObjectURL(await r.blob());
          const a = document.createElement("a");
          a.href = url;
          a.download = `daybreak-${edition.date}.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (e) {
          notify((e as Error).message);
        }
      })();
    }
  }
  const closeReader = useCallback(() => setReader(false), []);
  const navigate = (next: string) => {
    setView(next);
    setSidebar(false);
    setQuery("");
    if (next === "My newspaper") setReader(true);
  };
  return (
    <>
      <div className="app-shell" inert={reader || !!auth || onboard}>
        <aside className={`sidebar ${sidebar ? "open" : ""}`}>
          <a href="#" className="brand" onClick={() => navigate("Overview")}>
            <Sun size={24} strokeWidth={1.3} />
            <span>
              daybreak<span className="brand-dot">.</span>
            </span>
          </a>
          <div className="sidebar-label">YOUR DAILY PERSPECTIVE</div>
          <nav>
            {sections.map((name, i) => {
              const Icon = icons[i];
              return (
                <button
                  key={name}
                  className={view === name ? "nav-item active" : "nav-item"}
                  onClick={() => navigate(name)}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {name}
                  {name === "My newspaper" && <span className="tiny-dot" />}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <div className="morning-note">
              <Sun size={26} strokeWidth={1.2} />
              <h4>
                A slower start.
                <br />A wider perspective.
              </h4>
              <p>
                A little less scrolling.
                <br />A little more understanding.
              </p>
              <button
                onClick={() => {
                  setView("Settings");
                  setSidebar(false);
                }}
              >
                Make it your own <ArrowUpRight size={14} />
              </button>
            </div>
            <button
              className="profile"
              onClick={() => (user ? setView("Settings") : setAuth("Sign in"))}
            >
              <span className="avatar">
                {user?.email?.slice(0, 1).toUpperCase() || "R"}
              </span>
              <span>
                <strong>
                  {user?.user_metadata?.display_name || "The curious reader"}
                </strong>
                <small>
                  {user ? "Your personal edition" : "Explore Daybreak"}
                </small>
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              Your reading room <span>/</span> <strong>{view}</strong>
            </div>
            <div className="topbar-right">
              <ThemeControl />
              {offline && (
                <span>
                  <WifiOff size={15} /> Offline
                </span>
              )}
              <span className="today-date">
                {new Intl.DateTimeFormat("en", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  timeZone: "Asia/Kolkata",
                }).format(new Date())}
              </span>
              <span className="top-divider" />
              <button
                aria-label="Search archive"
                onClick={() => setView("Archive")}
              >
                <Search size={19} />
              </button>
              {user ? (
                <button
                  aria-label="Sign out"
                  onClick={async () => {
                    await supabase?.auth.signOut();
                    setView("Overview");
                  }}
                >
                  <LogOut size={18} />
                </button>
              ) : (
                <button className="sign-in" onClick={() => setAuth("Sign in")}>
                  Sign in <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </header>
          <main>
            {view === "Overview" || view === "My newspaper" ? (
              <>
                <div className="intro">
                  <div>
                    <div className="eyebrow">
                      <span className="tiny-sun">✳</span> A NEW DAY. A FRESH
                      PERSPECTIVE.
                    </div>
                    <h1>Your world, in a few pages.</h1>
                    <p>
                      Good stories. Thoughtfully gathered. A newspaper that
                      feels like you.
                    </p>
                  </div>
                  <button
                    className="button primary generate"
                    onClick={generate}
                    disabled={busy}
                  >
                    <RefreshCw size={15} className={busy ? "spin" : ""} />
                    {busy ? "Preparing edition…" : "Create my edition"}
                  </button>
                </div>
                <div className="edition-heading">
                  <div className="section-title">
                    <span className="green-dot" />
                    {edition.sample
                      ? "A taste of your next morning"
                      : "Your latest edition"}
                    <span className="small-tag">
                      {edition.sample ? "SAMPLE EDITION" : edition.date}
                    </span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setView("Archive")}
                  >
                    View archive <ArrowRight size={15} />
                  </button>
                </div>
                <CoverStage
                  edition={edition}
                  onRead={() => setReader(true)}
                  onExplore={() => setView("Explore stories")}
                />
                <EditionOverview
                  edition={edition}
                  saved={bookmarks.length}
                  sourceCount={sources.length}
                  onExplore={() => setView("Explore stories")}
                />
                <div className="edition-layout">
                  <section className="edition-preview">
                    <div className="paper-topline">
                      <span>INDEPENDENT CURIOSITY. PERSONAL PERSPECTIVE.</span>
                      <span>EST. 2026</span>
                    </div>
                    <div className="masthead">
                      Daybreak<span>✳</span>
                    </div>
                    <div className="edition-dateline">
                      <span>
                        {edition.sample
                          ? "TUESDAY, JULY 12, 2022 · HISTORICAL SAMPLE"
                          : edition.date}
                      </span>
                      <span>
                        THE {edition.sample ? "DISCOVERY" : "PERSONAL"} EDITION
                      </span>
                      <span>NO. {edition.id.slice(-3).toUpperCase()}</span>
                    </div>
                    <div className="front-page">
                      <div className="front-lead">
                        <div className="eyebrow accent">
                          {edition.articles[0]?.category}{" "}
                          <span> / THE LEAD STORY</span>
                        </div>
                        <h2>{edition.articles[0]?.headline}</h2>
                        <p className="lead-deck">
                          {edition.articles[0]?.summary}
                        </p>
                        {edition.articles[0]?.image ? (
                          <MediaFigure story={edition.articles[0]} />
                        ) : (
                          <div className="type-art">
                            A fresh
                            <br />
                            <em>perspective.</em>
                            <Sun size={100} strokeWidth={0.5} />
                          </div>
                        )}
                        <a
                          className="attribution"
                          href={edition.articles[0]?.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {edition.articles[0]?.source}{" "}
                          <ArrowUpRight size={11} />
                        </a>
                      </div>
                      <div className="front-column">
                        {edition.articles.slice(1, 3).map((s) => (
                          <Article
                            key={s.id}
                            story={s}
                            saved={bookmarks.includes(s.id)}
                            onBookmark={toggleBookmark}
                          />
                        ))}
                        <div className="editor-note">
                          <span className="eyebrow">
                            A NOTE FROM THE EDITOR
                          </span>
                          <p>
                            Less noise.
                            <br />
                            <em>More wonder.</em>
                          </p>
                          <span>A small ritual for a bigger world.</span>
                        </div>
                      </div>
                    </div>
                    <div className="edition-extras">
                      <div>
                        <BookOpen
                          size={34}
                          strokeWidth={1}
                          aria-hidden="true"
                        />
                        <span>
                          <small>THE READING NOOK</small>
                          <strong>A story to get lost in.</strong>
                        </span>
                      </div>
                      <div className="extras-puzzle">
                        <span className="extras-letters" aria-hidden="true">
                          A B<br />C ?
                        </span>
                        <span>
                          <small>THE PUZZLE CORNER</small>
                          <strong>A little twist for your mind.</strong>
                        </span>
                      </div>
                      <div className="extras-slow">
                        <Sun size={34} strokeWidth={1} />
                        <span>
                          <small>THE SLOW PAGE</small>
                          <strong>Room for a little wonder.</strong>
                        </span>
                      </div>
                    </div>
                    <div className="paper-bottom">
                      <span>YOUR INTERESTS. YOUR SOURCES. YOUR DAYBREAK.</span>
                      <span>01</span>
                    </div>
                    <button
                      className="open-paper"
                      onClick={() => setReader(true)}
                    >
                      <BookOpen size={16} /> Open the newspaper{" "}
                      <ArrowRight size={17} />
                    </button>
                  </section>
                  <aside className="edition-side">
                    <div className="edition-about">
                      <span className="eyebrow">MADE FOR YOUR MORNING</span>
                      <h2>
                        A world worth
                        <br />
                        <em>reading.</em>
                      </h2>
                      <p>
                        Your daily pause from the endless feed. A considered
                        selection of stories, shaped around what matters to you.
                      </p>
                      <div className="edition-facts">
                        <span>
                          <Newspaper size={16} />
                          {edition.articles.length} stories
                        </span>
                        <span>
                          <Clock size={16} />
                          {Math.max(
                            1,
                            Math.ceil(
                              edition.articles.reduce(
                                (n, s) => n + s.summary.split(" ").length,
                                0,
                              ) / 200,
                            ),
                          )}{" "}
                          min read
                        </span>
                      </div>
                      <div className="interest-tags">
                        {prefs.topics.slice(0, 3).map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                      <button
                        className="button primary wide"
                        onClick={() => setReader(true)}
                      >
                        Start reading <ArrowRight size={16} />
                      </button>
                      <button className="button quiet wide" onClick={pdf}>
                        <Download size={16} /> Download PDF
                      </button>
                      <small className="sample-disclosure">
                        {edition.sample
                          ? "A curated historical sample, not today’s news. Your own edition will use your connected sources."
                          : "Collected from your sources. Always follow original links for the full context."}
                      </small>
                    </div>
                    <div className="delivery-card">
                      <span className="delivery-icon">
                        <Sun size={21} />
                      </span>
                      <div>
                        <h4>Your morning, on schedule.</h4>
                        <p>
                          {user
                            ? nextRun
                              ? `Next: ${new Date(nextRun).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} IST`
                              : "Daily generation is paused"
                            : "Good reading. Delivered daily."}
                        </p>
                        {user && <p>Email: {deliveryStatus}</p>}
                        <button
                          onClick={() =>
                            user
                              ? setView("Settings")
                              : setAuth("Create account")
                          }
                        >
                          Set up daily delivery <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
                <div className="below-grid">
                  <section>
                    <div className="section-heading">
                      <h3>Your interests, in focus</h3>
                      <button
                        className="text-button"
                        onClick={() => setView("Following")}
                      >
                        Personalize <SlidersHorizontal size={14} />
                      </button>
                    </div>
                    <div className="topic-strip">
                      {prefs.topics.map((t, i) => (
                        <button
                          key={t}
                          onClick={() => {
                            setView("Discover");
                            setQuery(t);
                          }}
                        >
                          <span className="topic-number">0{i + 1}</span>
                          <span>{t}</span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                      <button
                        onClick={() => setView("Following")}
                        className="add-topic"
                      >
                        <Plus size={18} /> Add an interest
                      </button>
                    </div>
                  </section>
                  <section className="quote">
                    <span>THE DAILY THOUGHT</span>
                    <p>Make a little room for a different point of view.</p>
                    <small>A reminder to stay curious.</small>
                  </section>
                </div>
              </>
            ) : view === "Explore stories" ? (
              <StoryExplorer
                editions={editions.length ? editions : [sample]}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
              />
            ) : view === "Archive" ? (
              <>
                <PageTitle
                  kicker="THE READING ROOM"
                  title="Good stories keep."
                  description="Revisit your editions. Pick up a thought you left behind."
                />
                <SearchBox query={query} setQuery={setQuery} />
                {!editions.length ? (
                  <Empty
                    title="Your collection begins with a morning."
                    text="Create your first personal edition to start an archive. The historical sample is always available below."
                    action="Explore sample edition"
                    onClick={() => {
                      setEdition(sample);
                      setReader(true);
                    }}
                  />
                ) : (
                  editions
                    .filter((e) =>
                      JSON.stringify(e)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((e) => (
                      <button
                        className="archive-row"
                        key={e.id}
                        onClick={() => {
                          setEdition(e);
                          setReader(true);
                        }}
                      >
                        <Newspaper size={35} />
                        <span>
                          <small>{e.date}</small>
                          <h3>{e.title}</h3>
                          <p>{e.articles.length} stories</p>
                        </span>
                        <ArrowRight />
                      </button>
                    ))
                )}
                {archiveOffset !== null && (
                  <button
                    className="button quiet"
                    disabled={archiveLoading}
                    onClick={async () => {
                      const requestedOwner = owner.current;
                      setArchiveLoading(true);
                      try {
                        const data = await api(
                          `/api/editions?offset=${archiveOffset}&limit=20`,
                        );
                        if (owner.current !== requestedOwner) return;
                        setEditions((previous) =>
                          Array.from(
                            new Map(
                              [...previous, ...data.editions].map((e) => [
                                e.id,
                                e,
                              ]),
                            ).values(),
                          ),
                        );
                        setArchiveOffset(data.next_offset);
                      } catch (error) {
                        notify((error as Error).message);
                      } finally {
                        setArchiveLoading(false);
                      }
                    }}
                  >
                    {archiveLoading
                      ? "Loading editions…"
                      : "Load older editions"}
                  </button>
                )}
              </>
            ) : view === "Following" ? (
              <>
                <PageTitle
                  kicker="THE EDITOR’S DESK"
                  title="Follow your curiosity."
                  description="A good newspaper starts with sources you trust."
                />
                <h3 className="settings-heading">Your interests</h3>
                <div className="topic-options">
                  {topics.map((t) => (
                    <button
                      key={t}
                      className={prefs.topics.includes(t) ? "selected" : ""}
                      onClick={() =>
                        setPrefs({
                          ...prefs,
                          topics: prefs.topics.includes(t)
                            ? prefs.topics.filter((x) => x !== t)
                            : [...prefs.topics, t],
                        })
                      }
                    >
                      {prefs.topics.includes(t) ? (
                        <Check size={14} />
                      ) : (
                        <Plus size={14} />
                      )}{" "}
                      {t}
                    </button>
                  ))}
                </div>
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = new FormData(e.currentTarget)
                      .get("topic")
                      ?.toString()
                      .trim();
                    if (input && !prefs.topics.includes(input))
                      setPrefs({ ...prefs, topics: [...prefs.topics, input] });
                    e.currentTarget.reset();
                  }}
                >
                  <input
                    name="topic"
                    placeholder="Add a custom interest"
                    maxLength={60}
                    required
                  />
                  <button className="button quiet">Add topic</button>
                  <button
                    type="button"
                    className="button primary"
                    onClick={savePreferences}
                  >
                    Save interests
                  </button>
                </form>
                <div className="section-heading">
                  <h3>Your sources</h3>
                  <span>{sources.length} connected</span>
                </div>
                <SourceForm onAdd={follow} />
                {sources.map((s) => (
                  <div className="source-row" key={s.id}>
                    <Rss size={22} />
                    <div>
                      <h3>{s.name}</h3>
                      <p>{s.url}</p>
                      <small>{s.status || "Ready to retrieve"}</small>
                    </div>
                    <button
                      className="button quiet"
                      onClick={async () => {
                        try {
                          await api(`/api/sources/${s.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ enabled: !s.enabled }),
                          });
                          void load();
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      {s.enabled ? "Pause" : "Enable"}
                    </button>
                    <button
                      aria-label={`Remove ${s.name}`}
                      onClick={async () => {
                        try {
                          await api(`/api/sources/${s.id}`, {
                            method: "DELETE",
                          });
                          void load();
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
                <p className="muted">
                  RSS/Atom and public GitHub releases are available. YouTube
                  needs an API key; Reddit needs approved API access.
                </p>
              </>
            ) : view === "Discover" ? (
              <>
                <PageTitle
                  kicker="BEYOND YOUR USUAL"
                  title="There’s more to the story."
                  description="A small, editorially selected collection of sources worth following. No sponsored placements."
                />
                <SearchBox query={query} setQuery={setQuery} />
                <div className="discover-grid">
                  {recommendations
                    .filter((r) =>
                      `${r.name} ${r.category}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((r) => (
                      <article key={r.name} className="discover-source">
                        <div className="source-emblem">
                          {r.kind === "github" ? (
                            <Github size={35} />
                          ) : (
                            <Rss size={35} />
                          )}
                        </div>
                        <span className="eyebrow accent">{r.category}</span>
                        <h2>{r.name}</h2>
                        <p>{r.description}</p>
                        <button
                          className="button quiet"
                          onClick={() => follow(r)}
                        >
                          <Plus size={15} /> Follow source
                        </button>
                      </article>
                    ))}
                </div>
              </>
            ) : view === "Bookmarks" ? (
              <>
                <PageTitle
                  kicker="WORTH KEEPING"
                  title="Hold that thought."
                  description="A personal collection of stories to come back to."
                />
                {!bookmarks.length ? (
                  <Empty
                    title="Some stories stay with you."
                    text="Use the bookmark beside a story to save it here."
                    action="Open the newspaper"
                    onClick={() => setReader(true)}
                  />
                ) : (
                  <div className="saved-grid">
                    {[
                      ...editions.flatMap((e) => e.articles),
                      ...sample.articles,
                    ]
                      .filter((s) => bookmarks.includes(s.id))
                      .map((s) => (
                        <Article
                          key={s.id}
                          story={s}
                          saved
                          onBookmark={toggleBookmark}
                        />
                      ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <PageTitle
                  kicker="MAKE YOURSELF AT HOME"
                  title="Your paper. Your way."
                  description="Small adjustments for a better daily ritual."
                />
                <section className="appearance-panel">
                  <div>
                    <h3>Set the mood.</h3>
                    <p>
                      Your theme follows you through the dashboard and
                      newspaper.
                    </p>
                  </div>
                  <ThemeControl />
                </section>
                <ServiceStatus />
                <PreferencesForm prefs={prefs} setPrefs={setPrefs} />
                <button className="button primary" onClick={savePreferences}>
                  Save preferences <Check size={16} />
                </button>
                <section className="settings-block">
                  <h3>Account & privacy</h3>
                  <p>
                    {user?.email ||
                      "Sign in to sync preferences and editions across your devices."}
                  </p>
                  <div className="inline-form">
                    <button
                      className="button quiet"
                      onClick={() => setAuth("Reset password")}
                    >
                      Reset password
                    </button>
                    <button
                      className="button quiet"
                      onClick={() =>
                        notify(
                          "Install Daybreak from your browser menu: Install app on Chrome/Edge, or Share → Add to Home Screen on iOS.",
                        )
                      }
                    >
                      Install Daybreak
                    </button>
                    {user && (
                      <button
                        className="button danger"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Permanently delete your account, sources, and all editions? This cannot be undone.",
                            )
                          )
                            return;
                          try {
                            await api("/api/me", { method: "DELETE" });
                            await supabase?.auth.signOut();
                            notify("Your account has been deleted.");
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        Delete account & data
                      </button>
                    )}
                  </div>
                </section>
              </>
            )}
            <footer className="app-footer">
              <span>
                Daybreak<span className="accent">.</span>{" "}
                <span className="footer-message">
                  A little less noise. A little more perspective.
                </span>
              </span>
              <button
                onClick={() =>
                  notify(
                    "Your editions are private. Source content is sent to your configured AI provider only during generation. Delete your account in Settings to remove stored data.",
                  )
                }
              >
                Privacy
              </button>
              <button
                onClick={() =>
                  notify(
                    "Daybreak links to original publishers. Summaries are for personal reading; verify important claims at the source. This is a development build, not a production news service.",
                  )
                }
              >
                About this edition
              </button>
              <a href="/welcome">About Daybreak</a>
            </footer>
          </main>
        </div>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {reader && (
        <Reader
          syncProgress={!!user && !edition.sample}
          edition={edition}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
          onClose={closeReader}
          onPdf={pdf}
        />
      )}
      {auth && <Auth mode={auth} setMode={setAuth} notify={notify} />}
      {onboard && (
        <div className="modal-backdrop">
          <ModalFrame title="The editor's desk" className="modal onboarding">
            <button
              className="modal-close"
              aria-label="Close onboarding"
              onClick={() => setOnboard(false)}
            >
              <X />
            </button>
            <span className="eyebrow accent">
              THE EDITOR’S DESK · {step + 1} OF 4
            </span>
            <h2>
              {
                [
                  "What opens your world?",
                  "Choose your trusted voices.",
                  "Find your reading rhythm.",
                  "Make it a morning ritual.",
                ][step]
              }
            </h2>
            <progress max={4} value={step + 1} />
            {step === 0 ? (
              <div className="topic-options">
                {topics.map((t) => (
                  <button
                    className={prefs.topics.includes(t) ? "selected" : ""}
                    key={t}
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        topics: prefs.topics.includes(t)
                          ? prefs.topics.filter((x) => x !== t)
                          : [...prefs.topics, t],
                      })
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : step === 1 ? (
              <>
                <SourceForm onAdd={follow} />
                <p>
                  {sources.length} sources connected. You can add more in
                  Following.
                </p>
              </>
            ) : (
              <PreferencesForm
                prefs={prefs}
                setPrefs={setPrefs}
                section={step === 2 ? "reading" : "delivery"}
              />
            )}
            <div className="modal-actions">
              <button disabled={step === 0} onClick={() => setStep(step - 1)}>
                Back
              </button>
              <button
                className="button primary"
                onClick={async () => {
                  if (step < 3) setStep(step + 1);
                  else if (await savePreferences()) {
                    setOnboard(false);
                    void generate();
                  }
                }}
              >
                {step === 3 ? "Create my first edition" : "Continue"}{" "}
                <ArrowRight size={16} />
              </button>
            </div>
          </ModalFrame>
        </div>
      )}
      <div className="print-edition">
        <h1>Daybreak</h1>
        <p>
          {edition.date} ·{" "}
          {edition.sample ? "Historical sample" : edition.title}
        </p>
        {edition.articles.map((s) => (
          <article key={s.id}>
            <h2>{s.headline}</h2>
            {s.image && <img src={s.image} alt={s.image_caption} />}
            <p>{s.summary}</p>
            <a href={s.url}>
              {s.source} — {s.url}
            </a>
          </article>
        ))}
      </div>
    </>
  );
}

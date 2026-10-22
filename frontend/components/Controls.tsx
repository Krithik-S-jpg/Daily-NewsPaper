"use client";
import { useState, useRef } from "react";
import { Sun, X, ArrowRight, Plus, Search, BookOpen, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useModalFocus } from "@/lib/modal-focus";
import type { Preferences, Source } from "@/lib/types";
export function ModalFrame({
  children,
  title,
  className,
}: {
  children: React.ReactNode;
  title: string;
  className: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useModalFocus(ref);
  return (
    <section
      ref={ref}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {children}
    </section>
  );
}
export function PageTitle({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow accent">{kicker}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function SearchBox({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (s: string) => void;
}) {
  return (
    <label className="search-box">
      <Search size={18} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search stories, sources, or dates"
        aria-label="Search stories, sources, or dates"
      />
    </label>
  );
}
export function Empty({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="empty">
      <BookOpen size={40} strokeWidth={1} />
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button primary" onClick={onClick}>
        {action}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
export function SourceForm({
  onAdd,
}: {
  onAdd: (s: Omit<Source, "id" | "enabled">) => void;
}) {
  return (
    <form
      className="source-form"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        onAdd({
          name: String(d.get("name")),
          kind: String(d.get("kind")),
          url: String(d.get("url")),
        });
      }}
    >
      <label>
        Source name
        <input
          name="name"
          required
          maxLength={80}
          placeholder="A trusted voice"
        />
      </label>
      <label>
        Source type
        <select name="kind">
          <option value="rss">RSS / Atom feed</option>
          <option value="github">GitHub repository</option>
          <option value="youtube">YouTube channel ID</option>
          <option value="reddit">Reddit community</option>
        </select>
      </label>
      <label>
        URL or identifier
        <input name="url" required placeholder="https://example.com/feed.xml" />
      </label>
      <button className="button primary">
        <Plus size={15} /> Add source
      </button>
    </form>
  );
}
export function PreferencesForm({
  prefs,
  setPrefs,
  section,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  section?: string;
}) {
  return (
    <>
      {section !== "delivery" && (
        <section className="settings-block">
          <h3>Reading preferences</h3>
          <div className="form-grid">
            <label>
              Reading length
              <select
                value={prefs.length}
                onChange={(e) => setPrefs({ ...prefs, length: e.target.value })}
              >
                {["Quick Brief", "Daily Edition", "Deep Read"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Editorial tone
              <select
                value={prefs.tone}
                onChange={(e) => setPrefs({ ...prefs, tone: e.target.value })}
              >
                {["Balanced", "Concise", "Analytical"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Language
              <select
                value={prefs.language}
                onChange={(e) =>
                  setPrefs({ ...prefs, language: e.target.value })
                }
              >
                <option>English</option>
              </select>
            </label>
            <label>
              Newspaper style
              <select
                value={prefs.theme}
                onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}
              >
                <option>Classic</option>
              </select>
            </label>
          </div>
        </section>
      )}
      {section !== "reading" && (
        <section className="settings-block">
          <h3>Delivery & schedule</h3>
          <div className="form-grid">
            <label>
              Your morning begins at
              <input
                type="time"
                value={prefs.time}
                onChange={(e) => setPrefs({ ...prefs, time: e.target.value })}
              />
            </label>
            <label>
              Timezone
              <input
                value={prefs.timezone}
                onChange={(e) =>
                  setPrefs({ ...prefs, timezone: e.target.value })
                }
                placeholder="Asia/Kolkata"
              />
            </label>
          </div>
          <div className="day-options">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <button
                key={d}
                className={prefs.days.includes(i) ? "selected" : ""}
                onClick={() =>
                  setPrefs({
                    ...prefs,
                    days: prefs.days.includes(i)
                      ? prefs.days.filter((x) => x !== i)
                      : [...prefs.days, i],
                  })
                }
              >
                {d}
              </button>
            ))}
          </div>
          <p className="muted">
            Deselect all days to pause automatic generation.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={prefs.email}
              onChange={(e) => setPrefs({ ...prefs, email: e.target.checked })}
            />
            <Mail size={17} /> Email me each edition
          </label>
          <label>
            Delivery format
            <select
              value={prefs.delivery_format}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  delivery_format: e.target
                    .value as Preferences["delivery_format"],
                })
              }
            >
              <option value="link">Private edition link</option>
              <option value="pdf">PDF attachment</option>
              <option value="both">PDF and private link</option>
            </select>
          </label>
        </section>
      )}
    </>
  );
}
export function Auth({
  mode,
  setMode,
  notify,
}: {
  mode: string;
  setMode: (m: string | null) => void;
  notify: (m: string) => void;
}) {
  const modal = useRef<HTMLElement>(null);
  useModalFocus(modal);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        ref={modal}
        role="dialog"
        aria-modal="true"
        aria-label={mode}
      >
        <button
          className="modal-close"
          aria-label="Close sign in"
          onClick={() => setMode(null)}
        >
          <X />
        </button>
        <Sun size={32} strokeWidth={1} />
        <h2>
          {mode === "Create account"
            ? "A better morning starts here."
            : mode === "Sign in"
              ? "Welcome to your reading room."
              : mode}
        </h2>
        <p>Your world, thoughtfully gathered.</p>
        {!supabase && (
          <div className="config-notice">
            Accounts aren’t connected yet. Configure the Supabase environment
            variables to enable secure sign-in. You can still explore the sample
            edition.
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supabase) return;
            setLoading(true);
            setError("");
            const d = new FormData(e.currentTarget);
            const email = String(d.get("email"));
            const password = String(d.get("password"));
            try {
              const result =
                mode === "Create account"
                  ? await supabase.auth.signUp({
                      email,
                      password,
                      options: { emailRedirectTo: location.origin },
                    })
                  : mode === "Reset password"
                    ? await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: location.origin,
                      })
                    : mode === "New password"
                      ? await supabase.auth.updateUser({ password })
                      : await supabase.auth.signInWithPassword({
                          email,
                          password,
                        });
              if (result.error) throw result.error;
              notify(
                mode === "Create account"
                  ? "Check your email to verify your account."
                  : mode === "Reset password"
                    ? "Check your email for a reset link."
                    : mode === "New password"
                      ? "Password updated."
                      : "Welcome back.",
              );
              setMode(null);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {mode !== "New password" && (
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
          )}
          {mode !== "Reset password" && (
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete={
                  mode === "Sign in" ? "current-password" : "new-password"
                }
                required
              />
            </label>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="button primary wide"
            disabled={!supabase || loading}
          >
            {loading ? "Please wait…" : mode}
            <ArrowRight size={16} />
          </button>
        </form>
        {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && (
          <button
            className="button quiet wide"
            disabled={!supabase || loading}
            onClick={async () => {
              if (!supabase) return;
              setLoading(true);
              const result = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: location.origin },
              });
              if (result.error) {
                setError(result.error.message);
                setLoading(false);
              }
            }}
          >
            Continue with Google
          </button>
        )}
        <div className="auth-links">
          <button
            onClick={() =>
              setMode(mode === "Sign in" ? "Create account" : "Sign in")
            }
          >
            {mode === "Sign in"
              ? "New here? Create an account"
              : "Already a reader? Sign in"}
          </button>
          <button onClick={() => setMode("Reset password")}>
            Forgot password?
          </button>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useRef } from "react";
import type { Story } from "@/lib/types";

/** Delegation also supports the page-turn library's cloned DOM. */
export function bindMediaPreviews(root: HTMLElement) {
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  const stop = (card: HTMLElement) => {
    clearTimeout(timers.get(card));
    timers.delete(card);
    card.dataset.playing = "false";
    card.dataset.videoReady = "false";
    const video = card.querySelector("video");
    video?.pause();
    card.querySelector("button")?.setAttribute("aria-pressed", "false");
    const label = card.querySelector("[data-preview-label]");
    if (label) label.textContent = card.dataset.idle || "Play preview";
  };
  const start = (card: HTMLElement) => {
    root
      .querySelectorAll<HTMLElement>('[data-media][data-playing="true"]')
      .forEach(stop);
    card.dataset.playing = "true";
    card.querySelector("button")?.setAttribute("aria-pressed", "true");
    const label = card.querySelector("[data-preview-label]");
    if (label) label.textContent = "Pause preview";
    const video = card.querySelector("video");
    if (video) {
      video.muted = true;
      if (!video.getAttribute("src")) video.src = video.dataset.src!;
      video.currentTime = 0;
      void video
        .play()
        .then(() => {
          if (card.dataset.playing === "true") card.dataset.videoReady = "true";
          else video.pause();
        })
        .catch(() => {
          if (card.dataset.playing !== "true") return;
          stop(card);
          if (label) label.textContent = "Preview unavailable · retry";
        });
    }
    timers.set(
      card,
      setTimeout(() => stop(card), 12000),
    );
  };
  const over = (e: Event) => {
    const pointer = e as PointerEvent;
    if (
      pointer.pointerType !== "mouse" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const card = (e.target as Element).closest<HTMLElement>("[data-media]");
    if (card && !card.contains(pointer.relatedTarget as Node)) start(card);
  };
  const out = (e: Event) => {
    const card = (e.target as Element).closest<HTMLElement>("[data-media]");
    if (card && !card.contains((e as PointerEvent).relatedTarget as Node))
      stop(card);
  };
  const click = (e: Event) => {
    const button = (e.target as Element).closest("[data-preview-toggle]");
    const card = button?.closest<HTMLElement>("[data-media]");
    if (card) {
      if (card.dataset.playing === "true") stop(card);
      else start(card);
    }
  };
  const stopAll = () =>
    root.querySelectorAll<HTMLElement>("[data-media]").forEach(stop);
  const hidden = () => {
    if (document.hidden) stopAll();
  };
  const brokenImage = (event: Event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.closest("figure")?.setAttribute("hidden", "");
    }
  };
  root.addEventListener("error", brokenImage, true);
  root.addEventListener("pointerover", over);
  root.addEventListener("pointerout", out);
  root.addEventListener("focusout", out);
  root.addEventListener("click", click);
  document.addEventListener("visibilitychange", hidden);
  return {
    stopAll,
    destroy: () => {
      stopAll();
      root.removeEventListener("pointerover", over);
      root.removeEventListener("pointerout", out);
      root.removeEventListener("focusout", out);
      root.removeEventListener("click", click);
      document.removeEventListener("visibilitychange", hidden);
      root.removeEventListener("error", brokenImage, true);
    },
  };
}

export default function MediaFigure({
  story,
}: {
  story: Pick<
    Story,
    "image" | "image_caption" | "headline" | "video" | "video_caption"
  >;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const binding = bindMediaPreviews(ref.current);
    return binding.destroy;
  }, []);
  const label = story.video ? "Play video preview" : "Animate image";
  return (
    <figure className="media-figure" ref={ref}>
      <div
        className="media-window"
        data-media
        data-playing="false"
        data-idle={label}
      >
        <img
          src={story.image}
          alt={story.image_caption || story.headline}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {story.video && (
          <video
            data-src={story.video}
            muted
            playsInline
            loop
            preload="none"
            aria-label={story.video_caption || "Silent visual preview"}
          />
        )}
        <span className="media-type">
          {story.video ? "MOTION STORY" : "LIVING PICTURE"}
        </span>
        <button
          type="button"
          data-preview-toggle
          aria-label={`${label}: ${story.headline}`}
          aria-pressed="false"
        >
          <span className="preview-play" aria-hidden="true">
            ▶
          </span>
          <span data-preview-label>{label}</span>
          <span className="preview-wave" aria-hidden="true">
            ▂▅▃▇
          </span>
        </button>
        <div className="preview-timeline" aria-hidden="true" />
      </div>
      <figcaption>
        {story.image_caption}
        {story.video_caption && (
          <span className="video-credit">{story.video_caption}</span>
        )}
      </figcaption>
    </figure>
  );
}

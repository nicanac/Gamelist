"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Flip, gsap, useGSAP } from "@/lib/gsap";
import {
  difficultyLevel,
  DIFFICULTY_LEVELS,
  formatDate,
  formatHours,
  metacriticTone,
  TONE_STYLE,
} from "@/lib/format";
import type { EditMode } from "@/lib/edit-access";
import { FAMILY_LABEL, platformMeta } from "@/lib/platforms";
import { ratingOutOf20 } from "@/lib/review";
import type { Game, PlayModes } from "@/lib/types";
import { SERIES_ACCENT } from "./charts";
import { StatusDot } from "./game-card";
import { GameCover } from "./game-cover";
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  GamepadIcon,
  GlobeIcon,
  NetworkIcon,
  SwordsIcon,
  UsersIcon,
} from "./icons";
import { ReviewForm } from "./review-form";
import { useLenisRef } from "./smooth-scroll";

interface GameModalProps {
  game: Game | null;
  /** Whether status, rating and feedback can be saved back to Notion. */
  editMode: EditMode;
  /** Position within the currently filtered collection, when the game is in it. */
  position: { index: number; total: number } | null;
  /** Element the cover flies from (and back to). */
  sourceRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}

export function GameModal(props: GameModalProps) {
  return props.game ? <ModalShell {...props} game={props.game} /> : null;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function isOnScreen(element: HTMLElement | null): element is HTMLElement {
  if (!element?.isConnected) return false;
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth;
}

function ModalShell({ game, editMode, position, sourceRef, onClose, onStep }: GameModalProps & { game: Game }) {
  const root = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const hiddenSource = useRef<HTMLElement | null>(null);
  const closing = useRef(false);
  const lenisRef = useLenisRef();
  const [firstGameId] = useState(game.id);

  // Scroll lock and focus handling for the lifetime of the dialog.
  useEffect(() => {
    const restoreFocus = document.activeElement as HTMLElement | null;
    const lenis = lenisRef.current;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    lenis?.stop();
    html.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      lenis?.start();
      html.style.overflow = overflow;
      if (hiddenSource.current) hiddenSource.current.style.visibility = "";
      restoreFocus?.focus({ preventScroll: true });
    };
  }, [lenisRef]);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const source = sourceRef.current;
      const timeline = gsap.timeline();
      timeline
        .from("[data-modal-backdrop]", { autoAlpha: 0, duration: 0.6, ease: "power2.out" }, 0)
        .from("[data-modal-surface]", { autoAlpha: 0, y: 40, scale: 0.98, duration: 1, ease: "expo.out" }, 0.12);
      if (isOnScreen(source) && cover.current) {
        const from = Flip.fit(cover.current, source, { scale: true, getVars: true }) as gsap.TweenVars;
        timeline.from(cover.current, { ...from, duration: 1, ease: "expo.inOut" }, 0);
        source.style.visibility = "hidden";
        hiddenSource.current = source;
      } else {
        timeline.from(cover.current, { autoAlpha: 0, y: 50, scale: 0.94, duration: 1, ease: "expo.out" }, 0.15);
      }
    },
    { scope: root },
  );

  // Moving to another game: un-hide the card we flew out of; closing returns to the new game's card.
  useEffect(() => {
    if (game.id === firstGameId || !hiddenSource.current) return;
    hiddenSource.current.style.visibility = "";
    hiddenSource.current = null;
  }, [game.id, firstGameId]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (reducedMotion()) {
      onClose();
      return;
    }
    const source = sourceRef.current;
    const timeline = gsap.timeline({ onComplete: onClose });
    timeline
      .to("[data-reveal-item]", { autoAlpha: 0, y: 14, duration: 0.25, stagger: 0.012, ease: "power2.in" }, 0)
      .to("[data-modal-surface]", { autoAlpha: 0, scale: 0.98, duration: 0.45, ease: "power2.in" }, 0.05);
    if (isOnScreen(source) && cover.current) {
      timeline.add(Flip.fit(cover.current, source, { scale: true, duration: 0.85, ease: "expo.inOut" }) as gsap.core.Tween, 0);
      timeline.to("[data-modal-backdrop]", { autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, 0.35);
    } else {
      timeline.to(cover.current, { autoAlpha: 0, y: 30, duration: 0.4, ease: "power2.in" }, 0);
      timeline.to("[data-modal-backdrop]", { autoAlpha: 0, duration: 0.45, ease: "power2.inOut" }, 0.1);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if ((event.target as HTMLElement).closest("input, textarea, select")) return;
      event.preventDefault();
      onStep(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Tab") {
      const focusable = root.current!.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-dialog-title"
      className="fixed inset-0 z-[60]"
      onKeyDown={onKeyDown}
    >
      <div data-modal-backdrop className="absolute inset-0 bg-[rgb(5_5_8/0.8)] backdrop-blur-xl" />
      <div
        data-lenis-prevent
        className="absolute inset-0 overflow-y-auto overscroll-contain"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="relative mx-auto my-[max(12px,5vh)] w-[min(1180px,calc(100vw-24px))]">
          <div
            data-modal-surface
            className="absolute inset-0 overflow-hidden rounded-[32px] border border-line bg-surface/85 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.95)]"
          >
            <div className="absolute inset-[-25%] opacity-35 blur-[90px] saturate-150" aria-hidden="true">
              <GameCover key={game.id} game={game} className="h-full w-full" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/40 to-surface" />
          </div>

          <div className="relative grid gap-8 p-5 pt-16 sm:p-8 sm:pt-16 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-12 md:p-12">
            <ModalBody
              key={game.id}
              game={game}
              editMode={editMode}
              coverRef={cover}
              position={position}
              onStep={onStep}
              delay={game.id === firstGameId ? 0.35 : 0}
              animateCover={game.id !== firstGameId}
            />
          </div>

          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="Close"
            className="glass absolute top-4 right-4 z-10 grid h-11 w-11 place-items-center rounded-full text-ink transition-colors hover:bg-white/15"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

const MODES: { key: keyof PlayModes; label: string; icon: ReactNode }[] = [
  { key: "solo", label: "Single player", icon: <GamepadIcon size={16} /> },
  { key: "localCoop", label: "Local co-op", icon: <UsersIcon size={16} /> },
  { key: "localVersus", label: "Local versus", icon: <SwordsIcon size={16} /> },
  { key: "onlineCoop", label: "Online co-op", icon: <GlobeIcon size={16} /> },
  { key: "onlineVersus", label: "Online versus", icon: <SwordsIcon size={16} /> },
  { key: "lan", label: "LAN", icon: <NetworkIcon size={16} /> },
];

function ModalBody({
  game,
  editMode,
  coverRef,
  position,
  onStep,
  delay,
  animateCover,
}: {
  game: Game;
  editMode: EditMode;
  coverRef: RefObject<HTMLDivElement | null>;
  position: GameModalProps["position"];
  onStep: GameModalProps["onStep"];
  delay: number;
  animateCover: boolean;
}) {
  const body = useRef<HTMLDivElement>(null);
  const platform = platformMeta(game.platform);
  const level = difficultyLevel(game.difficulty);
  const modes = MODES.filter((mode) => game.modes[mode.key]);
  const studios = game.developers.join(", ");
  const publishers = game.publishers.filter((publisher) => !game.developers.includes(publisher)).join(", ");
  const released = formatDate(game.releaseDate);
  const rating = ratingOutOf20(game.rating);
  // When editing is on, the feedback lives in the form instead of a notes card.
  const notes = editMode === "off" ? game.notes : null;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-reveal-item]", { autoAlpha: 0, y: 28, duration: 1, stagger: 0.06, delay, ease: "expo.out" });
        if (animateCover) {
          gsap.from(coverRef.current, { autoAlpha: 0, scale: 0.95, duration: 0.8, ease: "expo.out" });
        }
      });
      return () => mm.revert();
    },
    { scope: body },
  );

  return (
    <div ref={body} className="contents">
      <div className="md:sticky md:top-12 md:self-start">
        <div ref={coverRef} className="overflow-hidden rounded-[24px] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]">
          <GameCover game={game} eager alt={`${game.name} cover art`} />
        </div>
        <a
          data-reveal-item
          href={game.notionUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-black/20 px-4 py-3 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          Open this page in Notion
          <ArrowUpRightIcon size={16} />
        </a>
      </div>

      <div className="min-w-0">
        <div data-reveal-item className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="rounded-full border border-line bg-black/20 px-3 py-1.5 text-ink-2">
            {platform.short}
            {platform.family !== "other" && <span className="text-muted"> · {FAMILY_LABEL[platform.family]}</span>}
          </span>
          <span className="rounded-full border border-line bg-black/20 px-3 py-1.5 text-ink-2">
            <StatusDot game={game} />
          </span>
          {game.franchises[0] && (
            <span className="rounded-full border border-line bg-black/20 px-3 py-1.5 text-ink-2">{game.franchises[0]}</span>
          )}
        </div>

        <h2
          id="game-dialog-title"
          data-reveal-item
          className="mt-6 font-display text-[clamp(30px,4.4vw,60px)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance uppercase"
        >
          {game.name}
        </h2>

        {(studios || released) && (
          <p data-reveal-item className="mt-4 text-[15px] leading-relaxed text-ink-2">
            {studios && <>By {studios}</>}
            {publishers && <span className="text-muted"> · published by {publishers}</span>}
            {released && <span className="text-muted"> · {released}</span>}
          </p>
        )}

        <div data-reveal-item className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {game.metacritic != null ? (
            <ScoreRing
              value={game.metacritic}
              color={TONE_STYLE[metacriticTone(game.metacritic)].fill}
              label="Metacritic"
              caption={TONE_STYLE[metacriticTone(game.metacritic)].label}
            />
          ) : (
            <Fact label="Metacritic" value="—" caption="No critic score" />
          )}
          {rating != null && (
            <ScoreRing value={rating} max={20} color={SERIES_ACCENT} label="My rating" caption="Out of 20" />
          )}
          <Fact
            label="Main story"
            value={formatHours(game.hltbHours) ?? "—"}
            caption="HowLongToBeat"
            icon={<ClockIcon size={16} />}
          />
          <div className="rounded-2xl border border-line bg-black/20 p-4">
            <p className="text-[13px] text-ink-2">Difficulty</p>
            <div className="mt-3 flex gap-1" aria-hidden="true">
              {DIFFICULTY_LEVELS.map((name, index) => (
                <span
                  key={name}
                  className={`h-2 flex-1 rounded-full ${index <= level ? "bg-ink" : "bg-white/10"}`}
                />
              ))}
            </div>
            <p className="mt-3 text-lg leading-tight font-semibold text-ink">{game.difficulty ?? "—"}</p>
          </div>
        </div>

        {modes.length > 0 && (
          <div data-reveal-item className="mt-6 flex flex-wrap gap-2">
            {modes.map((mode) => (
              <span
                key={mode.key}
                className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2"
              >
                {mode.icon}
                {mode.label}
              </span>
            ))}
            {game.maxPlayers && (
              <span className="inline-flex items-center rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2">
                Up to {game.maxPlayers} players
              </span>
            )}
          </div>
        )}

        {editMode !== "off" && <ReviewForm game={game} mode={editMode} />}

        {game.description && (
          <p data-reveal-item className="mt-8 text-[16px] leading-[1.75] whitespace-pre-line text-ink-2">
            {game.description}
          </p>
        )}

        {game.summary && (
          <div data-reveal-item className="mt-6 rounded-2xl border border-line bg-black/20 p-5">
            <p className="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">In short</p>
            <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line text-ink-2">{game.summary}</p>
          </div>
        )}

        {(notes || game.dlc) && (
          <div data-reveal-item className="mt-4 grid gap-3 sm:grid-cols-2">
            {notes && <Note title="Notes" text={notes} />}
            {game.dlc && <Note title="DLC" text={game.dlc} />}
          </div>
        )}

        <div data-reveal-item className="mt-8 flex flex-wrap gap-2">
          {[...game.genres, ...game.labels.filter((label) => !game.genres.includes(label))].map((tag) => (
            <span key={tag} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] text-ink-2">
              {tag}
            </span>
          ))}
        </div>

        {position && (
          <nav
            data-reveal-item
            aria-label="Browse games"
            className="mt-10 flex items-center justify-between border-t border-line pt-6"
          >
            <button
              type="button"
              onClick={() => onStep(-1)}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              <ChevronLeftIcon size={16} /> Previous
            </button>
            <span className="font-mono text-xs text-muted tabular-nums">
              {position.index + 1} / {position.total}
            </span>
            <button
              type="button"
              onClick={() => onStep(1)}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Next <ChevronRightIcon size={16} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value, caption, icon }: { label: string; value: string; caption: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-black/20 p-4">
      <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
        {icon}
        {label}
      </p>
      <p className="mt-3 text-2xl leading-none font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs text-muted">{caption}</p>
    </div>
  );
}

function Note({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-black/20 p-5">
      <p className="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">{title}</p>
      <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line text-ink-2">{text}</p>
    </div>
  );
}

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({
  value,
  max = 100,
  color,
  label,
  caption,
}: {
  value: number;
  max?: number;
  color: string;
  label: string;
  caption: string;
}) {
  const ring = useRef<SVGCircleElement>(null);
  const offset = CIRCUMFERENCE * (1 - Math.min(max, value) / max);

  // Re-runs when the value changes (a saved rating), reverting the previous tween's inline offset.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ring.current,
          { strokeDashoffset: CIRCUMFERENCE },
          { strokeDashoffset: offset, duration: 1.8, delay: 0.45, ease: "expo.out" },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [offset] },
  );

  return (
    <div className="rounded-2xl border border-line bg-black/20 p-4">
      <p className="text-[13px] text-ink-2">{label}</p>
      <div className="mt-2.5 flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="5" />
            <circle
              ref={ring}
              cx="32"
              cy="32"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold text-ink">{value}</span>
        </div>
        <p className="text-xs text-muted">{caption}</p>
      </div>
    </div>
  );
}

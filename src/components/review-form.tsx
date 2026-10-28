"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { saveReview } from "@/app/actions";
import type { EditMode } from "@/lib/edit-access";
import { parseReview, ratingOutOf20 } from "@/lib/review";
import { STATUS_ORDER } from "@/lib/status";
import { cleanText } from "@/lib/text";
import type { Game, GameStatus } from "@/lib/types";

type Message = { tone: "saved" | "error"; text: string } | null;

/**
 * Status, rating out of 20 and feedback for one game, saved to its Notion
 * page. Only the fields that changed are sent, so edits made in Notion to
 * the others are kept.
 */
export function ReviewForm({ game, mode }: { game: Game; mode: Exclude<EditMode, "off"> }) {
  const ids = useId();
  const savedRating = ratingOutOf20(game.rating);
  const [status, setStatus] = useState<GameStatus>(game.status);
  // 0 on the slider means "not rated".
  const [rating, setRating] = useState(savedRating ?? 0);
  const [notes, setNotes] = useState(game.notes ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const changes: Record<string, unknown> = {};
  if (status !== game.status) changes.status = status;
  if ((rating || null) !== savedRating) changes.rating = rating || null;
  if ((cleanText(notes) ?? "") !== (game.notes ?? "")) changes.notes = notes;
  const dirty = Object.keys(changes).length > 0;

  const edit = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setMessage(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseReview({ id: game.id, ...changes });
    if (!parsed.ok) {
      setMessage({ tone: "error", text: parsed.error });
      return;
    }
    startTransition(async () => {
      const result = await saveReview(parsed.review, mode === "password" ? password : undefined);
      setMessage(result.ok ? { tone: "saved", text: "Saved to Notion." } : { tone: "error", text: result.error });
    });
  };

  const hint = pending ? "Saving to Notion…" : (message?.text ?? (dirty ? "Unsaved changes" : ""));

  return (
    <form
      data-reveal-item
      onSubmit={submit}
      aria-labelledby={`${ids}-title`}
      className="mt-6 rounded-2xl border border-line bg-black/20 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${ids}-title`} className="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">
          My take
        </h3>
        <p className="text-xs text-muted">Saved to your Notion Game List</p>
      </div>

      <fieldset className="mt-4">
        <legend className="text-[13px] text-ink-2">Status</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_ORDER.map((meta) => (
            <label key={meta.status} className="cursor-pointer">
              <input
                type="radio"
                name={`${ids}-status`}
                value={meta.status}
                checked={status === meta.status}
                onChange={() => edit(setStatus)(meta.status)}
                className="peer sr-only"
              />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2 transition-colors peer-checked:border-line-strong peer-checked:bg-white/10 peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-soft hover:border-line-strong hover:text-ink">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                {meta.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${ids}-rating`} className="text-[13px] text-ink-2">
            My rating
          </label>
          <output htmlFor={`${ids}-rating`} className="text-2xl leading-none font-semibold text-ink tabular-nums">
            {rating ? (
              <>
                {rating}
                <span className="text-sm font-normal text-muted"> / 20</span>
              </>
            ) : (
              <span className="text-sm font-normal text-muted">Not rated</span>
            )}
          </output>
        </div>
        <input
          id={`${ids}-rating`}
          type="range"
          min={0}
          max={20}
          step={0.5}
          value={rating}
          onChange={(event) => edit(setRating)(Number(event.target.value))}
          aria-valuetext={rating ? `${rating} out of 20` : "Not rated"}
          className="mt-3 w-full cursor-pointer accent-accent"
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-muted" aria-hidden="true">
          <span>Not rated</span>
          <span>10</span>
          <span>20</span>
        </div>
      </div>

      <label htmlFor={`${ids}-notes`} className="mt-6 block text-[13px] text-ink-2">
        My feedback
      </label>
      <textarea
        id={`${ids}-notes`}
        rows={5}
        maxLength={10_000}
        value={notes}
        onChange={(event) => edit(setNotes)(event.target.value)}
        placeholder="What stood out, what didn't, would you play it again?"
        className="mt-2 w-full resize-y rounded-xl border border-line bg-black/30 px-4 py-3 text-[14px] leading-relaxed text-ink placeholder:text-muted hover:border-line-strong"
      />

      {mode === "password" && (
        <>
          <label htmlFor={`${ids}-password`} className="mt-4 block text-[13px] text-ink-2">
            Edit password
          </label>
          <input
            id={`${ids}-password`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => edit(setPassword)(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-black/30 px-4 py-2.5 text-[14px] text-ink hover:border-line-strong"
          />
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          className={`text-[13px] ${message?.tone === "error" && !pending ? "text-[#ff9b9b]" : "text-ink-2"}`}
        >
          {hint}
        </p>
        <button
          type="submit"
          disabled={!dirty || pending}
          className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-bg transition-opacity hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save to Notion
        </button>
      </div>
    </form>
  );
}

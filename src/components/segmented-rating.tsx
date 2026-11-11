"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { getRatingTier } from "@/lib/rating-tiers";

interface SegmentedRatingProps {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

const STEPS = Array.from({ length: 20 }, (_, i) => i + 1);

/**
 * Tactile 20-pip segmented rating selector (Option 1), echoing the Difficulty
 * bar and Metacritic palette. Supports hover preview, click-to-toggle `null`,
 * explicit Clear, and arrow/Delete keyboard controls.
 */
export function SegmentedRating({ id, value, onChange }: SegmentedRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const activeValue = hoverRating ?? value;
  const tier = getRatingTier(activeValue);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      const base = value ?? 0;
      onChange(Math.min(20, Math.round(base) + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      if (value === null || value <= 1) onChange(null);
      else onChange(Math.max(1, Math.round(value) - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(1);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(20);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onChange(null);
    }
  };

  return (
    <div
      className="mt-5 rounded-xl border border-line bg-black/25 px-4 py-3.5 select-none"
      style={{ "--tier-color": tier.color } as CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span id={id} className="text-[13px] text-ink-2">
            My rating
          </span>
          <span
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors duration-150"
            style={{
              color: tier.color,
              backgroundColor: "color-mix(in srgb, var(--tier-color) 16%, transparent)",
              borderColor: "color-mix(in srgb, var(--tier-color) 35%, transparent)",
            }}
          >
            {tier.label}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {value !== null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Reset to Not rated"
              className="rounded-md px-2 py-0.5 text-xs text-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              Clear
            </button>
          )}
          <output aria-live="polite" className="flex items-baseline gap-1 font-sans tabular-nums">
            <strong
              className="text-2xl leading-none font-bold transition-colors duration-150"
              style={{ color: activeValue !== null ? tier.color : "var(--color-muted)" }}
            >
              {activeValue !== null ? activeValue : "—"}
            </strong>
            <span className="text-xs text-muted">/ 20</span>
          </output>
        </div>
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-labelledby={id}
        aria-valuemin={1}
        aria-valuemax={20}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value !== null ? `${value} out of 20 (${getRatingTier(value).label})` : "Not rated"}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHoverRating(null)}
        className="mt-3 grid h-6 grid-cols-[repeat(20,minmax(0,1fr))] items-center gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-soft sm:gap-1.5"
      >
        {STEPS.map((step) => {
          const filled = activeValue !== null && step <= activeValue;
          const current = activeValue !== null && Math.round(activeValue) === step;
          const milestone = step % 5 === 0;
          const heightClass = current ? "h-5 scale-y-105" : milestone ? "h-3.5" : "h-2.5";

          return (
            <button
              key={step}
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setHoverRating(step)}
              onClick={() => onChange(step === value ? null : step)}
              aria-label={`Rate ${step} out of 20`}
              className={`w-full cursor-pointer rounded-[3px] transition-all duration-150 hover:h-5 hover:scale-y-105 ${heightClass}`}
              style={
                filled
                  ? {
                      backgroundColor: "var(--tier-color)",
                      boxShadow: "0 0 8px color-mix(in srgb, var(--tier-color) 35%, transparent)",
                    }
                  : { backgroundColor: "rgb(255 255 255 / 0.1)" }
              }
            />
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-muted tabular-nums" aria-hidden="true">
        <span>Not rated</span>
        <span>5</span>
        <span>10</span>
        <span>15</span>
        <span>20</span>
      </div>
    </div>
  );
}

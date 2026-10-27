"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_FILTERS, isFiltered, SORT_OPTIONS, type GameFilters, type SortKey } from "@/lib/filters";
import { STATUS_ORDER } from "@/lib/status";
import type { GameStatus } from "@/lib/types";
import { CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon } from "./icons";

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

interface FilterBarProps {
  filters: GameFilters;
  onChange: (filters: GameFilters) => void;
  statusCounts: Record<GameStatus, number>;
  platformOptions: FacetOption[];
  genreOptions: FacetOption[];
  total: number;
}

/** Popover anchored to a toggle button; closes on outside press and Escape. */
function Dropdown({ label, active, children }: { label: ReactNode; active: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition-colors ${
          active ? "border-accent/60 bg-accent/15 text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
        }`}
      >
        {label}
        <ChevronDownIcon size={15} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          data-lenis-prevent
          className="absolute top-[calc(100%+8px)] left-0 z-40 max-h-[min(420px,60vh)] w-64 overflow-y-auto rounded-2xl border border-line-strong bg-elevated/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function OptionRow({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
    >
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border ${
          selected ? "border-accent bg-accent text-bg" : "border-line-strong"
        }`}
      >
        {selected && <CheckIcon size={11} />}
      </span>
      {children}
    </button>
  );
}

export function FilterBar({ filters, onChange, statusCounts, platformOptions, genreOptions, total }: FilterBarProps) {
  const [query, setQuery] = useState(filters.query);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef({ filters, onChange });

  useEffect(() => {
    latest.current = { filters, onChange };
  });

  // Debounce typing so each keystroke does not restart the grid animation.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = latest.current.filters;
      if (current.query !== query) latest.current.onChange({ ...current, query });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  // "/" focuses search, like most catalog sites.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || target.closest("input, textarea, [contenteditable]")) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const platformLabel = filters.platforms.length
    ? filters.platforms.length === 1
      ? (platformOptions.find((option) => option.value === filters.platforms[0])?.label ?? "1 platform")
      : `${filters.platforms.length} platforms`
    : "Platform";

  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-[26px] p-3">
      <label className="relative order-1 flex h-10 w-full min-w-[220px] items-center sm:w-auto sm:flex-1">
        <span className="sr-only">Search games</span>
        <SearchIcon size={17} className="pointer-events-none absolute left-4 text-muted" />
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${total} games, studios, tags…`}
          className="h-full w-full rounded-full border border-line bg-black/20 pr-12 pl-11 text-[14px] text-ink placeholder:text-muted focus:border-accent/60 focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-3 hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-muted sm:block">
          /
        </kbd>
      </label>

      <div
        className="scrollbar-none order-3 -mx-1 flex w-full gap-2 overflow-x-auto px-1"
        role="group"
        aria-label="Filter by status"
      >
        {STATUS_ORDER.map((meta) => {
          const active = filters.statuses.includes(meta.status);
          return (
            <button
              key={meta.status}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...filters, statuses: toggle(filters.statuses, meta.status) })}
              title={meta.hint}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors ${
                active ? "border-white/30 bg-white/12 text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
              {meta.label}
              <span className="text-muted tabular-nums">{statusCounts[meta.status]}</span>
            </button>
          );
        })}
      </div>

      <div className="order-2 flex flex-wrap items-center gap-2">
        <Dropdown label={platformLabel} active={filters.platforms.length > 0}>
          <div role="group" aria-label="Platforms">
            {platformOptions.map((option) => (
              <OptionRow
                key={option.value}
                selected={filters.platforms.includes(option.value)}
                onSelect={() => onChange({ ...filters, platforms: toggle(filters.platforms, option.value) })}
              >
                <span className="flex-1 truncate">{option.label}</span>
                <span className="text-muted tabular-nums">{option.count}</span>
              </OptionRow>
            ))}
          </div>
        </Dropdown>

        <Dropdown label={filters.genre ?? "Genre"} active={filters.genre != null}>
          <div role="group" aria-label="Genres">
            {genreOptions.map((option) => (
              <OptionRow
                key={option.value}
                selected={filters.genre === option.value}
                onSelect={() =>
                  onChange({ ...filters, genre: filters.genre === option.value ? null : option.value })
                }
              >
                <span className="flex-1 truncate">{option.label}</span>
                <span className="text-muted tabular-nums">{option.count}</span>
              </OptionRow>
            ))}
          </div>
        </Dropdown>

        <label className="relative">
          <span className="sr-only">Sort by</span>
          <select
            value={filters.sort}
            onChange={(event) => onChange({ ...filters, sort: event.target.value as SortKey })}
            className="h-10 appearance-none rounded-full border border-line bg-transparent pr-10 pl-4 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key} className="bg-elevated">
                Sort: {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={15} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" />
        </label>

        {isFiltered(filters) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange({ ...DEFAULT_FILTERS, sort: filters.sort });
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] text-muted transition-colors hover:text-ink"
          >
            <CloseIcon size={14} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

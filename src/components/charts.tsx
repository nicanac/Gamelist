"use client";

import { useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { ChartIcon, TableIcon } from "./icons";

/* Chart chrome (dark mode), per the dataviz reference palette. */
export const SERIES_ACCENT = "#9085e9";
const GRID = "rgb(255 255 255 / 0.07)";
const BASELINE = "rgb(255 255 255 / 0.18)";

// ------------------------------------------------------------------ tooltip

interface TipData {
  value: string;
  label: string;
  color: string;
}

interface TipState extends TipData {
  x: number;
  y: number;
}

/** One tooltip per chart card, positioned over the hovered or focused mark. */
function useChartTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);

  const show = (element: Element, data: TipData) => {
    const box = element.closest("[data-chart]")?.getBoundingClientRect();
    if (!box) return;
    const mark = element.getBoundingClientRect();
    setTip({ ...data, x: mark.left + mark.width / 2 - box.left, y: mark.top - box.top });
  };
  const hide = () => setTip(null);

  const bind = (data: TipData) => ({
    role: "img",
    tabIndex: 0,
    "aria-label": `${data.label}: ${data.value}`,
    onPointerEnter: (event: PointerEvent<Element>) => show(event.currentTarget, data),
    onPointerLeave: hide,
    onFocus: (event: FocusEvent<Element>) => show(event.currentTarget, data),
    onBlur: hide,
  });

  const element = tip && (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-line-strong bg-elevated/95 px-3 py-2 shadow-xl backdrop-blur-md"
      style={{ left: tip.x, top: tip.y }}
    >
      <div className="text-[15px] leading-tight font-semibold text-ink">{tip.value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs whitespace-nowrap text-ink-2">
        <span className="h-0.5 w-3 rounded-full" style={{ background: tip.color }} />
        {tip.label}
      </div>
    </div>
  );

  return { bind, element };
}

// --------------------------------------------------------------- chart card

interface Column {
  label: string;
  align?: "left" | "right";
}

interface ChartCardProps {
  title: string;
  caption?: ReactNode;
  className?: string;
  table: { columns: Column[]; rows: (string | number)[][] };
  children: (tooltip: ReturnType<typeof useChartTooltip>) => ReactNode;
}

/** Figure with a title, caption, a chart/table toggle and a reveal-on-scroll for its marks. */
export function ChartCard({ title, caption, className = "", table, children }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const container = useRef<HTMLElement>(null);
  const tooltip = useChartTooltip();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const marks = gsap.utils.toArray<HTMLElement>("[data-mark]", container.current);
        if (!marks.length) return;
        gsap.set(marks, { clipPath: (_, el: HTMLElement) => hiddenClip(el.dataset.mark) });
        gsap.to(marks, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.2,
          ease: "expo.out",
          stagger: { amount: 0.6 },
          scrollTrigger: { trigger: container.current, start: "top 82%", once: true },
          clearProps: "clipPath",
        });
      });
      return () => mm.revert();
    },
    { scope: container, dependencies: [showTable], revertOnUpdate: true },
  );

  return (
    <figure
      ref={container}
      data-chart
      className={`relative flex flex-col rounded-[28px] border border-line bg-surface/80 p-6 md:p-7 ${className}`}
    >
      <figcaption className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {caption && <p className="mt-1 text-[13px] leading-relaxed text-muted">{caption}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          aria-pressed={showTable}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          {showTable ? <ChartIcon size={14} /> : <TableIcon size={14} />}
          {showTable ? "Chart" : "Table"}
        </button>
      </figcaption>
      {showTable ? <DataTable title={title} {...table} /> : children(tooltip)}
      {!showTable && tooltip.element}
    </figure>
  );
}

function hiddenClip(kind: string | undefined) {
  if (kind === "column") return "inset(100% 0% 0% 0%)";
  return "inset(0% 100% 0% 0%)";
}

function DataTable({ title, columns, rows }: { title: string; columns: Column[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-xl border border-line" data-lenis-prevent>
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">{title}</caption>
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={`px-4 py-2.5 font-medium text-muted ${column.align === "right" ? "text-right" : ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-t border-line">
              {row.map((cell, index) => (
                <td
                  key={index}
                  className={`px-4 py-2 text-ink-2 ${columns[index]?.align === "right" ? "text-right tabular-nums" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------ stacked bar

export interface Segment {
  key: string;
  label: string;
  count: number;
  color: string;
}

/** 100% stacked bar with a 2px surface gap between segments and a legend carrying the counts. */
export function StackedBar({
  segments,
  total,
  tooltip,
}: {
  segments: Segment[];
  total: number;
  tooltip: ReturnType<typeof useChartTooltip>;
}) {
  const visible = segments.filter((segment) => segment.count > 0);
  return (
    <div>
      <div data-mark className="flex h-6 gap-[2px] overflow-hidden rounded-[6px]">
        {visible.map((segment) => (
          <div
            key={segment.key}
            {...tooltip.bind({
              value: `${segment.count} · ${Math.round((segment.count / total) * 100)}%`,
              label: segment.label,
              color: segment.color,
            })}
            className="h-full transition-[filter] outline-none hover:brightness-125 focus-visible:brightness-125"
            style={{ flexGrow: segment.count, flexBasis: 0, background: segment.color }}
          />
        ))}
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-start gap-2.5">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: segment.color }} />
            <span className="min-w-0">
              <span className="block text-[13px] text-ink-2">{segment.label}</span>
              <span className="block text-lg font-semibold text-ink">
                {segment.count}
                <span className="ml-1.5 text-xs font-normal text-muted">
                  {Math.round((segment.count / total) * 100)}%
                </span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --------------------------------------------------------------- bar list

export interface BarDatum {
  label: string;
  value: number;
  hint?: string;
}

/** Horizontal single-series bars: label above, value at the tip. */
export function BarList({
  data,
  tooltip,
  unit,
}: {
  data: BarDatum[];
  tooltip: ReturnType<typeof useChartTooltip>;
  unit: string;
}) {
  const max = Math.max(1, ...data.map((datum) => datum.value));
  return (
    <ul className="space-y-3.5">
      {data.map((datum) => (
        <li key={datum.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-ink-2" title={datum.hint ?? datum.label}>
              {datum.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3.5 flex-1">
              <div
                data-mark
                {...tooltip.bind({
                  value: `${datum.value} ${datum.value === 1 ? unit : `${unit}s`}`,
                  label: datum.hint ?? datum.label,
                  color: SERIES_ACCENT,
                })}
                className="h-full rounded-r-[4px] transition-[filter] outline-none hover:brightness-125 focus-visible:brightness-125"
                style={{ width: `${(datum.value / max) * 100}%`, background: SERIES_ACCENT }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[13px] font-semibold text-ink tabular-nums">
              {datum.value}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------- year columns

/** Release years as columns on one baseline, with decade ticks and hairline gridlines. */
export function YearColumns({
  data,
  tooltip,
}: {
  data: { year: number; count: number }[];
  tooltip: ReturnType<typeof useChartTooltip>;
}) {
  const max = Math.max(1, ...data.map((datum) => datum.count));
  const step = max > 12 ? 5 : max > 6 ? 2 : 1;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, index) => index * step);

  return (
    <div className="flex gap-3">
      <div className="relative h-52 w-6 shrink-0 text-right text-[11px] text-muted tabular-nums" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(tick / top) * 100}%` }}>
            {tick}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-52">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 h-px"
              style={{ bottom: `${(tick / top) * 100}%`, background: tick === 0 ? BASELINE : GRID }}
              aria-hidden="true"
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((datum) => (
              <div key={datum.year} className="flex h-full flex-1 items-end justify-center">
                {datum.count > 0 && (
                  <div
                    data-mark="column"
                    {...tooltip.bind({
                      value: `${datum.count} ${datum.count === 1 ? "game" : "games"}`,
                      label: `Released in ${datum.year}`,
                      color: SERIES_ACCENT,
                    })}
                    className="w-full max-w-6 rounded-t-[4px] transition-[filter] outline-none hover:brightness-125 focus-visible:brightness-125"
                    style={{ height: `${(datum.count / top) * 100}%`, background: SERIES_ACCENT }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-2 h-4 text-[11px] text-muted tabular-nums" aria-hidden="true">
          {data.map((datum, index) =>
            datum.year % 10 === 0 ? (
              <span
                key={datum.year}
                className="absolute -translate-x-1/2"
                style={{ left: `${((index + 0.5) / data.length) * 100}%` }}
              >
                {datum.year}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

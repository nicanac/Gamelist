"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatPercent } from "@/lib/format";
import { STATUS_ORDER } from "@/lib/status";
import type { LibraryStats } from "@/lib/stats";
import { BarList, ChartCard, StackedBar, YearColumns, type BarDatum } from "./charts";

function StatTile({
  label,
  value,
  decimals = 0,
  prefix = "",
  detail,
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  detail: string;
}) {
  const number = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const element = number.current!;
      const counter = { n: 0 };
      element.textContent = (0).toFixed(decimals);
      gsap.to(counter, {
        n: value,
        duration: 1.8,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 88%", once: true },
        onUpdate: () => {
          element.textContent = counter.n.toFixed(decimals);
        },
      });
    });
    return () => mm.revert();
  });

  return (
    <div className="rounded-[24px] border border-line bg-surface/80 p-4 sm:rounded-[28px] sm:p-6 md:p-7">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className="mt-3 text-[clamp(32px,4.4vw,60px)] leading-none font-semibold tracking-tight text-ink">
        {prefix}
        <span ref={number}>{value.toFixed(decimals)}</span>
      </p>
      <p className="mt-3 text-[12px] leading-relaxed text-muted sm:text-[13px]">{detail}</p>
    </div>
  );
}

/** Keeps the top entries and folds the rest into one "Other" bar (single-valued data only). */
function foldTail(data: BarDatum[], keep: number, noun: string): BarDatum[] {
  if (data.length <= keep + 1) return data;
  const rest = data.slice(keep);
  const value = rest.reduce((sum, datum) => sum + datum.value, 0);
  return [
    ...data.slice(0, keep),
    { label: `Other (${rest.length} ${noun})`, value, hint: rest.map((datum) => datum.hint ?? datum.label).join(", ") },
  ];
}

export function StatsSection({ stats }: { stats: LibraryStats }) {
  const segments = STATUS_ORDER.map((meta) => ({
    key: meta.status,
    label: meta.label,
    color: meta.color,
    count: stats.byStatus.find((entry) => entry.status === meta.status)?.count ?? 0,
  }));
  const platforms = stats.byPlatform.map((entry) => ({ label: entry.short, value: entry.count, hint: entry.name }));
  const genres = stats.byGenre.slice(0, 10).map((entry) => ({ label: entry.name, value: entry.count }));
  const franchises = stats.byFranchise.slice(0, 10).map((entry) => ({ label: entry.name, value: entry.count }));
  const backlog = stats.backlogHoursCoverage;

  return (
    <section id="stats" aria-labelledby="stats-title" className="relative px-[var(--gutter)] py-[clamp(96px,14vh,160px)]">
      <div className="aurora top-40 left-1/3 h-[40vh] w-[40vh] bg-[#4b3fd1] opacity-30" />
      <header className="relative mb-12 max-w-3xl">
        <p className="font-mono text-[11px] tracking-[0.3em] text-muted uppercase">02 — By the numbers</p>
        <h2
          id="stats-title"
          className="mt-5 font-display text-[clamp(36px,5vw,76px)] leading-[0.95] font-extrabold tracking-[-0.04em] uppercase"
        >
          The library, <span className="outline-text">quantified</span>
        </h2>
      </header>

      <div className="relative grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Games in the library" value={stats.total} detail={`Across ${stats.platformCount} platforms`} />
        <StatTile
          label="Finished"
          value={stats.finished}
          detail={`${formatPercent(stats.finishedShare)} of the library, credits rolled`}
        />
        <StatTile
          label="Average Metacritic"
          value={stats.averageMetacritic ?? 0}
          decimals={1}
          detail={`Across the ${stats.metacriticCount} games with a critic score`}
        />
        <StatTile
          label="Backlog, in hours"
          value={stats.backlogHours}
          prefix="≈"
          detail={`HowLongToBeat main story for ${backlog.known} of ${backlog.total} unfinished games`}
        />
      </div>

      <div className="relative mt-4 grid gap-4">
        <ChartCard
          title="Where every game stands"
          caption="Status of each game in the Notion database."
          table={{
            columns: [{ label: "Status" }, { label: "Games", align: "right" }, { label: "Share", align: "right" }],
            rows: segments.map((segment) => [
              segment.label,
              segment.count,
              formatPercent(segment.count / Math.max(1, stats.total)),
            ]),
          }}
        >
          {(tooltip) => <StackedBar segments={segments} total={stats.total} tooltip={tooltip} />}
        </ChartCard>

        <ChartCard
          title="Release years"
          caption={`Games per release year, for the ${stats.datedCount} of ${stats.total} games with a release date.`}
          table={{
            columns: [{ label: "Year" }, { label: "Games", align: "right" }],
            rows: stats.byYear.filter((entry) => entry.count > 0).map((entry) => [entry.year, entry.count]),
          }}
        >
          {(tooltip) => <YearColumns data={stats.byYear} tooltip={tooltip} />}
        </ChartCard>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Platforms"
            caption="Games per platform."
            table={{
              columns: [{ label: "Platform" }, { label: "Games", align: "right" }],
              rows: platforms.map((entry) => [entry.hint, entry.value]),
            }}
          >
            {(tooltip) => <BarList data={foldTail(platforms, 8, "platforms")} tooltip={tooltip} unit="game" />}
          </ChartCard>
          <ChartCard
            title="Genres"
            caption={`Top 10 of ${stats.byGenre.length}. A game can have several genres.`}
            table={{
              columns: [{ label: "Genre" }, { label: "Games", align: "right" }],
              rows: stats.byGenre.map((entry) => [entry.name, entry.count]),
            }}
          >
            {(tooltip) => <BarList data={genres} tooltip={tooltip} unit="game" />}
          </ChartCard>
          <ChartCard
            title="Franchises"
            caption={`Top 10 of ${stats.franchiseCount} franchises.`}
            table={{
              columns: [{ label: "Franchise" }, { label: "Games", align: "right" }],
              rows: stats.byFranchise.map((entry) => [entry.name, entry.count]),
            }}
          >
            {(tooltip) => <BarList data={franchises} tooltip={tooltip} unit="game" />}
          </ChartCard>
        </div>
      </div>
    </section>
  );
}

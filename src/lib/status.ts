import type { GameStatus } from "./types";

export interface StatusMeta {
  status: GameStatus;
  label: string;
  /** Mark color. Never used for text; pair it with a label. */
  color: string;
  hint: string;
}

/**
 * Display order doubles as the categorical slot order. The first five take
 * the validated dark-mode slots 1–5 (blue, orange, aqua, yellow, magenta),
 * checked with the dataviz validator on #111118 and #15151d: worst adjacent
 * CVD ΔE 8.4, normal-vision ΔE 19.3, all ≥ 3:1. "Dropped" is de-emphasis gray.
 */
export const STATUS_ORDER: StatusMeta[] = [
  { status: "In progress", label: "Playing", color: "#3987e5", hint: "On the go right now" },
  { status: "Not started", label: "Not started", color: "#d95926", hint: "Waiting in the backlog" },
  { status: "Done", label: "Finished", color: "#199e70", hint: "Rolled the credits" },
  { status: "Want to Play", label: "Want to play", color: "#c98500", hint: "Next up" },
  { status: "Stalled", label: "Stalled", color: "#d55181", hint: "Paused for now" },
  { status: "Dropped", label: "Dropped", color: "#6b6a72", hint: "Not for me" },
];

const BY_STATUS = new Map(STATUS_ORDER.map((meta) => [meta.status, meta]));

export function statusMeta(status: GameStatus): StatusMeta {
  return BY_STATUS.get(status) ?? STATUS_ORDER[1];
}

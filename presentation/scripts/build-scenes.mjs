#!/usr/bin/env node
// Writes the data-driven parts of the scenes from the app's Notion snapshot:
//   - compositions/list.html: one table row per game, with the values as Notion stores them;
//   - compositions/wall.html: one tile per game, in the app's A to Z order, with its status group;
//   - assets/images/covers.jpg: every captured card cover on one sprite sheet.
// Run capture-footage.mjs (the `stills` shot) first; FFmpeg builds the sprite.
//
//   node presentation/scripts/build-scenes.mjs
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(root, "..");
const workDir = path.join(process.env.CAPTURE_TMP ?? tmpdir(), "gamelist-footage");

const SPRITE = { cols: 24, rows: 10, tileWidth: 192, tileHeight: 256 };

// Played, playing and up next, as the app's hero groups them, then the rest.
const GROUPS = [
  { key: "played", label: "Played", statuses: ["Done"] },
  { key: "playing", label: "Playing", statuses: ["In progress"] },
  { key: "next", label: "Up next", statuses: ["Not started", "Want to Play", "Stalled"] },
  { key: "dropped", label: "Dropped", statuses: ["Dropped"] },
];

const escape = (value) =>
  String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

// Notion keeps HowLongToBeat hours as text with a decimal comma ("27,50").
const hoursText = (hours) => (hours == null ? "" : hours.toFixed(2).replace(".", ","));

function replaceBetween(source, marker, content) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const from = source.indexOf(start);
  const to = source.indexOf(end);
  if (from < 0 || to < from) throw new Error(`Missing ${marker} markers`);
  const indent = source.slice(source.lastIndexOf("\n", from) + 1, from);
  return `${source.slice(0, from + start.length)}\n${content.map((line) => indent + line).join("\n")}\n${indent}${source.slice(to)}`;
}

async function update(file, marker, lines) {
  const target = path.join(root, file);
  await writeFile(target, replaceBetween(await readFile(target, "utf8"), marker, lines));
  console.log(`  ${file}: ${lines.length} ${marker}`);
}

const { games } = JSON.parse(await readFile(path.join(repo, "src/data/library.json"), "utf8"));
const byId = new Map(games.map((game) => [game.id, game]));

// The table: the snapshot is already in the app's A to Z order.
await update(
  "compositions/list.html",
  "rows",
  games.map(
    (game) =>
      `<div class="list-row"><span class="list-cell list-name">${escape(game.name)}</span>` +
      `<span class="list-cell list-platform">${escape(game.platform)}</span>` +
      `<span class="list-cell list-status">${escape(game.status)}</span>` +
      `<span class="list-cell list-num">${game.metacritic ?? ""}</span>` +
      `<span class="list-cell list-num">${hoursText(game.hltbHours)}</span></div>`,
  ),
);

// The wall, in the order the app's grid showed the cards when they were captured.
const order = await readFile(path.join(workDir, "covers/order.json"), "utf8").then(JSON.parse, () => null);
if (!order) {
  console.log("  No captured covers yet: run capture-footage.mjs stills, then this script again.");
  process.exit(0);
}
if (order.length !== games.length) throw new Error(`Captured ${order.length} covers for ${games.length} games`);
const groupOf = (game) => GROUPS.findIndex((group) => group.statuses.includes(game.status));
const within = GROUPS.map(() => 0);
const ranked = order
  .map((id, index) => ({ game: byId.get(id), index }))
  .sort((a, b) => {
    const ga = groupOf(a.game);
    const gb = groupOf(b.game);
    if (ga !== gb) return ga - gb;
    const sa = GROUPS[ga].statuses.indexOf(a.game.status);
    const sb = GROUPS[gb].statuses.indexOf(b.game.status);
    return sa - sb || a.index - b.index;
  });
const slot = new Map();
for (const { game } of ranked) {
  const group = groupOf(game);
  slot.set(game.id, { group, place: within[group]++ });
}
await update(
  "compositions/wall.html",
  "tiles",
  order.map((id, index) => {
    const game = byId.get(id);
    const { group, place } = slot.get(id);
    const col = index % SPRITE.cols;
    const row = Math.floor(index / SPRITE.cols);
    return (
      `<div class="wall-tile" data-i="${index}" data-g="${group}" data-k="${place}" data-status="${escape(game.status)}"` +
      ` style="background-position: ${-col * 72}px ${-row * 96}px" title="${escape(game.name)}"></div>`
    );
  }),
);

// The sprite: covers in grid order, SPRITE.cols across.
const temp = await mkdtemp(path.join(tmpdir(), "covers-"));
try {
  for (const [index, id] of order.entries()) {
    await symlink(path.join(workDir, "covers", `${id}.png`), path.join(temp, `${String(index).padStart(3, "0")}.png`));
  }
  const { cols, rows, tileWidth, tileHeight } = SPRITE;
  const result = spawnSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      // Cover heights differ by a pixel or two; rebuilding the filter graph would restart the tiling.
      "-reinit_filter", "0",
      "-framerate", "1", "-i", path.join(temp, "%03d.png"),
      "-vf", `scale=${tileWidth}:${tileHeight}:flags=lanczos,tile=${cols}x${rows}:color=0x08080c`,
      "-frames:v", "1", "-q:v", "3",
      path.join(root, "assets/images/covers.jpg"),
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error("ffmpeg could not build the sprite");
  console.log(`  assets/images/covers.jpg: ${order.length} covers, ${cols * tileWidth} x ${rows * tileHeight}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}

const counts = GROUPS.map((group, index) => `${group.label} ${within[index]}`);
console.log(`  groups: ${counts.join(", ")}`);

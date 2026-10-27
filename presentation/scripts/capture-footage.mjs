#!/usr/bin/env node
// Frame-exact footage and stills of the running Game Library app, for the film.
//
//   npm run build && npm start                       # in the repository root: the app on :3000
//   node presentation/scripts/capture-footage.mjs     # or pass another base URL and shot names
//
// Every clock the app reads (requestAnimationFrame, timers, performance.now, Date.now and CSS
// animations) runs on a virtual clock that moves exactly one frame per screenshot. GSAP, Lenis,
// the search debounce and the custom cursor therefore play at true speed, however slow the
// capture is. Needs Playwright (`npm i -D playwright`) and FFmpeg.
import { spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const FPS = 30;
const FRAME_MS = 1000 / FPS;
const VIEWPORT = { width: 1440, height: 810 }; // 16:9, captured at 2x: 2880 x 1620
const SCALE = 2;
const HERO_SLUG = "the-legend-of-zelda-breath-of-the-wild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const footageDir = path.join(root, "assets/footage");
const imagesDir = path.join(root, "assets/images");
const workDir = path.join(process.env.CAPTURE_TMP ?? tmpdir(), "gamelist-footage");

const args = process.argv.slice(2);
const base = args.find((arg) => /^https?:/.test(arg)) ?? "http://localhost:3000";
const only = args.filter((arg) => !/^https?:/.test(arg));

// Installed before any app script runs.
const virtualClock = () => {
  const startDate = Date.now();
  let now = 0;
  let seq = 0;
  const timers = new Map();
  let frames = new Map();
  const seen = new WeakMap();

  const schedule = (fn, ms, rest, repeat) => {
    const id = ++seq;
    const delay = Math.max(0, Number(ms) || 0);
    timers.set(id, { fn, rest, due: now + delay, order: id, repeat: repeat ? Math.max(1, delay) : 0 });
    return id;
  };
  window.setTimeout = (fn, ms, ...rest) => schedule(fn, ms, rest, false);
  window.setInterval = (fn, ms, ...rest) => schedule(fn, ms, rest, true);
  window.clearTimeout = window.clearInterval = (id) => void timers.delete(id);
  window.requestAnimationFrame = (callback) => {
    const id = ++seq;
    frames.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => void frames.delete(id);
  performance.now = () => now;
  Date.now = () => startDate + now;

  const call = (fn, rest) => {
    try {
      if (typeof fn === "function") fn(...rest);
    } catch (error) {
      console.error(error);
    }
  };

  const syncCss = () => {
    for (const animation of document.getAnimations()) {
      if (!seen.has(animation)) {
        seen.set(animation, now);
        animation.pause();
      }
      animation.currentTime = now - seen.get(animation);
    }
  };

  window.__clock = {
    advance(ms) {
      const until = now + ms;
      for (;;) {
        let next = null;
        for (const [id, timer] of timers) {
          if (timer.due > until) continue;
          if (!next || timer.due < next.timer.due || (timer.due === next.timer.due && timer.order < next.timer.order)) {
            next = { id, timer };
          }
        }
        if (!next) break;
        now = Math.max(now, next.timer.due);
        if (next.timer.repeat) {
          next.timer.due = now + next.timer.repeat;
          next.timer.order = ++seq;
        } else {
          timers.delete(next.id);
        }
        call(next.timer.fn, next.timer.rest);
      }
      now = until;
      const due = frames;
      frames = new Map();
      for (const callback of due.values()) call(callback, [now]);
      syncCss();
    },
  };
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

class Recorder {
  constructor(page, name) {
    this.page = page;
    this.name = name;
    this.dir = path.join(workDir, name);
    this.count = 0;
    this.pointer = { x: VIEWPORT.width + 40, y: VIEWPORT.height * 0.7 };
  }

  async start() {
    await rm(this.dir, { recursive: true, force: true });
    await mkdir(this.dir, { recursive: true });
  }

  // Advances the clock by one frame without recording it.
  async tick(frames = 1) {
    for (let i = 0; i < frames; i += 1) {
      await this.page.evaluate((ms) => window.__clock.advance(ms), FRAME_MS);
    }
  }

  async frame() {
    await this.tick();
    this.count += 1;
    const file = path.join(this.dir, `frame-${String(this.count).padStart(4, "0")}.png`);
    await this.page.screenshot({ path: file });
  }

  async hold(seconds) {
    for (let i = 0; i < Math.round(seconds * FPS); i += 1) await this.frame();
  }

  // Moves the real pointer along an eased path, one step per recorded frame.
  async moveTo(x, y, seconds) {
    const from = { ...this.pointer };
    const steps = Math.max(1, Math.round(seconds * FPS));
    for (let i = 1; i <= steps; i += 1) {
      const t = ease(i / steps);
      await this.page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
      await this.frame();
    }
    this.pointer = { x, y };
  }

  async type(text, secondsPerKey) {
    for (const key of text) {
      await this.page.keyboard.type(key);
      await this.hold(secondsPerKey);
    }
  }

  async wheel(deltaY, seconds) {
    const steps = Math.max(1, Math.round(seconds * FPS));
    for (let i = 0; i < steps; i += 1) {
      if (i < 6) await this.page.mouse.wheel(0, deltaY / 6);
      await this.frame();
    }
  }

  encode(output, crf = 20) {
    const result = spawnSync(
      "ffmpeg",
      [
        "-y", "-loglevel", "error",
        "-framerate", String(FPS),
        "-i", path.join(this.dir, "frame-%04d.png"),
        "-c:v", "libx264", "-preset", "slow", "-crf", String(crf),
        "-pix_fmt", "yuv420p", "-x264-params", `keyint=${FPS}:min-keyint=${FPS}`,
        "-movflags", "+faststart",
        output,
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0) throw new Error(`ffmpeg failed for ${this.name}`);
    console.log(`  ${path.relative(root, output)}: ${this.count} frames`);
  }
}

async function openPage(browser, { skipIntro, url = base, clock = true, reducedMotion = "no-preference", scale = SCALE }) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: scale,
    reducedMotion,
    colorScheme: "dark",
  });
  if (clock) await context.addInitScript(virtualClock);
  if (skipIntro) await context.addInitScript(() => window.sessionStorage.setItem("intro-seen", "1"));
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error("  page error:", error.message));
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

async function rect(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`No box for ${selector}`);
  return box;
}

const shots = {
  // The count-up curtain hands over to the hero: kinetic type over the cover wall.
  async intro(browser) {
    const { context, page } = await openPage(browser, { skipIntro: false });
    const rec = new Recorder(page, "intro");
    await rec.start();
    await rec.hold(7);
    rec.encode(path.join(footageDir, "intro.mp4"));
    await context.close();
  },

  // Search the collection for "zelda", then open Breath of the Wild.
  async search(browser) {
    const { context, page } = await openPage(browser, { skipIntro: true });
    const rec = new Recorder(page, "search");
    await rec.start();
    await rec.tick(30);
    await page.evaluate(() => {
      const target = document.querySelector("#collection");
      window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 24);
    });
    await rec.tick(90);

    const input = await rect(page, "input[type=search], input[placeholder^='Search']");
    await rec.hold(0.3);
    await rec.moveTo(input.x + 150, input.y + input.height / 2, 0.7);
    await page.mouse.down();
    await rec.frame();
    await page.mouse.up();
    await rec.hold(0.25);
    await rec.type("zelda", 0.13);
    await rec.hold(1.6);

    const card = `li[data-flip-card]:has(a[href="?game=${HERO_SLUG}"]) [data-cover-source]`;
    let cover = await rect(page, card);
    if (cover.y + cover.height > VIEWPORT.height - 40) {
      await rec.moveTo(cover.x + cover.width / 2, VIEWPORT.height * 0.62, 0.45);
      await rec.wheel(cover.y + cover.height - VIEWPORT.height + 120, 1.1);
      cover = await rect(page, card);
    }
    await rec.moveTo(cover.x + cover.width * 0.55, cover.y + cover.height * 0.45, 0.6);
    await rec.hold(0.35);
    await page.mouse.down();
    await rec.frame();
    await page.mouse.up();
    await rec.hold(3.6);
    rec.encode(path.join(footageDir, "search.mp4"));
    await context.close();
  },

  // Stills: every card cover in grid order (for the wall of all games, built by build-scenes.mjs)
  // and the detail view's cover at 3x.
  async stills(browser) {
    await mkdir(imagesDir, { recursive: true });
    {
      const { context, page } = await openPage(browser, {
        skipIntro: true,
        clock: false,
        reducedMotion: "reduce",
        scale: 3,
        url: `${base}/?game=${HERO_SLUG}`,
      });
      await page.waitForTimeout(2500);
      await markModalCover(page);
      await page.locator("[data-capture=modal-cover]").screenshot({ path: path.join(imagesDir, "botw-cover.png") });
      await context.close();
    }
    {
      const { context, page } = await openPage(browser, { skipIntro: true, clock: false, reducedMotion: "reduce" });
      const dir = path.join(workDir, "covers");
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      const ids = await page.$$eval("li[data-flip-card]", (cards) => cards.map((card) => card.dataset.cardId));
      for (const id of ids) {
        const cover = page.locator(`li[data-card-id="${id}"] [data-cover-source]`);
        await cover.scrollIntoViewIfNeeded();
        await cover.screenshot({ path: path.join(dir, `${id}.png`) });
      }
      await writeFile(path.join(dir, "order.json"), JSON.stringify(ids, null, 2));
      console.log(`  ${ids.length} covers in ${dir}`);
      await context.close();
    }
  },

  // Where the app draws what the film matches against, in CSS pixels of the 1440 x 810 viewport.
  async geometry(browser) {
    const box = (element) => {
      const r = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        x: r.x, y: r.y, width: r.width, height: r.height,
        fontSize: style.fontSize, letterSpacing: style.letterSpacing, fontWeight: style.fontWeight,
      };
    };
    const out = {};
    {
      const { context, page } = await openPage(browser, { skipIntro: false });
      const rec = new Recorder(page, "geometry");
      for (let i = 0; i < 45; i += 1) {
        await rec.tick();
        const count = await page.evaluate(() => document.querySelector(".intro [data-intro-line]")?.textContent);
        if (count === "237") break;
      }
      out.intro = await page.evaluate((fn) => {
        const measure = new Function(`return ${fn}`)();
        const lines = [...document.querySelectorAll(".intro [data-intro-line]")];
        return {
          time: performance.now(),
          count: measure(lines[0]),
          caption: { ...measure(lines[1]), text: lines[1].textContent },
          track: measure(document.querySelector("[data-intro-bar]").parentElement),
        };
      }, box.toString());
      await context.close();
    }
    {
      const { context, page } = await openPage(browser, {
        skipIntro: true,
        clock: false,
        reducedMotion: "reduce",
        url: `${base}/?game=${HERO_SLUG}`,
      });
      await page.waitForTimeout(2500);
      await markModalCover(page);
      out.modal = await page.evaluate((fn) => {
        const measure = new Function(`return ${fn}`)();
        const dialog = document.querySelector("[role=dialog]");
        const byText = (text) =>
          [...dialog.querySelectorAll("*")]
            .filter((el) => el.textContent.trim() === text)
            .sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0];
        const pick = (text) => {
          const element = byText(text);
          return element ? { text, ...measure(element) } : null;
        };
        return {
          cover: measure(document.querySelector("[data-capture=modal-cover]")),
          title: measure(document.querySelector("#game-dialog-title")),
          facts: ["Metacritic", "97", "Main story", "50 h", "Difficulty", "Medium", "Finished", "Switch", "Single player"].map(pick),
        };
      }, box.toString());
      await context.close();
    }
    await writeFile(path.join(workDir, "geometry.json"), JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
  },
};

async function markModalCover(page) {
  await page.evaluate(() => {
    const dialog = document.querySelector("[role=dialog]");
    const cover = [...dialog.querySelectorAll("div")].find((el) => el.className.includes("rounded-[24px] shadow"));
    cover.setAttribute("data-capture", "modal-cover");
  });
}

const browser = await chromium.launch();
try {
  await mkdir(footageDir, { recursive: true });
  for (const [name, shot] of Object.entries(shots)) {
    if (only.length && !only.includes(name)) continue;
    console.log(`${name}…`);
    await shot(browser);
  }
} finally {
  await browser.close();
}

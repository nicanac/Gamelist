# Game Library: the film

A 35-second presentation of the Game Library app and the collection it shows, made with
[HyperFrames](https://hyperframes.heygen.com) (HTML and GSAP rendered to video): 1920 x 1080, 30 fps.

It follows one long list. The real rows of the Notion database scroll past and fold into the number
237, which cuts to the app's own count-up. A search for "zelda" opens Breath of the Wild, and the
row's values fly onto its detail view. Its cover pulls back into all 237 covers, which sort into
played, playing, up next and dropped.

- `STORYLINES.md`: the three films considered, and why this one.
- `SPEC.md`: look, motion and shots, with numbers.
- `REVIEW.md`: what was checked, what was kept on purpose, what to improve next.

## Watch and render

```bash
cd presentation
npm run dev       # HyperFrames Studio preview, to play and edit
npm run check     # lint, runtime, layout, contrast and craft checks
npm run render    # renders/game-library.mp4
```

The scripts pin `hyperframes@0.8.209`, which needs Node.js 22+ and FFmpeg
(`npx hyperframes doctor` checks both, `npx hyperframes browser ensure` fetches its Chrome).

## What is real

Everything on screen comes from the app or its data:

- **Footage** (`assets/footage/`): the running app, captured frame by frame by
  `scripts/capture-footage.mjs`. The page's clocks (animation frames, timers, CSS animations) run on a
  virtual clock that advances one frame per screenshot, so GSAP and Lenis play at true speed.
- **The table and the wall**: written by `scripts/build-scenes.mjs` from `src/data/library.json`, the
  Notion snapshot. The wall uses each card cover as the app's grid drew it.
- **The mark, fonts and colours**: the app's icon, Unbounded, Geist and Geist Mono, and its palette.

## Refresh after the app or the library changes

```bash
npm run build && npm start                 # in the repository root: the app on :3000
cd presentation
npm run capture                            # footage and stills (about 15 minutes); needs Playwright
npm run build-scenes                       # table rows, wall tiles, cover sprite
```

`npm run capture -- http://localhost:3000 search` re-captures a single shot (`intro`, `search`,
`stills` or `geometry`). Scene timings in `compositions/` are set against these captures, so check
the seams (`npx hyperframes snapshot --at 5.97,6.0,18.8,18.85`) after a re-capture.

## Sound

Sound effects only, placed on visible actions (`index.html`). This environment had no music source.
To add a bed, put a track in `assets/` and add it to the root:

```html
<audio id="music" class="clip" data-start="0" data-duration="35.2" data-track-index="20"
  data-volume="0.5" data-fade-out="2" src="assets/music.mp3"></audio>
```

## Credits

- Unbounded, Geist and Geist Mono: SIL Open Font License, via Google Fonts.
- GSAP: GreenSock standard license (`assets/vendor/gsap.min.js`).
- Sound effects: Pixabay Content License, bundled with HyperFrames (`assets/sfx/CREDITS.md`).

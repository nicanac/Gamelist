# Review

The delivery note for the film. Read it before changing anything.

## Creative calls

- **Built storyline A, "One long list"** (`STORYLINES.md`): the real Notion rows fold into 237, which
  cuts to the app's own count-up; one search and one click follow Breath of the Wild from its row to
  its detail view; its cover pulls back into all 237 covers sorting by status. Not built: **B, "237"**
  (a data film where one frame rebuilds around the numbers) and **C, "Play it back"** (one continuous
  reverse take from a detail view out to the Notion row).
- **Only real material.** Every app pixel is footage of the running app, captured frame by frame on
  a virtual clock (`scripts/capture-footage.mjs`). The table, the wall and every number come from the
  Notion snapshot. Nothing in Notion's own interface is drawn: the table is the data, set in Geist
  Mono with the database's real column names.
- **Two app defects were fixed before filming**, because the footage showed them: the hero's
  staggered counts flashed their final value before counting from 0, and generated cover titles
  broke long words mid-word ("AIRWOL F"). The film shows the fixed app.
- **Covers are the app's generated posters.** This sandbox cannot reach Wikipedia or IGDB, so the app
  fell back to its generated art for every game. On a deployment that resolves real box art, a
  re-capture would show it.
- **Sound is effects only.** No music source was available here. 24 effects sit on visible actions:
  a key tick per title word, the fold, the curtain, the whip, the real clicks, five key ticks for
  "zelda", a pop when 97 lands, the pull-back, a riser and a bass hit for the sort, the two floods,
  a swell for the mark. The end card holds in silence.

## Measured, looked at, not checked

- `npx hyperframes check`: passes with 0 errors and no layout, contrast or craft warnings.
- The 237 cut (6.0 s): the film's last frame and the footage's first differ only in edge
  anti-aliasing (1654 pixels beyond a 12% tolerance in a 1920 x 1080 diff).
- The cover cut (18.85 s): both sides put the cover at 750 x 1000 px from (585, 40), corner radius
  50 px.
- Each effect starts so that its measured peak (`npx hyperframes audio`) lands one frame after its
  picture; the render's onsets confirm it (click 11.36 s, keys 11.68 to 12.21 s, card click 15.36 s,
  pop 17.68 s). Loudness -18 LUFS integrated, true peak -4.9 dBTP, no clipping. Measured, not heard.
- Looked at: the beat sheet, every seam strip, the phone sheet, and full-resolution frames for each
  fix below. Not checked: playback on a phone or a social player.

## Notes from review, fixed

| Time | Where | Problem | Change |
| --- | --- | --- | --- |
| 10.5 s | whip to the collection | The search scene's opaque ground hid the hero leaving | Transparent scene root |
| 16.3 s | Notion row strip | On screen 0.5 s before its values flew: too short to read | Held 0.8 s first |
| 17.8 s | row name | Landed as a small label over the big title | Grows into the title and dissolves |
| 17.8 s | "Nintendo Switch" | Landed 23 px left of the platform chip | Retargeted |
| 18.75 s | push into the cover | The dark surround stopped partway; the title showed at the edge | Four bands faded by colour; motion blur off for this camera |
| 30.2 s | end card | 0.4 s of empty dark frame between the claim and the mark | End card overlaps the claim's exit |
| 13.9 s | trip to the card | 2.9 s at one framing while the cursor travelled and the page scrolled | That stretch plays at 2x (one frame in two) |
| 4.7 s | the table's rush | Rows crisp at 520 px a frame: the render's motion blur skips the clipped table | Vertical blur on the table, on the scroll's own curve |
| 33 s | call to action | 30 px, small on a phone | 34 px |

## Weakest shot, and what to do with more time

- **The whip from the hero to the collection (10.35 s)** is crisp: three frames of a fast slide with
  no smear, because the render's motion blur skips the footage cameras. It reads as a real page
  scroll; a vertical smear would sell it harder.
- **Breath of the Wild's card is only half on screen when it is clicked** (14.9 s): the captured
  scroll stopped short. A re-capture that sorts by Metacritic would bring it to the first row.
- **Music.** A bed around 110 to 120 BPM would let the cuts land on beats and carry the claim.
- **The end card** is deliberately modest (the lockup is 29% of the width). A larger mark would give
  the ending more weight.

## Kept on purpose

- `composition_file_too_large` on `compositions/list.html` and `compositions/wall.html`: the 237
  rows and 237 tiles are generated data, rewritten by `scripts/build-scenes.mjs`.
- `data-layout-ignore` on texture: the scrolling table rows (meant to rush past unread), the app's
  small caption under 237 (kept only to match the footage frame), the values while they fly, and
  the mask bands.

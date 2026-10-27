# SPEC: One long list

Storyline A from `STORYLINES.md`. Every number on screen comes from `src/data/library.json`
(the Notion snapshot of Oct 27, 2026) or from footage of the app reading it.

```text
GOAL:    The viewer knows the library is the same Notion list of 237 games, made into a site that
         moves, and wants to open it.

OUTPUT:  HyperFrames 0.8.209, 1920 x 1080, 30 fps, H.264 MP4.

TIME:    35.2 s x 30 = 1056 frames. No music (no source in this environment); the picture is the clock.

LOOK:    Two worlds, one type system.
         Paper (the table): ground #f2f1ee flat, ink #08080c, muted #5e5d66, row rules ink at 12%.
           Values in Geist Mono 400 28 px (headers 500 28 px), rows 68 px, columns 658/420/240/150/260 px.
         Night (the app): ground #08080c; the app's own aurora (#6b54ff and #e8579a, radial, 30-55%)
           only where the app or the end card has it; holo gradient #9085e9 > #e87ba4 > #f6b26b.
         Display: Unbounded Black 900, capitals, tracking -2%, titles 92 px (8.5% of the height),
           the claim 132 px, counts 84 px with tabular figures; the curtain's 237 is 293.33 px
           (220 px in the 1440 px viewport x 4/3) so it matches the app frame for frame.
         Body: Geist 500 32 px; quiet lines Geist 400 32 px #c3c2b7.
         Accent, rationed: the holo gradient on "MOVES" in the claim and on the mark; status colours
           only on the status groups (#199e70 played, #3987e5 playing, #d95926 / #c98500 / #d55181
           up next, #6b6a72 dropped).
         The medium: captured product footage (2880 x 1620 frames of the real app, 1440 x 810 CSS at
           2x), the app's generated cover art, and a plain data table. No added glow, grain or blur
           on footage.

OBJECTS: The Notion table: the real column names (name, platforms, status, mc_score,
           hltb_main_story) and all 237 rows as Notion stores them ("50,00" hours, "Want to Play").
         The app: its count-up curtain, the hero ("PLAYED. PLAYING. UP NEXT."), the collection with
           the search field, the card grid, the detail view with the Metacritic ring. All footage.
         One row: The Legend of Zelda: Breath of the Wild, Nintendo Switch, Done, 97, 50,00.
         The wall: all 237 card covers as the grid shows them, A to Z.
         The mark: the app's icon (holo rounded square, night play triangle) and its wordmark.

MOTION:  Enter expo.out (titles: per word, blur 6 px > 0 and opacity 0 > 1 in 0.13 s, 0.067 s apart).
         Exit power3.in at about half the entrance (blur 8 px, 0.15 s, 0.04 s apart).
         Camera power2.inOut: punch-ins 0.5-0.6 s, the wall pull-back 1.7 s on a log-scale zoom.
         Floods: clip-path wipes rising from the bottom, 0.55 s expo.inOut, like the app's curtain.
         The sort borrows the app's Flip: 0.9 s expo.inOut, staggered over 0.35 s in grid order.
         Count-ups 1.3 s power3.out, tabular figures. Motion blur on the root (data-motion-blur),
         off on the search camera, whose zoom capture would drop the colour-faded mask bands.
         Landed titles stay still; the only continuous motion is the product's own (footage).

SHOTS:   0-180     LIST. Paper table, rows crawl then rush (expo.in, 0 > -15396 px). "237 GAMES IN
                   NOTION" (237 on frame 0, the rest 0.1-0.4 s), out at 2.3 s; "ONE VERY LONG LIST"
                   2.55-4.4 s. 4.55 s: the table folds onto the number's line; 4.9 s: 237 grows from
                   it; 5.3 s: night rises with the app's curtain layout. Sound: a key tick per title word,
                   whoosh on the fold.
         180-318   APP. Hard cut (frame-matched) to the curtain footage at 237. The real curtain
                   lifts into the hero; the type and counts land; the wall drifts. Sound: cinematic
                   whoosh on the curtain. Hands off with a vertical whip, as a scroll, at 10.35 s.
         310-565   SEARCH. Footage of the collection. Punch 1.45x into the search field as the real
                   cursor clicks it; "zelda" is typed (key ticks); pull back to 1x as 41 cards
                   rearrange; the trip to Breath of the Wild (cursor and scroll) plays at 2x; the
                   cursor opens it (click); the cover flies into the
                   detail view. The row from the table rises on a paper strip, holds 0.8 s, and its
                   values fly to the facts they become (97, 50 h, Finished, Switch); the name grows
                   into the title and dissolves. Push into the cover while the rest darkens.
                   Sound: click, five key ticks, click, pop on 97.
         565-756   WALL. Match cut on the cover. Pull back from it into all 237 covers (A to Z).
                   They sort into PLAYED 78, PLAYING 23, UP NEXT 111, DROPPED 25; counts land on
                   each group with a status bar. Sound: whoosh on the pull-back, riser into the
                   sort, bass impact as it lands.
         756-906   CLAIM. Paper rises over the wall: "SAME NOTION LIST." Night rises over it:
                   "NOW IT MOVES." with MOVES in holo; "Refreshed from Notion every hour".
                   Sound: short whoosh on each rise.
         900-1056  END CARD. On the claim's night, as its last words leave: the mark fills from
                   the bottom, the triangle lands, the wordmark "GAME LIBRARY" wipes in, then the
                   repository address. Held 3.5 s. Sound: a bass swell that lands with the triangle.

BANNED:  A dark void with small things floating; glow, bloom, flares, particles; glass cards beyond
         the app's own nav; purple or blue gradients beyond the brand's holo and aurora; cream paper
         with a serif, italic accents, numbered labels, mono caps labels or pills (the table uses
         lowercase property names, no serif, no chips); everything centred; fade-and-slide-up
         entrances; text moving while read; titles drifting after they land; corner labels, frame
         borders, HUD readouts; three cards, KPI grids, a title over a dimmed screenshot; the logo
         docked in a corner. For this film also: product UI tilted in 3D by the camera; any
         invented UI (every app pixel is footage or the app's own cover art); Notion's interface or
         logo imitated (the table is the data, not Notion's UI); numbers not in the snapshot.

QA:      0.0 s    thumbnail: the table and 237, readable.
         1.5 s    "237 GAMES IN NOTION" fully landed, rows legible.
         5.97 vs 6.0 s  the cut: the film's 237 and the footage's 237 identical.
         9.5 s    the hero landed: 78 / 23 / 111, the wall behind.
         10.45 s  the whip: two frames, adjacent, smeared.
         12.5 s   "zelda" readable in the field at 1.45x.
         13.6 s   41 Zelda cards after the reflow.
         17.8 s   the four values landed on the detail view.
         18.83 vs 18.85 s  the cover match cut.
         21.2 s   all 237 covers, edge to edge.
         23.7 s   the sorted groups with their counts and bars.
         26.7 s   SAME NOTION LIST.  28.7 s  NOW IT MOVES. + quiet line.
         32.9 s   the end card: mark, wordmark, repository.
```

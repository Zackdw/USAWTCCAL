# Pairing Simulator: stream view and regional branding

Proposal to rework `docs/pairing-simulator.html` so it reads clearly on a broadcast and looks like the Regional Founders site (`docs/founders/`).

Browse the visual version at `docs/pairing-redesign/index.html`. It has before screenshots and an interactive 1920×1080 mockup.

## Summary

- Add a **Stream view**: a fixed 16:9 canvas with no scrolling, built for America's scrims between state and regional teams. It shows only the current state: the current step, the pairings locked so far, which missions are open, banned or locked, and which Kill Teams each side has picked or still has available. Sizes are readable after stream compression.
- Keep a separate **Setup view** for the operator (roster picking, missions, exports), restyled to match the regional site.
- Replace the orange-on-black theme with the regional tokens: flag navy and red, cream panels, Nunito headlines, Inter body.
- Leave the pairing logic (step order, state, Excel export) as it is. This is a presentation change.

## What's wrong today

Measured from a 1920×1080 capture of the current page in Chromium.

| # | Problem | Evidence |
|---|---|---|
| 1 | Text is too small for a stream | `html { font-size: 50% }` makes 1rem = 8px. On the live board, kickers are 0.58rem (4.6px), count pills 0.48rem (3.8px), roster status 0.34rem (2.7px), mission stickers 0.18rem (1.4px). Team names are 0.92rem (7.4px). After a 1080p→720p downscale and compression, almost nothing on the board is readable. |
| 2 | The board is buried and small | The live playmat is 1410×692px. It sits below the hero and the full roster setup panel, so the operator has to scroll on air. Roughly half the 1080p frame is page chrome. |
| 3 | It doesn't match the brand | The pairing tool uses orange `#ff6118` on near-black with Bebas Neue, Oswald and IBM Plex Sans. The regional site uses navy `#0a3161`, flag red `#b31942`, accent red `#b24133`, gold `#f0b735` and cream panels, with Nunito 800/900 headlines and Inter for body text. |
| 4 | Team sides aren't obvious | Attacker and defender are told apart by a thin blue or gold border at 0.08 alpha. A viewer can't tell at a glance which side is acting. |
| 5 | Small bugs and stale copy | The "Waiting for rosters" chip stays visible while the simulation is live. The hero still says "the interface is now a drag-and-drop playmat", which describes a past change rather than the tool. |

## Proposed design

### Two views

| | Setup view (operator) | Stream view (on air) |
|---|---|---|
| Who sees it | Organizer's own screen | Captured by OBS as a browser source or window |
| Layout | Normal scrolling page, regional-site look | Fixed 1920×1080 canvas, scaled to fit the window, no scroll |
| Contents | Team library, roster pick, mission deck, swap sides, results, export, history | Current step, both rosters (picked vs available), five tables with current pairings, mission strip (open / banned / locked). No round history. |
| Entry | `pairing-simulator.html` | `pairing-simulator.html#stream`, or a **Go live** button, or the `S` key |

Both views read the same state. The operator can run the round from the stream view by clicking, or from a second window in setup view. The two windows stay in sync through `BroadcastChannel`, so one can be captured and the other used to drive.

### Stream canvas layout (1920×1080)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [USA] USA KILLTEAM · PAIRINGS     STEP 3 / 7  ATTACKER (A) OFFERS TWO     │ 140
│                                   KILL TEAMS              Round 2 · 2/5 ✓ │
├───────────┬──────────────────────────────────────────────────┬───────────┤
│ TEAM A    │              ACTION STAGE                        │ TEAM B    │
│ Attacker  │   offered / revealed cards shown large           │ Defender  │
│ 4 of 5    │                                                  │ 4 of 5    │
│           │                                                  │           │
│ 5 roster  ├──────────────────────────────────────────────────┤ 5 roster  │ 760
│ cards     │  TABLE 1   TABLE 2   TABLE 3   TABLE 4   TABLE 5 │ cards     │
│ 30px+     │  map       map       map       map       map     │           │
│           │  mission   mission   …                           │           │
│           │  A vs B    A vs B                                │           │
├───────────┴──────────────────────────────────────────────────┴───────────┤
│ MISSIONS 6 open·2 banned·1 locked  Secure ✓T1  Loot  ~~Orb~~  Reboot …    │ 120
└──────────────────────────────────────────────────────────────────────────┘
```

- **48px safe margin** on all sides so overlays and platform UI don't clip anything.
- **Team A on the left in navy, Team B on the right in red.** This holds for the whole round. "Attacker" and "Defender" are badges on the column, not colors, so the colors don't flip when roles change.
- **Acting side highlighted**: the active column gets a solid colored header and a soft glow, and the inactive one dims to 55%.
- **Lock-in moment**: when a pairing commits, its table tile fills with both team colors and a short 400ms flip. This is skipped under `prefers-reduced-motion`.
- **Two team names set in setup** (e.g. "New England Kill Team" and "DFW Kill Team") instead of "Team A/B". Long regional names wrap to two lines in the column header.
- **Roster status**: each roster card shows whether it's available, offered or revealed, or already paired. The column header shows how many are still available.
- **Mission status**: every mission is shown as open, banned (struck through) or locked to a table (T1–T5), with counts.
- **Map names stay fixed**: Volkus 25:6, Volkus 25:2, Volkus 25:5, WTC ITC:1, Tomb World:5.
- **Map images**: each table tile has an image slot above its pairing. Images live in `docs/assets/maps/` as `volkus-25-6.jpg`, `volkus-25-2.jpg`, `volkus-25-5.jpg`, `wtc-itc-1.jpg` and `tomb-world-5.jpg`. Supply them landscape (30:22, at least 800px wide). The tile turns them to portrait so they fill its height, and the map name sits over the bottom edge. A drawn placeholder shows until an image exists.

### Type scale at 1080p

Nothing on the stream canvas is smaller than 18px. Sizes are in canvas pixels and scale with the canvas.

| Role | Size | Face |
|---|---|---|
| Step title | 46px | Nunito 900, uppercase |
| Team name (column header) | 36px | Nunito 900 |
| Roster card / table team name | 28px | Nunito 800 |
| Map name, mission name | 24px | Inter 700 |
| Labels and badges (STEP, ATTACKER, BANNED) | 18px | Inter 700, 0.08em tracking, uppercase |

The setup view drops `html { font-size: 50% }` and uses the regional scale as is (16px body).

### Brand tokens

Move the token block from `docs/founders/founders.css` into a shared `docs/assets/brand.css` and load it from both the founders pages and the pairing tool.

| Current (pairing) | New (regional) | Used for |
|---|---|---|
| `--orange #ff6118` | `--accent-red #b24133` | Primary buttons, active drop zone |
| `--blue #7dbef5` (attacker) | `--flag-blue #0a3161` / `--accent-blue #3c6dcb` | Team A, always |
| `--gold #f5ca67` (defender) | `--flag-red #b31942` | Team B, always |
| `--green #8bd18f` (mission) | `--mission #a9e0e4` light teal, black text, `--accent-cyan #2b9aa6` edge | Mission cards |
| — | `--success #2f8a4a` | Locked pairing tick |
| `--panel rgba(18,18,18,.9)` | `--panel-strong` cream | Cards and panels |
| Bebas Neue / Oswald | Nunito 800/900 | Headlines, team names |
| IBM Plex Sans | Inter 400–700 | Everything else |
| Pill buttons (999px), 18–28px cards | Radii halved from the regional set: 6px buttons, 8px cards, 12px panels; pills only for chips | Every rectangle |
| — | `.brand-mark` USA flag chip | Top-left of both views |

The stream view gets two backgrounds: **Site** (blue-gray, as on the regional site) and **Broadcast** (deep navy `#0d1b30` with cream cards, easier on the eyes on a dark stream layout). Both use the same tokens. A `?bg=transparent` option drops the background so the board can sit over a camera or a custom overlay.

## Implementation plan

1. **Shared tokens.** Create `docs/assets/brand.css` from the `:root` block in `founders.css`, and import it in `founders.css` so the regional site doesn't change.
2. **Setup restyle.** In `pairing-simulator.html`, remove the orange theme, the `font-size: 50%` root, the grid-paper overlay and the three Google font families. Map the existing classes (`.primary-button`, `.ghost-button`, `.panel`, `.count-pill`, `.sim-card.*`) onto the regional look. Fix the stale hero copy and the "Waiting for rosters" chip.
3. **Stream view.** Add a `#stream` section with its own markup and a render function that reads the existing `state`. Click targets replace drag-and-drop on air, and drag stays available in setup.
4. **Sync.** Post state changes over `BroadcastChannel('pairing')` so a capture window and a control window mirror each other.
5. **Config.** The two team names, background mode and the transparent option go in a small settings row in setup, saved to `localStorage`.
6. **Check.** Playwright screenshots of setup and of every stream step at 1920×1080, plus a 1280×720 downscale to check readability.

Steps 1–2 can ship on their own. Steps 3–5 are the bulk of the work.

## Decisions

| Question | Decision |
|---|---|
| What the stream shows | Current pairings; open, banned and locked missions; Kill Teams picked vs available |
| Round history on stream | Not shown; only the current step |
| Team names | Two names set in setup, for America's scrims between state and regional teams |
| Sponsor or event logo | None |
| Map names | Fixed, no per-event editing |

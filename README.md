# FanSignal

**Buffalo sports, all in one place.** Bills, Sabres, Bandits, Bisons — pulled from the local beats that actually cover them. No politics, no ads, no discourse.

## The bar

FanSignal is built around one success criterion: **for 30 consecutive days, you open FanSignal before opening Twitter or Yahoo for sports news.** Behavior, not aesthetics.

## What's built

- Single-screen Buffalo sports front page — game strip, top story, team columns.
- Team tab filter: **All / Bills / Sabres / Bandits / Bisons**. One tap. No setup.
- "What's new since you last checked" highlight on every story.
- Mobile-first layout — designed to be opened on a phone, fast.
- **Live ingestion** from real open sources (see below) — refreshed on demand by re-running `node ingest.js`.

When `feed.json` is missing or fails to load, the frontend falls back to seeded sample data with a yellow "Sample data" badge visible in the topbar.

## Running it

**Prerequisites:** Node 18+.

```bash
# 1. Pull real Buffalo sports news (writes feed.js + feed.json)
node ingest.js

# 2. Open index.html in your browser. Works straight off file:// — no server needed,
#    because feed.js loads as a <script> tag instead of a fetch.
```

`node ingest.js` typically completes in 3–5 seconds and prints a per-source report.

## Refreshing data

### Full automation (recommended, one-time setup)

Double-click **`setup-autostart.bat`** once. Two things happen:

1. A shortcut to a hidden background watcher (`watch-silent.vbs`) is placed in your Windows Startup folder, so it runs every time you log in. It re-ingests every 10 minutes silently in the background. No visible window.
2. The watcher starts immediately so you don't have to log out and back in.

The frontend independently auto-detects new data every 60 seconds and re-renders the page in place. You'll see a small toast like "*3 new stories*" when fresh content arrives. **You never need to hit F5 again.**

To turn it off later, double-click **`remove-autostart.bat`**. Removes the shortcut and kills the background process.

### Manual options (if you'd rather control it)

- **`refresh.bat`** — double-click for a one-shot pull. Window auto-closes after 5 seconds.
- **`watch.bat`** — double-click for a foreground watcher (visible console window, re-ingests every 10 min).
- **From terminal:**
  - `npm run refresh` — one-shot
  - `npm run watch` — every 10 min until Ctrl+C
  - `node ingest.js --watch 5` — custom interval

### Verifying it's working

After auto-refresh runs, the green chip in the topbar reads "*Live · N sources · updated Xm ago*". When the X drops back toward "just now" without you doing anything, automation is working.

## Sources

All sources are open: public URLs, no API keys, no auth, no paid scraping services.

| Source | What it gives us | Method |
|---|---|---|
| `buffalobills.com/rss/news` | Bills official news | RSS |
| ESPN NFL `team=2` news | National Bills coverage | ESPN public JSON |
| ESPN NHL `team=7` news | National Sabres coverage | ESPN public JSON |
| `bandits.com/rss` | Bandits official news | RSS |
| ESPN NLL news (filtered) | NLL stories mentioning Buffalo | ESPN public JSON |
| `reddit.com/r/buffalobills/hot.json` | Top fan posts | Reddit JSON (no auth) |
| `reddit.com/r/sabres/hot.json` | Top fan posts | Reddit JSON (no auth) |

**Why these and not Twitter:** Twitter killed the free API and locked down scraping in 2023. Paid access starts at ~$200/mo. Scraping services exist in a legal gray area. For v1 we skip Twitter entirely and lean into "the slow-news version of Buffalo sports" — by the time we'd see a beat-writer tweet, their full article is usually on Buffalo News / The Athletic / WGR within an hour, which we can ingest cleanly.

**Why no Buffalo News / WGR 550 / The Athletic yet:** Buffalo News removed their public RSS feeds. WGR 550 (Audacy) doesn't publish RSS. The Athletic is paywalled. All three need either scraping or paid arrangements. Future work.

## Normalized story shape

```ts
{
  id: string,
  team: "bills" | "sabres" | "bandits" | "bisons",
  title: string,
  source: string,           // human-readable byline
  sourceType: "team" | "league" | "reddit",
  sourceCount: number,      // how many sources converged on this story
  publishedAt: ISO string,
  link: string,
  breaking?: boolean,       // true when ≥3 sources publish similar headlines within 60 min
}
```

## How "breaking" works

After ingestion, items are clustered by team + title token similarity (Jaccard ≥ 0.5) within a 6-hour window. The newest item in each cluster is canonical; its `sourceCount` is set to the number of distinct sources that hit it. If ≥3 sources converge inside 60 minutes, the cluster is flagged `breaking: true` and bubbled to the top story slot.

## Phone access

See **[DEPLOY.md](./DEPLOY.md)** — step-by-step guide to ship FanSignal to GitHub Pages so it runs on your phone, refreshes itself in the cloud every 15 minutes, and works as a home-screen app. 15 minutes one-time setup, $0/month forever.

## Next steps

- **Buffalo News / WGR 550 / The Athletic** — investigate scraping or paid feed alternatives once the v1 habit loop is proven.
- **Live in-game polling** — when a Sabres or Bills game is live, poll ESPN's scoreboard every 30s instead of every 15 min (separate code path, only active during games).
- **Push notifications** — for `fire` events specifically. Probably too noisy for hot, but a "🔥 Sabres are blowing up r/sabres right now" push would be high-signal during a Game 7 OT.

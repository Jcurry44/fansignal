// FanSignal ingestion script.
// Pulls real Buffalo sports news from public, open sources and writes feed.json.
// Run with: node ingest.js
// No dependencies. Node 18+ required (uses native fetch).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "feed.json");

const UA = "FanSignal/0.1 (open-source Buffalo sports aggregator)";
const FETCH_TIMEOUT_MS = 12000;
const REDDIT_MIN_SCORE = 3;
const PER_SOURCE_LIMIT = 20;

const SABRES_KEYWORDS = /buffalo|sabres|tage thompson|dahlin|peterka|byram|tuch|cozens|levi|granato|ruff|lyon|benson|quinn|mityukov|helenius/i;
const BILLS_KEYWORDS = /buffalo|bills|josh allen|mcdermott|von miller|cook|knox|kincaid|diggs|kindley|samuel|cooper|coleman|bishop|dorsey|brady|reign|highmark/i;

const SOURCES = [
  // ---------- Bills ----------
  {
    id: "bills-official",
    label: "Bills.com",
    sourceType: "team",
    team: "bills",
    kind: "rss",
    url: "https://www.buffalobills.com/rss/news",
  },
  {
    id: "espn-bills",
    label: "ESPN",
    sourceType: "league",
    team: "bills",
    kind: "espn",
    url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?team=2",
  },
  {
    id: "buffalo-rumblings",
    label: "Buffalo Rumblings",
    sourceType: "blog",
    team: "bills",
    kind: "rss",
    url: "https://www.buffalorumblings.com/rss/current.xml",
  },
  {
    id: "pft-bills",
    label: "ProFootballTalk",
    sourceType: "blog",
    team: "bills",
    kind: "rss",
    url: "https://www.profootballtalk.com/feed/",
    rssFilter: (item) => BILLS_KEYWORDS.test(`${item.title} ${item.summary}`),
  },
  {
    id: "reddit-bills",
    label: "r/buffalobills",
    sourceType: "reddit",
    team: "bills",
    kind: "reddit",
    url: "https://www.reddit.com/r/buffalobills/hot.json?limit=30",
  },

  // ---------- Sabres ----------
  {
    id: "espn-sabres",
    label: "ESPN",
    sourceType: "league",
    team: "sabres",
    kind: "espn",
    url: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news?team=7",
  },
  {
    id: "die-by-the-blade",
    label: "Die By The Blade",
    sourceType: "blog",
    team: "sabres",
    kind: "rss",
    url: "https://www.diebytheblade.com/rss/current.xml",
  },
  {
    id: "buffalo-hockey-beat",
    label: "Buffalo Hockey Beat",
    sourceType: "blog",
    team: "sabres",
    kind: "rss",
    url: "https://buffalohockeybeat.com/feed/",
  },
  {
    id: "sportsnet-nhl",
    label: "Sportsnet",
    sourceType: "league",
    team: "sabres",
    kind: "rss",
    url: "https://www.sportsnet.ca/hockey/feed/",
    rssFilter: (item) => SABRES_KEYWORDS.test(`${item.title} ${item.summary}`),
  },
  {
    id: "cbs-nhl",
    label: "CBS Sports",
    sourceType: "league",
    team: "sabres",
    kind: "rss",
    url: "https://www.cbssports.com/rss/headlines/nhl/",
    rssFilter: (item) => SABRES_KEYWORDS.test(`${item.title} ${item.summary}`),
  },
  {
    id: "espn-nhl-general",
    label: "ESPN NHL",
    sourceType: "league",
    team: "sabres",
    kind: "rss",
    url: "https://www.espn.com/espn/rss/nhl/news",
    rssFilter: (item) => SABRES_KEYWORDS.test(`${item.title} ${item.summary}`),
  },
  {
    id: "reddit-sabres",
    label: "r/sabres",
    sourceType: "reddit",
    team: "sabres",
    kind: "reddit",
    url: "https://www.reddit.com/r/sabres/hot.json?limit=30",
  },

  // ---------- Bandits ----------
  {
    id: "bandits-official",
    label: "Bandits.com",
    sourceType: "team",
    team: "bandits",
    kind: "rss",
    url: "https://bandits.com/rss",
  },
  {
    id: "espn-nll",
    label: "ESPN NLL",
    sourceType: "league",
    team: "bandits",
    kind: "espn",
    url: "https://site.api.espn.com/apis/site/v2/sports/lacrosse/nll/news",
    filter: (item) => /buffalo|bandits/i.test(item.headline + " " + (item.description || "")),
  },
];

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/json, application/xml, text/xml, */*" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s) {
  return String(s ?? "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&nbsp;", " ");
}

function stripTags(s) {
  return decodeEntities(String(s ?? "").replace(/<[^>]+>/g, "")).trim();
}

function unwrapCdata(s) {
  if (!s) return "";
  const m = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(s);
  return (m ? m[1] : s).trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(block);
  return m ? unwrapCdata(m[1]) : "";
}

function extractAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = re.exec(block);
  return m ? m[1] : "";
}

function parseRss(xml, source) {
  const items = [];
  // Channel-level lastBuildDate used as fallback when items don't carry pubDate
  const channelBuild = /<channel[\s\S]*?<lastBuildDate[^>]*>([\s\S]*?)<\/lastBuildDate>/i.exec(xml);
  const channelBuildAt = channelBuild ? Date.parse(unwrapCdata(channelBuild[1])) : NaN;
  const fallbackBase = Number.isFinite(channelBuildAt) ? channelBuildAt : Date.now();

  const itemRe = /<item[\s\S]*?<\/item>/gi;
  const blocks = xml.match(itemRe) || [];
  blocks.forEach((block, idx) => {
    const title = stripTags(extractTag(block, "title"));
    const link = stripTags(extractTag(block, "link")) || extractAttr(block, "link", "href");
    const pubDateRaw = extractTag(block, "pubDate") || extractTag(block, "dc:date") || extractTag(block, "published");
    const description = stripTags(extractTag(block, "description"));
    if (!title || !link) return;
    // Items appear newest-first in feeds; stagger fallback by 1 min per index so
    // they sort in feed order rather than colliding on one timestamp.
    const parsed = pubDateRaw ? Date.parse(pubDateRaw) : NaN;
    const publishedAt = Number.isFinite(parsed)
      ? new Date(parsed).toISOString()
      : new Date(fallbackBase - idx * 60_000).toISOString();
    const item = {
      id: `${source.id}::${link}`,
      team: source.team,
      title,
      summary: description,
      source: source.label,
      sourceType: source.sourceType,
      sourceCount: 1,
      publishedAt,
      link,
    };
    if (source.rssFilter && !source.rssFilter(item)) return;
    items.push(item);
  });
  return items;
}

function parseAtom(xml, source) {
  const items = [];
  const entryRe = /<entry[\s\S]*?<\/entry>/gi;
  const blocks = xml.match(entryRe) || [];
  for (const block of blocks) {
    const title = stripTags(extractTag(block, "title"));
    const link = extractAttr(block, "link", "href") || stripTags(extractTag(block, "link"));
    const pubDateRaw = extractTag(block, "updated") || extractTag(block, "published");
    if (!title || !link) continue;
    items.push({
      id: `${source.id}::${link}`,
      team: source.team,
      title,
      summary: "",
      source: source.label,
      sourceType: source.sourceType,
      sourceCount: 1,
      publishedAt: pubDateRaw ? new Date(pubDateRaw).toISOString() : new Date().toISOString(),
      link,
    });
  }
  return items;
}

function parseEspn(json, source) {
  const data = JSON.parse(json);
  const articles = data.articles || [];
  const items = [];
  for (const a of articles) {
    if (source.filter && !source.filter(a)) continue;
    const link = a.links?.web?.href;
    if (!a.headline || !link) continue;
    const byline = a.byline ? `${source.label} · ${a.byline}` : source.label;
    items.push({
      id: `${source.id}::${a.id || link}`,
      team: source.team,
      title: a.headline,
      summary: a.description || "",
      source: byline,
      sourceType: source.sourceType,
      sourceCount: 1,
      publishedAt: a.published || a.lastModified || new Date().toISOString(),
      link,
    });
  }
  return items;
}

function parseReddit(json, source) {
  const data = JSON.parse(json);
  const posts = data.data?.children || [];
  const now = Date.now();
  const items = [];
  for (const p of posts) {
    const d = p.data;
    if (!d || d.stickied || d.over_18) continue;
    if ((d.score || 0) < REDDIT_MIN_SCORE) continue;
    const link = `https://www.reddit.com${d.permalink}`;
    const createdMs = (d.created_utc || 0) * 1000;
    const hoursOld = Math.max(0.25, (now - createdMs) / 3_600_000);
    const comments = d.num_comments || 0;
    const score = d.score || 0;
    const commentsPerHour = comments / hoursOld;
    const item = {
      id: `${source.id}::${d.id}`,
      team: source.team,
      title: d.title,
      summary: (d.selftext || "").slice(0, 240),
      source: source.label,
      sourceType: source.sourceType,
      sourceCount: 1,
      publishedAt: new Date(createdMs).toISOString(),
      link,
      comments,
      score,
    };
    // Fire = blowing up right now. Hot = significantly above baseline.
    // Min comment count guards against young posts with high per-hour rates that aren't actually threads.
    if (commentsPerHour >= 20 && comments >= 30) item.fire = true;
    else if (commentsPerHour >= 8 && comments >= 15) item.hot = true;
    items.push(item);
  }
  return items;
}

async function ingestSource(source) {
  try {
    const body = await fetchWithTimeout(source.url);
    let items = [];
    if (source.kind === "rss") {
      items = parseRss(body, source);
      if (!items.length) items = parseAtom(body, source);
    } else if (source.kind === "espn") {
      items = parseEspn(body, source);
    } else if (source.kind === "reddit") {
      items = parseReddit(body, source);
    }
    items = items.slice(0, PER_SOURCE_LIMIT);
    return { source, items, error: null };
  } catch (err) {
    return { source, items: [], error: err.message || String(err) };
  }
}

function tokenize(s) {
  return new Set(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function dedupeAndCount(items) {
  // Group items with very similar titles within 6 hours; pick newest as canonical,
  // bump its sourceCount, and flag as breaking if >=3 sources converge in <60 min.
  const withTokens = items.map((it) => ({ ...it, _t: tokenize(it.title), _ts: Date.parse(it.publishedAt) }));
  withTokens.sort((a, b) => b._ts - a._ts);

  const clusters = [];
  for (const it of withTokens) {
    let attached = false;
    for (const cluster of clusters) {
      if (cluster[0].team !== it.team) continue;
      const dt = Math.abs(cluster[0]._ts - it._ts);
      if (dt > 6 * 60 * 60 * 1000) continue;
      if (jaccard(cluster[0]._t, it._t) >= 0.5) {
        cluster.push(it);
        attached = true;
        break;
      }
    }
    if (!attached) clusters.push([it]);
  }

  return clusters.map((cluster) => {
    const canonical = cluster[0];
    const uniqueSources = new Set(cluster.map((c) => c.source));
    const tsSpread = Math.max(...cluster.map((c) => c._ts)) - Math.min(...cluster.map((c) => c._ts));
    const breaking = uniqueSources.size >= 3 && tsSpread <= 60 * 60 * 1000;
    const { _t, _ts, ...rest } = canonical;
    return {
      ...rest,
      sourceCount: uniqueSources.size,
      ...(breaking ? { breaking: true } : {}),
    };
  });
}

async function fetchNhlSabresGames() {
  try {
    // Full season endpoint includes regular season + all playoff rounds, not just rolling window.
    const body = await fetchWithTimeout("https://api-web.nhle.com/v1/club-schedule-season/BUF/now");
    const data = JSON.parse(body);
    const games = (data.games || []).map((g) => ({
      ...g,
      _ts: Date.parse(g.startTimeUTC || g.gameDate),
    }));
    if (!games.length) return null;

    // Pick the featured game: live → most recent final → next upcoming.
    const live = games.find((g) => /^(LIVE|CRIT)$/i.test(g.gameState));
    const finals = games.filter((g) => /^(OFF|FINAL)$/i.test(g.gameState)).sort((a, b) => b._ts - a._ts);
    const future = games.filter((g) => /^FUT$/i.test(g.gameState)).sort((a, b) => a._ts - b._ts);
    const featured = live || finals[0] || future[0];
    if (!featured) return null;

    const isHome = featured.homeTeam.abbrev === "BUF";
    const opp = isHome ? featured.awayTeam : featured.homeTeam;
    const buft = isHome ? featured.homeTeam : featured.awayTeam;

    let state, headline, detail;
    if (/^(LIVE|CRIT)$/i.test(featured.gameState)) {
      state = "live";
      headline = `${buft.score} - ${opp.score}`;
      const period = featured.periodDescriptor?.number ? `P${featured.periodDescriptor.number}` : "";
      const clock = featured.clock?.timeRemaining || "";
      detail = `${isHome ? "vs" : "at"} ${opp.abbrev} · ${period} ${clock}`.trim();
    } else if (/^(OFF|FINAL)$/i.test(featured.gameState)) {
      state = "final";
      const result = buft.score > opp.score ? "W" : "L";
      headline = `Final · ${result} ${buft.score}-${opp.score}`;
      detail = `${isHome ? "vs" : "at"} ${opp.abbrev}`;
    } else {
      state = "upcoming";
      const t = new Date(featured.startTimeUTC || featured.gameDate);
      const day = t.toLocaleString("en-US", { weekday: "short", timeZone: "America/New_York" });
      const time = t.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
      headline = `${day} ${time}`;
      detail = `${isHome ? "vs" : "at"} ${opp.abbrev}`;
    }

    // Series context: walk back through consecutive playoff games against the same opponent
    // to isolate the current series (not all of Buffalo's playoff games this season).
    let seriesNote = null;
    if (featured.gameType === 3) {
      const oppAbbr = opp.abbrev;
      const allPlayoff = games.filter((g) => g.gameType === 3).sort((a, b) => a._ts - b._ts);
      const seriesGames = allPlayoff.filter((g) => g.homeTeam.abbrev === oppAbbr || g.awayTeam.abbrev === oppAbbr);
      const completed = seriesGames.filter((g) => /^(OFF|FINAL)$/i.test(g.gameState));
      const bufWins = completed.filter((g) => {
        const home = g.homeTeam.abbrev === "BUF" ? g.homeTeam : g.awayTeam;
        const away = g.homeTeam.abbrev === "BUF" ? g.awayTeam : g.homeTeam;
        return home.score > away.score;
      }).length;
      const oppWins = completed.length - bufWins;
      if (bufWins === oppWins) seriesNote = `Series tied ${bufWins}-${oppWins}`;
      else if (bufWins > oppWins) seriesNote = `Sabres lead ${bufWins}-${oppWins}`;
      else seriesNote = `Trail ${bufWins}-${oppWins}`;
    }

    return {
      team: "sabres",
      state,
      headline,
      detail: seriesNote ? `${detail} · ${seriesNote}` : detail,
    };
  } catch (err) {
    console.warn(`  ! sabres game fetch failed: ${err.message}`);
    return null;
  }
}

async function fetchEspnGame(teamKey, sportPath, teamId) {
  try {
    const body = await fetchWithTimeout(`https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${teamId}/schedule`);
    const data = JSON.parse(body);
    const events = data.events || [];
    if (!events.length) return null;
    const now = Date.now();
    const sorted = [...events].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const future = sorted.find((e) => Date.parse(e.date) > now);
    const past = [...sorted].reverse().find((e) => Date.parse(e.date) <= now);
    const featured = future || past;
    if (!featured) return null;
    const comp = featured.competitions?.[0];
    const competitors = comp?.competitors || [];
    const us = competitors.find((c) => String(c.team?.id) === String(teamId));
    const them = competitors.find((c) => String(c.team?.id) !== String(teamId));
    const status = comp?.status?.type?.state; // pre, in, post
    const t = new Date(featured.date);
    const day = t.toLocaleString("en-US", { weekday: "short", timeZone: "America/New_York" });
    const time = t.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    if (status === "in") {
      return {
        team: teamKey,
        state: "live",
        headline: `${us.score} - ${them.score}`,
        detail: `${us.homeAway === "home" ? "vs" : "at"} ${them.team.abbreviation} · ${comp.status.type.shortDetail}`,
      };
    }
    if (status === "post") {
      const result = parseInt(us.score, 10) > parseInt(them.score, 10) ? "W" : "L";
      return {
        team: teamKey,
        state: "final",
        headline: `Final · ${result} ${us.score}-${them.score}`,
        detail: `${us.homeAway === "home" ? "vs" : "at"} ${them.team.abbreviation}`,
      };
    }
    return {
      team: teamKey,
      state: "upcoming",
      headline: `${day} ${time}`,
      detail: `${us.homeAway === "home" ? "vs" : "at"} ${them.team.abbreviation}`,
    };
  } catch (err) {
    console.warn(`  ! ${teamKey} game fetch failed: ${err.message}`);
    return null;
  }
}

async function fetchGames() {
  console.log("[FanSignal] Fetching live game data...");
  const [sabres, bills, bisons] = await Promise.all([
    fetchNhlSabresGames(),
    fetchEspnGame("bills", "football/nfl", 2),
    fetchEspnGame("bisons", "baseball/mlb", 14),
  ]);
  // Bandits don't have an ESPN team schedule endpoint; leave a static "Season over"
  // until/unless we find a better source. Their official feed told us the season just ended.
  const bandits = {
    team: "bandits",
    state: "offday",
    headline: "Season over",
    detail: "1st round vs GA",
  };
  const games = [bills, sabres, bandits, bisons].filter(Boolean);
  console.log(`  fetched ${games.length} games`);
  return games;
}

async function main() {
  const startedAt = new Date();
  console.log(`[FanSignal] Ingesting from ${SOURCES.length} sources...`);
  const [results, games] = await Promise.all([
    Promise.all(SOURCES.map(ingestSource)),
    fetchGames(),
  ]);

  let allItems = [];
  const sourceReport = [];
  for (const r of results) {
    sourceReport.push({
      id: r.source.id,
      label: r.source.label,
      team: r.source.team,
      itemCount: r.items.length,
      error: r.error,
    });
    if (r.error) {
      console.warn(`  ! ${r.source.id.padEnd(22)} FAILED: ${r.error}`);
    } else {
      console.log(`  ${r.source.id.padEnd(22)} ${String(r.items.length).padStart(3)} items`);
    }
    allItems = allItems.concat(r.items);
  }

  const deduped = dedupeAndCount(allItems);
  deduped.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const out = {
    generatedAt: startedAt.toISOString(),
    sources: sourceReport,
    games,
    stories: deduped,
  };

  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  // Also write feed.js so the page works when opened via file:// (no server),
  // since browsers block fetch() between local files but allow <script> loads.
  const JS_OUT_PATH = path.join(__dirname, "feed.js");
  await fs.writeFile(
    JS_OUT_PATH,
    `// Generated by ingest.js — do not edit by hand.\nwindow.__FANSIGNAL_FEED__ = ${JSON.stringify(out)};\n`,
    "utf8",
  );

  const byTeam = deduped.reduce((acc, s) => ((acc[s.team] = (acc[s.team] || 0) + 1), acc), {});
  console.log(`\n[FanSignal] Wrote ${deduped.length} stories to feed.json + feed.js`);
  console.log(`  by team: ${JSON.stringify(byTeam)}`);
  console.log(`  breaking: ${deduped.filter((s) => s.breaking).length}`);
}

// Watch mode: pass --watch [minutes] to re-ingest on an interval.
// Examples: node ingest.js --watch   (default 10 min)
//           node ingest.js --watch 5 (every 5 min)
const watchIdx = process.argv.indexOf("--watch");
if (watchIdx !== -1) {
  const intervalMin = Math.max(1, parseInt(process.argv[watchIdx + 1], 10) || 10);
  (async () => {
    while (true) {
      try {
        await main();
      } catch (err) {
        console.error("[watch] ingest failed:", err.message || err);
      }
      console.log(`[watch] next refresh in ${intervalMin}m (Ctrl+C to stop)\n`);
      await new Promise((r) => setTimeout(r, intervalMin * 60 * 1000));
    }
  })();
} else {
  main().catch((err) => {
    console.error("[FanSignal] Fatal:", err);
    process.exit(1);
  });
}

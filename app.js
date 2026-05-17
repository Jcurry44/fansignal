const STORAGE_KEY = "fansignal-prefs-v2";

const TEAMS = [
  { id: "bills", label: "Buffalo Bills", short: "Bills", league: "NFL", color: "#00338d", accent: "#c60c30" },
  { id: "sabres", label: "Buffalo Sabres", short: "Sabres", league: "NHL", color: "#002654", accent: "#fcb514" },
  { id: "bandits", label: "Buffalo Bandits", short: "Bandits", league: "NLL", color: "#ed6a2e", accent: "#24303c" },
  { id: "bisons", label: "Buffalo Bisons", short: "Bisons", league: "AAA", color: "#c8102e", accent: "#1d2d5c" },
  { id: "usmnt", label: "USMNT", short: "USMNT", league: "Soccer", color: "#002868", accent: "#bf0a30" },
];

const SOURCES = {
  beat: { label: "Beat writer" },
  team: { label: "Team site" },
  league: { label: "League" },
  blog: { label: "Blog" },
  forum: { label: "Fan forum" },
  paper: { label: "Buffalo News" },
  radio: { label: "WGR 550" },
  athletic: { label: "The Athletic" },
  reddit: { label: "Reddit" },
};

// Source filter pills shown under team tabs. Each pill can cover one or more
// underlying sourceType values. Order matters (rendered left-to-right).
const SOURCE_FILTERS = [
  { id: "official", label: "Official", types: ["team"], description: "Team sites (Bills.com, Bandits.com)" },
  { id: "national", label: "National", types: ["league"], description: "ESPN, Sportsnet, CBS" },
  { id: "blogs", label: "Blogs", types: ["blog"], description: "Die By The Blade, Buffalo Rumblings, Buffalo Hockey Beat" },
  { id: "community", label: "Community", types: ["reddit", "forum"], description: "r/buffalobills, r/sabres, HFBoards" },
];
const ALL_SOURCE_TYPES = [...new Set(SOURCE_FILTERS.flatMap((f) => f.types))];

const DEFAULT_PREFS = {
  activeTeam: "all",
  // We persist sourceType IDs (not pill IDs) so saved prefs survive pill-grouping changes.
  activeSourceTypes: ["team", "league", "blog", "reddit", "forum"], // all on by default
  lastCheckedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
};

let NOW = new Date();
let LIVE_FEED_INFO = null;

// Demo data — calendar-aware for mid-May (offseason football, NHL season over,
// NLL playoff window, MiLB regular season). Replaced by real ingestion in Days 4-8.
const SAMPLE_STORIES = [
  {
    id: "bills-rookie-minicamp-open",
    team: "bills",
    title: "Bills rookie minicamp opens at One Bills Drive — first looks at the 2026 draft class",
    source: "Maddy Glab",
    sourceType: "team",
    sourceCount: 4,
    minutesAgo: 38,
    breaking: true,
    link: "https://www.buffalobills.com/",
  },
  {
    id: "bills-otas-attendance",
    team: "bills",
    title: "Voluntary OTA attendance notes: veteran corner on hand, two starters absent",
    source: "Sal Capaccio",
    sourceType: "radio",
    sourceCount: 3,
    minutesAgo: 95,
    link: "https://www.audacy.com/wgr550",
  },
  {
    id: "bills-schedule-takeaways",
    team: "bills",
    title: "Five things the 2026 schedule release tells us about Buffalo's path back to the AFC title game",
    source: "Joe Buscaglia",
    sourceType: "athletic",
    sourceCount: 1,
    minutesAgo: 210,
    link: "https://www.nytimes.com/athletic/",
  },
  {
    id: "bills-cap-update",
    team: "bills",
    title: "Where the Bills' cap sits after the post-draft signings — and what's still possible",
    source: "Matthew Fairburn",
    sourceType: "athletic",
    sourceCount: 1,
    minutesAgo: 320,
    link: "https://www.nytimes.com/athletic/",
  },
  {
    id: "bills-skurski-column",
    team: "bills",
    title: "Skurski: The under-the-radar position battle that could define Bills training camp",
    source: "Jay Skurski",
    sourceType: "paper",
    sourceCount: 1,
    minutesAgo: 540,
    link: "https://buffalonews.com/",
  },
  {
    id: "bills-reddit-otas",
    team: "bills",
    title: "OTAs notebook thread — what fans on the ground are seeing this week",
    source: "r/buffalobills",
    sourceType: "reddit",
    sourceCount: 1,
    minutesAgo: 145,
    link: "https://www.reddit.com/r/buffalobills/",
  },

  {
    id: "sabres-coaching-staff-move",
    team: "sabres",
    title: "Sabres add to coaching staff with development-focused hire ahead of Draft",
    source: "Lance Lysowski",
    sourceType: "paper",
    sourceCount: 4,
    minutesAgo: 52,
    breaking: true,
    link: "https://buffalonews.com/",
  },
  {
    id: "sabres-draft-lottery-recap",
    team: "sabres",
    title: "After the Lottery: where the Sabres pick, who they're connected to, what scouts are saying",
    source: "John Vogl",
    sourceType: "athletic",
    sourceCount: 2,
    minutesAgo: 180,
    link: "https://www.nytimes.com/athletic/",
  },
  {
    id: "sabres-free-agency-targets",
    team: "sabres",
    title: "Three veteran free agents the Sabres should target on July 1 — and the salary fit for each",
    source: "Mike Harrington",
    sourceType: "paper",
    sourceCount: 1,
    minutesAgo: 270,
    link: "https://buffalonews.com/",
  },
  {
    id: "sabres-rochester-recap",
    team: "sabres",
    title: "Rochester wraps season — five prospects who pushed themselves onto the NHL radar",
    source: "Bill Hoppe",
    sourceType: "radio",
    sourceCount: 2,
    minutesAgo: 410,
    link: "https://www.audacy.com/wgr550",
  },
  {
    id: "sabres-exit-interviews",
    team: "sabres",
    title: "Exit-interview notes: what the captaincy and locker-room voices said on the way out",
    source: "NHL.com / Sabres",
    sourceType: "team",
    sourceCount: 1,
    minutesAgo: 620,
    link: "https://www.nhl.com/sabres/",
  },

  {
    id: "bandits-semifinal-preview",
    team: "bandits",
    title: "Bandits' NLL semifinal series preview: transition lanes, faceoff battle, goalie matchup",
    source: "Bandits.com",
    sourceType: "team",
    sourceCount: 3,
    minutesAgo: 70,
    breaking: true,
    link: "https://bandits.com/",
  },
  {
    id: "bandits-keybank-game-2",
    team: "bandits",
    title: "Game 2 at KeyBank Center sells out — what to watch for after Buffalo's road win",
    source: "NLL Insider",
    sourceType: "league",
    sourceCount: 2,
    minutesAgo: 200,
    link: "https://www.nll.com/",
  },
  {
    id: "bandits-injury-note",
    team: "bandits",
    title: "Bandits forward listed as game-time decision after taking a hit late in Game 1",
    source: "WGR 550",
    sourceType: "radio",
    sourceCount: 2,
    minutesAgo: 130,
    link: "https://www.audacy.com/wgr550",
  },

  {
    id: "bisons-callup-toronto",
    team: "bisons",
    title: "Bisons infielder recalled to Toronto for weekend series after hot two-week stretch",
    source: "Bisons.com",
    sourceType: "team",
    sourceCount: 2,
    minutesAgo: 85,
    link: "https://www.milb.com/buffalo",
  },
  {
    id: "bisons-walkoff",
    team: "bisons",
    title: "Walk-off single in the 10th gives Bisons series opener at Sahlen Field",
    source: "Buffalo News",
    sourceType: "paper",
    sourceCount: 2,
    minutesAgo: 720,
    link: "https://buffalonews.com/",
  },
  {
    id: "bisons-prospect-streak",
    team: "bisons",
    title: "Blue Jays' top pitching prospect extends scoreless streak in Triple-A start",
    source: "Bisons.com",
    sourceType: "team",
    sourceCount: 1,
    minutesAgo: 850,
    link: "https://www.milb.com/buffalo",
  },
];

const SAMPLE_GAMES = [
  {
    team: "bills",
    state: "offday",
    headline: "Offseason",
    detail: "OTAs · Mandatory minicamp Jun 9",
  },
  {
    team: "sabres",
    state: "offday",
    headline: "Season over",
    detail: "NHL Draft · Jun 26 in LA",
  },
  {
    team: "bandits",
    state: "upcoming",
    headline: "Tonight 7:30",
    detail: "NLL Semis G2 vs ROC · KeyBank",
  },
  {
    team: "bisons",
    state: "final",
    headline: "Final · W 5-4 (10)",
    detail: "vs SWB · Walk-off",
  },
  {
    team: "usmnt",
    state: "offday",
    headline: "Off window",
    detail: "Next FIFA window: June",
  },
];

const els = {
  lastCheckedLabel: document.querySelector("#lastCheckedLabel"),
  markCheckedButton: document.querySelector("#markCheckedButton"),
  gameStrip: document.querySelector("#gameStrip"),
  teamTabs: document.querySelector("#teamTabs"),
  sourcePills: document.querySelector("#sourcePills"),
  topStory: document.querySelector("#topStory"),
  teamColumns: document.querySelector("#teamColumns"),
  emptyState: document.querySelector("#emptyState"),
  toast: document.querySelector("#toast"),
};

let prefs = loadPrefs();

function loadPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...DEFAULT_PREFS, ...stored };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function teamById(id) {
  return TEAMS.find((team) => team.id === id);
}

function sourceLabel(sourceType) {
  return SOURCES[sourceType]?.label || sourceType;
}

function storyTime(story) {
  if (story.publishedAt) {
    const t = Date.parse(story.publishedAt);
    if (Number.isFinite(t)) return new Date(t);
  }
  return new Date(NOW.getTime() - (story.minutesAgo || 0) * 60 * 1000);
}

let STORIES = SAMPLE_STORIES;
let GAMES = SAMPLE_GAMES;

function applyFeedData(data) {
  if (!data || !Array.isArray(data.stories) || !data.stories.length) return false;
  STORIES = data.stories;
  if (Array.isArray(data.games) && data.games.length) {
    // Real games for teams the ingest pulled, hardcoded fallback for others.
    const realByTeam = Object.fromEntries(data.games.map((g) => [g.team, g]));
    GAMES = SAMPLE_GAMES.map((g) => realByTeam[g.team] || g);
  }
  LIVE_FEED_INFO = {
    generatedAt: data.generatedAt,
    sources: data.sources || [],
    storyCount: data.stories.length,
  };
  NOW = new Date();
  document.body.classList.add("is-live");
  return true;
}

async function loadFeed() {
  // Path 1: feed.js was loaded as a <script> tag and exposed a global.
  // This works under file:// and http:// alike.
  if (typeof window !== "undefined" && window.__FANSIGNAL_FEED__) {
    if (applyFeedData(window.__FANSIGNAL_FEED__)) {
      console.info("[FanSignal] Loaded data from feed.js");
      return true;
    }
  }
  // Path 2: fetch feed.json (works when served via http, blocked under file://).
  try {
    const res = await fetch("./feed.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (applyFeedData(data)) {
      console.info("[FanSignal] Loaded data from feed.json fetch");
      return true;
    }
    throw new Error("feed.json has no stories");
  } catch (err) {
    console.info("[FanSignal] No live feed available — using sample data.", err.message);
    return false;
  }
}

function formatRelative(date) {
  const diff = Math.max(0, NOW.getTime() - date.getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function activeSourceTypes() {
  const fromPrefs = Array.isArray(prefs.activeSourceTypes) ? prefs.activeSourceTypes : ALL_SOURCE_TYPES;
  // Guard against an empty list locking the user out — fall back to all-on.
  return fromPrefs.length ? fromPrefs : ALL_SOURCE_TYPES;
}

function visibleStories() {
  const activeTypes = new Set(activeSourceTypes());
  const teamFiltered = prefs.activeTeam === "all"
    ? STORIES
    : STORIES.filter((story) => story.team === prefs.activeTeam);
  const filtered = teamFiltered.filter((story) => activeTypes.has(story.sourceType));
  return [...filtered].sort((a, b) => {
    if (a.breaking && !b.breaking) return -1;
    if (!a.breaking && b.breaking) return 1;
    return storyTime(b).getTime() - storyTime(a).getTime();
  });
}

function isNew(story) {
  const lastChecked = new Date(prefs.lastCheckedAt || 0);
  return storyTime(story) > lastChecked;
}

function renderGameStrip() {
  els.gameStrip.innerHTML = GAMES.map((game) => {
    const team = teamById(game.team);
    if (!team) return "";
    const stateClass = `state-${game.state}`;
    return `
      <button class="game-card ${stateClass}" type="button" data-team-jump="${team.id}" style="--team-color:${team.color}; --team-accent:${team.accent}">
        <span class="game-team">
          <span class="team-bar" aria-hidden="true"></span>
          ${escapeHtml(team.short)}
        </span>
        <span class="game-headline">${escapeHtml(game.headline)}</span>
        <span class="game-detail">${escapeHtml(game.detail)}</span>
      </button>
    `;
  }).join("");
}

function renderTeamTabs() {
  const tabs = [
    { id: "all", label: "All", color: "#24303c" },
    ...TEAMS.map((team) => ({ id: team.id, label: team.short, color: team.color })),
  ];
  els.teamTabs.innerHTML = tabs.map((tab) => `
    <button class="team-tab ${prefs.activeTeam === tab.id ? "active" : ""}" type="button" data-tab="${tab.id}" style="--team-color:${tab.color}">
      ${escapeHtml(tab.label)}
    </button>
  `).join("");
}

function renderSourcePills() {
  if (!els.sourcePills) return;
  // Count stories per source type within the current team filter (so counts react to team changes too).
  const teamScoped = prefs.activeTeam === "all"
    ? STORIES
    : STORIES.filter((s) => s.team === prefs.activeTeam);
  const counts = teamScoped.reduce((acc, s) => ((acc[s.sourceType] = (acc[s.sourceType] || 0) + 1), acc), {});
  const active = new Set(activeSourceTypes());
  els.sourcePills.innerHTML = SOURCE_FILTERS.map((f) => {
    // Pill count = sum of underlying sourceType counts.
    const pillCount = f.types.reduce((sum, t) => sum + (counts[t] || 0), 0);
    // Pill is "on" if at least one of its underlying types is active.
    const on = f.types.some((t) => active.has(t));
    return `
      <button class="source-pill ${on ? "active" : ""}" type="button"
              data-pill="${f.id}" title="${escapeHtml(f.description)}"
              aria-pressed="${on ? "true" : "false"}">
        <span>${escapeHtml(f.label)}</span>
        <strong>${pillCount}</strong>
      </button>
    `;
  }).join("");
}

function renderTopStory(stories) {
  const top = stories.find((story) => story.breaking) || stories[0];
  if (!top) {
    els.topStory.innerHTML = "";
    els.topStory.classList.add("is-hidden");
    return;
  }
  els.topStory.classList.remove("is-hidden");
  const team = teamById(top.team);
  const confirmed = top.sourceCount > 1 ? `${top.sourceCount} sources` : "1 source";
  const breakingTag = top.breaking ? `<span class="breaking-pill">Breaking</span>` : "";
  els.topStory.innerHTML = `
    <article class="top-story-card ${isNew(top) ? "is-new" : ""}" style="--team-color:${team?.color || "#24303c"}; --team-accent:${team?.accent || "#1f66d1"}">
      <div class="top-story-meta">
        <span class="team-chip">${escapeHtml(team?.short || "Buffalo")}</span>
        ${breakingTag}
        <span class="time-chip">${escapeHtml(formatRelative(storyTime(top)))}</span>
      </div>
      <a class="top-story-title" href="${escapeHtml(top.link)}" target="_blank" rel="noreferrer">
        ${escapeHtml(top.title)}
      </a>
      <div class="top-story-source">
        <strong>${escapeHtml(top.source)}</strong>
        <span>${escapeHtml(sourceLabel(top.sourceType))} · ${escapeHtml(confirmed)}</span>
      </div>
    </article>
  `;
}

function renderStoryRow(story) {
  const team = teamById(story.team);
  const confirmed = story.sourceCount > 1 ? `<span class="confirmed-pill" title="${story.sourceCount} sources confirming">&check; ${story.sourceCount}</span>` : "";
  const breaking = story.breaking ? `<span class="breaking-pill small">Breaking</span>` : "";

  // Reddit-only signals
  const commentBadge = (story.sourceType === "reddit" && typeof story.comments === "number")
    ? `<span class="comment-badge" title="${story.comments} comments"><svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="currentColor" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H6.7l-3.1 2.7A.5.5 0 0 1 2.8 13.3V11H3.5A1.5 1.5 0 0 1 2 9.5v-6Z"/></svg>${story.comments}</span>`
    : "";
  const heatPill = story.fire
    ? `<span class="heat-pill fire" title="Comments-per-hour is way above baseline">🔥 Fire</span>`
    : story.hot
      ? `<span class="heat-pill hot" title="Comments-per-hour is above baseline">Hot</span>`
      : "";

  return `
    <li class="story-row ${isNew(story) ? "is-new" : ""} ${story.fire ? "is-fire" : story.hot ? "is-hot" : ""}" style="--team-color:${team?.color || "#24303c"}">
      <a class="story-link" href="${escapeHtml(story.link)}" target="_blank" rel="noreferrer">
        <span class="story-title">${escapeHtml(story.title)}</span>
        <span class="story-meta-line">
          <strong>${escapeHtml(story.source)}</strong>
          <span class="dot" aria-hidden="true">·</span>
          <span>${escapeHtml(sourceLabel(story.sourceType))}</span>
          <span class="dot" aria-hidden="true">·</span>
          <span class="time">${escapeHtml(formatRelative(storyTime(story)))}</span>
          ${commentBadge}
          ${heatPill}
          ${confirmed}
          ${breaking}
        </span>
      </a>
    </li>
  `;
}

function renderTeamColumns(stories) {
  const topStoryId = (stories.find((story) => story.breaking) || stories[0])?.id;
  const remaining = stories.filter((story) => story.id !== topStoryId);

  let columnsHtml = "";
  if (prefs.activeTeam === "all") {
    const order = ["bills", "sabres", "bandits", "bisons", "usmnt"];
    columnsHtml = order.map((teamId) => {
      const team = teamById(teamId);
      const teamStories = remaining.filter((story) => story.team === teamId).slice(0, 6);
      if (!teamStories.length) return "";
      return `
        <section class="team-column" style="--team-color:${team.color}; --team-accent:${team.accent}">
          <header class="team-column-header">
            <span class="team-color-bar" aria-hidden="true"></span>
            <h2>${escapeHtml(team.label)}</h2>
            <span class="team-league">${escapeHtml(team.league)}</span>
          </header>
          <ul class="story-list">
            ${teamStories.map(renderStoryRow).join("")}
          </ul>
        </section>
      `;
    }).join("");
  } else {
    const team = teamById(prefs.activeTeam);
    const teamStories = remaining.filter((story) => story.team === prefs.activeTeam);
    if (team && teamStories.length) {
      columnsHtml = `
        <section class="team-column single" style="--team-color:${team.color}; --team-accent:${team.accent}">
          <header class="team-column-header">
            <span class="team-color-bar" aria-hidden="true"></span>
            <h2>${escapeHtml(team.label)}</h2>
            <span class="team-league">${escapeHtml(team.league)}</span>
          </header>
          <ul class="story-list">
            ${teamStories.map(renderStoryRow).join("")}
          </ul>
        </section>
      `;
    }
  }

  els.teamColumns.innerHTML = columnsHtml;
  const isEmpty = !stories.length;
  els.emptyState.classList.toggle("is-visible", isEmpty);
  els.teamColumns.classList.toggle("is-hidden", isEmpty);
  els.topStory.classList.toggle("is-hidden", isEmpty);
}

function renderLastChecked() {
  if (LIVE_FEED_INFO?.generatedAt) {
    const age = formatRelative(new Date(LIVE_FEED_INFO.generatedAt));
    const sourceCount = LIVE_FEED_INFO.sources.filter((s) => s.itemCount > 0).length;
    els.lastCheckedLabel.textContent = `Live · ${sourceCount} sources · updated ${age}`;
  } else if (prefs.lastCheckedAt) {
    els.lastCheckedLabel.textContent = `Last checked ${formatRelative(new Date(prefs.lastCheckedAt))}`;
  } else {
    els.lastCheckedLabel.textContent = "Never checked";
  }
}

function render() {
  const stories = visibleStories();
  renderGameStrip();
  renderTeamTabs();
  renderSourcePills();
  renderTopStory(stories);
  renderTeamColumns(stories);
  renderLastChecked();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2000);
}

els.teamTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  prefs.activeTeam = button.dataset.tab;
  savePrefs();
  render();
});

if (els.sourcePills) {
  els.sourcePills.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pill]");
    if (!button) return;
    const pill = SOURCE_FILTERS.find((f) => f.id === button.dataset.pill);
    if (!pill) return;
    const current = new Set(activeSourceTypes());
    // If any underlying type is currently on, the pill is "on" — turn them all off.
    // Otherwise turn them all on.
    const pillIsOn = pill.types.some((t) => current.has(t));
    if (pillIsOn) {
      pill.types.forEach((t) => current.delete(t));
    } else {
      pill.types.forEach((t) => current.add(t));
    }
    // If user deselected everything, treat that as "all on" so they aren't stuck on an empty page.
    prefs.activeSourceTypes = current.size ? [...current] : [...ALL_SOURCE_TYPES];
    savePrefs();
    render();
  });
}

els.gameStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-team-jump]");
  if (!button) return;
  prefs.activeTeam = button.dataset.teamJump;
  savePrefs();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

els.markCheckedButton.addEventListener("click", () => {
  prefs.lastCheckedAt = new Date().toISOString();
  savePrefs();
  render();
  showToast("Caught up.");
});

render();
loadFeed().then((loaded) => {
  if (loaded) render();
  // The initial loadFeed reads from the <script src="feed.js?v=N"> global, which
  // iOS/Safari and PWAs may serve from disk cache on cold open. Force an immediate
  // cache-busted fetch so the user never sees stale data for more than a beat.
  checkForNewData();
});

// --- Auto-refresh: re-load feed.js periodically and re-render only when generatedAt changes.
// Works under file:// because script loads bypass the CORS rules that block fetch().
// Pauses while the tab is hidden (saves battery on phones / bandwidth on metered).
const AUTO_REFRESH_MS = 60_000;

function reloadFeedScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `./feed.js?t=${Date.now()}`;
    script.onload = () => {
      script.remove();
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("feed.js failed to load"));
    };
    document.head.appendChild(script);
  });
}

async function checkForNewData() {
  const previousGeneratedAt = LIVE_FEED_INFO?.generatedAt;
  try {
    await reloadFeedScript();
    const incoming = window.__FANSIGNAL_FEED__;
    if (!incoming || !incoming.generatedAt) return;
    if (incoming.generatedAt === previousGeneratedAt) return; // nothing new yet
    const previousIds = new Set(STORIES.map((s) => s.id));
    applyFeedData(incoming);
    const newCount = STORIES.filter((s) => !previousIds.has(s.id)).length;
    render();
    if (newCount > 0) {
      showToast(`${newCount} new ${newCount === 1 ? "story" : "stories"}`);
    }
  } catch (err) {
    // Silent: page keeps working with last successful load.
    console.debug("[FanSignal] auto-refresh skipped:", err.message);
  }
}

let refreshTimer = null;
function startAutoRefresh() {
  if (refreshTimer != null) return;
  refreshTimer = setInterval(checkForNewData, AUTO_REFRESH_MS);
}
function stopAutoRefresh() {
  if (refreshTimer == null) return;
  clearInterval(refreshTimer);
  refreshTimer = null;
}

// When the tab becomes visible again, refresh immediately so the user doesn't
// have to wait up to 60s to see what they missed. Then resume the interval.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    checkForNewData();
    startAutoRefresh();
  }
});

// pageshow fires on cold load AND when iOS/Safari restores a tab or standalone
// app from the back-forward cache. Belt-and-suspenders against stale data on
// PWA cold open (Add to Home Screen on iOS, where visibilitychange isn't always
// reliable on first launch).
window.addEventListener("pageshow", (event) => {
  // event.persisted = true means restored from bfcache, where the page didn't re-init.
  if (event.persisted) checkForNewData();
});

if (!document.hidden) startAutoRefresh();

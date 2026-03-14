import { PINS } from "./pins.js";
import { ROUTES } from "./routes.js";
import { getQA } from "./qa.js";
import { createAIVerifier } from "./ai_verify.js";

const $ = (id) => document.getElementById(id);

const SAVE_KEY = "bq_world_v5";
const ENTER_RADIUS_M_DEFAULT = 35;
const PASS_BONUS_COINS = 25;
const BOSS_BONUS_COINS = 150;

const DEFAULT_PLAYERS = [
  { id: "p1", name: "Player 1", coins: 0, enabled: true },
  { id: "p2", name: "Player 2", coins: 0, enabled: true },
  { id: "p3", name: "Player 3", coins: 0, enabled: false },
  { id: "p4", name: "Player 4", coins: 0, enabled: false },
];

const DEFAULT_PARK_THEME_PROGRESS = {
  festival: 0,
  history: 0,
  mystery: 0,
  challenge: 0,
  nature: 0,
};

const DEFAULT_SETTINGS = {
  enterRadiusM: ENTER_RADIUS_M_DEFAULT,
  character: "hero_duo",
  voiceRate: 1,
  voicePitch: 1,
  sfxVol: 80,
  zoomUI: false,
  captureNeed: 3,
  cooldownMin: 10,
};

const ZONES = {
  core: {
    id: "core",
    label: "Full Barrow",
    route: "core",
    startView: [54.1145, -3.2185, 14],
    mode: "open",
  },
  abbey: {
    id: "abbey",
    label: "Abbey",
    route: "abbey",
    startView: [54.1165, -3.2105, 15],
    mode: "guided",
  },
  park: {
    id: "park",
    label: "Park",
    route: "park",
    startView: [54.1175, -3.2175, 16],
    mode: "dynamic",
  },
};

let state = JSON.parse(localStorage.getItem(SAVE_KEY)) || {
  players: DEFAULT_PLAYERS,
  activePlayerId: "p1",
  activeSet: "core",
  activeRoute: "core",
  activeRouteStart: null,
  activeTheme: null,
  unlockedHiddenPins: [],
  unlockedBossPins: [],
  ghostStageUnlocked: false,
  nodes: {},
  parkThemeProgress: DEFAULT_PARK_THEME_PROGRESS,
  settings: DEFAULT_SETTINGS,
};

state.players ||= structuredClone(DEFAULT_PLAYERS);
state.activePlayerId ||= "p1";
state.activeSet ||= "core";
state.activeRoute ||= "core";
state.activeRouteStart ||= null;
state.activeTheme ||= null;
state.unlockedHiddenPins ||= [];
state.unlockedBossPins ||= [];
state.ghostStageUnlocked ||= false;
state.nodes ||= {};
state.parkThemeProgress ||= structuredClone(DEFAULT_PARK_THEME_PROGRESS);
state.settings ||= {};
state.settings.enterRadiusM ??= ENTER_RADIUS_M_DEFAULT;
state.settings.character ??= "hero_duo";
state.settings.voiceRate ??= 1;
state.settings.voicePitch ??= 1;
state.settings.sfxVol ??= 80;
state.settings.zoomUI ??= false;
state.settings.captureNeed ??= 3;
state.settings.cooldownMin ??= 10;

let map = null;
let hero = null;
let cur = null;
let selectedQuestPin = null;
let activeTask = null;
let activeMarkers = {};
let audioCtx = null;
let aiVerifier = null;
let aiVerifyContext = null;
let watchId = null;

const CHARACTERS = {
  hero_duo: { html: `<div style="font-size:42px;">🧭</div>` },
  ninja: { html: `<div style="font-size:42px;">🥷</div>` },
  wizard: { html: `<div style="font-size:42px;">🧙</div>` },
  robot: { html: `<div style="font-size:42px;">🤖</div>` },
  pirate: { html: `<div style="font-size:42px;">🏴‍☠️</div>` },
};

/* =========================================================
   SAVE / STATE
========================================================= */

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  renderPlayersHUD();
  updateCaptureHud();
  syncSettingsUI();
}

function syncSettingsUI() {
  if ($("radius-label")) {
    $("radius-label").innerText = String(state.settings.enterRadiusM ?? 35);
  }
  if ($("zoomui-label")) {
    $("zoomui-label").innerText = state.settings.zoomUI ? "ON" : "OFF";
  }
  if ($("rate-label")) {
    $("rate-label").innerText = String(state.settings.voiceRate ?? 1);
  }
  if ($("pitch-label")) {
    $("pitch-label").innerText = String(state.settings.voicePitch ?? 1);
  }
  if ($("sfx-label")) {
    $("sfx-label").innerText = String(state.settings.sfxVol ?? 80);
  }
  if ($("capture-label")) {
    $("capture-label").innerText = String(state.settings.captureNeed ?? 3);
  }
  if ($("cooldown-label")) {
    $("cooldown-label").innerText = String(state.settings.cooldownMin ?? 10);
  }
}

function getEnabledPlayers() {
  return state.players.filter((p) => p.enabled);
}

function getPlayerById(id) {
  return state.players.find((p) => p.id === id) || null;
}

function ensureActivePlayer() {
  const active = getPlayerById(state.activePlayerId);
  if (active && active.enabled) return active;
  const first = getEnabledPlayers()[0] || state.players[0];
  state.activePlayerId = first.id;
  return first;
}

function awardCoins(playerId, amount) {
  const p = getPlayerById(playerId);
  if (!p) return;
  p.coins += Math.max(0, Math.round(amount || 0));
  save();
}

function getActiveZone() {
  return ZONES[state.activeSet] || ZONES.core;
}

function getTier() {
  const enabledCount = getEnabledPlayers().length;
  if (enabledCount <= 1) return "adult";
  if (enabledCount === 2) return "teen";
  return "kid";
}

/* =========================================================
   NODE / CAPTURE STATE
========================================================= */

function nodeState(id) {
  if (!state.nodes[id]) {
    state.nodes[id] = {
      completed: false,
      captureProgress: 0,
      captured: false,
      owner: null,
      completedModes: [],
      lastCompletedAt: 0,
      bossCleared: false,
      hiddenFound: false,
    };
  }
  return state.nodes[id];
}

function isNodeOnCooldown(pinId) {
  const node = nodeState(pinId);
  const cooldownMin = Number(state.settings.cooldownMin ?? 10);
  if (!cooldownMin || cooldownMin <= 0) return false;
  if (!node.lastCompletedAt) return false;

  const cooldownMs = cooldownMin * 60 * 1000;
  return Date.now() - node.lastCompletedAt < cooldownMs;
}

function completeMissionForPin(pin, mode, playerId) {
  const node = nodeState(pin.id);

  if (!node.completedModes.includes(mode)) {
    node.completedModes.push(mode);
  }

  node.captureProgress = node.completedModes.length;
  node.lastCompletedAt = Date.now();

  const captureNeed = Number(state.settings.captureNeed ?? 3);

  if (node.captureProgress >= captureNeed) {
    node.captured = true;
    node.completed = true;
    node.owner = playerId || state.activePlayerId;
  }

  if (pin.hidden) {
    node.hiddenFound = true;
  }

  if (pin.type === "boss") {
    node.bossCleared = true;
  }

  save();
}

function getNodeStatusText(pin) {
  const node = nodeState(pin.id);
  const captureNeed = Number(state.settings.captureNeed ?? 3);

  if (node.captured) {
    const owner = getPlayerById(node.owner);
    return owner ? `CAPTURED BY ${owner.name.toUpperCase()}` : "CAPTURED";
  }

  if (isNodeOnCooldown(pin.id)) {
    return "COOLDOWN";
  }

  return `CAPTURE ${node.captureProgress}/${captureNeed}`;
}

function totalCompletedInRoute(routeId) {
  return Object.keys(state.nodes)
    .map((id) => getPinById(id))
    .filter(
      (pin) => pin && pin.route === routeId && state.nodes[pin.id]?.completed
    ).length;
}

/* =========================================================
   DOM HELPERS
========================================================= */

function onClick(id, fn) {
  const el = $(id);
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn(e);
  });
}

function toggleM(id, force) {
  const el = $(id);
  if (!el) return;
  if (typeof force === "boolean") {
    el.style.display = force ? "block" : "none";
  } else {
    el.style.display = el.style.display === "block" ? "none" : "block";
  }
}

function hideAllModals() {
  document.querySelectorAll(".full-modal").forEach((el) => {
    el.style.display = "none";
  });
}

function showModal(id) {
  hideAllModals();
  const el = $(id);
  if (el) el.style.display = "block";
}

function setMapPillState(mode) {
  const abbey = $("pill-park");
  const park = $("pill-docks");
  const full = $("pill-full");

  if (abbey) abbey.classList.toggle("active", mode === "abbey");
  if (park) park.classList.toggle("active", mode === "park");
  if (full) full.classList.toggle("active", mode === "core");
}

/* =========================================================
   AUDIO / SPEECH
========================================================= */

function speak(text) {
  try {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = "en-GB";
    u.rate = parseFloat(state.settings.voiceRate || 1);
    u.pitch = parseFloat(state.settings.voicePitch || 1);

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(u);
      } catch {}
    }, 80);
  } catch {}
}

function getSfxVolume() {
  const pct = parseInt(state.settings.sfxVol ?? 80, 10);
  return Math.max(0, Math.min(1, pct / 100));
}

function beep(freq = 660, duration = 0.12, type = "sine", gain = 0.05) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain * getSfxVolume();

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {}
}

function playSuccessSfx() {
  beep(660, 0.08, "triangle", 0.05);
  setTimeout(() => beep(880, 0.1, "triangle", 0.055), 70);
}

function playFailSfx() {
  beep(220, 0.1, "sawtooth", 0.04);
}

function playBossSfx() {
  beep(520, 0.09, "square", 0.05);
  setTimeout(() => beep(780, 0.12, "square", 0.055), 80);
  setTimeout(() => beep(1040, 0.14, "square", 0.06), 170);
}

/* =========================================================
   VISUAL REWARDS
========================================================= */

function ensureRewardLayer() {
  let fx = $("reward-fx-layer");
  if (fx) return fx;

  fx = document.createElement("div");
  fx.id = "reward-fx-layer";
  fx.style.position = "fixed";
  fx.style.inset = "0";
  fx.style.pointerEvents = "none";
  fx.style.zIndex = "20000";
  fx.style.overflow = "hidden";
  document.body.appendChild(fx);
  return fx;
}

function burstEmoji(count = 10, emoji = "✨") {
  const layer = ensureRewardLayer();
  const rect = document.body.getBoundingClientRect();

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.textContent = emoji;
    el.style.position = "fixed";
    el.style.left = `${rect.width * (0.2 + Math.random() * 0.6)}px`;
    el.style.top = `${rect.height * (0.35 + Math.random() * 0.15)}px`;
    el.style.fontSize = `${18 + Math.random() * 18}px`;
    el.style.opacity = "1";
    el.style.transition = "transform 900ms ease-out, opacity 900ms ease-out";
    layer.appendChild(el);

    requestAnimationFrame(() => {
      const dx = -80 + Math.random() * 160;
      const dy = -100 - Math.random() * 120;
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${
        -80 + Math.random() * 160
      }deg)`;
      el.style.opacity = "0";
    });

    setTimeout(() => el.remove(), 950);
  }
}

function showRewardPopup(title, subtitle = "", tone = "success") {
  const layer = ensureRewardLayer();
  const card = document.createElement("div");

  card.style.position = "fixed";
  card.style.left = "50%";
  card.style.top = "18%";
  card.style.transform = "translate(-50%, -10px) scale(0.96)";
  card.style.minWidth = "220px";
  card.style.maxWidth = "86vw";
  card.style.background =
    tone === "fail" ? "rgba(80,0,0,0.92)" : "rgba(0,0,0,0.9)";
  card.style.border =
    tone === "fail" ? "2px solid #ff6666" : "2px solid var(--gold)";
  card.style.color = "#fff";
  card.style.borderRadius = "18px";
  card.style.padding = "16px 18px";
  card.style.textAlign = "center";
  card.style.opacity = "0";
  card.style.transition = "all 320ms ease";
  card.innerHTML = `
    <div style="font-size:22px;font-weight:bold;margin-bottom:6px;">${title}</div>
    <div style="font-size:14px;opacity:.92;">${subtitle}</div>
  `;

  layer.appendChild(card);

  requestAnimationFrame(() => {
    card.style.opacity = "1";
    card.style.transform = "translate(-50%, 0) scale(1)";
  });

  setTimeout(() => {
    card.style.opacity = "0";
    card.style.transform = "translate(-50%, -12px) scale(0.97)";
  }, 2600);

  setTimeout(() => card.remove(), 3100);
}

/* =========================================================
   PLAYER / HUD
========================================================= */

function renderPlayersHUD() {
  const enabled = getEnabledPlayers();

  const hK = $("h-k");
  const hP = $("h-p");
  const hMe = $("h-me");
  const slot1 = enabled[0] || { name: "Player 1", coins: 0 };
  const slot2 = enabled[1] || { name: "Player 2", coins: 0 };
  const slot3 = enabled[2] || { name: "Player 3", coins: 0 };

  if (hK) hK.innerText = `${slot1.name}: ${slot1.coins} 🪙`;
  if (hP) hP.innerText = `${slot2.name}: ${slot2.coins} 🪙`;
  if (hMe) hMe.innerText = `${slot3.name}: ${slot3.coins} 🪙`;

  const hpK = $("hp-k-tag");
  const hpP = $("hp-p-tag");
  const active = ensureActivePlayer();

  if (hpK) {
    const p1 = enabled[0];
    const isActive = p1 && active && p1.id === active.id;
    hpK.innerText = isActive ? "ACTIVE" : "OFF";
    hpK.className = `hp-status ${isActive ? "hp-on" : "hp-off"}`;
  }

  if (hpP) {
    const p2 = enabled[1];
    const isActive = p2 && active && p2.id === active.id;
    hpP.innerText = isActive ? "ACTIVE" : "OFF";
    hpP.className = `hp-status ${isActive ? "hp-on" : "hp-off"}`;
  }
}

function getCharacterHtml() {
  return (
    CHARACTERS[state.settings.character || "hero_duo"]?.html ||
    CHARACTERS.hero_duo.html
  );
}

/* =========================================================
   PINS / ROUTES / FILTERS
========================================================= */

function getPinById(id) {
  return PINS.find((p) => String(p.id) === String(id)) || null;
}

function hasValidCoords(pin) {
  return (
    Array.isArray(pin?.l) &&
    pin.l.length === 2 &&
    Number.isFinite(pin.l[0]) &&
    Number.isFinite(pin.l[1]) &&
    !(pin.l[0] === 0 && pin.l[1] === 0)
  );
}

function unlockHiddenPin(pinId) {
  if (!state.unlockedHiddenPins.includes(pinId)) {
    state.unlockedHiddenPins.push(pinId);
    save();
  }
}

function unlockBossPin(pinId) {
  if (!state.unlockedBossPins.includes(pinId)) {
    state.unlockedBossPins.push(pinId);
    save();
  }
}

function startRouteFromPin(pin) {
  if (!pin?.route || !pin?.routeStart) return;

  state.activeRoute = pin.route;
  state.activeRouteStart = pin.routeStart;

  if (pin.route === "park") {
    const cfg = ROUTES.park?.starts?.[pin.routeStart];
    state.activeSet = "park";
    state.activeTheme = cfg?.suggestedTheme || null;

    showRewardPopup(
      "PARK ADVENTURE",
      state.activeTheme ? `Suggested theme: ${state.activeTheme}` : pin.n
    );

    speak(
      state.activeTheme
        ? `Park adventure started. Suggested theme: ${state.activeTheme}.`
        : `Park adventure started from ${pin.n}.`
    );
  } else if (pin.route === "abbey") {
    state.activeSet = "abbey";
    state.activeTheme = null;

    showRewardPopup("ABBEY QUEST", pin.n);
    speak(`Abbey route started from ${pin.n}.`);
  }

  setMapPillState(state.activeSet);
  save();
  initPins();
}

function getActiveRouteConfig() {
  if (!state.activeRoute) return null;
  return ROUTES[state.activeRoute] || null;
}

function getActiveRouteOrder() {
  const cfg = getActiveRouteConfig();
  if (!cfg || !state.activeRouteStart || cfg.mode !== "guided") return [];
  return cfg.starts?.[state.activeRouteStart]?.orderedPins || [];
}

function pinMatchesActiveSet(pin) {
  if (state.activeSet === "core") return pin.set === "core" || !pin.set;
  return pin.set === state.activeSet;
}

function isPinVisibleForCurrentRoute(pin) {
  if (!pin || !hasValidCoords(pin)) return false;
  if (!pinMatchesActiveSet(pin)) return false;

  if (pin.hidden === true) {
    if (pin.type === "ghost") return state.ghostStageUnlocked === true;
    if (pin.type === "boss") return state.unlockedBossPins.includes(pin.id);
    return state.unlockedHiddenPins.includes(pin.id);
  }

  if (state.activeSet === "core") {
    return pin.set === "core" || !pin.set;
  }

  if (state.activeSet === "abbey") {
    if (pin.route !== "abbey") return false;
    if (!state.activeRouteStart) return pin.type === "start";
    const ordered = getActiveRouteOrder();
    if (!ordered.length) return true;
    return ordered.includes(pin.id);
  }

  if (state.activeSet === "park") {
    return pin.route === "park";
  }

  return true;
}

function getVisiblePins() {
  return PINS.filter(isPinVisibleForCurrentRoute);
}

/* =========================================================
   ROUTE UNLOCK LOGIC
========================================================= */

function completeAbbeyBossUnlocks() {
  state.ghostStageUnlocked = true;
  unlockHiddenPin("abbey_hidden_stone");
  unlockHiddenPin("abbey_hidden_mirror");
  unlockHiddenPin("abbey_hidden_forge");

  save();
  initPins();
  showRewardPopup("NEW DISCOVERIES", "Hidden Abbey pins unlocked");
}

function completeParkProgress(pin) {
  if (!pin || pin.route !== "park") return;

  const theme = pin.theme || null;
  if (theme && state.parkThemeProgress[theme] !== undefined) {
    state.parkThemeProgress[theme] += 1;
  }

  const hiddenRules = ROUTES.park?.hiddenRules || {};
  Object.entries(hiddenRules).forEach(([pinId, rule]) => {
    if (state.unlockedHiddenPins.includes(pinId)) return;

    if (rule.totalCompleted) {
      if (totalCompletedInRoute("park") >= rule.totalCompleted) {
        unlockHiddenPin(pinId);
      }
      return;
    }

    if (
      rule.theme &&
      (state.parkThemeProgress[rule.theme] || 0) >= (rule.needed || 0)
    ) {
      unlockHiddenPin(pinId);
    }
  });

  const bossRules = ROUTES.park?.bossRules || {};
  Object.entries(bossRules).forEach(([pinId, rule]) => {
    if (state.unlockedBossPins.includes(pinId)) return;

    const score = state.parkThemeProgress[rule.theme] || 0;
    const enough = score >= (rule.needed || 0);
    const hiddenOk =
      !rule.needsHidden || state.unlockedHiddenPins.includes(rule.needsHidden);

    if (enough && hiddenOk) {
      unlockBossPin(pinId);
      showRewardPopup("BOSS UNLOCKED", getPinById(pinId)?.n || pinId);
    }
  });

  save();
  initPins();
}

/* =========================================================
   MAP
========================================================= */

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function getMapStartView() {
  return getActiveZone().startView;
}

function getMarkerHtmlForPin(pin) {
  const node = nodeState(pin.id);
  const opacity = node.captured ? 0.75 : isNodeOnCooldown(pin.id) ? 0.55 : 1;

  return `
    <div style="display:flex;flex-direction:column;align-items:center;opacity:${opacity};">
      <div style="font-size:28px;line-height:1;">${pin.i || "📍"}</div>
      ${
        node.captured
          ? `<div style="font-size:10px;margin-top:2px;color:#ffd54a;font-weight:800;">✓</div>`
          : ""
      }
    </div>
  `;
}

function initMap() {
  const [lat, lng, zoom] = getMapStartView();

  map = L.map("map", { zoomControl: false }).setView([lat, lng], zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  if (state.settings.zoomUI) {
    L.control.zoom({ position: "topright" }).addTo(map);
  }

  hero = L.marker([lat, lng], {
    icon: L.divIcon({
      className: "marker-logo",
      html: getCharacterHtml(),
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    }),
  }).addTo(map);

  initPins();
  startGPSWatcher();
}

function destroyMap() {
  if (!map) return;
  map.off();
  map.remove();
  map = null;
  hero = null;
  activeMarkers = {};
  cur = null;

  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function refreshHeroIcon() {
  if (!hero) return;

  hero.setIcon(
    L.divIcon({
      className: "marker-logo",
      html: getCharacterHtml(),
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    })
  );
}

function initPins() {
  if (!map) return;

  Object.values(activeMarkers).forEach((m) => {
    try {
      map.removeLayer(m);
    } catch {}
  });
  activeMarkers = {};

  getVisiblePins().forEach((p) => {
    const m = L.marker(p.l, {
      icon: L.divIcon({
        className: "marker-logo",
        html: getMarkerHtmlForPin(p),
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      }),
    }).addTo(map);

    m.on("click", () => {
      cur = p;
      selectedQuestPin = p;
      if ($("action-trigger")) $("action-trigger").style.display = "block";
      updateCaptureHud();
    });

    activeMarkers[p.id] = m;
  });

  updateCaptureHud();
}

function startGPSWatcher() {
  if (!navigator.geolocation || !map) {
    if ($("capture-hud")) $("capture-hud").innerText = "GPS UNAVAILABLE";
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (hero) hero.setLatLng([lat, lng]);

      const radius =
        parseInt(state.settings.enterRadiusM ?? ENTER_RADIUS_M_DEFAULT, 10) ||
        ENTER_RADIUS_M_DEFAULT;

      const near = getVisiblePins().find((p) => {
        return (
          haversineMeters({ lat, lng }, { lat: p.l[0], lng: p.l[1] }) < radius
        );
      });

      if (near) {
        cur = near;
        if ($("action-trigger")) $("action-trigger").style.display = "block";
      } else {
        cur = null;
        if (!selectedQuestPin && $("action-trigger")) {
          $("action-trigger").style.display = "none";
        }
      }

      updateCaptureHud();
    },
    () => {
      if ($("capture-hud")) {
        $("capture-hud").innerText = "GPS UNAVAILABLE • TAP A PIN";
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    }
  );
}

/* =========================================================
   HUD / STATUS
========================================================= */

function updateCaptureHud() {
  const hud = $("capture-hud");
  if (!hud) return;

  const displayPin = selectedQuestPin || cur;

  if (!displayPin) {
    if (state.activeSet === "park") {
      hud.innerText = `PARK • ${String(
        state.activeTheme || "explore"
      ).toUpperCase()}`;
      return;
    }

    if (state.activeSet === "abbey") {
      hud.innerText = `ABBEY • ${String(
        state.activeRouteStart || "explore"
      ).toUpperCase()}`;
      return;
    }

    if (state.activeSet === "core") {
      hud.innerText = "FULL BARROW MAP";
      return;
    }

    hud.innerText = "CAPTURE: -";
    return;
  }

  hud.innerText = `${displayPin.n} • ${getNodeStatusText(displayPin)}`;
}

/* =========================================================
   QUEST / TASK FLOW
========================================================= */

function showRewardPanel(show = true) {
  const panel = $("reward-panel");
  if (panel) panel.style.display = show ? "block" : "none";
}

function renderOptions(task) {
  const wrap = $("task-options");
  if (!wrap) return;

  wrap.innerHTML = (task.options || [])
    .map(
      (opt, idx) =>
        `<button class="mcq-btn" data-idx="${idx}" type="button">${String.fromCharCode(
          65 + idx
        )}) ${opt}</button>`
    )
    .join("");

  wrap.querySelectorAll(".mcq-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectOption(parseInt(btn.dataset.idx, 10));
    });
  });
}

function openQuest() {
  if (!cur && !selectedQuestPin) return;

  const pin = selectedQuestPin || cur;
  if (!pin) return;

  selectedQuestPin = pin;

  if (selectedQuestPin.type === "start" && selectedQuestPin.routeStart) {
    startRouteFromPin(selectedQuestPin);
  }

  if ($("q-name")) $("q-name").innerText = selectedQuestPin.n;

  if ($("quest-status")) {
    const themeText = selectedQuestPin.theme
      ? ` • ${selectedQuestPin.theme.toUpperCase()}`
      : "";
    $("quest-status").innerText = `STATUS: ${getNodeStatusText(
      selectedQuestPin
    )}${themeText}`;
  }

  if ($("mode-banner")) {
    $("mode-banner").style.display = "block";

    let banner = `${String(selectedQuestPin.zone).toUpperCase()} ROUTE\n${
      selectedQuestPin.n
    }`;

    if (selectedQuestPin.zone === "park" && selectedQuestPin.theme) {
      banner = `PARK • ${selectedQuestPin.theme.toUpperCase()}\n${
        selectedQuestPin.n
      }`;
    }

    if (state.activeSet === "core") {
      banner = `FULL BARROW MAP\n${selectedQuestPin.n}`;
    }

    $("mode-banner").innerText = banner;
  }

  if ($("boss-banner")) {
    $("boss-banner").style.display =
      selectedQuestPin.type === "boss" ? "block" : "none";
    $("boss-banner").innerText =
      selectedQuestPin.type === "boss" ? "FINAL TRIAL ACTIVE" : "";
  }

  showModal("quest-modal");
  updateCaptureHud();
}

function closeQuest() {
  selectedQuestPin = null;
  toggleM("quest-modal", false);
}

function launchMode(mode) {
  const pin = selectedQuestPin || cur;
  if (!pin) return;

  if (mode === "ai_verify") {
    openAIVerify(pin);
    return;
  }

  if (isNodeOnCooldown(pin.id)) {
    showRewardPopup(
      "NODE ON COOLDOWN",
      "Wait before doing another mode.",
      "fail"
    );
    return;
  }

  const zone = pin.set || state.activeSet || "core";

  const task = getQA({
    pinId: pin.id,
    zone,
    mode,
    tier: getTier(),
    salt: Date.now(),
  });

  activeTask = {
    pinId: pin.id,
    mode,
    task,
    passed: false,
    pendingReward: 0,
  };

  if ($("task-title")) {
    $("task-title").innerText = `${mode.toUpperCase()} @ ${pin.n}`;
  }

  if ($("task-desc")) {
    $("task-desc").innerText = task.q || "Task";
  }

  if ($("task-feedback")) {
    $("task-feedback").style.display = "none";
    $("task-feedback").innerText = "";
  }

  showRewardPanel(false);
  renderOptions(task);
  showModal("task-modal");
  speak(task.q);
}

function selectOption(idx) {
  if (!activeTask?.task) return;

  const task = activeTask.task;
  const correct = idx === task.answer;

  if ($("task-feedback")) {
    $("task-feedback").style.display = "block";
    $("task-feedback").innerText = correct
      ? `Correct! ${task.fact || ""}`
      : "Not quite. Try again.";
  }

  if (correct) {
    activeTask.passed = true;
    activeTask.pendingReward = PASS_BONUS_COINS;
    showRewardPanel(true);
    playSuccessSfx();
    burstEmoji(10, "✨");
    showRewardPopup("CORRECT!", task.fact || "Nice work.");
  } else {
    playFailSfx();
    showRewardPopup("NOT QUITE", "Try again.", "fail");
  }
}

/* =========================================================
   AI VERIFY
========================================================= */

async function ensureAIVerifier() {
  if (aiVerifier) return aiVerifier;

  aiVerifier = await createAIVerifier({
    videoEl: $("ai-video"),
    canvasEl: $("ai-canvas"),
    statusEl: $("ai-status"),
  });

  return aiVerifier;
}

function getVerifyTemplateForPin(pin) {
  if (!pin) return "still";
  if (pin.type === "boss") return "victory";
  if (pin.type === "ghost") return "still";
  if (pin.type === "activity") return "tpose";
  if (pin.theme === "festival") return "victory";
  if (pin.theme === "mystery") return "hands_together";
  return "still";
}

async function openAIVerify(pin) {
  aiVerifyContext = {
    pinId: pin.id,
    pinName: pin.n,
    template: getVerifyTemplateForPin(pin),
  };

  if ($("ai-status")) {
    $("ai-status").textContent = `Pose target: ${aiVerifyContext.template}`;
  }

  showModal("ai-modal");
}

async function startAICamera() {
  try {
    const verifier = await ensureAIVerifier();
    await verifier.start();
  } catch (err) {
    console.error("AI start error:", err);
    showRewardPopup("AI ERROR", "Camera could not start.", "fail");
  }
}

async function stopAICamera() {
  try {
    if (aiVerifier) {
      await aiVerifier.stop();
    }
  } catch {}
}

async function captureAIVerify() {
  try {
    const pin = selectedQuestPin || cur;
    if (!pin) return;

    const verifier = await ensureAIVerifier();
    const template = aiVerifyContext?.template || getVerifyTemplateForPin(pin);

    const verdict = await verifier.captureAndVerify({
      template,
      pinId: pin.id,
      pinName: pin.n,
      child: getEnabledPlayers()
        .map((p) => p.name)
        .join(", "),
      taskLabel: `AI Verify: ${template}`,
      autosave: true,
    });

    if ($("ai-status")) {
      $("ai-status").textContent = verdict.reason || "Verification complete.";
    }

    if (verdict.ok) {
      activeTask = {
        pinId: pin.id,
        mode: "ai_verify",
        task: {
          q: `AI VERIFY: ${template}`,
          fact: verdict.reason || "Verified.",
        },
        passed: true,
        pendingReward: PASS_BONUS_COINS,
      };

      playSuccessSfx();
      burstEmoji(12, "📷");
      showRewardPopup("AI VERIFIED", verdict.reason || "Pose complete.");
      showRewardPanel(true);
      toggleM("ai-modal", false);
      renderRewardButtons();
    } else {
      playFailSfx();
      showRewardPopup(
        "AI VERIFY FAILED",
        verdict.reason || "Try again.",
        "fail"
      );
    }
  } catch (err) {
    console.error("AI capture error:", err);
    showRewardPopup("AI ERROR", "Capture failed.", "fail");
  }
}

/* =========================================================
   REWARD
========================================================= */

function finalizeReward(playerId) {
  const pin = selectedQuestPin || cur;
  if (!pin || !activeTask?.passed) return;

  const amount = activeTask.pendingReward || PASS_BONUS_COINS;

  awardCoins(playerId, amount);
  completeMissionForPin(pin, activeTask.mode, playerId);

  if (pin.route === "park") {
    completeParkProgress(pin);
  }

  if (pin.id === "abbey_boss") {
    const enabled = getEnabledPlayers();
    enabled.forEach((p) => awardCoins(p.id, BOSS_BONUS_COINS));
    playBossSfx();
    completeAbbeyBossUnlocks();
    showRewardPopup(
      "ABBEY CONQUERED",
      "Ghost stage and hidden discoveries unlocked"
    );
  }

  if (pin.route === "park" && pin.type === "boss") {
    const enabled = getEnabledPlayers();
    enabled.forEach((p) => awardCoins(p.id, Math.round(BOSS_BONUS_COINS / 2)));
    playBossSfx();
    showRewardPopup("PARK BOSS DEFEATED", pin.n);
  }

  save();
  burstEmoji(12, "🪙");
  showRewardPanel(false);
  toggleM("task-modal", false);
  activeTask = null;
  selectedQuestPin = null;
  initPins();
}

/* =========================================================
   HOME / LIST
========================================================= */

function renderHomeLog() {
  const sum = $("home-summary");
  const list = $("home-list");
  if (!sum || !list) return;

  const captureNeed = Number(state.settings.captureNeed ?? 3);

  const rows = getVisiblePins().map((p) => {
    const node = nodeState(p.id);
    return {
      name: p.n,
      status: node.captured
        ? "Captured"
        : `Capture ${node.captureProgress}/${captureNeed}`,
      theme: p.theme || "",
      zone: p.zone || p.set || "core",
      owner: node.owner ? getPlayerById(node.owner)?.name || "" : "",
    };
  });

  const capturedCount = rows.filter((r) => r.status === "Captured").length;

  sum.innerHTML = `Visible pins: <b>${
    rows.length
  }</b> | Captured: <b>${capturedCount}</b> | Set: <b>${
    state.activeSet
  }</b> | Route: <b>${state.activeRouteStart || "-"}</b> | Theme: <b>${
    state.activeTheme || "-"
  }</b>`;

  list.innerHTML = rows
    .map(
      (r) => `
        <div style="padding:10px;border:1px solid #333;border-radius:12px;margin:8px 0;background:#111;">
          <div style="font-weight:bold;">${r.name}</div>
          <div style="opacity:.85;font-size:12px;">
            ${r.status} • ${r.zone}${r.theme ? ` • ${r.theme}` : ""}${
        r.owner ? ` • ${r.owner}` : ""
      }
          </div>
        </div>
      `
    )
    .join("");
}

/* =========================================================
   PLAYER SETTINGS UI
========================================================= */

function buildPlayerManager() {
  const settingsHost = $("settings-player-manager");
  if (!settingsHost || $("player-manager")) return;

  const wrap = document.createElement("div");
  wrap.id = "player-manager";
  wrap.innerHTML = `<div id="player-manager-list"></div>`;
  settingsHost.appendChild(wrap);

  renderPlayerManager();
}

function setPlayerCount(count) {
  state.players.forEach((p, idx) => {
    p.enabled = idx < count;
  });

  ensureActivePlayer();
  save();
  renderPlayerManager();
  renderRewardButtons();
}

function renderPlayerManager() {
  const list = $("player-manager-list");
  if (!list) return;

  list.innerHTML = state.players
    .map(
      (p) => `
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin:8px 0;align-items:center;">
          <input data-player-name="${p.id}" value="${
        p.name
      }" style="padding:10px;border-radius:10px;border:1px solid #333;background:#111;color:#fff;" />
          <button data-player-active="${
            p.id
          }" class="win-btn" type="button" style="padding:10px 12px;background:${
        p.enabled ? "#1f8f4d" : "#444"
      };color:#fff;width:auto;">
            ${p.enabled ? "ON" : "OFF"}
          </button>
        </div>
      `
    )
    .join("");

  list.querySelectorAll("[data-player-name]").forEach((el) => {
    el.addEventListener("input", () => {
      const id = el.getAttribute("data-player-name");
      const p = getPlayerById(id);
      if (!p) return;
      p.name = el.value || p.name;
      save();
      renderRewardButtons();
    });
  });

  list.querySelectorAll("[data-player-active]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-player-active");
      const p = getPlayerById(id);
      if (!p) return;

      p.enabled = !p.enabled;
      if (getEnabledPlayers().length === 0) p.enabled = true;

      ensureActivePlayer();
      save();
      renderPlayerManager();
      renderRewardButtons();
    });
  });
}

/* =========================================================
   REWARD BUTTONS
========================================================= */

function renderRewardButtons() {
  const panel = $("reward-panel");
  if (!panel) return;

  const enabled = getEnabledPlayers();

  panel.innerHTML = `
    <div style="font-weight:bold;margin-bottom:8px;">AWARD POINTS TO:</div>
    <div id="reward-buttons-list" style="display:grid;gap:10px;"></div>
  `;

  const list = $("reward-buttons-list");
  if (!list) return;

  enabled.forEach((p, idx) => {
    const btn = document.createElement("button");
    btn.className = "win-btn";
    btn.type = "button";
    btn.style.color = idx === 1 ? "#000" : "#fff";
    btn.style.background =
      idx === 0
        ? "var(--kylan)"
        : idx === 1
        ? "var(--piper)"
        : idx === 2
        ? "var(--parent)"
        : "var(--gold)";
    btn.textContent = p.name.toUpperCase();
    btn.addEventListener("click", () => finalizeReward(p.id));
    list.appendChild(btn);
  });
}

/* =========================================================
   MAP SET SWITCH
========================================================= */

function setMapMode(mode) {
  if (!ZONES[mode]) return;

  state.activeSet = mode;
  state.activeRoute = ZONES[mode].route;
  state.activeRouteStart = null;
  state.activeTheme = null;
  cur = null;
  selectedQuestPin = null;

  setMapPillState(mode);
  save();

  destroyMap();
  initMap();
}

/* =========================================================
   WIRES
========================================================= */

function wireHUD() {
  onClick("btn-home", () => {
    renderHomeLog();
    showModal("home-modal");
  });

  onClick("btn-home-close", () => toggleM("home-modal", false));
  onClick("btn-home-close-x", () => toggleM("home-modal", false));

  onClick("btn-settings", () => showModal("settings-modal"));
  onClick("btn-close-settings", () => toggleM("settings-modal", false));
  onClick("btn-close-settings-x", () => toggleM("settings-modal", false));
  onClick("btn-open-settings", () => showModal("settings-modal"));
  onClick("btn-open-settings-from-commander", () =>
    showModal("settings-modal")
  );

  onClick("btn-commander", () => showModal("commander-hub"));
  onClick("btn-open-commander-from-home", () => showModal("commander-hub"));
  onClick("btn-close-commander", () => toggleM("commander-hub", false));
  onClick("btn-close-commander-x", () => toggleM("commander-hub", false));

  onClick("btn-start", () => toggleM("start-modal", false));
  onClick("btn-start-close", () => toggleM("start-modal", false));
  onClick("btn-start-close-x", () => toggleM("start-modal", false));

  onClick("btn-close-quest", closeQuest);

  onClick("btn-task-close", () => {
    toggleM("task-modal", false);
    activeTask = null;
    selectedQuestPin = null;
  });

  onClick("action-trigger", openQuest);

  onClick("btn-hp-k", () => {
    const p = getEnabledPlayers()[0];
    if (p) state.activePlayerId = p.id;
    save();
  });

  onClick("btn-hp-p", () => {
    const p = getEnabledPlayers()[1] || getEnabledPlayers()[0];
    if (p) state.activePlayerId = p.id;
    save();
  });

  onClick("btn-swap", () => {
    const enabled = getEnabledPlayers();
    if (enabled.length >= 2) {
      const a = enabled[0].name;
      enabled[0].name = enabled[1].name;
      enabled[1].name = a;
      save();
      renderPlayerManager();
      renderRewardButtons();
    }
  });

  onClick("btn-night", () => {
    $("map")?.classList.toggle("night-vision");
  });

  onClick("btn-show-node-stats", () => {
    const visible = getVisiblePins();
    const captured = visible.filter((p) => nodeState(p.id).captured).length;
    const onCooldown = visible.filter((p) => isNodeOnCooldown(p.id)).length;

    alert(
      `Current set: ${state.activeSet}\n` +
        `Visible pins: ${visible.length}\n` +
        `Captured nodes: ${captured}\n` +
        `Nodes on cooldown: ${onCooldown}\n` +
        `Capture need: ${state.settings.captureNeed}\n` +
        `Cooldown: ${state.settings.cooldownMin} min`
    );
  });

  onClick("btn-respawn-nodes", () => {
    state.nodes = {};
    state.unlockedHiddenPins = [];
    state.unlockedBossPins = [];
    state.ghostStageUnlocked = false;
    state.activeRouteStart = null;
    state.activeTheme = null;
    state.parkThemeProgress = structuredClone(DEFAULT_PARK_THEME_PROGRESS);
    save();
    initPins();
    showRewardPopup("RESET", "Progress cleared");
  });

  onClick("btn-test", () => {
    refreshHeroIcon();
    initPins();
    showRewardPopup("SYSTEMS OK", "Buttons and markers refreshed.");
  });

  onClick("btn-zoom-ui", () => {
    state.settings.zoomUI = !state.settings.zoomUI;
    save();
    destroyMap();
    initMap();
  });

  onClick("btn-player-1", () => setPlayerCount(1));
  onClick("btn-player-2", () => setPlayerCount(2));
  onClick("btn-player-3", () => setPlayerCount(3));
  onClick("btn-player-4", () => setPlayerCount(4));

  const charSel = $("char-select");
  if (charSel) {
    charSel.value = state.settings.character || "hero_duo";
    charSel.addEventListener("change", () => {
      state.settings.character = charSel.value || "hero_duo";
      refreshHeroIcon();
      save();
    });
  }

  const radius = $("enter-radius");
  if (radius) {
    radius.value = String(
      state.settings.enterRadiusM ?? ENTER_RADIUS_M_DEFAULT
    );
    radius.addEventListener("input", () => {
      state.settings.enterRadiusM =
        parseInt(radius.value, 10) || ENTER_RADIUS_M_DEFAULT;
      save();
    });
  }

  const rate = $("v-rate");
  if (rate) {
    rate.value = String(state.settings.voiceRate ?? 1);
    rate.addEventListener("input", () => {
      state.settings.voiceRate = parseFloat(rate.value) || 1;
      save();
    });
  }

  const pitch = $("v-pitch");
  if (pitch) {
    pitch.value = String(state.settings.voicePitch ?? 1);
    pitch.addEventListener("input", () => {
      state.settings.voicePitch = parseFloat(pitch.value) || 1;
      save();
    });
  }

  const sfx = $("sfx-vol");
  if (sfx) {
    sfx.value = String(state.settings.sfxVol ?? 80);
    sfx.addEventListener("input", () => {
      state.settings.sfxVol = parseInt(sfx.value, 10) || 80;
      save();
    });
  }

  const captureNeed = $("capture-need");
  if (captureNeed) {
    captureNeed.value = String(state.settings.captureNeed ?? 3);
    captureNeed.addEventListener("input", () => {
      state.settings.captureNeed = parseInt(captureNeed.value, 10) || 3;
      save();
      initPins();
    });
  }

  const cooldown = $("cooldown-min");
  if (cooldown) {
    cooldown.value = String(state.settings.cooldownMin ?? 10);
    cooldown.addEventListener("input", () => {
      state.settings.cooldownMin = parseInt(cooldown.value, 10) || 0;
      save();
      initPins();
    });
  }

  const kids = $("pill-kids");
  const teen = $("pill-teen");

  if (kids && teen) {
    kids.addEventListener("click", () => {
      kids.classList.add("active");
      teen.classList.remove("active");
    });

    teen.addEventListener("click", () => {
      teen.classList.add("active");
      kids.classList.remove("active");
    });
  }

  const pillAbbey = $("pill-park");
  const pillPark = $("pill-docks");
  const pillFull = $("pill-full");

  if (pillAbbey) {
    pillAbbey.addEventListener("click", () => setMapMode("abbey"));
  }

  if (pillPark) {
    pillPark.addEventListener("click", () => setMapMode("park"));
  }

  if (pillFull) {
    pillFull.addEventListener("click", () => setMapMode("core"));
  }

  onClick("btn-ai-close", async () => {
    await stopAICamera();
    toggleM("ai-modal", false);
  });

  onClick("btn-ai-start", async () => {
    await startAICamera();
  });

  onClick("btn-ai-stop", async () => {
    await stopAICamera();
  });

  onClick("btn-ai-capture", async () => {
    await captureAIVerify();
  });
}

function wireModes() {
  document.querySelectorAll(".m-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const mode = tile.getAttribute("data-mode");
      if (mode) launchMode(mode);
    });
  });
}

/* =========================================================
   BOOT
========================================================= */

function boot() {
  try {
    ensureActivePlayer();
    buildPlayerManager();
    renderPlayerManager();
    renderRewardButtons();
    setMapPillState(state.activeSet);
    initMap();
    wireHUD();
    wireModes();
    renderPlayersHUD();
    syncSettingsUI();
    save();
    ensureRewardLayer();
    console.log("Barrow Quest booted");
  } catch (err) {
    console.error("Boot error:", err);
    if ($("capture-hud")) $("capture-hud").innerText = "BOOT ERROR";
  }
}

window.addEventListener("DOMContentLoaded", boot);

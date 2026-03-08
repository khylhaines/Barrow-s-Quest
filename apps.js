// app.js
import { PINS } from "./pins.js";
import { getQA } from "./qa.js";

const ENTER_RADIUS_M_DEFAULT = 30;
const PASS_BONUS_COINS = 10;
const MODE_BONUS_COINS = 100;
const CAPTURE_BONUS_COINS = 50;

const $ = (id) => document.getElementById(id);

let state = JSON.parse(localStorage.getItem("bq_clean_match_v1")) || {
  k: 0,
  p: 0,
  khyl: 0,
  activeParticipant: "both",
  dk: 7,
  dp: 3,
  hpK: false,
  hpP: false,
  currentExperience: "full",
  rules: {
    cooldownMin: 10,
    captureNeed: 3,
  },
  settings: {
    enterRadiusM: 30,
    character: "hero_duo",
    voiceRate: 1,
    sfxVol: 80,
    zoomUI: false,
  },
  session: {
    qaSalt: Date.now(),
    missionsCompleted: 0,
    rank: 1,
  },
  nodes: {},
  pendingCaptureReward: 0,
};

state.rules = state.rules || { cooldownMin: 10, captureNeed: 3 };
state.settings = state.settings || {};
state.session = state.session || {};
state.nodes = state.nodes || {};
state.settings.enterRadiusM =
  state.settings.enterRadiusM ?? ENTER_RADIUS_M_DEFAULT;
state.settings.character = state.settings.character ?? "hero_duo";
state.settings.voiceRate = state.settings.voiceRate ?? 1;
state.settings.sfxVol = state.settings.sfxVol ?? 80;
state.settings.zoomUI = state.settings.zoomUI ?? false;
state.session.qaSalt = state.session.qaSalt ?? Date.now();
state.session.missionsCompleted = state.session.missionsCompleted ?? 0;
state.session.rank = state.session.rank ?? 1;

const RANK_TABLE = [
  { rank: 1, missions: 0 },
  { rank: 2, missions: 10 },
  { rank: 3, missions: 25 },
  { rank: 4, missions: 50 },
  { rank: 5, missions: 100 },
];

const PIN_RULES = {
  1: {
    label: "HOME BASE PROTOCOL",
    type: "foundation",
    captureNeed: 2,
    requiredModes: ["quiz", "history"],
    cooldownMin: 5,
    banner: "Home Base: Complete QUIZ + HISTORY to establish the link.",
  },
  4: {
    label: "CENOTAPH PROTOCOL",
    type: "reflection",
    captureNeed: 3,
    requiredModes: ["history", "family", "activity"],
    cooldownMin: 15,
    banner: "Cenotaph: HISTORY + FAMILY + ACTIVITY required.",
  },
  100: {
    label: "FINAL BOSS ACTIVE",
    type: "boss",
    captureNeed: 4,
    requiredModes: ["battle", "logic", "speed", "quiz"],
    allowedModes: ["battle", "logic", "speed", "quiz"],
    cooldownMin: 30,
    banner: "FINAL BOSS: Complete all phases to capture.",
  },
};

const CHARACTERS = {
  hero_duo: {
    label: "Hero Duo",
    pointsMult: 1,
    healthMult: 1,
    iconHtml: `
      <div style="
        width:48px;height:48px;border-radius:50%;
        background:radial-gradient(circle at 35% 30%, #fff7a8, #f1c40f 45%, #9a6f00 100%);
        border:3px solid #fff3b0;
        box-shadow:0 0 18px rgba(241,196,15,.75);
        display:flex;align-items:center;justify-content:center;
        font-size:24px;line-height:1;
      ">🧭</div>`,
  },
  ninja: {
    label: "Ninja Scout",
    pointsMult: 1.1,
    healthMult: 0.9,
    iconHtml: `
      <div style="
        width:48px;height:48px;border-radius:50%;
        background:radial-gradient(circle at 35% 30%, #d8e6ff, #4ea3ff 50%, #173b6e 100%);
        border:3px solid #cfe1ff;
        box-shadow:0 0 18px rgba(78,163,255,.75);
        display:flex;align-items:center;justify-content:center;
        font-size:24px;line-height:1;
      ">🥷</div>`,
  },
  wizard: {
    label: "Wizard Guide",
    pointsMult: 1,
    healthMult: 1,
    iconHtml: `
      <div style="
        width:48px;height:48px;border-radius:50%;
        background:radial-gradient(circle at 35% 30%, #efe1ff, #9b59b6 50%, #4b245d 100%);
        border:3px solid #f0d9ff;
        box-shadow:0 0 18px rgba(155,89,182,.75);
        display:flex;align-items:center;justify-content:center;
        font-size:24px;line-height:1;
      ">🧙</div>`,
  },
  robot: {
    label: "Robo Ranger",
    pointsMult: 1.2,
    healthMult: 1.15,
    iconHtml: `
      <div style="
        width:48px;height:48px;border-radius:50%;
        background:radial-gradient(circle at 35% 30%, #dffcff, #5fffd7 50%, #11665b 100%);
        border:3px solid #dffff4;
        box-shadow:0 0 18px rgba(95,255,215,.75);
        display:flex;align-items:center;justify-content:center;
        font-size:24px;line-height:1;
      ">🤖</div>`,
  },
  pirate: {
    label: "Pirate Captain",
    pointsMult: 1.15,
    healthMult: 1.05,
    iconHtml: `
      <div style="
        width:48px;height:48px;border-radius:50%;
        background:radial-gradient(circle at 35% 30%, #ffe0e6, #ff5d73 50%, #7f2131 100%);
        border:3px solid #ffd4dc;
        box-shadow:0 0 18px rgba(255,93,115,.75);
        display:flex;align-items:center;justify-content:center;
        font-size:24px;line-height:1;
      ">🏴‍☠️</div>`,
  },
};

let map = null;
let hero = null;
let cur = null;
let activeTask = null;
let activeMarkers = {};
let audioCtx = null;

let healthActive = false;
let healthLast = null;
let healthMeters = 0;
let healthTarget = 0;

function save() {
  localStorage.setItem("bq_clean_match_v1", JSON.stringify(state));

  if ($("h-k")) $("h-k").innerText = state.k || 0;
  if ($("h-p")) $("h-p").innerText = state.p || 0;
  if ($("h-me")) $("h-me").innerText = state.khyl || 0;

  if ($("hp-k-tag")) {
    $("hp-k-tag").className = state.hpK ? "hp-status hp-on" : "hp-status hp-off";
    $("hp-k-tag").innerText = state.hpK ? "ACTIVE" : "OFF";
  }

  if ($("hp-p-tag")) {
    $("hp-p-tag").className = state.hpP ? "hp-status hp-on" : "hp-status hp-off";
    $("hp-p-tag").innerText = state.hpP ? "ACTIVE" : "OFF";
  }

  const radiusLabel = $("radius-label");
  if (radiusLabel) radiusLabel.innerText = String(state.settings.enterRadiusM ?? 30);

  const cooldownLabel = $("cooldown-label");
  if (cooldownLabel) cooldownLabel.innerText = String(state.rules.cooldownMin ?? 10);

  const captureLabel = $("capture-label");
  if (captureLabel) captureLabel.innerText = String(state.rules.captureNeed ?? 3);

  updateRank();
  updateRankHud();
  updateCaptureHud();
}

function getRank() {
  return state.session.rank ?? 1;
}

function updateRank() {
  let nextRank = 1;
  for (const row of RANK_TABLE) {
    if ((state.session.missionsCompleted ?? 0) >= row.missions) {
      nextRank = row.rank;
    }
  }
  state.session.rank = nextRank;
}

function updateRankHud() {
  let el = $("rank-hud");
  if (!el && $("coin-hud")) {
    el = document.createElement("div");
    el.id = "rank-hud";
    el.style.marginTop = "6px";
    el.style.fontSize = "12px";
    el.style.color = "var(--gold)";
    $("coin-hud").appendChild(el);
  }
  if (!el) return;

  const next = RANK_TABLE.find((x) => x.rank > getRank());
  el.innerText = next
    ? `RANK ${getRank()} | MISSIONS ${state.session.missionsCompleted} | NEXT ${next.missions}`
    : `RANK ${getRank()} | MISSIONS ${state.session.missionsCompleted} | MAX`;
}

function getCharacter() {
  const key = state.settings.character || "hero_duo";
  return CHARACTERS[key] || CHARACTERS.hero_duo;
}

function cleanSpeechText(text) {
  return String(text || "").replace(/[^\w\s.,!?'"():;\-]/g, "");
}

function difficultyTier() {
  return state.dp <= 4 ? "kid" : "adult";
}

function speak(text) {
  if (!text) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(cleanSpeechText(text));
    u.lang = "en-GB";
    u.rate = parseFloat($("v-rate")?.value || state.settings.voiceRate || 1);
    u.pitch = parseFloat($("v-pitch")?.value || "1");
    synth.speak(u);
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
  setTimeout(() => beep(1040, 0.12, "triangle", 0.06), 140);
}

function playFailSfx() {
  beep(220, 0.1, "sawtooth", 0.04);
  setTimeout(() => beep(180, 0.12, "sawtooth", 0.035), 90);
}

function playCaptureSfx() {
  beep(520, 0.09, "square", 0.05);
  setTimeout(() => beep(780, 0.12, "square", 0.055), 80);
  setTimeout(() => beep(1040, 0.14, "square", 0.06), 170);
}

function ensureRewardLayer() {
  let fx = $("reward-fx-layer");
  if (fx) return fx;
  fx = document.createElement("div");
  fx.id = "reward-fx-layer";
  fx.style.position = "fixed";
  fx.style.inset = "0";
  fx.style.pointerEvents = "none";
  fx.style.zIndex = "20000";
  document.body.appendChild(fx);
  return fx;
}

function burstEmoji(count = 12, emoji = "✨") {
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
    el.style.transition =
      "transform 900ms ease-out, opacity 900ms ease-out, top 900ms ease-out";
    layer.appendChild(el);
    requestAnimationFrame(() => {
      const dx = -80 + Math.random() * 160;
      const dy = -100 - Math.random() * 120;
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${-80 + Math.random() * 160}deg)`;
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
  card.style.top = "20%";
  card.style.transform = "translate(-50%, -10px) scale(0.96)";
  card.style.minWidth = "220px";
  card.style.maxWidth = "86vw";
  card.style.background = tone === "fail" ? "rgba(80,0,0,0.92)" : "rgba(0,0,0,0.9)";
  card.style.border = tone === "fail" ? "2px solid #ff6666" : "2px solid var(--gold)";
  card.style.color = "#fff";
  card.style.borderRadius = "18px";
  card.style.padding = "16px 18px";
  card.style.textAlign = "center";
  card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
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
  }, 3200);
  setTimeout(() => card.remove(), 3700);
}

function celebrateCorrect(fact = "") {
  playSuccessSfx();
  burstEmoji(14, "✨");
  showRewardPopup("CORRECT!", fact || "Great job.");
}

function celebrateCapture(mins) {
  playCaptureSfx();
  burstEmoji(18, "🏆");
  showRewardPopup("NODE CAPTURED!", `Reawakens in ${mins} minutes`);
}

function warnTryAgain() {
  playFailSfx();
  showRewardPopup("NOT QUITE", "Try again.", "fail");
}

function pulseCoinsHud() {
  const hud = $("coin-hud");
  if (!hud) return;
  hud.animate(
    [
      { transform: "scale(1)", boxShadow: "0 0 0 rgba(241,196,15,0)" },
      { transform: "scale(1.04)", boxShadow: "0 0 22px rgba(241,196,15,0.55)" },
      { transform: "scale(1)", boxShadow: "0 0 0 rgba(241,196,15,0)" },
    ],
    { duration: 450, easing: "ease-out" }
  );
}

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

function getPinRule(pin) {
  return pin ? PIN_RULES[pin.id] || null : null;
}

function getEffectiveCaptureNeed(pin) {
  return getPinRule(pin)?.captureNeed ?? (state.rules.captureNeed || 3);
}

function getEffectiveCooldownMs(pin) {
  const mins = getPinRule(pin)?.cooldownMin ?? (state.rules.cooldownMin || 10);
  return mins * 60 * 1000;
}

function requiredModesFor(pin) {
  return Array.isArray(getPinRule(pin)?.requiredModes)
    ? getPinRule(pin).requiredModes
    : null;
}

function allowedModesFor(pin) {
  return Array.isArray(getPinRule(pin)?.allowedModes)
    ? getPinRule(pin).allowedModes
    : null;
}

function nodeState(id) {
  if (!state.nodes[id]) {
    state.nodes[id] = {
      completedModes: [],
      cooldownUntil: 0,
    };
  }
  return state.nodes[id];
}

function isOnCooldown(id) {
  const ns = nodeState(id);
  return ns.cooldownUntil && Date.now() < ns.cooldownUntil;
}

function pinMatchesExperience(_pin) {
  return true;
}

function pinUnlockedForRank(_pin) {
  return true;
}

function getVisiblePins() {
  return PINS.filter((pin) => pinMatchesExperience(pin) && pinUnlockedForRank(pin));
}

function updateCaptureHud() {
  const hud = $("capture-hud");
  if (!hud) return;

  if (!cur) {
    hud.innerText = "CAPTURE: -";
    return;
  }

  const ns = nodeState(cur.id);
  const need = getEffectiveCaptureNeed(cur);
  const left = Math.max(0, need - ns.completedModes.length);
  const rule = getPinRule(cur);
  const label = rule?.type === "boss" ? "BOSS" : "CAPTURE";

  hud.innerText = isOnCooldown(cur.id)
    ? `${label}: LOCKED`
    : `${label}: ${ns.completedModes.length}/${need} (need ${left} more)`;
}

function initMap() {
  map = L.map("map", { zoomControl: false }).setView([54.1137, -3.2184], 17);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  if (state.settings.zoomUI) {
    L.control.zoom({ position: "topright" }).addTo(map);
    if ($("zoomui-label")) $("zoomui-label").innerText = "ON";
  } else {
    if ($("zoomui-label")) $("zoomui-label").innerText = "OFF";
  }

  hero = L.marker([54.1137, -3.2184], {
    icon: L.divIcon({
      className: "marker-logo",
      html: getCharacter().iconHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    }),
  }).addTo(map);

  initPins();
  startGPSWatcher();
}

function refreshHeroIcon() {
  if (!hero) return;
  hero.setIcon(
    L.divIcon({
      className: "marker-logo",
      html: getCharacter().iconHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    })
  );
}

function initPins() {
  if (!map) return;

  Object.values(activeMarkers).forEach((m) => map.removeLayer(m));
  activeMarkers = {};

  getVisiblePins().forEach((p) => {
    if (!isOnCooldown(p.id)) {
      const pinHtml =
        typeof p.i === "string" && p.i.trim().startsWith("<")
          ? p.i
          : `<div style="font-size:28px;line-height:1;">${p.i || "📍"}</div>`;

      const m = L.marker(p.l, {
        icon: L.divIcon({
          className: "marker-logo",
          html: pinHtml,
          iconSize: [46, 46],
          iconAnchor: [23, 23],
        }),
      }).addTo(map);

      activeMarkers[p.id] = m;
    }
  });

  save();
}

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

function startGPSWatcher() {
  map.locate({ watch: true, enableHighAccuracy: true });

  map.on("locationfound", (e) => {
    if (hero) hero.setLatLng(e.latlng);

    if (healthActive) {
      const pt = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (!healthLast) healthLast = pt;
      const step = haversineMeters(healthLast, pt);

      if (step > 0.5 && step < 20) {
        healthMeters += step;
        healthLast = pt;
      }

      const fb = $("task-feedback");
      if (fb) {
        fb.style.display = "block";
        fb.innerText = `Distance: ${healthMeters.toFixed(0)}m / ${healthTarget}m`;
      }

      if (healthMeters >= healthTarget) {
        healthActive = false;
        if (activeTask) {
          activeTask.passed = true;
          activeTask.pendingReward =
            PASS_BONUS_COINS + Math.round(MODE_BONUS_COINS * (getCharacter().pointsMult ?? 1));
        }
        celebrateCorrect("Health objective complete!");
        showRewardOnly("Health objective complete. Choose who gets the points.");
      }
    }

    const near = getVisiblePins().find(
      (p) =>
        map.distance(e.latlng, p.l) <
          (parseInt(state.settings.enterRadiusM ?? ENTER_RADIUS_M_DEFAULT, 10) || 30) &&
        !isOnCooldown(p.id)
    );

    if (near) {
      cur = near;
      if ($("action-trigger")) $("action-trigger").style.display = "block";
    } else {
      cur = null;
      if ($("action-trigger")) $("action-trigger").style.display = "none";
    }

    updateCaptureHud();
  });

  map.on("locationerror", () => {
    console.warn("GPS blocked/unavailable.");
  });
}

function showPinBanners(pin) {
  const rule = getPinRule(pin);
  const modeBanner = $("mode-banner");
  const bossBanner = $("boss-banner");

  if (modeBanner) modeBanner.style.display = "none";
  if (bossBanner) bossBanner.style.display = "none";
  if (!rule) return;

  if (modeBanner) {
    modeBanner.style.display = "block";
    modeBanner.innerText = `${rule.label}\n${rule.banner || ""}`;
  }

  if (rule.type === "boss" && bossBanner) {
    bossBanner.style.display = "block";
    bossBanner.innerText = "BOSS MODE ACTIVE\nBoss phases enforced.";
  }
}

function disableModeTiles(disabled) {
  document.querySelectorAll(".m-tile").forEach((tile) => {
    tile.style.opacity = disabled ? "0.35" : "1";
    tile.style.pointerEvents = disabled ? "none" : "auto";
  });
}

function openQuest() {
  if (!cur) return;

  const ns = nodeState(cur.id);
  if ($("q-name")) $("q-name").innerText = cur.n;
  toggleM("quest-modal", true);
  showPinBanners(cur);

  const need = getEffectiveCaptureNeed(cur);

  if (isOnCooldown(cur.id)) {
    const mins = Math.ceil((ns.cooldownUntil - Date.now()) / 60000);
    if ($("quest-status")) {
      $("quest-status").innerText = `STATUS: CAPTURED (reawakens in ~${mins} min)`;
    }
    disableModeTiles(true);
  } else {
    if ($("quest-status")) {
      $("quest-status").innerText = `STATUS: READY (Complete ${need} modes to capture)`;
    }

    disableModeTiles(false);

    const allowed = allowedModesFor(cur);
    if (allowed) {
      document.querySelectorAll(".m-tile").forEach((tile) => {
        const mode = tile.getAttribute("data-mode");
        const ok = allowed.includes(mode);
        tile.style.opacity = ok ? "1" : "0.2";
        tile.style.pointerEvents = ok ? "auto" : "none";
      });
    }
  }

  updateCaptureHud();
}

function closeQuest() {
  toggleM("quest-modal", false);
}

function maybeWildcard() {
  const roll = Math.random();
  if (roll > 0.05) return null;
  return {
    q: "WILDCARD: Treasure chest discovered!",
    options: ["OPEN CHEST", "LEAVE IT", "SKIP", "UNSAFE"],
    answer: 0,
    fact: "Lucky find! Rare reward ready.",
    meta: { wildcard: true, rewardCoins: 250 },
  };
}

function resetTaskView() {
  if ($("task-desc")) $("task-desc").style.display = "block";
  if ($("task-feedback")) {
    $("task-feedback").style.display = "none";
    $("task-feedback").innerText = "";
  }
  if ($("task-options")) $("task-options").innerHTML = "";
  showRewardPanel(false);
}

function showRewardPanel(show = true) {
  const panel = $("reward-panel");
  if (panel) panel.style.display = show ? "block" : "none";
}

function showRewardOnly(message) {
  if ($("task-desc")) $("task-desc").style.display = "none";
  if ($("task-options")) $("task-options").innerHTML = "";
  if ($("task-feedback")) {
    $("task-feedback").style.display = "block";
    $("task-feedback").innerText = message || "Reward ready.";
  }
  showRewardPanel(true);
}

function launchMode(mode) {
  if (!cur) return;

  const ns = nodeState(cur.id);
  const allowed = allowedModesFor(cur);

  if (allowed && !allowed.includes(mode)) {
    speak("This mode is locked at this node.");
    return;
  }

  if (ns.completedModes.includes(mode)) {
    speak("Mode already completed here.");
    return;
  }

  const task = maybeWildcard() || getQA(cur.id, mode, difficultyTier(), state.session.qaSalt);

  activeTask = {
    mode,
    passed: false,
    pendingReward: 0,
    prompt: task.q,
    options: task.options,
    answerIndex: task.answer,
    fact: task.fact || "",
    meta: task.meta || {},
  };

  if ($("task-title")) $("task-title").innerText = `${mode.toUpperCase()} @ ${cur.n}`;
  if ($("task-desc")) $("task-desc").innerText = activeTask.prompt;

  resetTaskView();
  renderOptions(activeTask);

  toggleM("quest-modal", false);
  toggleM("task-modal", true);
}

function renderOptions(task) {
  const wrap = $("task-options");
  if (!wrap) return;

  wrap.innerHTML = (task.options || [])
    .map(
      (opt, idx) =>
        `<button class="mcq-btn" data-idx="${idx}">${String.fromCharCode(65 + idx)}) ${opt}</button>`
    )
    .join("");

  wrap.querySelectorAll(".mcq-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectOption(parseInt(btn.dataset.idx, 10));
    });
  });
}

function selectOption(idx) {
  if (!activeTask) return;

  if (activeTask.mode === "health") {
    if (idx === 0) {
      const base =
        activeTask.meta?.meters ?? (difficultyTier() === "kid" ? 30 : 80);
      healthTarget = Math.max(
        10,
        Math.round(base * (getCharacter().healthMult ?? 1))
      );
      healthActive = true;
      healthMeters = 0;
      healthLast = null;
      return;
    }

    if (idx === 1) {
      healthActive = false;
      toggleM("task-modal", false);
      openQuest();
      return;
    }
  }

  if (
    activeTask.mode === "battle" ||
    activeTask.mode === "speed" ||
    activeTask.mode === "family" ||
    activeTask.mode === "activity"
  ) {
    if (idx === 0) {
      activeTask.passed = true;
      activeTask.pendingReward =
        PASS_BONUS_COINS +
        Math.round(MODE_BONUS_COINS * (getCharacter().pointsMult ?? 1));
      celebrateCorrect(activeTask.fact || "Completed.");
      showRewardOnly(activeTask.fact || "Completed. Choose who gets the points.");
      return;
    }

    if (idx === 1) {
      if ($("task-feedback")) {
        $("task-feedback").style.display = "block";
        $("task-feedback").innerText = "Not yet.";
      }
      return;
    }

    if (idx === 2 || idx === 3) {
      activeTask.passed = true;
      activeTask.pendingReward = 0;
      toggleM("task-modal", false);
      openQuest();
      return;
    }
  }

  const correct = idx === activeTask.answerIndex;

  if (!correct) {
    if ($("task-feedback")) {
      $("task-feedback").style.display = "block";
      $("task-feedback").innerText = "Not quite. Try again.";
    }
    warnTryAgain();
    return;
  }

  activeTask.passed = true;
  activeTask.pendingReward =
    (activeTask.meta?.rewardCoins || PASS_BONUS_COINS) +
    Math.round(MODE_BONUS_COINS * (getCharacter().pointsMult ?? 1));

  celebrateCorrect(activeTask.fact || "Nice work!");
  showRewardOnly(activeTask.fact || "Correct. Choose who gets the points.");
}

function awardPointsTo(target, amount) {
  const gain = Math.max(0, Math.round(amount || 0));
  if (!gain) return;

  if (target === "kylan") state.k += gain;
  else if (target === "piper") state.p += gain;
  else if (target === "khyl") state.khyl += gain;
  else {
    state.k += gain;
    state.p += gain;
  }

  playSuccessSfx();
  pulseCoinsHud();
  burstEmoji(10, "🪙");
  save();
}

function getPendingRewardAmount() {
  if (activeTask?.pendingReward) return activeTask.pendingReward;
  if (state.pendingCaptureReward) return state.pendingCaptureReward;
  return PASS_BONUS_COINS;
}

function clearPendingRewards() {
  if (activeTask) activeTask.pendingReward = 0;
  state.pendingCaptureReward = 0;
}

function finalizeReward(target) {
  if (!cur) return;

  const amount = getPendingRewardAmount();
  awardPointsTo(target, amount);
  clearPendingRewards();
  showRewardPanel(false);

  if (activeTask && activeTask.mode) {
    const ns = nodeState(cur.id);
    if (!ns.completedModes.includes(activeTask.mode)) {
      ns.completedModes.push(activeTask.mode);
      state.session.missionsCompleted += 1;
      updateRank();
    }

    const need = getEffectiveCaptureNeed(cur);
    const reqModes = requiredModesFor(cur);
    const reqOk = reqModes
      ? reqModes.every((m) => ns.completedModes.includes(m))
      : true;

    toggleM("task-modal", false);
    save();

    if (ns.completedModes.length >= need && reqOk) {
      captureNode(cur);
    } else {
      openQuest();
    }
    return;
  }

  toggleM("task-modal", false);
  save();
}

function captureNode(pin) {
  const ns = nodeState(pin.id);
  ns.cooldownUntil = Date.now() + getEffectiveCooldownMs(pin);
  ns.completedModes = [];
  state.session.qaSalt = Date.now();

  if (activeMarkers[pin.id]) {
    map.removeLayer(activeMarkers[pin.id]);
    delete activeMarkers[pin.id];
  }

  state.pendingCaptureReward = CAPTURE_BONUS_COINS;
  save();

  const mins = Math.round(getEffectiveCooldownMs(pin) / 60000);
  celebrateCapture(mins);

  if ($("task-title")) $("task-title").innerText = "NODE CAPTURED";
  if ($("task-desc")) $("task-desc").style.display = "none";
  if ($("task-options")) $("task-options").innerHTML = "";
  if ($("task-feedback")) {
    $("task-feedback").style.display = "block";
    $("task-feedback").innerText = "Choose who gets the capture reward.";
  }

  toggleM("task-modal", true);
  showRewardPanel(true);
  toggleM("quest-modal", false);
  updateCaptureHud();
  initPins();
}

function renderHomeLog() {
  const sum = $("home-summary");
  const list = $("home-list");
  if (!sum || !list) return;

  const now = Date.now();
  let locked = 0;
  const rows = [];

  getVisiblePins().forEach((p) => {
    const ns = nodeState(p.id);
    const onCd = ns.cooldownUntil && now < ns.cooldownUntil;
    const doneCount = ns.completedModes?.length || 0;

    if (onCd) locked++;

    let status = "Fresh";
    if (onCd) {
      const mins = Math.ceil((ns.cooldownUntil - now) / 60000);
      status = `Captured (back in ~${mins}m)`;
    } else if (doneCount > 0) {
      status = `Progress (${doneCount}/${getEffectiveCaptureNeed(p)} modes)`;
    }

    rows.push({ name: p.n, status });
  });

  sum.innerHTML = `Pins: <b>${getVisiblePins().length}</b> | Locked: <b>${locked}</b> | Kylan: <b>${state.k}</b> | Piper: <b>${state.p}</b> | KHYL: <b>${state.khyl}</b> | Rank: <b>${getRank()}</b>`;

  list.innerHTML = rows
    .map(
      (r) =>
        `<div style="padding:10px;border:1px solid #333;border-radius:12px;margin:8px 0;background:#111;"><div style="font-weight:bold;">${r.name}</div><div style="opacity:.85;font-size:12px;">${r.status}</div></div>`
    )
    .join("");
}

function wireHUD() {
  onClick("btn-home", () => {
    renderHomeLog();
    toggleM("home-modal", true);
  });
  onClick("btn-home-close", () => toggleM("home-modal", false));
  onClick("btn-home-close-x", () => toggleM("home-modal", false));

  onClick("btn-settings", () => toggleM("settings-modal", true));
  onClick("btn-close-settings", () => toggleM("settings-modal", false));
  onClick("btn-close-settings-x", () => toggleM("settings-modal", false));
  onClick("btn-open-settings", () => toggleM("settings-modal", true));

  onClick("btn-commander", () => toggleM("commander-hub", true));
  onClick("btn-close-commander", () => toggleM("commander-hub", false));
  onClick("btn-close-commander-x", () => toggleM("commander-hub", false));

  onClick("btn-start", () => {
    initExperienceFromStart();
    save();
    initPins();
    toggleM("start-modal", false);
  });
  onClick("btn-start-close", () => toggleM("start-modal", false));
  onClick("btn-start-close-x", () => toggleM("start-modal", false));

  onClick("btn-close-quest", closeQuest);
  onClick("btn-task-close", () => toggleM("task-modal", false));

  onClick("action-trigger", openQuest);

  onClick("btn-award-kylan", () => finalizeReward("kylan"));
  onClick("btn-award-piper", () => finalizeReward("piper"));
  onClick("btn-award-khyl", () => finalizeReward("khyl"));
  onClick("btn-award-both", () => finalizeReward("both"));

  onClick("btn-hp-k", () => {
    state.hpK = !state.hpK;
    save();
  });

  onClick("btn-hp-p", () => {
    state.hpP = !state.hpP;
    save();
  });

  onClick("btn-swap", () => {
    const a = state.dk ?? 7;
    const b = state.dp ?? 3;
    state.dk = b;
    state.dp = a;
    if ($("dk")) $("dk").value = String(state.dk);
    if ($("dp")) $("dp").value = String(state.dp);
    save();
  });

  onClick("btn-night", () => {
    $("map")?.classList.toggle("night-vision");
  });

  onClick("btn-respawn-nodes", () => {
    Object.keys(state.nodes || {}).forEach((id) => {
      state.nodes[id].cooldownUntil = 0;
      state.nodes[id].completedModes = [];
    });
    initPins();
    save();
  });

  onClick("btn-test", () => {
    refreshHeroIcon();
    initPins();
    showRewardPopup("SYSTEMS OK", "Buttons and markers refreshed.");
  });

  const charSel = $("char-select");
  if (charSel) {
    charSel.value = state.settings.character || "hero_duo";
    charSel.addEventListener("change", () => {
      state.settings.character = charSel.value || "hero_duo";
      refreshHeroIcon();
      save();
    });
  }

  const participantSelect = $("participant-select");
  if (participantSelect) {
    participantSelect.value = state.activeParticipant || "both";
    participantSelect.addEventListener("change", () => {
      state.activeParticipant = participantSelect.value || "both";
      save();
    });
  }

  const radius = $("enter-radius");
  if (radius) {
    radius.value = String(state.settings.enterRadiusM ?? 30);
    radius.addEventListener("input", () => {
      state.settings.enterRadiusM = parseInt(radius.value, 10) || 30;
      save();
    });
  }

  const cooldown = $("cooldown-min");
  if (cooldown) {
    cooldown.value = String(state.rules.cooldownMin ?? 10);
    cooldown.addEventListener("input", () => {
      state.rules.cooldownMin = parseInt(cooldown.value, 10) || 10;
      save();
    });
  }

  const captureNeed = $("capture-need");
  if (captureNeed) {
    captureNeed.value = String(state.rules.captureNeed ?? 3);
    captureNeed.addEventListener("input", () => {
      state.rules.captureNeed = parseInt(captureNeed.value, 10) || 3;
      save();
    });
  }

  const dk = $("dk");
  if (dk) {
    dk.value = String(state.dk ?? 7);
    dk.addEventListener("input", () => {
      state.dk = parseInt(dk.value, 10) || 7;
      save();
    });
  }

  const dp = $("dp");
  if (dp) {
    dp.value = String(state.dp ?? 3);
    dp.addEventListener("input", () => {
      state.dp = parseInt(dp.value, 10) || 3;
      save();
    });
  }
}

function initExperienceFromStart() {
  if ($("pill-park")?.classList.contains("active")) state.currentExperience = "park";
  else if ($("pill-docks")?.classList.contains("active")) state.currentExperience = "docks";
  else state.currentExperience = "full";
}

function wireModes() {
  document.querySelectorAll(".m-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const mode = tile.getAttribute("data-mode");
      launchMode(mode);
    });
  });
}

function boot() {
  try {
    initMap();
    wireHUD();
    wireModes();
    save();
    console.log("Barrow Quest booted");
  } catch (err) {
    console.error("Boot error:", err);
    if ($("capture-hud")) $("capture-hud").innerText = "BOOT ERROR";
  }
}

window.addEventListener("DOMContentLoaded", boot);

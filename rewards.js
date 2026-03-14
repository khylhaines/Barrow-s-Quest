// rewards.js
// Coin system + rewards

const state = {
  coins: {
    kylan: 0,
    piper: 0,
  },

  inventory: {
    bronze: 0,
    silver: 0,
    gold: 0,
  },
};

function updateHUD() {
  const k = document.getElementById("h-k");
  const p = document.getElementById("h-p");

  if (k) k.textContent = state.coins.kylan;
  if (p) p.textContent = state.coins.piper;
}

/* ==========================
    COINS
    ========================== */

export function addCoins(child, amount) {
  if (child === "Kylan" || child === "kylan") {
    state.coins.kylan += amount;
  } else if (child === "Piper" || child === "piper") {
    state.coins.piper += amount;
  } else {
    state.coins.kylan += amount;
    state.coins.piper += amount;
  }

  updateHUD();
}

/* ==========================
    CHESTS
    ========================== */

export function giveChest(type) {
  if (!state.inventory[type]) return;

  state.inventory[type] += 1;

  alert("Chest Found: " + type.toUpperCase());
}

/* ==========================
    OPEN CHEST
    ========================== */

export function openChest(type) {
  if (state.inventory[type] <= 0) {
    alert("No " + type + " chests");
    return;
  }

  state.inventory[type] -= 1;

  let reward = 0;

  if (type === "bronze") reward = 50;
  if (type === "silver") reward = 120;
  if (type === "gold") reward = 300;

  addCoins("Both", reward);

  alert(type + " chest opened! +" + reward + " coins");
}

/* ==========================
    GET STATE
    ========================== */

export function getRewardState() {
  return state;
}

/* ==========================
    INIT
    ========================== */

updateHUD();

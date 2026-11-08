const deck = document.getElementById("deck");
const deckFrame = document.getElementById("deckFrame");

const tabButtons = [...document.querySelectorAll(".tab")];
const panes = [...document.querySelectorAll(".pane")];

function activateTab(name) {
  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  panes.forEach((pane) => pane.classList.toggle("active", pane.dataset.pane === name));
}

tabButtons.forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

document.querySelector(".deck-tabs").addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  event.preventDefault();
  const index = tabButtons.findIndex((btn) => btn.classList.contains("active"));
  const next = tabButtons[(index + (event.key === "ArrowRight" ? 1 : -1) + tabButtons.length) % tabButtons.length];
  next.focus();
  activateTab(next.dataset.tab);
});

const logEl = document.getElementById("log");
const logCount = document.getElementById("logCount");
const startupLog = [
  "starting mode: stage 1: 2 ticks all | 2 ticks wave (0.5f all | 0.5f wave @ 60fps)",
  "f6 cycles anywhere: 2/2 -> 4/4 -> 8/8 -> 16/8 -> 24/12 -> 32/16 -> 40/20 -> off",
  "f9 opens the control deck",
  "host os: windows (native)",
  "buffer ready | 2t all / 2t wave | f6 cycles"
];
function liveLine() {
  const stage = stageAt(currentStage);
  const max = Math.max(stage.all, stage.wave, 1);
  const delay = Math.min(2, Math.max(1, max - 1));
  const start = Math.max(1, max - delay - 2);
  const fail = Math.min(max, delay + 4);
  switch (logIndex % 4) {
    case 0: return `saved press +${delay}t (${delay / 4}f)  ${start}->${start + delay}  [max ${max}]`;
    case 1: return `no save: release dies in ${fail}t (max ${max}t, best +0t -> ${fail}t of ${max})`;
    case 2: return `saved release +${delay}t (${delay / 4}f)  ${start + 2}->${start + 2 + delay}  [max ${max}]`;
    default: return `orb press +${delay}t (${delay / 4}f) -> ${start + delay}t`;
  }
}
let logIndex = 0;
let logTotal = 0;

function pushLine(text) {
  const line = document.createElement("div");
  line.className = "log-line";
  line.textContent = text;
  logIndex += 1;
  logTotal += 1;
  const prev = logEl.querySelector(".log-line.latest");
  if (prev) prev.classList.remove("latest");
  line.classList.add("latest");
  logEl.appendChild(line);
  const limit = logEl.classList.contains("expanded") ? 12 : 7;
  while (logEl.children.length > limit) logEl.removeChild(logEl.firstChild);
  logCount.textContent = logTotal;
}

if (logEl.children.length) {
  [...logEl.children].forEach((line, index, all) => {
    line.classList.toggle("latest", index === all.length - 1);
  });
  logTotal = logEl.children.length;
  logIndex = logTotal;
} else {
  startupLog.forEach((line) => pushLine(line));
}

setInterval(() => {
  if (document.hidden) return;
  if (!document.querySelector('.pane[data-pane="log"].active')) return;
  if (!isCustom(currentStage) && stageAt(currentStage).all === 0) return;
  pushLine(liveLine());
}, 3600);

document.getElementById("expandBtn").addEventListener("click", (event) => {
  const expanded = logEl.classList.toggle("expanded");
  event.currentTarget.textContent = expanded ? "collapse" : "expand";
});

document.getElementById("copyBtn").addEventListener("click", async (event) => {
  const btn = event.currentTarget;
  const text = [...logEl.children].map((line) => line.textContent).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "copied";
  } catch {
    btn.textContent = "copy failed";
  }
  setTimeout(() => { btn.textContent = "copy"; }, 1200);
});

const baseStages = [
  { name: "tight", all: 2, wave: 2 },
  { name: "quick", all: 4, wave: 4 },
  { name: "steady", all: 8, wave: 8 },
  { name: "flow", all: 16, wave: 8 },
  { name: "deep", all: 24, wave: 12 },
  { name: "wide", all: 32, wave: 16 },
  { name: "max", all: 40, wave: 20 },
  { name: "raw", all: 0, wave: 0 }
];

const CUSTOM_LIMIT = 4;
const TICKS_MIN = 1;
const TICKS_MAX = 240;
const TICKS_SAFE = 120;

const stageCard = document.querySelector(".stage-card");
const stageRow = document.getElementById("stageRow");
const stageName = document.getElementById("stageName");
const stageTicks = document.getElementById("stageTicks");
const stageIndex = document.getElementById("stageIndex");
const stageHint = document.querySelector(".stage-hint");
const sliderAll = document.getElementById("sliderAll");
const sliderWave = document.getElementById("sliderWave");
const tickAll = document.getElementById("tickAll");
const tickWave = document.getElementById("tickWave");
const removeBtn = document.getElementById("removeBtn");

let customStages = [];
try {
  const stored = JSON.parse(localStorage.getItem("afterflow-custom-stages") || "[]");
  if (Array.isArray(stored)) customStages = stored.slice(0, CUSTOM_LIMIT);
} catch {}

let currentStage = 0;

function totalStages() {
  return baseStages.length + customStages.length;
}

function stageAt(index) {
  return index < baseStages.length ? baseStages[index] : customStages[index - baseStages.length];
}

function isCustom(index) {
  return index >= baseStages.length;
}

function stageLabelAt(index) {
  return index < baseStages.length ? baseStages[index].name : "c" + (index - baseStages.length + 1);
}

function stageTitleAt(index) {
  return index < baseStages.length ? baseStages[index].name : "custom " + (index - baseStages.length + 1);
}

function clampTicks(value) {
  if (Number.isNaN(value)) return TICKS_MIN;
  return Math.min(TICKS_MAX, Math.max(TICKS_MIN, Math.round(value)));
}

function saveCustom() {
  try {
    localStorage.setItem("afterflow-custom-stages", JSON.stringify(customStages));
  } catch {}
}

function paintRange(range, value) {
  const ratio = isCustom(currentStage)
    ? (value - TICKS_MIN) / (TICKS_MAX - TICKS_MIN)
    : value / 40;
  range.style.setProperty("--fill", Math.min(100, Math.max(0, ratio * 100)) + "%");
}

function renderStageRow() {
  stageRow.innerHTML = "";
  const total = totalStages();
  for (let index = 0; index < total; index += 1) {
    const chip = document.createElement("button");
    chip.className = "stage-chip" + (index === currentStage ? " active" : "");
    chip.textContent = stageLabelAt(index);
    chip.setAttribute("aria-pressed", index === currentStage ? "true" : "false");
    chip.addEventListener("click", () => selectStage(index));
    stageRow.appendChild(chip);
  }
}

function stageBanner(index) {
  const stage = stageAt(index);
  if (!isCustom(index) && stage.all === 0 && stage.wave === 0) {
    return "stage off (100% raw input)";
  }
  return `stage ${index + 1}: ${stage.all} ticks all | ${stage.wave} ticks wave (${stage.all / 4}f all | ${stage.wave / 4}f wave @ 60fps)`;
}

function selectStage(index, logChange = true) {
  currentStage = Math.min(totalStages() - 1, Math.max(0, index));
  const stage = stageAt(currentStage);
  const custom = isCustom(currentStage);

  [...stageRow.children].forEach((chip, i) => {
    chip.classList.toggle("active", i === currentStage);
    chip.setAttribute("aria-pressed", i === currentStage ? "true" : "false");
  });
  stageCard.classList.toggle("custom", custom);

  stageName.textContent = stageTitleAt(currentStage);
  stageIndex.textContent = String(currentStage + 1).padStart(2, "0") + "/" + String(totalStages()).padStart(2, "0");
  stageTicks.innerHTML = `${stage.all} ticks all <span class="sep">/</span> ${stage.wave} ticks wave`;

  const raw = !custom && stage.all === 0 && stage.wave === 0;
  tickAll.value = raw ? "off" : stage.all;
  tickWave.value = raw ? "off" : stage.wave;
  tickAll.readOnly = !custom;
  tickWave.readOnly = !custom;

  sliderAll.disabled = !custom;
  sliderWave.disabled = !custom;
  sliderAll.value = stage.all;
  sliderWave.value = stage.wave;
  paintRange(sliderAll, stage.all);
  paintRange(sliderWave, stage.wave);

  removeBtn.hidden = !custom;
  document.getElementById("customBtn").disabled = customStages.length >= CUSTOM_LIMIT;

  if (stage.all === 0 && stage.wave === 0) {
    stageHint.textContent = "raw input, nothing is buffered";
  } else if (custom && (stage.all > TICKS_SAFE || stage.wave > TICKS_SAFE)) {
    stageHint.textContent = `warning: over ${TICKS_SAFE} ticks may lag or work worse than ${TICKS_SAFE}`;
  } else if (custom) {
    stageHint.textContent = `tune each delay with -5 / -1 / +1 / +5, up to ${TICKS_MAX} ticks`;
  } else if (customStages.length >= CUSTOM_LIMIT) {
    stageHint.textContent = "custom stage limit reached";
  } else {
    stageHint.textContent = "tap + custom to make an editable copy of this stage";
  }

  if (logChange) {
    pushLine("stage set -> " + stageBanner(currentStage));
  }
}

function updateCustomTicks(row, value) {
  if (!isCustom(currentStage)) return;
  const stage = stageAt(currentStage);
  if (row === 0) {
    stage.all = clampTicks(value);
  } else {
    stage.wave = clampTicks(value);
  }
  saveCustom();
  selectStage(currentStage, false);
}

renderStageRow();
selectStage(0, false);

document.getElementById("customBtn").addEventListener("click", () => {
  if (customStages.length >= CUSTOM_LIMIT) {
    return;
  }
  const source = stageAt(currentStage);
  customStages.push({ all: clampTicks(source.all), wave: clampTicks(source.wave) });
  saveCustom();
  renderStageRow();
  selectStage(totalStages() - 1);
});

removeBtn.addEventListener("click", () => {
  if (!isCustom(currentStage)) return;
  const custom = currentStage - baseStages.length;
  customStages.splice(custom, 1);
  saveCustom();
  renderStageRow();
  selectStage(custom > 0 ? baseStages.length + custom - 1 : baseStages.length - 2);
});

tickAll.addEventListener("change", () => updateCustomTicks(0, Number(tickAll.value)));
tickWave.addEventListener("change", () => updateCustomTicks(1, Number(tickWave.value)));

[tickAll, tickWave].forEach((input, row) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      input.blur();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      updateCustomTicks(row, Number(input.value) + (event.key === "ArrowUp" ? 1 : -1));
    }
  });
});

document.querySelectorAll(".tick-steps button").forEach((button) => {
  button.addEventListener("click", () => {
    const row = Number(button.parentElement.dataset.row);
    const input = row === 0 ? tickAll : tickWave;
    updateCustomTicks(row, Number(input.value) + Number(button.dataset.step));
  });
});

sliderAll.addEventListener("input", () => updateCustomTicks(0, Number(sliderAll.value)));
sliderWave.addEventListener("input", () => updateCustomTicks(1, Number(sliderWave.value)));

const themes = [
  ["violet", "#7c4dff", "#b79cff", "#16161a", "#e8e9ee"],
  ["ocean", "#3ba3ff", "#8fd0ff", "#121820", "#e6edf5"],
  ["mint", "#34d399", "#8ee8c4", "#101a17", "#e4f2ec"],
  ["rose", "#ff6b8a", "#ffb3c3", "#1b1418", "#f5e8ec"],
  ["mono", "#c9cdd6", "#ffffff", "#15161a", "#edeef2"],
  ["ice", "#67d5ff", "#bfeaff", "#101820", "#e6f1f7"],
  ["grape", "#a855f7", "#d5b4ff", "#17131f", "#efe7f7"],
  ["lime", "#a3e635", "#d9f99d", "#141a10", "#eaf3df"],
  ["crimson", "#f43f5e", "#ff9eb0", "#1b1115", "#f5e4e8"],
  ["dark", "#f2f3f7", "#14161b", "#0a0b0e", "#f2f3f7"],
  ["white", "#3b82f6", "#ffffff", "#f4f2ed", "#1c1d22"],
  ["graphene", "#8b94a3", "#c9d1dc", "#111318", "#e6eaf0"],
  ["aurora", "#2dd4bf", "#99f6e4", "#0e1a19", "#e2f5f1"],
  ["nebula", "#6366f1", "#c7d2fe", "#121331", "#e9eafb"],
  ["cobalt", "#2563eb", "#93c5fd", "#0e1420", "#e4ebf7"],
  ["jade", "#10b981", "#6ee7b7", "#0d1815", "#e3f3ec"]
];

const defaultTheme = "grape";

const themeGrid = document.getElementById("themeGrid");

themes.forEach(([name, primary, secondary, surface, text]) => {
  const isDefault = name === defaultTheme;
  const pill = document.createElement("button");
  pill.className = "theme-pill" + (isDefault ? " active" : "");
  pill.style.setProperty("--pill", primary);
  pill.setAttribute("aria-pressed", isDefault ? "true" : "false");
  pill.innerHTML = `<i></i>${name}`;
  pill.addEventListener("click", () => {
    deck.style.setProperty("--deck-accent", primary);
    deck.style.setProperty("--deck-accent-2", secondary);
    deck.style.setProperty("--deck-surface", surface);
    deck.style.setProperty("--deck-text", text);
    deck.classList.toggle("light", name === "white");
    document.querySelectorAll(".theme-pill").forEach((el) => {
      el.classList.remove("active");
      el.setAttribute("aria-pressed", "false");
    });
    pill.classList.add("active");
    pill.setAttribute("aria-pressed", "true");
  });
  themeGrid.appendChild(pill);
});

const glowBtn = document.getElementById("glowBtn");
const modeDefs = [
  ["cube", "#7c4dff"],
  ["ship", "#3ba3ff"],
  ["ball", "#34d399"],
  ["ufo", "#ff6b8a"],
  ["wave", "#67d5ff"],
  ["robot", "#a855f7"],
  ["spider", "#a3e635"],
  ["swing", "#f43f5e"]
];

const modeGrid = document.getElementById("modeGrid");
const modesHint = document.getElementById("modesHint");
let modeTicks = modeDefs.map(() => 0);

try {
  const storedModes = JSON.parse(localStorage.getItem("afterflow-mode-ticks") || "[]");
  if (Array.isArray(storedModes) && storedModes.length === modeDefs.length) {
    modeTicks = storedModes.map((value) => Math.min(TICKS_MAX, Math.max(0, Math.round(Number(value) || 0))));
  }
} catch {}

function saveModes() {
  try {
    localStorage.setItem("afterflow-mode-ticks", JSON.stringify(modeTicks));
  } catch {}
}

function modeValueAt(index) {
  return modeTicks[index] > 0 ? modeTicks[index] : Math.max(stageAt(currentStage).all, 1);
}

function renderModes() {
  modeGrid.innerHTML = "";
  modeDefs.forEach(([name, color], index) => {
    const override = modeTicks[index];
    const tile = document.createElement("div");
    tile.className = "mode-tile" + (override > 0 ? " set" : "");
    tile.style.setProperty("--mode", color);
    tile.setAttribute("role", "group");
    tile.setAttribute("aria-label", name + (override > 0 ? " " + override + " ticks" : " auto"));
    tile.innerHTML = `
      <span class="mode-icon"><img src="assets/icons/${name}.png" alt="" loading="lazy"></span>
      <span class="mode-name">${name}</span>
      <span class="mode-value">${override > 0 ? override + "t" : "auto"}</span>
      <button class="mode-step left" data-dir="-1" aria-label="less ticks for ${name}">-</button>
      <button class="mode-step right" data-dir="1" aria-label="more ticks for ${name}">+</button>
    `;
    tile.querySelectorAll(".mode-step").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        stepMode(index, Number(button.dataset.dir));
      });
    });
    tile.addEventListener("click", () => {
      if (modeTicks[index] === 0) return;
      modeTicks[index] = 0;
      saveModes();
      renderModes();
      pushLine(`mode reset -> ${name} follows the stage (${Math.max(stageAt(currentStage).all, 1)}t)`);
    });
    modeGrid.appendChild(tile);
  });
  const overrides = modeTicks.filter((value) => value > 0).length;
  modesHint.textContent = overrides === 0
    ? "every mode follows the stage, tap - or + to override one"
    : overrides + (overrides === 1 ? " mode tuned" : " modes tuned") + ", tap a tile to put it back on auto";
}

function stepMode(index, dir) {
  const name = modeDefs[index][0];
  const next = Math.min(TICKS_MAX, Math.max(1, modeValueAt(index) + dir));
  modeTicks[index] = next;
  saveModes();
  renderModes();
  pushLine(`mode set -> ${name} ${next}t`);
}

document.getElementById("allAutoBtn").addEventListener("click", () => {
  modeTicks = modeDefs.map(() => 0);
  saveModes();
  renderModes();
  pushLine("modes reset -> every mode follows the stage");
});

renderModes();
const glowLabel = document.getElementById("glowLabel");

glowBtn.addEventListener("click", () => {
  const off = deck.classList.toggle("no-glow");
  glowBtn.classList.toggle("off", off);
  glowLabel.textContent = off ? "glow off" : "glow on";
});

let panelScale = 0.9;
let fontScale = 1.5;
let scaleReady = false;

function applyScale() {
  const base = Math.min(1, deckFrame.clientWidth / 700);
  const scale = base * panelScale;
  if (!scaleReady) deck.style.transition = "none";
  deck.style.transform = `scale(${scale})`;
  deck.style.fontSize = `${12.5 * fontScale}px`;
  deckFrame.style.height = `${460 * scale}px`;
  if (!scaleReady) {
    void deck.offsetWidth;
    deck.style.transition = "";
    scaleReady = true;
  }
  document.getElementById("panelVal").textContent = Math.round(panelScale * 100) + "%";
  document.getElementById("fontVal").textContent = Math.round(fontScale * 100) + "%";
}

document.querySelectorAll(".step").forEach((button) => {
  button.addEventListener("click", () => {
    const dir = Number(button.dataset.dir);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, Math.round(value * 10) / 10));
    if (button.dataset.key === "panel") {
      panelScale = clamp(panelScale + dir * 0.1, 0.4, 2);
    } else {
      fontScale = clamp(fontScale + dir * 0.1, 0.8, 2);
    }
    applyScale();
  });
});

document.getElementById("exportBtn").addEventListener("click", async (event) => {
  const btn = event.currentTarget;
  const config = JSON.stringify({
    theme: document.querySelector(".theme-pill.active").textContent,
    panel: panelScale,
    font: fontScale,
    stage: stageName.textContent
  });
  try {
    await navigator.clipboard.writeText(config);
    btn.textContent = "exported";
  } catch {
    btn.textContent = "failed";
  }
  setTimeout(() => { btn.textContent = "export"; }, 1200);
});

const creditsModal = document.getElementById("creditsModal");

document.getElementById("creditsBtn").addEventListener("click", () => {
  creditsModal.hidden = false;
});

document.getElementById("creditsClose").addEventListener("click", () => {
  creditsModal.hidden = true;
});

creditsModal.addEventListener("click", (event) => {
  if (event.target === creditsModal) creditsModal.hidden = true;
});

const reopen = document.getElementById("reopen");

document.getElementById("closeDeck").addEventListener("click", () => {
  deck.classList.add("closed");
  reopen.hidden = false;
});

reopen.addEventListener("click", () => {
  deck.classList.remove("closed");
  reopen.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  creditsModal.hidden = true;
  deck.classList.remove("closed");
  reopen.hidden = true;
});

const bufferChip = document.getElementById("bufferChip");

bufferChip.addEventListener("click", () => {
  const off = bufferChip.classList.toggle("off");
  bufferChip.innerHTML = off ? "<i></i>buffer off" : "<i></i>buffer on";
});

const tickers = [
  "stage set -> stage 7: 40 ticks all | 20 ticks wave (10f all | 5f wave @ 60fps)",
  "saved press +2t (0.5f)  1->3  [max 8]",
  "buffer ready | 2t all / 2t wave | f6 cycles",
  "no save: release dies in 7t (max 8t, best +0t -> 7t of 8)",
  "stage set -> stage off (100% raw input)"
];
const tickerEl = document.getElementById("heroTicker");
let tickerIndex = 0;

if (tickerEl) {
  setInterval(() => {
    tickerIndex = (tickerIndex + 1) % tickers.length;
    tickerEl.style.animation = "none";
    void tickerEl.offsetWidth;
    tickerEl.textContent = tickers[tickerIndex];
    tickerEl.style.animation = "";
  }, 3400);
}

async function loadVersion() {
  try {
    const response = await fetch("https://api.github.com/repos/afterflow-gd/afterflow/releases/latest");
    if (!response.ok) return;
    const data = await response.json();
    document.querySelectorAll("[data-version]").forEach((el) => {
      el.textContent = "v" + data.tag_name;
    });
  } catch {}
}

loadVersion();

applyScale();
window.addEventListener("resize", applyScale);

const vantaEl = document.getElementById("vantaBg");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (vantaEl && window.VANTA && VANTA.DOTS && !reduceMotion) {
  VANTA.DOTS({
    el: vantaEl,
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200,
    minWidth: 200,
    scale: 1,
    scaleMobile: 1,
    color: 0x7c4dff,
    color2: 0x4a2aa0,
    backgroundColor: 0x0b0a0f,
    size: 3,
    spacing: 32,
    showLines: false
  });
}

import { COSMIC_SCALES, UNIVERSE_OBJECTS } from "./data/universeData.js";
import { EXO_SYSTEMS } from "./data/exoSystems.js";
import { BANGLADESH_PLACES } from "./data/bangladeshData.js";
import { PLANET_DEEP_DIVES } from "./data/planetDeepDive.js";
import { UniverseEngine } from "./engine/universeScene.js";

const viewport = document.getElementById("cosmos3d");
const hoverTooltip = document.getElementById("hoverTooltip");
const tooltipEmoji = document.getElementById("tooltipEmoji");
const tooltipName = document.getElementById("tooltipName");
const tooltipDist = document.getElementById("tooltipDist");

const hudSector = document.getElementById("hudSector");
const hudScale = document.getElementById("hudScale");
const hudRange = document.getElementById("hudRange");

const cosmicSlider = document.getElementById("cosmicSlider");
const sliderLabels = document.getElementById("sliderLabels");
const scaleBadge = document.getElementById("scaleBadge");
const scaleTitle = document.getElementById("scaleTitle");
const flyInBtn = document.getElementById("flyInBtn");
const flyOutBtn = document.getElementById("flyOutBtn");
const sectorChips = document.getElementById("sectorChips");

const warpSearchInput = document.getElementById("warpSearchInput");
const warpDropdown = document.getElementById("warpDropdown");

const dossierDrawer = document.getElementById("dossierDrawer");
const closeDossierBtn = document.getElementById("closeDossierBtn");
const dossierCat = document.getElementById("dossierCat");
const dossierEmoji = document.getElementById("dossierEmoji");
const dossierTitle = document.getElementById("dossierTitle");
const dossierTagline = document.getElementById("dossierTagline");
const dossierDesc = document.getElementById("dossierDesc");
const dossierStats = document.getElementById("dossierStats");
const dossierFacts = document.getElementById("dossierFacts");
const refocusBtn = document.getElementById("refocusBtn");

const helpToggleBtn = document.getElementById("helpToggleBtn");
const controlsModal = document.getElementById("controlsModal");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const hudToggleBtn = document.getElementById("hudToggleBtn");
const showHudBtn = document.getElementById("showHudBtn");
const labelsLayer = document.getElementById("labelsLayer");
const orbitSpeedBtn = document.getElementById("orbitSpeedBtn");
const audioToggleBtn = document.getElementById("audioToggleBtn");
const grandTourBtn = document.getElementById("grandTourBtn");
const enterSystemBtn = document.getElementById("enterSystemBtn");
const enterCountryBtn = document.getElementById("enterCountryBtn");
const enterPlanetBtn = document.getElementById("enterPlanetBtn");
const exitSystemBtn = document.getElementById("exitSystemBtn");

const TOUR_STOPS = [
  "earth",
  "moon",
  "sun",
  "saturn",
  "halleys-comet",
  "orion-nebula",
  "pillars-of-creation",
  "sagittarius-a",
  "andromeda",
  "m87",
  "laniakea",
  "ton-618",
  "cmb"
];
let tourTimer = null;
let tourStep = 0;

function stopGrandTour() {
  if (tourTimer) {
    clearInterval(tourTimer);
    tourTimer = null;
    grandTourBtn.textContent = "🚀 Grand Tour";
  }
}

function advanceTour() {
  const id = TOUR_STOPS[tourStep % TOUR_STOPS.length];
  const obj = UNIVERSE_OBJECTS.find((o) => o.id === id);
  if (obj) {
    engine.flyToObject(obj.id);
    playWarpSound();
    openDossier(obj);
  }
  tourStep++;
}

grandTourBtn.addEventListener("click", () => {
  if (tourTimer) {
    stopGrandTour();
    return;
  }
  tourStep = 0;
  grandTourBtn.textContent = "⏹ Stop Tour";
  advanceTour();
  tourTimer = setInterval(advanceTour, 4800);
});

let activeScaleIndex = 0;
let activeObject = null;
const labelElements = new Map();

// Procedural Web Audio API Space Ambient Drone & Warp Whoosh
let audioCtx = null;
let droneGain = null;
let audioEnabled = false;

function toggleSpaceAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    droneGain = audioCtx.createGain();
    droneGain.gain.value = 0;
    droneGain.connect(audioCtx.destination);

    [55, 82.41, 110].forEach((freq) => {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 180;
      osc.connect(filter);
      filter.connect(droneGain);
      osc.start();
    });
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  audioEnabled = !audioEnabled;
  droneGain.gain.setTargetAtTime(audioEnabled ? 0.045 : 0, audioCtx.currentTime, 0.35);
  audioToggleBtn.textContent = audioEnabled ? "🔊 Audio: ON" : "🔇 Audio";
}

function playWarpSound() {
  if (!audioEnabled || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(140, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(420, audioCtx.currentTime + 0.35);
  g.gain.setValueAtTime(0.06, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.46);
}

audioToggleBtn.addEventListener("click", toggleSpaceAudio);

const ORBIT_SPEEDS = [1, 10, 50, 0];
let orbitSpeedIdx = 0;
orbitSpeedBtn.addEventListener("click", () => {
  orbitSpeedIdx = (orbitSpeedIdx + 1) % ORBIT_SPEEDS.length;
  const mult = ORBIT_SPEEDS[orbitSpeedIdx];
  engine.setOrbitSpeed(mult);
  orbitSpeedBtn.textContent = mult === 0 ? "⏸ Orbits: Off" : `⏱ Orbits: ${mult}×`;
});

const engine = new UniverseEngine(viewport, {
  onHoverObject: (obj, x, y) => {
    if (!obj) {
      hoverTooltip.hidden = true;
      return;
    }
    tooltipEmoji.textContent = obj.emoji;
    tooltipName.textContent = obj.name;
    tooltipDist.textContent = `${obj.distanceLabel} • Click to Fly & Inspect`;
    hoverTooltip.style.left = `${Math.min(window.innerWidth - 220, x + 16)}px`;
    hoverTooltip.style.top = `${Math.max(12, y - 16)}px`;
    hoverTooltip.hidden = false;
  },
  onSelectObject: (obj) => {
    playWarpSound();
    openDossier(obj);
  },
  onSelectEarthLocation: (loc) => {
    playWarpSound();
    openDossier(engine.earthAtlas.buildDossier(loc));
  },
  onScaleUpdate: (idx) => {
    playWarpSound();
    updateScaleUI(idx);
  },
  onDistanceUpdate: (dist) => {
    hudRange.textContent = dist < 1000 ? `${dist.toFixed(1)} u` : `${(dist / 1000).toFixed(2)}k u`;
  },
  onUpdateLabels: (labels) => {
    const visibleIds = new Set(labels.map((l) => l.obj.id));
    for (const [id, el] of labelElements.entries()) {
      if (!visibleIds.has(id)) el.style.display = "none";
    }
    for (const { obj, x, y } of labels) {
      let el = labelElements.get(obj.id);
      if (!el) {
        el = document.createElement("button");
        el.className = "space-label";
        el.innerHTML = `<span>${obj.emoji}</span><span>${obj.name}</span>`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (engine.activePlanet) {
            engine.flyToPlanetFeature(obj.id);
          } else if (engine.activeCountry) {
            engine.flyToCountryPlace(obj.id);
          } else if (engine.activeExoSystem) {
            engine.flyToExoObject(obj.id);
          } else {
            engine.flyToObject(obj.id);
          }
          playWarpSound();
          openDossier(obj);
        });
        labelsLayer.appendChild(el);
        labelElements.set(obj.id, el);
      }
      el.style.display = "inline-flex";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }
});

function renderSliderLabels() {
  sliderLabels.innerHTML = COSMIC_SCALES.map(
    (s) => `
    <button class="slider-lbl-btn ${s.index === activeScaleIndex ? "active" : ""}" data-idx="${s.index}">
      ${s.shortLabel}
    </button>
  `
  ).join("");

  sliderLabels.querySelectorAll(".slider-lbl-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      engine.flyToScale(Number(btn.dataset.idx));
    });
  });
}

function updateScaleUI(idx) {
  activeScaleIndex = idx;
  const s = COSMIC_SCALES[idx];
  cosmicSlider.value = idx;
  hudSector.textContent = s.title;
  hudScale.textContent = s.power;
  scaleBadge.textContent = `SCALE ${idx + 1} / ${COSMIC_SCALES.length}`;
  scaleTitle.textContent = s.title;
  flyInBtn.disabled = idx === 0;
  flyOutBtn.disabled = idx === COSMIC_SCALES.length - 1;

  // Populate quick-jump objects for this sector
  const objs = UNIVERSE_OBJECTS.filter((o) => o.scaleIndex === idx);
  sectorChips.innerHTML = objs
    .map(
      (o) => `
    <button class="sector-chip" data-id="${o.id}">
      <span>${o.emoji}</span>
      <span>${o.name}</span>
    </button>
  `
    )
    .join("");

  sectorChips.querySelectorAll(".sector-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const obj = UNIVERSE_OBJECTS.find((o) => o.id === chip.dataset.id);
      if (obj) {
        engine.flyToObject(obj.id);
        openDossier(obj);
      }
    });
  });

  renderSliderLabels();
}

function openDossier(obj) {
  activeObject = obj;
  dossierCat.textContent = obj.category;
  dossierEmoji.textContent = obj.emoji;
  dossierTitle.textContent = obj.name;
  dossierTagline.textContent = obj.tagline;
  dossierDesc.textContent = obj.description;

  const allStats = [
    { label: "Distance from Earth", value: obj.distanceLabel },
    { label: "Diameter / Scale", value: obj.diameter },
    ...obj.stats
  ];

  dossierStats.innerHTML = allStats
    .map(
      (st) => `
    <div class="d-stat">
      <span>${st.label}</span>
      <strong>${st.value}</strong>
    </div>
  `
    )
    .join("");

  dossierFacts.innerHTML = obj.facts.map((f) => `<li>${f}</li>`).join("");
  enterSystemBtn.hidden = !EXO_SYSTEMS[obj.id];
  enterCountryBtn.hidden = obj.name !== "Bangladesh" || engine.activeCountry === "Bangladesh";
  enterPlanetBtn.hidden = !PLANET_DEEP_DIVES[obj.id] || engine.activePlanet?.id === obj.id;
  dossierDrawer.hidden = false;
}

function enterPlanetMode(planetId) {
  const p = PLANET_DEEP_DIVES[planetId];
  if (!p) return;
  if (engine.enterPlanetView(planetId)) {
    playWarpSound();
    hudSector.textContent = p.title;
    exitSystemBtn.hidden = false;
    enterPlanetBtn.hidden = true;
    dossierDrawer.hidden = true;

    sectorChips.innerHTML = p.features
      .map(
        (f) => `
      <button class="sector-chip" data-planet-feat="${f.id}">
        <span>${f.emoji}</span>
        <span>${f.name}</span>
      </button>
    `
      )
      .join("");

    sectorChips.querySelectorAll(".sector-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const entry = engine.planetLabelTargets.find((t) => t.obj.id === chip.dataset.planetFeat);
        if (entry) {
          engine.flyToPlanetFeature(entry.obj.id);
          playWarpSound();
          openDossier({ ...entry.obj, category: p.title });
        }
      });
    });
  }
}

function enterBangladeshMode() {
  if (engine.enterBangladeshView()) {
    playWarpSound();
    hudSector.textContent = "Bangladesh • Full 3D Satellite Explorer";
    exitSystemBtn.hidden = false;
    enterCountryBtn.hidden = true;
    dossierDrawer.hidden = true;

    sectorChips.innerHTML = BANGLADESH_PLACES.map(
      (p) => `
      <button class="sector-chip" data-bd-id="${p.id}">
        <span>${p.emoji}</span>
        <span>${p.name}</span>
      </button>
    `
    ).join("");

    sectorChips.querySelectorAll(".sector-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const entry = engine.countryLabelTargets.find((t) => t.obj.id === chip.dataset.bdId);
        if (entry) {
          engine.flyToCountryPlace(entry.obj.id);
          playWarpSound();
          openDossier(entry.obj);
        }
      });
    });
  }
}

function enterSystemView(systemId) {
  const sys = EXO_SYSTEMS[systemId];
  if (!sys) return;
  if (engine.enterExoSystem(systemId)) {
    playWarpSound();
    hudSector.textContent = sys.systemName;
    exitSystemBtn.hidden = false;
    enterSystemBtn.hidden = true;
    dossierDrawer.hidden = true;

    // Populate sector chips with this system's star & exoplanets
    sectorChips.innerHTML = sys.planets
      .map(
        (p) => `
      <button class="sector-chip" data-exo-id="${p.id}">
        <span>${p.emoji}</span>
        <span>${p.name}</span>
      </button>
    `
      )
      .join("");
    sectorChips.querySelectorAll(".sector-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const entry = engine.exoLabelTargets.find((t) => t.obj.id === chip.dataset.exoId);
        if (entry) {
          engine.flyToExoObject(entry.obj.id);
          playWarpSound();
          openDossier(entry.obj);
        }
      });
    });
  }
}

enterSystemBtn.addEventListener("click", () => {
  if (activeObject && EXO_SYSTEMS[activeObject.id]) {
    enterSystemView(activeObject.id);
  }
});

enterCountryBtn.addEventListener("click", () => {
  enterBangladeshMode();
});

enterPlanetBtn.addEventListener("click", () => {
  if (activeObject && PLANET_DEEP_DIVES[activeObject.id]) {
    enterPlanetMode(activeObject.id);
  }
});

exitSystemBtn.addEventListener("click", () => {
  exitSystemBtn.hidden = true;
  if (engine.activePlanet) {
    engine.exitPlanetView();
  } else if (engine.activeCountry) {
    engine.exitCountryView();
  } else {
    engine.exitExoSystem();
  }
  playWarpSound();
});

closeDossierBtn.addEventListener("click", () => {
  dossierDrawer.hidden = true;
});

refocusBtn.addEventListener("click", () => {
  if (!activeObject) return;
  if (engine.activePlanet) {
    engine.flyToPlanetFeature(activeObject.id);
  } else if (engine.activeCountry) {
    engine.flyToCountryPlace(activeObject.id);
  } else if (engine.activeExoSystem) {
    engine.flyToExoObject(activeObject.id);
  } else if (typeof activeObject.lat === "number" && typeof activeObject.lon === "number") {
    engine.flyToEarthLatLon(activeObject.lat, activeObject.lon, 4.35, activeObject.emoji === "📍" ? activeObject.name : null);
  } else {
    engine.flyToObject(activeObject.id);
  }
});

cosmicSlider.addEventListener("input", (e) => {
  engine.flyToScale(Number(e.target.value));
});

flyInBtn.addEventListener("click", () => {
  if (activeScaleIndex > 0) engine.flyToScale(activeScaleIndex - 1);
});

flyOutBtn.addEventListener("click", () => {
  if (activeScaleIndex < COSMIC_SCALES.length - 1) engine.flyToScale(activeScaleIndex + 1);
});

// Search / Warp-To Dropdown (includes both Cosmic Objects & Extragalactic/Exoplanet Worlds)
function renderWarpResults(query) {
  const q = query.trim().toLowerCase();
  const exoMatches = [];
  for (const [sysId, sys] of Object.entries(EXO_SYSTEMS)) {
    for (const p of sys.planets) {
      if (
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        sys.hostGalaxy.toLowerCase().includes(q)
      ) {
        exoMatches.push({
          id: p.id,
          sysId,
          emoji: p.emoji,
          name: p.name,
          subtitle: `Exoplanet • ${sys.hostGalaxy}`
        });
      }
    }
  }

  const objMatches = UNIVERSE_OBJECTS.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      o.category.toLowerCase().includes(q) ||
      o.tagline.toLowerCase().includes(q)
  ).map((o) => ({
    id: o.id,
    sysId: null,
    emoji: o.emoji,
    name: o.name,
    subtitle: `${o.category} • ${o.distanceLabel}`
  }));

  const countryMatches = q
    ? engine.earthAtlas.countries
        .filter((c) => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q))
        .slice(0, 8)
        .map((c) => ({
          id: c.id,
          countryName: c.name,
          sysId: null,
          emoji: "📍",
          name: c.name,
          subtitle: `Country on Earth • ${c.region}`
        }))
    : [];

  const bdMatches = q
    ? BANGLADESH_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q)
      )
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          bdPlaceId: p.id,
          countryName: null,
          sysId: null,
          emoji: p.emoji,
          name: p.name,
          subtitle: `${p.category} • ${p.distanceLabel}`
        }))
    : [];

  const planetFeatMatches = [];
  if (q) {
    for (const [planetId, p] of Object.entries(PLANET_DEEP_DIVES)) {
      for (const f of p.features) {
        if (f.name.toLowerCase().includes(q) || f.tagline.toLowerCase().includes(q)) {
          planetFeatMatches.push({
            id: f.id,
            planetId,
            bdPlaceId: null,
            countryName: null,
            sysId: null,
            emoji: f.emoji,
            name: f.name,
            subtitle: `${p.title}`
          });
        }
      }
    }
  }

  const matches = [...objMatches, ...countryMatches, ...bdMatches, ...planetFeatMatches, ...exoMatches].slice(0, 12);

  if (matches.length === 0) {
    warpDropdown.innerHTML = `<div style="padding:0.6rem;font-size:0.8rem;color:var(--text-dim)">No cosmic target found.</div>`;
  } else {
    warpDropdown.innerHTML = matches
      .map(
        (m) => `
      <button class="warp-item" data-id="${m.id}" data-sys-id="${m.sysId || ""}" data-country="${m.countryName || ""}" data-bd-id="${m.bdPlaceId || ""}" data-planet-id="${m.planetId || ""}">
        <span>${m.emoji}</span>
        <div>
          <strong>${m.name}</strong>
          <small>${m.subtitle}</small>
        </div>
      </button>
    `
      )
      .join("");

    warpDropdown.querySelectorAll(".warp-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sysId = btn.dataset.sysId;
        const countryName = btn.dataset.country;
        const bdId = btn.dataset.bdId;
        const planetId = btn.dataset.planetId;
        const id = btn.dataset.id;
        if (sysId) {
          enterSystemView(sysId);
          const entry = engine.exoLabelTargets.find((t) => t.obj.id === id);
          if (entry) {
            engine.flyToExoObject(entry.obj.id);
            openDossier(entry.obj);
          }
        } else if (planetId) {
          if (engine.activePlanet?.id !== planetId) {
            enterPlanetMode(planetId);
          }
          const entry = engine.planetLabelTargets.find((t) => t.obj.id === id);
          if (entry) {
            engine.flyToPlanetFeature(entry.obj.id);
            playWarpSound();
            openDossier({ ...entry.obj, category: PLANET_DEEP_DIVES[planetId].title });
          }
        } else if (bdId) {
          if (engine.activeCountry !== "Bangladesh") {
            enterBangladeshMode();
          }
          const entry = engine.countryLabelTargets.find((t) => t.obj.id === bdId);
          if (entry) {
            engine.flyToCountryPlace(entry.obj.id);
            playWarpSound();
            openDossier(entry.obj);
          }
        } else if (countryName) {
          exitSystemBtn.hidden = true;
          const country = engine.earthAtlas.countries.find((c) => c.name === countryName);
          if (country) {
            engine.flyToEarthLatLon(country.lat, country.lon, 4.35, country.name);
            playWarpSound();
            openDossier(engine.earthAtlas.buildDossier({ type: "country", country, name: country.name, lat: country.lat, lon: country.lon }));
          }
        } else {
          exitSystemBtn.hidden = true;
          const obj = UNIVERSE_OBJECTS.find((o) => o.id === id);
          if (obj) {
            engine.flyToObject(obj.id);
            openDossier(obj);
          }
        }
        warpDropdown.hidden = true;
        warpSearchInput.value = "";
      });
    });
  }
  warpDropdown.hidden = false;
}

warpSearchInput.addEventListener("focus", () => renderWarpResults(warpSearchInput.value));
warpSearchInput.addEventListener("input", () => renderWarpResults(warpSearchInput.value));

document.addEventListener("click", (e) => {
  if (!e.target.closest(".warp-search-wrap")) {
    warpDropdown.hidden = true;
  }
});

// Help & HUD Toggle
helpToggleBtn.addEventListener("click", () => (controlsModal.hidden = false));
closeHelpBtn.addEventListener("click", () => (controlsModal.hidden = true));
controlsModal.addEventListener("click", (e) => {
  if (e.target === controlsModal) controlsModal.hidden = true;
});

function toggleHud() {
  const hidden = document.body.classList.toggle("hud-hidden");
  showHudBtn.hidden = !hidden;
}

hudToggleBtn.addEventListener("click", toggleHud);
showHudBtn.addEventListener("click", toggleHud);

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    warpSearchInput.focus();
  } else if (e.key.toLowerCase() === "h" && document.activeElement?.tagName !== "INPUT") {
    toggleHud();
  } else if (e.key === "Escape") {
    controlsModal.hidden = true;
    warpDropdown.hidden = true;
  }
});

// Initial state: Earth POV
updateScaleUI(0);

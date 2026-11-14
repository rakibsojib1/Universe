// Deep-dive 3D Star & Exoplanet Systems (including Extragalactic Systems in Andromeda, Triangulum, Whirlpool)
export const EXO_SYSTEMS = {
  andromeda: {
    id: "andromeda",
    systemName: "Andromeda (M31) — M31-PA-99-N2 Star System",
    hostGalaxy: "Andromeda Galaxy (2.537 Million ly)",
    star: {
      name: "M31-K4V Orange Dwarf",
      color: 0xfb923c,
      hotColor: 0xfef08a,
      radius: 4.8,
      temp: "4,600 K",
      description: "An orange main-sequence star inside the Andromeda Galaxy, site of one of the first microlensing exoplanet detections outside the Milky Way."
    },
    planets: [
      {
        id: "m31-b",
        name: "Andromeda Prime (M31-b)",
        emoji: "🌋",
        type: "Tidally Locked Lava Super-Earth",
        orbitRadius: 11,
        radius: 1.25,
        palette: ["#7f1d1d", "#f97316", "#450a0a"],
        temp: "1,420 °C",
        gravity: "1.65 g",
        atmosphere: "Vaporized Silicate & CO",
        habitability: "0% (Extreme Heat)",
        description: "A scorched rocky world orbiting close to its Andromeda host star with glowing magma oceans.",
        moons: []
      },
      {
        id: "m31-c",
        name: "Aethelgard (M31-c)",
        emoji: "🌊",
        type: "Temperate Ocean Super-Earth",
        orbitRadius: 18,
        radius: 1.65,
        palette: ["#0369a1", "#38bdf8", "#0f766e"],
        hasAtmosphere: 0x38bdf8,
        temp: "18 °C",
        gravity: "1.22 g",
        atmosphere: "74% N₂, 24% O₂, 2% H₂O",
        habitability: "91% (Habitable Candidate)",
        description: "A lush water-rich world in Andromeda's habitable zone, orbited by two rocky moons that drive colossal tides.",
        moons: [
          { name: "M31-c I (Thalassa)", radius: 0.32, dist: 3.1, speed: 1.4, color: 0xcbd5e1 },
          { name: "M31-c II (Nereid-M31)", radius: 0.22, dist: 4.3, speed: 0.9, color: 0x94a3b8 }
        ]
      },
      {
        id: "m31-d",
        name: "Boreas Giant (M31-d)",
        emoji: "🪐",
        type: "Ringed Gas Giant",
        orbitRadius: 29,
        radius: 3.1,
        palette: ["#818cf8", "#312e81", "#c084fc"],
        hasRing: true,
        temp: "-145 °C",
        gravity: "2.3 g",
        atmosphere: "H₂, He, Ammonia Clouds",
        habitability: "0% (Gas Giant — Moons Potentially Habitable)",
        description: "A violet-banded gas giant with icy rings and three large moons, including an ice-crusted ocean moon.",
        moons: [
          { name: "M31-d I (Cryos)", radius: 0.42, dist: 5.5, speed: 1.1, color: 0xe0f2fe },
          { name: "M31-d II (Pyros)", radius: 0.35, dist: 6.9, speed: 0.75, color: 0xfacc15 },
          { name: "M31-d III (Umbra)", radius: 0.28, dist: 8.2, speed: 0.5, color: 0x64748b }
        ]
      }
    ]
  },

  "whirlpool-m51": {
    id: "whirlpool-m51",
    systemName: "Whirlpool Galaxy (M51) — M51-ULS-1 System",
    hostGalaxy: "Whirlpool Galaxy (31 Million ly)",
    star: {
      name: "M51-ULS-1 Blue Supergiant",
      color: 0x38bdf8,
      hotColor: 0xe0f2fe,
      radius: 5.6,
      temp: "22,000 K",
      description: "An X-ray binary in the Whirlpool Galaxy where NASA's Chandra Observatory detected M51-ULS-1b — the first strong extragalactic planet candidate."
    },
    planets: [
      {
        id: "m51-uls-1b",
        name: "M51-ULS-1b (First Extragalactic Planet)",
        emoji: "🪐",
        type: "Saturn-Sized Gas Giant",
        orbitRadius: 22,
        radius: 2.9,
        palette: ["#60a5fa", "#1e3a8a", "#93c5fd"],
        hasRing: true,
        temp: "-90 °C",
        gravity: "1.15 g",
        atmosphere: "H₂, He, Methane",
        habitability: "0% (Gas Giant)",
        description: "Detected via X-ray transit in M51, orbiting a massive star-black hole binary 31 million light-years from Earth.",
        moons: [
          { name: "M51-b I", radius: 0.38, dist: 5.2, speed: 1.2, color: 0xbae6fd },
          { name: "M51-b II", radius: 0.29, dist: 6.7, speed: 0.8, color: 0xfde68a }
        ]
      }
    ]
  },

  triangulum: {
    id: "triangulum",
    systemName: "Triangulum (M33) — NGC 604 Nursery System",
    hostGalaxy: "Triangulum Galaxy (2.73 Million ly)",
    star: {
      name: "M33-O5V Young Star",
      color: 0x60a5fa,
      hotColor: 0xffffff,
      radius: 5.2,
      temp: "32,000 K",
      description: "A fierce, newly born star inside Triangulum's giant NGC 604 star-forming region."
    },
    planets: [
      {
        id: "m33-proto-1",
        name: "NGC-604 Protoplanet Alpha",
        emoji: "🔥",
        type: "Molten Protoplanet",
        orbitRadius: 14,
        radius: 1.5,
        palette: ["#ea580c", "#7c2d12", "#fbbf24"],
        temp: "1,850 °C",
        gravity: "1.4 g",
        atmosphere: "Silicate Vapor",
        habitability: "0% (Forming World)",
        description: "Still glowing from the heat of accretion, bombarded by planetesimals.",
        moons: [{ name: "Proto-Moon A", radius: 0.28, dist: 2.8, speed: 1.5, color: 0xf97316 }]
      },
      {
        id: "m33-giant",
        name: "Triangulum Ice Giant",
        emoji: "🩵",
        type: "Sub-Neptune Ice Giant",
        orbitRadius: 26,
        radius: 2.3,
        palette: ["#22d3ee", "#0e7490", "#a5f3fc"],
        hasAtmosphere: 0x22d3ee,
        temp: "-180 °C",
        gravity: "1.3 g",
        atmosphere: "H₂, He, Water & Methane Ice",
        habitability: "0%",
        description: "A cyan ice giant sculpted by intense UV winds from its young host star.",
        moons: [
          { name: "M33-I", radius: 0.32, dist: 4.1, speed: 1.0, color: 0xe2e8f0 },
          { name: "M33-II", radius: 0.24, dist: 5.2, speed: 0.65, color: 0x94a3b8 }
        ]
      }
    ]
  },

  "trappist-1": {
    id: "trappist-1",
    systemName: "TRAPPIST-1 Seven-Planet System",
    hostGalaxy: "Milky Way (40.66 ly from Earth)",
    star: {
      name: "TRAPPIST-1 (M8V Ultra-Cool Dwarf)",
      color: 0xdc2626,
      hotColor: 0xfca5a5,
      radius: 3.4,
      temp: "2,566 K",
      description: "An ultra-cool red dwarf barely larger than Jupiter, hosting seven Earth-sized rocky worlds."
    },
    planets: [
      { id: "t1b", name: "TRAPPIST-1b", emoji: "🪨", type: "Scorched Rocky World", orbitRadius: 7.5, radius: 0.9, palette: ["#9a3412", "#431407"], temp: "127 °C", gravity: "1.1 g", atmosphere: "Minimal / Thin", habitability: "5%", description: "Innermost world, tidally locked.", moons: [] },
      { id: "t1c", name: "TRAPPIST-1c", emoji: "🟠", type: "Hot Rocky World", orbitRadius: 10.5, radius: 0.92, palette: ["#c2410c", "#7c2d12"], temp: "69 °C", gravity: "1.1 g", atmosphere: "Thin CO₂", habitability: "15%", description: "Venus-like rocky world.", moons: [] },
      { id: "t1d", name: "TRAPPIST-1d", emoji: "🏜️", type: "Warm Sub-Earth", orbitRadius: 13.8, radius: 0.78, palette: ["#d97706", "#78350f"], temp: "15 °C", gravity: "0.62 g", atmosphere: "Possible Thin N₂", habitability: "62%", description: "On the inner edge of the habitable zone.", moons: [] },
      { id: "t1e", name: "TRAPPIST-1e", emoji: "🌍", type: "Habitable Earth-Twin", orbitRadius: 17.5, radius: 0.95, palette: ["#0284c7", "#15803d", "#e0f2fe"], hasAtmosphere: 0x38bdf8, temp: "12 °C", gravity: "0.93 g", atmosphere: "Potential N₂ / O₂ / H₂O", habitability: "95% (Top Earth Analog)", description: "Dense iron core and prime temperatures for liquid surface oceans.", moons: [] },
      { id: "t1f", name: "TRAPPIST-1f", emoji: "🌊", type: "Ocean / Ice World", orbitRadius: 21.5, radius: 1.02, palette: ["#0369a1", "#bae6fd"], hasAtmosphere: 0x7dd3fc, temp: "-54 °C", gravity: "0.95 g", atmosphere: "Thick CO₂ / H₂O", habitability: "78%", description: "Likely covered by a global ocean or ice sheet.", moons: [] },
      { id: "t1g", name: "TRAPPIST-1g", emoji: "🧊", type: "Cold Super-Earth", orbitRadius: 25.5, radius: 1.1, palette: ["#38bdf8", "#1e3a8a"], temp: "-75 °C", gravity: "1.05 g", atmosphere: "Dense Greenhouse", habitability: "64%", description: "Largest planet in the TRAPPIST-1 system.", moons: [] },
      { id: "t1h", name: "TRAPPIST-1h", emoji: "❄️", type: "Frozen Outer World", orbitRadius: 30.0, radius: 0.76, palette: ["#e2e8f0", "#64748b"], temp: "-104 °C", gravity: "0.57 g", atmosphere: "Thin Nitrogen", habitability: "10%", description: "Icy outermost planet of the system.", moons: [] }
    ]
  },

  "proxima-centauri": {
    id: "proxima-centauri",
    systemName: "Proxima Centauri Exoplanet System",
    hostGalaxy: "Milky Way (4.246 ly — Nearest Star)",
    star: {
      name: "Proxima Centauri (M5.5Ve)",
      color: 0xef4444,
      hotColor: 0xfecaca,
      radius: 3.6,
      temp: "3,042 K",
      description: "Our closest stellar neighbor outside the Solar System."
    },
    planets: [
      { id: "prox-d", name: "Proxima Centauri d", emoji: "🪨", type: "Sub-Earth", orbitRadius: 9, radius: 0.7, palette: ["#78716c", "#44403c"], temp: "87 °C", gravity: "0.4 g", atmosphere: "Stripped", habitability: "10%", description: "Lightest exoplanet detected via radial velocity (0.26 Earth masses).", moons: [] },
      { id: "prox-b", name: "Proxima Centauri b", emoji: "🌍", type: "Habitable-Zone Super-Earth", orbitRadius: 15, radius: 1.15, palette: ["#0369a1", "#854d0e", "#bae6fd"], hasAtmosphere: 0x38bdf8, temp: "-39 °C (Equilibrium)", gravity: "1.1 g", atmosphere: "Possible N₂ / CO₂", habitability: "85% (Closest Habitable World)", description: "Orbits every 11.2 days in the habitable zone of Proxima Centauri.", moons: [{ name: "Proxima-b I", radius: 0.22, dist: 2.3, speed: 1.4, color: 0xcbd5e1 }] },
      { id: "prox-c", name: "Proxima Centauri c", emoji: "❄️", type: "Frozen Super-Earth / Mini-Neptune", orbitRadius: 26, radius: 1.8, palette: ["#93c5fd", "#1e3a8a"], hasRing: true, temp: "-234 °C", gravity: "1.6 g", atmosphere: "H₂ / He / Methane", habitability: "0%", description: "Cold outer world candidate with possible ring system.", moons: [{ name: "Proxima-c I", radius: 0.3, dist: 3.6, speed: 0.9, color: 0xe2e8f0 }] }
    ]
  }
};

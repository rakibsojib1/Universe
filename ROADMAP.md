# COSMOS 3D — Observable Universe Master Roadmap

This roadmap outlines the step-by-step engineering phases to evolve **COSMOS 3D** into a photorealistic, game-grade, scientifically complete 3D Observable Universe simulator from Earth's surface out to the 93-billion-light-year horizon.

---

## Phase 1: Photorealistic Planetary & Earth Rendering
- [x] Procedural 3D Earth with continents, oceans, polar ice caps, moving cloud layer, and GLSL Rayleigh atmospheric rim glow.
- [x] **Earth Day/Night Terminator & City Lights**: Custom shader blending sunlit continents/clouds with glowing golden night-side city lights on the dark hemisphere.
- [ ] **Moon & Planetary Surface Bump/Normal Maps**: Add procedural elevation normal/bump maps so craters on the Moon, Mercury, and Mars catch real directional sunlight shadows.
- [ ] **Live Rotating Moons**: Orbit the Moon around Earth (Scale 0) and Galilean/Saturnian moons around Jupiter & Saturn (Scale 1).

## Phase 2: Hyperdrive Star-Streaks & Seamless Scale Transitions
- [x] Concentric scale isolation (`10⁷ m` to `10²⁷ m`) with `UnrealBloomPass` HDR glow.
- [x] Projected 3D clickable HUD markers, orbital time-warp (`1× / 10× / 50×`), and Web Audio ambient synth.
- [ ] **3D Hyperdrive Star-Streak Particle Tunnel**: When warping between scales or flying to a target, render radial star-streaks rushing past the cockpit.
- [ ] **Smooth Cross-Fade Scale Transitions**: Fade scale opacity smoothly during `flyToScale` so transitions feel continuous rather than instant.

## Phase 3: Deep-Space Volumetric Realism
- [x] **Black Hole Gravitational Lensing Halo**: Add a warped Einstein-ring photon sphere and Doppler-beamed accretion disk to Sagittarius A*, M87*, TON 618, and Phoenix A*.
- [ ] **3D Nebula Volumetric Sprites & Star-Forming Pillars**: Upgrade Orion, Pillars of Creation, Carina, Crab, and Helix Nebulae with multi-layered additive dust sprites and central young star clusters.
- [ ] **Pulsar Rotating Radiation Beams**: Animate sweeping twin relativistic lighthouse beams on the Crab Pulsar and SGR 1806-20 Magnetar.

## Phase 4: Complete Cosmic Encyclopedia & Interactive Tools
- [ ] **Interactive Relativistic Travel & Redshift Calculator** inside the Dossier Drawer (compute light-travel time, Voyager 1 time, and cosmological redshift $z$).
- [ ] **Cosmic Composition & Big Bang Timeline Drawer**: Accessible directly from the cockpit HUD without leaving the 3D space view.
- [x] **Tour / Autopilot Mode ("Grand Tour of the Universe")**: One-click guided cinematic flight from Earth → Sun → Jupiter → Orion Nebula → Sagittarius A* → Andromeda → Laniakea → Cosmic Web → CMB.

## Phase 5: Mobile & Performance Polish
- [ ] **Touch Virtual Joystick / D-Pad** for mobile free-flight.
- [ ] **Adaptive Quality Toggle** (High HDR Bloom vs. Battery/Mobile mode).

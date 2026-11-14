import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { COSMIC_SCALES, UNIVERSE_OBJECTS } from "../data/universeData.js";
import { EXO_SYSTEMS } from "../data/exoSystems.js";
import { BANGLADESH_PLACES } from "../data/bangladeshData.js";
import { PLANET_DEEP_DIVES } from "../data/planetDeepDive.js";
import {
  createEarthTextures,
  createRockyTexture,
  createGasGiantTexture,
  createSaturnRingTexture,
  createGlowSpriteTexture
} from "./textures.js";
import {
  createAtmosphereMaterial,
  createSunPlasmaMaterial,
  createAccretionDiskMaterial,
  createCMBMaterial,
  createMilkyWaySkyboxMaterial
} from "./shaders.js";
import { EarthAtlas, vector3ToLatLon, latLonToVector3, formatLatLon } from "./earthAtlas.js";

const EARTH_CDN = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets";

export class UniverseEngine {
  constructor(container, { onHoverObject, onSelectObject, onSelectEarthLocation, onEarthAtlasLoaded, onScaleUpdate, onDistanceUpdate, onUpdateLabels }) {
    this.container = container;
    this.onHoverObject = onHoverObject;
    this.onSelectObject = onSelectObject;
    this.onSelectEarthLocation = onSelectEarthLocation;
    this.onEarthAtlasLoaded = onEarthAtlasLoaded;
    this.onScaleUpdate = onScaleUpdate;
    this.onDistanceUpdate = onDistanceUpdate;
    this.onUpdateLabels = onUpdateLabels;

    this.earthAtlas = new EarthAtlas();
    this.earthMesh = null;
    this.earthRadius = 2.6;
    this.earthSpinEnabled = true;
    this.earthBordersMesh = null;
    this.earthHighlightMesh = null;
    this.earthAtlas.load().then((countries) => {
      this.onEarthAtlasLoaded?.(countries);
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010207);

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.05,
      8000
    );
    this.camera.position.set(0, 2.0, 7.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    // HDR Bloom Post-Processing for realistic star/nebula/blackhole glow
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.42, // strength
      0.55, // radius
      0.78  // threshold
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 600;
    this.controls.minDistance = 0.5;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownPos = new THREE.Vector2();

    // Separate concentric group per cosmic scale (0..7)
    this.scaleGroups = Array.from({ length: COSMIC_SCALES.length }, (_, idx) => {
      const g = new THREE.Group();
      g.visible = idx === 0;
      this.scene.add(g);
      return g;
    });

    this.clickableMeshesByScale = Array.from({ length: COSMIC_SCALES.length }, () => []);
    this.animatedShaders = [];
    this.rotators = [];
    this.orbiters = [];
    this.localMoons = [];
    this.labelTargets = new Map();
    this.orbitSpeedMultiplier = 1;

    // Dedicated group for exploring distant star & galaxy planetary systems
    this.exoSystemGroup = new THREE.Group();
    this.exoSystemGroup.visible = false;
    this.scene.add(this.exoSystemGroup);
    this.exoClickables = [];
    this.exoLabelTargets = [];
    this.activeExoSystem = null;

    // Dedicated group for full-detail Bangladesh Satellite & Division Explorer
    this.countryGroup = new THREE.Group();
    this.countryGroup.visible = false;
    this.scene.add(this.countryGroup);
    this.countryClickables = [];
    this.countryLabelTargets = [];
    this.activeCountry = null;
    this.countryPatchGroup = null;

    // Dedicated group for Solar System Planet Deep-Dive (Landmarks, Storms & Moons)
    this.planetGroup = new THREE.Group();
    this.planetGroup.visible = false;
    this.scene.add(this.planetGroup);
    this.planetClickables = [];
    this.planetLabelTargets = [];
    this.planetOrbiters = [];
    this.activePlanet = null;

    this.keys = new Set();
    this.flyAnim = null;
    this.clock = new THREE.Clock();
    this.currentScale = 0;

    this._setupLights();
    this._buildDeepStarfield();
    this._buildAllScales();
    this._bindEvents();
    this._animate();
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0x334770, 0.5);
    this.scene.add(ambient);

    // Sun-side directional light for Earth POV
    const earthSun = new THREE.DirectionalLight(0xfff8ed, 2.2);
    earthSun.position.set(14, 6, 10);
    this.scaleGroups[0].add(earthSun);

    // Central Sun point light for Solar System
    const solarLight = new THREE.PointLight(0xfff4de, 3.8, 350, 0.25);
    solarLight.position.set(0, 0, 0);
    this.scaleGroups[1].add(solarLight);
  }

  _buildDeepStarfield() {
    // 360-degree Milky Way galactic band & deep-space skybox
    const skybox = new THREE.Mesh(
      new THREE.SphereGeometry(4200, 32, 32),
      createMilkyWaySkyboxMaterial()
    );
    this.scene.add(skybox);

    const count = 5500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 1200 + Math.random() * 2500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const tint = Math.random();
      const c = tint > 0.82 ? new THREE.Color(0x93c5fd) : tint > 0.65 ? new THREE.Color(0xfef08a) : new THREE.Color(0xffffff);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.scene.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, opacity: 0.85 })
      )
    );
  }

  _registerClickable(mesh, objData) {
    mesh.userData.universeObject = objData;
    this.clickableMeshesByScale[objData.scaleIndex].push(mesh);
  }

  _buildAllScales() {
    const glowTex = createGlowSpriteTexture("rgba(255,255,255,1)", "rgba(56,189,248,0)");
    const warmGlowTex = createGlowSpriteTexture("rgba(255,235,180,1)", "rgba(251,146,60,0)");

    for (const obj of UNIVERSE_OBJECTS) {
      const parentGroup = this.scaleGroups[obj.scaleIndex];
      const group = new THREE.Group();
      group.position.set(...obj.pos);
      parentGroup.add(group);
      this.labelTargets.set(obj.id, { group, obj });

      // Draw orbital ring & register real-time orbital motion in Solar System
      if (obj.scaleIndex === 1 && obj.orbitRadius > 0) {
        const angle = Math.atan2(obj.pos[2], obj.pos[0]);
        const speed = 0.045 / Math.pow(obj.orbitRadius / 11, 1.35);
        this.orbiters.push({ group, radius: obj.orbitRadius, y: obj.pos[1], angle, speed, obj });

        const ringPts = [];
        for (let i = 0; i <= 128; i++) {
          const a = (i / 128) * Math.PI * 2;
          ringPts.push(new THREE.Vector3(Math.cos(a) * obj.orbitRadius, 0, Math.sin(a) * obj.orbitRadius));
        }
        const orbitLine = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(ringPts),
          new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16 })
        );
        parentGroup.add(orbitLine);
      }

      if (obj.id === "earth" || obj.id === "earth-solar") {
        const { map, cloudMap, cityMap, bumpMap, roughnessMap } = createEarthTextures();
        const isMainEarth = obj.id === "earth";
        const texLoader = new THREE.TextureLoader();
        texLoader.setCrossOrigin("anonymous");

        let earthMat;
        if (isMainEarth) {
          earthMat = new THREE.MeshPhongMaterial({
            map,
            bumpMap,
            bumpScale: 0.04,
            specular: new THREE.Color(0x3a5878),
            shininess: 22,
            emissiveMap: cityMap,
            emissive: new THREE.Color(0xffcf70),
            emissiveIntensity: 0.55
          });

          // Upgrade to real 2K NASA / Three.js Earth satellite textures
          texLoader.load(`${EARTH_CDN}/earth_atmos_2048.jpg`, (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            earthMat.map = t;
            earthMat.needsUpdate = true;
          });
          texLoader.load(`${EARTH_CDN}/earth_normal_2048.jpg`, (t) => {
            earthMat.bumpMap = null;
            earthMat.normalMap = t;
            earthMat.normalScale = new THREE.Vector2(0.85, 0.85);
            earthMat.needsUpdate = true;
          });
          texLoader.load(`${EARTH_CDN}/earth_specular_2048.jpg`, (t) => {
            earthMat.specularMap = t;
            earthMat.needsUpdate = true;
          });
          texLoader.load(`${EARTH_CDN}/earth_lights_2048.png`, (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            earthMat.emissiveMap = t;
            earthMat.emissiveIntensity = 0.65;
            earthMat.needsUpdate = true;
          });
        } else {
          earthMat = new THREE.MeshStandardMaterial({
            map,
            bumpMap,
            bumpScale: 0.06,
            roughnessMap,
            emissiveMap: cityMap,
            emissive: new THREE.Color(0xffd27d),
            emissiveIntensity: 0.65,
            roughness: 1.0,
            metalness: 0.08
          });
        }

        const earthMesh = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius, isMainEarth ? 96 : 64, isMainEarth ? 96 : 64),
          earthMat
        );
        // Orient Prime Meridian (+0 deg) nicely toward the initial camera
        earthMesh.rotation.y = isMainEarth ? -1.15 : 0;
        group.add(earthMesh);
        this._registerClickable(earthMesh, obj);

        const cloudMat = new THREE.MeshStandardMaterial({ map: cloudMap, transparent: true, opacity: isMainEarth ? 0.58 : 0.85, depthWrite: false });
        if (isMainEarth) {
          texLoader.load(`${EARTH_CDN}/earth_clouds_1024.png`, (t) => {
            cloudMat.map = t;
            cloudMat.needsUpdate = true;
          });
        }
        const cloudMesh = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius * 1.015, 48, 48),
          cloudMat
        );
        group.add(cloudMesh);

        if (isMainEarth) {
          this.earthMesh = earthMesh;
          this.earthRadius = obj.radius;
          this.earthCloudMesh = cloudMesh;

          // Real Country Borders & Highlight Overlay (children of earthMesh so they stay locked to continents!)
          const bordersMesh = new THREE.Mesh(
            new THREE.SphereGeometry(obj.radius * 1.003, 72, 72),
            new THREE.MeshBasicMaterial({ map: this.earthAtlas.borderTex, transparent: true, opacity: 0.55, depthWrite: false })
          );
          const highlightMesh = new THREE.Mesh(
            new THREE.SphereGeometry(obj.radius * 1.006, 72, 72),
            new THREE.MeshBasicMaterial({ map: this.earthAtlas.highlightTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
          );
          earthMesh.add(bordersMesh, highlightMesh);
          this.earthBordersMesh = bordersMesh;
          this.earthHighlightMesh = highlightMesh;
        } else {
          this.rotators.push({ mesh: earthMesh, speed: 0.07 });
          this.rotators.push({ mesh: cloudMesh, speed: 0.095 });
        }

        group.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(obj.radius * 1.06, 48, 48),
            createAtmosphereMaterial(0x38bdf8, 0.85)
          )
        );
      } else if (obj.id === "moon") {
        const moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius, 36, 36),
          new THREE.MeshStandardMaterial({ map: createRockyTexture(0xa1a1aa, 0x52525b, 4, 110), roughness: 0.9 })
        );
        group.add(moonMesh);
        this.rotators.push({ mesh: moonMesh, speed: 0.04 });
        this._registerClickable(moonMesh, obj);
      } else if (["iss", "hubble", "jwst", "voyager-1", "parker-solar-probe"].includes(obj.id)) {
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.14, 0.45, 8),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.25 })
        );
        const panels = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.03, 0.32),
          new THREE.MeshStandardMaterial({ color: obj.id === "jwst" ? 0xfbbf24 : 0x3b82f6, metalness: 0.9, roughness: 0.15 })
        );
        group.add(body, panels);
        this.rotators.push({ mesh: group, speed: 0.22 });
        this._registerClickable(body, obj);
        this._registerClickable(panels, obj);
      } else if (obj.id === "van-allen-belts") {
        const torus = new THREE.Mesh(
          new THREE.TorusGeometry(obj.radius, 0.75, 16, 64),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        torus.rotation.x = Math.PI * 0.48;
        group.add(torus);
        this._registerClickable(torus, obj);
      } else if (obj.id === "geo-belt") {
        // Geostationary equatorial ring of telecom & weather satellites around (0,0,0)
        group.position.set(0, 0, 0);
        const satCount = 48;
        const satPos = new Float32Array(satCount * 3);
        for (let s = 0; s < satCount; s++) {
          const a = (s / satCount) * Math.PI * 2;
          satPos[s * 3] = Math.cos(a) * obj.radius;
          satPos[s * 3 + 1] = (Math.random() - 0.5) * 0.12;
          satPos[s * 3 + 2] = Math.sin(a) * obj.radius;
        }
        const satGeo = new THREE.BufferGeometry();
        satGeo.setAttribute("position", new THREE.BufferAttribute(satPos, 3));
        const satPts = new THREE.Points(
          satGeo,
          new THREE.PointsMaterial({ size: 0.28, map: glowTex, color: 0xfef08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        const geoRing = new THREE.Mesh(
          new THREE.RingGeometry(obj.radius - 0.04, obj.radius + 0.04, 96),
          new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
        );
        geoRing.rotation.x = Math.PI * 0.5;
        group.add(satPts, geoRing);
        this.rotators.push({ mesh: satPts, speed: 0.03 });
        const hitbox = new THREE.Mesh(new THREE.TorusGeometry(obj.radius, 0.28, 8, 48), new THREE.MeshBasicMaterial({ visible: false }));
        hitbox.rotation.x = Math.PI * 0.5;
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "aurora-magnetosphere") {
        // Polar auroral ovals at North & South magnetic poles
        group.position.set(0, 0, 0);
        const northOval = new THREE.Mesh(
          new THREE.TorusGeometry(0.95, 0.12, 16, 64),
          new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        northOval.position.y = 2.45;
        northOval.rotation.x = Math.PI * 0.5;
        const southOval = new THREE.Mesh(
          new THREE.TorusGeometry(0.95, 0.12, 16, 64),
          new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        southOval.position.y = -2.45;
        southOval.rotation.x = Math.PI * 0.5;
        group.add(northOval, southOval);
        this._registerClickable(northOval, obj);
        this._registerClickable(southOval, obj);
      } else if (obj.id === "halleys-comet") {
        const nucleus = new THREE.Mesh(
          new THREE.DodecahedronGeometry(obj.radius, 1),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 })
        );
        const tail = new THREE.Mesh(
          new THREE.ConeGeometry(1.1, 9, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
        );
        tail.position.set(-3.5, 1.5, 2.5);
        tail.rotation.z = Math.PI * 0.35;
        group.add(nucleus, tail);
        this._registerClickable(nucleus, obj);
      } else if (obj.id === "oort-cloud") {
        const count = 2000;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const r = obj.radius * (0.88 + Math.random() * 0.2);
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
          pos[i * 3 + 2] = r * Math.cos(ph);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.55, transparent: true, opacity: 0.45 })));
      } else if (["sun", "proxima-centauri", "barnards-star", "sirius", "vega", "rigel", "trappist-1", "betelgeuse", "stephenson-2-18"].includes(obj.id)) {
        const isRed = ["proxima-centauri", "barnards-star", "trappist-1", "betelgeuse", "stephenson-2-18"].includes(obj.id);
        const isBlue = ["sirius", "vega", "rigel"].includes(obj.id);
        const baseCol = isBlue ? 0x60a5fa : isRed ? 0xdc2626 : 0xf97316;
        const hotCol = isBlue ? 0xe0f2fe : isRed ? 0xfca5a5 : 0xfef08a;
        const plasmaMat = createSunPlasmaMaterial(baseCol, hotCol);
        this.animatedShaders.push(plasmaMat);
        const starMesh = new THREE.Mesh(new THREE.SphereGeometry(obj.radius, 48, 48), plasmaMat);
        if (obj.id === "vega") starMesh.scale.set(1.15, 0.88, 1.15); // Rapidly spinning oblate star
        group.add(starMesh);
        this._registerClickable(starMesh, obj);

        const corona = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: warmGlowTex,
            color: isBlue ? 0x93c5fd : isRed ? 0xf87171 : 0xfbbf24,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        corona.scale.set(obj.radius * 3.8, obj.radius * 3.8, 1);
        group.add(corona);

        if (obj.id === "vega") {
          const disk = new THREE.Mesh(
            new THREE.RingGeometry(obj.radius * 1.8, obj.radius * 3.8, 64),
            new THREE.MeshBasicMaterial({ map: createSaturnRingTexture(), color: 0xbae6fd, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
          );
          disk.rotation.x = Math.PI * 0.44;
          group.add(disk);
        }
      } else if (obj.id === "vela-pulsar" || obj.id === "sgr-1806-20") {
        const isMag = obj.id === "sgr-1806-20";
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius * 0.45, 24, 24),
          new THREE.MeshBasicMaterial({ color: isMag ? 0xe0f2fe : 0x7dd3fc })
        );
        const spinner = new THREE.Group();
        spinner.rotation.z = 0.45;
        const beamGeo = new THREE.ConeGeometry(obj.radius * 0.6, obj.radius * 7.5, 16, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
          color: isMag ? 0xc084fc : 0x38bdf8,
          transparent: true,
          opacity: 0.48,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const b1 = new THREE.Mesh(beamGeo, beamMat);
        b1.position.y = obj.radius * 3.75;
        b1.rotation.x = Math.PI;
        const b2 = new THREE.Mesh(beamGeo, beamMat);
        b2.position.y = -obj.radius * 3.75;
        spinner.add(b1, b2);
        group.add(core, spinner);
        this.rotators.push({ mesh: spinner, speed: isMag ? 2.5 : 5.5 });
        this._registerClickable(core, obj);
      } else if (obj.id === "pleiades") {
        // 7 Bright Blue B-Type Sisters + Reflection Nebula
        const sisterOffsets = [
          [0, 0, 0], [3.2, 1.5, -2], [-3.8, 2.2, 1.5], [1.5, -2.8, 3],
          [-2.2, -1.5, -3.5], [4.8, -0.5, 2.2], [-4.5, 0.5, -1.2]
        ];
        sisterOffsets.forEach((off) => {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x93c5fd, blending: THREE.AdditiveBlending, depthWrite: false }));
          s.position.set(...off);
          s.scale.set(4.5, 4.5, 1);
          group.add(s);
        });
        const pCount = 900;
        const pos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
          const r = Math.pow(Math.random(), 0.7) * obj.radius;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.55;
          pos[i * 3 + 2] = r * Math.cos(ph);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        group.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.8, map: glowTex, color: 0x38bdf8, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.65, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "barnard-68") {
        // Dense Dark Molecular Bok Globule
        const darkCore = new THREE.Mesh(
          new THREE.DodecahedronGeometry(obj.radius * 0.55, 2),
          new THREE.MeshBasicMaterial({ color: 0x020308 })
        );
        darkCore.scale.set(1.3, 0.85, 1.0);
        group.add(darkCore);
        this._registerClickable(darkCore, obj);
      } else if (obj.id === "local-bubble") {
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius, 36, 36),
          createAtmosphereMaterial(0x6366f1, 0.22)
        );
        group.add(bubble);
      } else if (obj.id === "pillars-of-creation") {
        // 3 Sculpted Towering Dusty Pillars with Ionized Glowing Tips
        const pillarSpecs = [
          { x: -3.2, h: 16, r: 1.5 },
          { x: 0.4, h: 12.5, r: 1.3 },
          { x: 3.6, h: 9.5, r: 1.1 }
        ];
        pillarSpecs.forEach((p) => {
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(p.r * 0.55, p.r * 1.15, p.h, 12),
            new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 })
          );
          trunk.position.set(p.x, p.h * 0.25 - 4, 0);
          const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xfbbf24, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
          tip.position.set(p.x, p.h * 0.75 - 4, 0);
          tip.scale.set(p.r * 4.2, p.r * 4.2, 1);
          group.add(trunk, tip);
        });
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.65, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (["mercury", "venus", "mars", "pluto", "ceres", "europa", "titan", "kepler-186f", "io", "ganymede", "enceladus", "55-cancri-e"].includes(obj.id)) {
        const palettes = {
          mercury: [0x9ca3af, 0x52525b, 9, 130],
          venus: [0xf59e0b, 0xb45309, 15, 20],
          mars: [0xd95338, 0x7c2d12, 22, 65],
          pluto: [0xd6d3d1, 0x78716c, 31, 50],
          ceres: [0x9ca3af, 0x3f3f46, 41, 90],
          europa: [0xe2e8f0, 0x93c5fd, 47, 15],
          titan: [0xf59e0b, 0xd97706, 53, 10],
          "kepler-186f": [0x38bdf8, 0x9a3412, 61, 25],
          io: [0xfacc15, 0xd97706, 67, 45],
          ganymede: [0xa8a29e, 0x57534e, 73, 70],
          enceladus: [0xf8fafc, 0xbae6fd, 79, 20],
          "55-cancri-e": [0xf97316, 0x450a0a, 83, 30]
        };
        const [c1, c2, seed, cr] = palettes[obj.id];
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius, 36, 36),
          new THREE.MeshStandardMaterial({ map: createRockyTexture(c1, c2, seed, cr), roughness: 0.85 })
        );
        group.add(mesh);
        this.rotators.push({ mesh, speed: 0.08 });
        this._registerClickable(mesh, obj);

        if (obj.id === "mars" || obj.id === "titan") {
          group.add(
            new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 1.05, 32, 32), createAtmosphereMaterial(0xfb923c, 0.45))
          );
        }
      } else if (["jupiter", "saturn", "uranus", "neptune", "rogue-planet"].includes(obj.id)) {
        const gasPalettes = {
          jupiter: [["#d6b48c", "#a3673c", "#e7d5be", "#8a4f2d"], 11, true],
          saturn: [["#ead6a6", "#c8ab73", "#f3e5c3", "#b09058"], 17, false],
          uranus: [["#7dd3fc", "#38bdf8", "#a5f3fc"], 23, false],
          neptune: [["#2563eb", "#1d4ed8", "#60a5fa"], 29, false],
          "rogue-planet": [["#451a03", "#7c2d12", "#1c1917"], 37, false]
        };
        const [pal, seed, spot] = gasPalettes[obj.id];
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius, 48, 48),
          new THREE.MeshStandardMaterial({ map: createGasGiantTexture(pal, seed, spot), roughness: 0.65 })
        );
        group.add(mesh);
        this.rotators.push({ mesh, speed: 0.14 });
        this._registerClickable(mesh, obj);

        if (obj.id === "saturn" || obj.id === "uranus") {
          const ringGeo = new THREE.RingGeometry(obj.radius * 1.35, obj.radius * 2.35, 72);
          const ringMat = new THREE.MeshBasicMaterial({
            map: createSaturnRingTexture(),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: obj.id === "saturn" ? 0.92 : 0.35
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = obj.id === "saturn" ? Math.PI * 0.42 : Math.PI * 0.05;
          group.add(ring);
        }
      } else if (["orion-nebula", "crab-nebula", "helix-nebula", "carina-nebula"].includes(obj.id)) {
        const isCrab = obj.id === "crab-nebula";
        const isHelix = obj.id === "helix-nebula";
        const pCount = 1600;
        const pos = new Float32Array(pCount * 3);
        const col = new Float32Array(pCount * 3);
        const cA = new THREE.Color(isCrab ? 0x38bdf8 : isHelix ? 0x22d3ee : 0xc084fc);
        const cB = new THREE.Color(isCrab ? 0xf97316 : isHelix ? 0xf43f5e : 0xf472b6);

        for (let i = 0; i < pCount; i++) {
          const r = isHelix ? (0.55 + Math.random() * 0.45) * obj.radius : Math.pow(Math.random(), 0.7) * obj.radius;
          const t = Math.random() * Math.PI * 2;
          const p = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(p) * Math.cos(t);
          pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t) * (obj.id === "pillars-of-creation" ? 1.4 : 0.65);
          pos[i * 3 + 2] = r * Math.cos(p);
          const c = cA.clone().lerp(cB, Math.random());
          col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        group.add(
          new THREE.Points(
            geo,
            new THREE.PointsMaterial({
              size: 2.8,
              map: glowTex,
              vertexColors: true,
              transparent: true,
              opacity: 0.75,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            })
          )
        );
        this.rotators.push({ mesh: group, speed: 0.025 });

        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.75, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (["milky-way", "milky-way-lg", "andromeda", "triangulum", "sombrero-galaxy", "lmc", "jades-z14", "whirlpool-m51", "centaurus-a", "pinwheel-m101"].includes(obj.id)) {
        const isMW = obj.id === "milky-way" || obj.id === "milky-way-lg";
        const starCount = obj.id === "milky-way" ? 32000 : obj.id === "andromeda" ? 16000 : 6500;
        const arms = obj.id === "triangulum" ? 3 : 4;
        const galaxyPts = this._createSpiralGalaxyPoints(starCount, obj.radius, arms, glowTex, isMW);
        group.add(galaxyPts);

        if (isMW) {
          const coreGlow = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xfde68a, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false })
          );
          coreGlow.scale.set(obj.radius * 0.42, obj.radius * 0.21, 1);
          group.add(coreGlow);
        }

        if (obj.id === "andromeda") {
          // Subtle gravitational merger trajectory arc between Milky Way and Andromeda
          const mergerPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(36, -26, 42)];
          const mergerLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(mergerPts),
            new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 3, gapSize: 2, transparent: true, opacity: 0.45 })
          );
          mergerLine.computeLineDistances();
          group.add(mergerLine);
        }

        group.rotation.x = obj.id === "andromeda" ? 0.55 : obj.id === "sombrero-galaxy" ? 1.35 : isMW ? 0.18 : 0.25;
        group.rotation.z = obj.id === "andromeda" ? -0.35 : 0.08;
        this.rotators.push({ mesh: galaxyPts, speed: 0.012 });

        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.55, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "hoags-object") {
        // Golden spherical core + detached glowing blue star-forming ring
        const core = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xfde68a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        core.scale.set(obj.radius * 0.6, obj.radius * 0.6, 1);
        const rCount = 2400;
        const rPos = new Float32Array(rCount * 3);
        for (let i = 0; i < rCount; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = obj.radius * (0.72 + Math.random() * 0.24);
          rPos[i * 3] = Math.cos(a) * r;
          rPos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
          rPos[i * 3 + 2] = Math.sin(a) * r;
        }
        const rGeo = new THREE.BufferGeometry();
        rGeo.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
        const ringPts = new THREE.Points(rGeo, new THREE.PointsMaterial({ size: 1.8, map: glowTex, color: 0x60a5fa, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        group.add(core, ringPts);
        group.rotation.x = 0.5;
        this.rotators.push({ mesh: ringPts, speed: 0.02 });
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.65, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "fermi-bubbles") {
        // Twin 25,000-ly Gamma-Ray Plasma Lobes above and below Galactic Plane
        const lobeGeo = new THREE.SphereGeometry(14, 32, 32);
        const lobeMat = createAtmosphereMaterial(0xd946ef, 0.55);
        const topLobe = new THREE.Mesh(lobeGeo, lobeMat);
        topLobe.scale.set(1.0, 1.85, 1.0);
        topLobe.position.y = 4;
        const botLobe = new THREE.Mesh(lobeGeo, lobeMat);
        botLobe.scale.set(1.0, 1.85, 1.0);
        botLobe.position.y = -48;
        group.add(topLobe, botLobe);
        this._registerClickable(topLobe, obj);
      } else if (obj.id === "dark-matter-halo") {
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius, 36, 36),
          createAtmosphereMaterial(0x6366f1, 0.22)
        );
        group.add(halo);
        this._registerClickable(halo, obj);
      } else if (["sagittarius-a", "m87", "ton-618", "cygnus-x1", "phoenix-a", "3c-273"].includes(obj.id)) {
        const bhScale = obj.id === "phoenix-a" ? 7.2 : obj.id === "ton-618" ? 6.5 : obj.id === "m87" ? 5.5 : obj.id === "3c-273" ? 4.6 : obj.id === "cygnus-x1" ? 1.8 : 3.2;
        const horizon = new THREE.Mesh(new THREE.SphereGeometry(bhScale, 36, 36), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        group.add(horizon);
        this._registerClickable(horizon, obj);

        const isBlueQuasar = obj.id === "ton-618" || obj.id === "cygnus-x1" || obj.id === "3c-273";
        // Gravitational Lensing Photon Sphere / Einstein Ring
        const photonRing = new THREE.Mesh(
          new THREE.SphereGeometry(bhScale * 1.18, 36, 36),
          createAtmosphereMaterial(isBlueQuasar ? 0x93c5fd : 0xfdba74, 1.45)
        );
        group.add(photonRing);

        const diskMat = createAccretionDiskMaterial(0xfff3d1, isBlueQuasar ? 0x60a5fa : 0xea580c);
        this.animatedShaders.push(diskMat);
        const disk = new THREE.Mesh(new THREE.PlaneGeometry(bhScale * 6.5, bhScale * 6.5), diskMat);
        disk.rotation.x = Math.PI * 0.42;
        group.add(disk);

        // Vertical gravitationally-lensed accretion halo (Interstellar/Gargantua effect)
        const lensedArc = new THREE.Mesh(new THREE.PlaneGeometry(bhScale * 4.4, bhScale * 4.4), diskMat);
        group.add(lensedArc);

        if (obj.id !== "sagittarius-a") {
          const jetGeo = new THREE.ConeGeometry(bhScale * 0.55, bhScale * 9, 16, 1, true);
          const jetMat = new THREE.MeshBasicMaterial({
            color: isBlueQuasar ? 0x93c5fd : 0xc084fc,
            transparent: true,
            opacity: 0.42,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          const jetTop = new THREE.Mesh(jetGeo, jetMat);
          jetTop.position.y = bhScale * 4.5;
          jetTop.rotation.x = Math.PI;
          const jetBot = new THREE.Mesh(jetGeo, jetMat);
          jetBot.position.y = -bhScale * 4.5;
          group.add(jetTop, jetBot);
        }
      } else if (["virgo-cluster", "laniakea", "shapley-supercluster", "hercules-wall", "great-attractor", "coma-cluster", "perseus-cluster", "fornax-cluster", "sloan-great-wall", "omega-centauri", "orion-spur", "galactic-bar", "perseus-arm", "scutum-centaurus-arm", "m13-hercules", "ic-1101", "m32-m110", "sagittarius-dwarf", "barnards-galaxy"].includes(obj.id)) {
        const count = obj.id === "laniakea" ? 1800 : 1100;
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const c1 = new THREE.Color(0xfde68a);
        const c2 = new THREE.Color(0x818cf8);
        for (let i = 0; i < count; i++) {
          const r = Math.pow(Math.random(), 0.65) * obj.radius;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.55;
          pos[i * 3 + 2] = r * Math.cos(ph);
          const c = c1.clone().lerp(c2, Math.random());
          col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        group.add(
          new THREE.Points(
            geo,
            new THREE.PointsMaterial({ size: 3.2, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
          )
        );

        if (obj.id === "laniakea") {
          // Curved gravitational flow streamlines converging toward Great Attractor
          for (let s = 0; s < 14; s++) {
            const a = (s / 14) * Math.PI * 2;
            const curve = new THREE.QuadraticBezierCurve3(
              new THREE.Vector3(Math.cos(a) * obj.radius, (Math.random() - 0.5) * 28, Math.sin(a) * obj.radius),
              new THREE.Vector3(Math.cos(a + 0.4) * obj.radius * 0.45, (Math.random() - 0.5) * 14, Math.sin(a + 0.4) * obj.radius * 0.45),
              new THREE.Vector3(-17, -10, 12)
            );
            group.add(
              new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)),
                new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
              )
            );
          }
        }

        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.6, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "bullet-cluster") {
        // Colliding pink hot X-ray gas in center + blue Dark Matter halos on left/right
        const gas = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf43f5e, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
        gas.scale.set(22, 16, 1);
        const dmL = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x3b82f6, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
        dmL.position.x = -16;
        dmL.scale.set(26, 26, 1);
        const dmR = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x3b82f6, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
        dmR.position.x = 16;
        dmR.scale.set(24, 24, 1);
        group.add(gas, dmL, dmR);
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.65, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "cosmic-web") {
        this._buildCosmicWeb(group, obj, glowTex);
      } else if (["bootes-void", "kbc-void", "cold-spot-void"].includes(obj.id)) {
        const voidCore = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius * 0.72, 28, 28),
          new THREE.MeshBasicMaterial({ color: 0x02040a, transparent: true, opacity: 0.72, depthWrite: false })
        );
        const rimColor = obj.id === "cold-spot-void" ? 0x38bdf8 : obj.id === "kbc-void" ? 0x312e81 : 0x1e1b4b;
        const voidGlow = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius, 32, 32),
          createAtmosphereMaterial(rimColor, obj.id === "cold-spot-void" ? 0.55 : 0.45)
        );
        group.add(voidCore, voidGlow);
        this._registerClickable(voidGlow, obj);
      } else if (obj.id === "gw150914") {
        // Binary black holes + concentric spacetime gravitational wave ripple rings
        const bh1 = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        bh1.position.set(2.4, 0, 0);
        const bh2 = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        bh2.position.set(-2.4, 0, 0);
        const bh1Glow = new THREE.Mesh(new THREE.SphereGeometry(2.15, 24, 24), createAtmosphereMaterial(0x38bdf8, 1.3));
        bh1Glow.position.copy(bh1.position);
        const bh2Glow = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 24), createAtmosphereMaterial(0x818cf8, 1.3));
        bh2Glow.position.copy(bh2.position);
        const binaryPivot = new THREE.Group();
        binaryPivot.add(bh1, bh2, bh1Glow, bh2Glow);
        group.add(binaryPivot);
        this.rotators.push({ mesh: binaryPivot, speed: 1.4 });

        for (let r = 1; r <= 5; r++) {
          const ringGeo = new THREE.RingGeometry(r * 2.8, r * 2.8 + 0.35, 64);
          const ringMat = new THREE.MeshBasicMaterial({
            color: r % 2 === 0 ? 0x38bdf8 : 0xa78bfa,
            transparent: true,
            opacity: 0.72 - r * 0.11,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI * 0.44;
          group.add(ring);
        }
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.75, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "dark-energy") {
        // Repulsive vacuum energy aura + outward-expanding glowing quanta
        const aura = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius * 0.85, 32, 32),
          createAtmosphereMaterial(0x10b981, 0.7)
        );
        const innerAura = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius * 0.45, 24, 24),
          createAtmosphereMaterial(0x34d399, 1.1)
        );
        group.add(aura, innerAura);
        const pCount = 260;
        const pPos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
          const r = (0.35 + Math.random() * 0.75) * obj.radius;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          pPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
          pPos[i * 3 + 2] = r * Math.cos(ph);
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
        const pts = new THREE.Points(
          pGeo,
          new THREE.PointsMaterial({ size: 2.2, map: glowTex, color: 0x6ee7b7, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        group.add(pts);
        this.rotators.push({ mesh: pts, speed: -0.08 });
        this._registerClickable(aura, obj);
      } else if (obj.id === "dark-matter-web") {
        // BAO nested acoustic sound-wave shells + dark matter scaffolding
        for (let s = 1; s <= 3; s++) {
          const shell = new THREE.Mesh(
            new THREE.SphereGeometry(obj.radius * (s * 0.32), 28, 28),
            createAtmosphereMaterial(s === 2 ? 0x818cf8 : 0x6366f1, 0.42)
          );
          group.add(shell);
        }
        const bCount = 450;
        const bPos = new Float32Array(bCount * 3);
        for (let i = 0; i < bCount; i++) {
          const r = obj.radius * (0.86 + (Math.random() - 0.5) * 0.14);
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          bPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          bPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
          bPos[i * 3 + 2] = r * Math.cos(ph);
        }
        const bGeo = new THREE.BufferGeometry();
        bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
        const baoPts = new THREE.Points(
          bGeo,
          new THREE.PointsMaterial({ size: 2.0, map: glowTex, color: 0xa5b4fc, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        group.add(baoPts);
        this.rotators.push({ mesh: baoPts, speed: 0.03 });
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.85, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "giant-arc") {
        // Sweeping crescent arc of galaxy clusters + nearby Big Ring
        const arcCount = 520;
        const arcPos = new Float32Array(arcCount * 3);
        const arcCol = new Float32Array(arcCount * 3);
        const c1 = new THREE.Color(0xfbbf24);
        const c2 = new THREE.Color(0xf472b6);
        for (let i = 0; i < arcCount; i++) {
          if (i < arcCount * 0.7) {
            const angle = -1.15 + Math.random() * 2.3;
            const rad = obj.radius * 1.1 + (Math.random() - 0.5) * 3.8;
            arcPos[i * 3] = Math.cos(angle) * rad - obj.radius * 0.4;
            arcPos[i * 3 + 1] = Math.sin(angle) * rad;
            arcPos[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
            arcCol[i * 3] = c1.r; arcCol[i * 3 + 1] = c1.g; arcCol[i * 3 + 2] = c1.b;
          } else {
            // Adjacent Big Ring structure
            const angle = Math.random() * Math.PI * 2;
            const rad = obj.radius * 0.45 + (Math.random() - 0.5) * 2.2;
            arcPos[i * 3] = Math.cos(angle) * rad - obj.radius * 0.55;
            arcPos[i * 3 + 1] = Math.sin(angle) * rad;
            arcPos[i * 3 + 2] = 6 + (Math.random() - 0.5) * 2.5;
            arcCol[i * 3] = c2.r; arcCol[i * 3 + 1] = c2.g; arcCol[i * 3 + 2] = c2.b;
          }
        }
        const arcGeo = new THREE.BufferGeometry();
        arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
        arcGeo.setAttribute("color", new THREE.BufferAttribute(arcCol, 3));
        group.add(
          new THREE.Points(
            arcGeo,
            new THREE.PointsMaterial({ size: 2.6, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
          )
        );
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.9, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "cmb") {
        // Smooth volumetric Planck CMB shell (no wireframe!)
        const cmbMat = createCMBMaterial();
        const shell = new THREE.Mesh(new THREE.SphereGeometry(obj.radius, 64, 64), cmbMat);
        group.add(shell);
        // Also place Cosmic Web filaments inside the Observable Universe sphere
        this._buildCosmicWeb(group, { ...obj, radius: obj.radius * 0.82 }, glowTex, false);
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.9, 24, 24), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hitbox);
        this._registerClickable(hitbox, obj);
      } else if (obj.id === "observable-universe") {
        const outerHalo = new THREE.Mesh(
          new THREE.SphereGeometry(obj.radius, 48, 48),
          createAtmosphereMaterial(0x38bdf8, 0.35)
        );
        group.add(outerHalo);
      }
    }

    // Add Solar System Asteroid Belt (between Mars and Jupiter) to Scale 1
    this._buildAsteroidBelt();
    // Attach visible orbiting moons (opogroho) to all Solar System planets
    this._buildSolarPlanetMoons();
  }

  _buildSolarPlanetMoons() {
    const planetMoons = {
      "earth-solar": [{ name: "Luna", radius: 0.36, dist: 2.6, speed: 0.9, color: 0xd4d4d8 }],
      mars: [
        { name: "Phobos", radius: 0.16, dist: 1.75, speed: 1.8, color: 0xa8a29e },
        { name: "Deimos", radius: 0.12, dist: 2.4, speed: 1.1, color: 0x78716c }
      ],
      jupiter: [
        { name: "Io", radius: 0.32, dist: 5.2, speed: 1.5, color: 0xfacc15 },
        { name: "Europa", radius: 0.28, dist: 6.3, speed: 1.1, color: 0xe0f2fe },
        { name: "Ganymede", radius: 0.42, dist: 7.6, speed: 0.75, color: 0xa8a29e },
        { name: "Callisto", radius: 0.36, dist: 9.0, speed: 0.5, color: 0x71717a }
      ],
      saturn: [
        { name: "Enceladus", radius: 0.22, dist: 8.2, speed: 1.3, color: 0xf8fafc },
        { name: "Titan", radius: 0.44, dist: 9.8, speed: 0.75, color: 0xf59e0b },
        { name: "Rhea", radius: 0.24, dist: 11.4, speed: 0.48, color: 0xcbd5e1 }
      ],
      uranus: [
        { name: "Titania", radius: 0.22, dist: 5.4, speed: 0.9, color: 0xbae6fd },
        { name: "Oberon", radius: 0.2, dist: 6.4, speed: 0.6, color: 0x94a3b8 }
      ],
      neptune: [{ name: "Triton", radius: 0.28, dist: 3.6, speed: -0.95, color: 0xe2e8f0 }],
      pluto: [{ name: "Charon", radius: 0.34, dist: 1.85, speed: 0.85, color: 0x9ca3af }]
    };

    for (const [planetId, moons] of Object.entries(planetMoons)) {
      const target = this.labelTargets.get(planetId);
      if (!target) continue;
      for (let i = 0; i < moons.length; i++) {
        const m = moons[i];
        const moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(m.radius, 18, 18),
          new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.85 })
        );
        const angle = (i * 2.1) + Math.random();
        moonMesh.position.set(Math.cos(angle) * m.dist, 0, Math.sin(angle) * m.dist);
        target.group.add(moonMesh);

        // Subtle local moon orbit ring
        const pts = [];
        for (let k = 0; k <= 48; k++) {
          const a = (k / 48) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * m.dist, 0, Math.sin(a) * m.dist));
        }
        target.group.add(
          new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.14 })
          )
        );

        this.localMoons.push({ mesh: moonMesh, dist: m.dist, angle, speed: m.speed });
      }
    }
  }

  _buildAsteroidBelt() {
    const count = 1600;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 31 + Math.random() * 5.5;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.scaleGroups[1].add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9ca3af, size: 0.25 })));
  }

  _createSpiralGalaxyPoints(count, radius, arms, spriteTex, isBarred = false) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const insideColor = new THREE.Color(0xffe4a0);
    const outsideColor = new THREE.Color(0x60a5fa);
    const h2Color = new THREE.Color(0xf472b6); // Pink H-II star-forming regions

    for (let i = 0; i < count; i++) {
      if (isBarred && i < count * 0.16) {
        // Elongated Central Stellar Bar
        const barX = (Math.random() - 0.5) * radius * 0.42;
        const barZ = (Math.random() - 0.5) * radius * 0.11;
        const barY = (Math.random() - 0.5) * radius * 0.06;
        const cosA = Math.cos(0.45);
        const sinA = Math.sin(0.45);
        pos[i * 3] = barX * cosA - barZ * sinA;
        pos[i * 3 + 1] = barY;
        pos[i * 3 + 2] = barX * sinA + barZ * cosA;
        col[i * 3] = insideColor.r; col[i * 3 + 1] = insideColor.g; col[i * 3 + 2] = insideColor.b;
        continue;
      }

      const r = Math.pow(Math.random(), 1.35) * radius;
      const spinAngle = r * 0.07;
      const branchAngle = ((i % arms) / arms) * Math.PI * 2;
      const spread = (Math.random() - 0.5) * (0.28 * r + 3.2);
      const ySpread = (Math.random() - 0.5) * (0.08 * (radius - r) + 2.0);

      pos[i * 3] = Math.cos(branchAngle + spinAngle) * r + spread;
      pos[i * 3 + 1] = ySpread;
      pos[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + (Math.random() - 0.5) * (0.28 * r + 3.2);

      const isH2 = Math.random() > 0.94 && r > radius * 0.2;
      const mixed = isH2 ? h2Color : insideColor.clone().lerp(outsideColor, r / radius);
      col[i * 3] = mixed.r; col[i * 3 + 1] = mixed.g; col[i * 3 + 2] = mixed.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 1.85,
        map: spriteTex,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  _buildCosmicWeb(group, obj, glowTex, clickable = true) {
    const nodes = [];
    const nodeCount = 185;
    for (let i = 0; i < nodeCount; i++) {
      const r = Math.pow(Math.random(), 0.55) * obj.radius;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      nodes.push(
        new THREE.Vector3(
          r * Math.sin(ph) * Math.cos(th),
          r * Math.sin(ph) * Math.sin(th),
          r * Math.cos(ph)
        )
      );
    }

    const linePositions = [];
    const lineColors = [];
    const dustPositions = [];
    const dustColors = [];
    const filColorA = new THREE.Color(0x6366f1); // Indigo dark matter
    const filColorB = new THREE.Color(0xc084fc); // Violet filament
    const gasColor = new THREE.Color(0x38bdf8);  // Cyan Lyman-alpha hydrogen gas
    const deg = new Int32Array(nodeCount);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = nodes[i].distanceTo(nodes[j]);
        if (d < obj.radius * 0.34) {
          deg[i]++;
          deg[j]++;
          linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
          lineColors.push(filColorA.r, filColorA.g, filColorA.b, filColorB.r, filColorB.g, filColorB.b);

          // Sample glowing hydrogen/galaxy dust along each filament
          const samples = 4;
          for (let s = 1; s <= samples; s++) {
            const t = s / (samples + 1) + (Math.random() - 0.5) * 0.12;
            const jitter = 2.6;
            dustPositions.push(
              nodes[i].x + (nodes[j].x - nodes[i].x) * t + (Math.random() - 0.5) * jitter,
              nodes[i].y + (nodes[j].y - nodes[i].y) * t + (Math.random() - 0.5) * jitter,
              nodes[i].z + (nodes[j].z - nodes[i].z) * t + (Math.random() - 0.5) * jitter
            );
            const c = Math.random() > 0.35 ? filColorB : gasColor;
            dustColors.push(c.r, c.g, c.b);
          }
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
    group.add(
      new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending })
      )
    );

    if (dustPositions.length > 0) {
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
      dustGeo.setAttribute("color", new THREE.Float32BufferAttribute(dustColors, 3));
      group.add(
        new THREE.Points(
          dustGeo,
          new THREE.PointsMaterial({ size: 2.2, map: glowTex, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })
        )
      );
    }

    const nodeArr = new Float32Array(nodes.length * 3);
    const nodeCol = new Float32Array(nodes.length * 3);
    const goldNode = new THREE.Color(0xfde68a);
    const violetNode = new THREE.Color(0xc084fc);
    nodes.forEach((n, idx) => {
      nodeArr[idx * 3] = n.x;
      nodeArr[idx * 3 + 1] = n.y;
      nodeArr[idx * 3 + 2] = n.z;
      const c = deg[idx] >= 6 ? goldNode : violetNode;
      nodeCol[idx * 3] = c.r;
      nodeCol[idx * 3 + 1] = c.g;
      nodeCol[idx * 3 + 2] = c.b;
    });
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodeArr, 3));
    nodeGeo.setAttribute("color", new THREE.BufferAttribute(nodeCol, 3));
    group.add(
      new THREE.Points(
        nodeGeo,
        new THREE.PointsMaterial({ size: 7.5, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      )
    );

    if (clickable) {
      const hitbox = new THREE.Mesh(new THREE.SphereGeometry(obj.radius * 0.35, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
      group.add(hitbox);
      this._registerClickable(hitbox, obj);
    }
  }

  _setActiveScaleGroup(scaleIndex) {
    this.activeExoSystem = null;
    this.exoSystemGroup.visible = false;
    this.activeCountry = null;
    this.countryGroup.visible = false;
    this.activePlanet = null;
    this.planetGroup.visible = false;
    this.currentScale = scaleIndex;
    this.scaleGroups.forEach((g, idx) => {
      g.visible = idx === scaleIndex;
    });
  }

  enterPlanetView(planetId) {
    const p = PLANET_DEEP_DIVES[planetId];
    if (!p) return false;

    this.scaleGroups.forEach((g) => (g.visible = false));
    this.exoSystemGroup.visible = false;
    this.activeExoSystem = null;
    this.countryGroup.visible = false;
    this.activeCountry = null;

    this.planetGroup.clear();
    this.planetClickables = [];
    this.planetLabelTargets = [];
    this.planetOrbiters = [];
    this.activePlanet = p;
    this.planetGroup.visible = true;

    // Dedicated lighting for crisp close-up planetary relief
    const amb = new THREE.AmbientLight(0x475569, 0.9);
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
    keyLight.position.set(10, 6, 12);
    this.planetGroup.add(amb, keyLight);

    const bodyTiltGroup = new THREE.Group();
    if (p.tiltDeg) bodyTiltGroup.rotation.z = THREE.MathUtils.degToRad(p.tiltDeg);
    this.planetGroup.add(bodyTiltGroup);

    let mainMesh;
    if (p.renderType === "sun") {
      const sunMat = createSunPlasmaMaterial();
      this.animatedShaders.push(sunMat);
      mainMesh = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 72, 72), sunMat);
    } else if (p.renderType === "earth") {
      const { map, bumpMap, roughnessMap } = createEarthTextures();
      mainMesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 96, 96),
        new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.05, roughnessMap, roughness: 0.9 })
      );
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      loader.load(`${EARTH_CDN}/earth_atmos_2048.jpg`, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        mainMesh.material.map = t;
        mainMesh.material.needsUpdate = true;
      });
    } else if (p.renderType === "gas") {
      mainMesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 96, 96),
        new THREE.MeshStandardMaterial({
          map: createGasGiantTexture(p.palette, 19, p.id === "jupiter"),
          roughness: 0.55
        })
      );
    } else {
      mainMesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 96, 96),
        new THREE.MeshStandardMaterial({
          map: createRockyTexture(p.colors[0], p.colors[1], 7, 130),
          roughness: 0.88
        })
      );
    }
    bodyTiltGroup.add(mainMesh);

    if (p.atmosphere) {
      bodyTiltGroup.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(p.radius * 1.06, 48, 48),
          createAtmosphereMaterial(p.atmosphere, 0.85)
        )
      );
    }

    if (p.hasRing) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(p.radius * 1.32, p.radius * 2.35, 96),
        new THREE.MeshBasicMaterial({
          map: createSaturnRingTexture(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.88
        })
      );
      ring.rotation.x = Math.PI * 0.48;
      bodyTiltGroup.add(ring);
    }

    // Surface landmarks + orbiting moons/probes
    for (const f of p.features) {
      const fGroup = new THREE.Group();
      const featObj = { ...f, radius: f.orbitRadius || 0.35, scaleIndex: 1 };

      if (f.kind === "surface") {
        const surfacePos = latLonToVector3(f.lat, f.lon, p.radius);
        const normal = surfacePos.clone().normalize();
        fGroup.position.copy(surfacePos);
        bodyTiltGroup.add(fGroup);

        const pinHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 16, 16),
          new THREE.MeshBasicMaterial({ color: f.color })
        );
        pinHead.position.copy(normal.clone().multiplyScalar(0.28));

        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc })
        );
        stem.position.copy(normal.clone().multiplyScalar(0.14));
        stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const beacon = new THREE.Mesh(
          new THREE.RingGeometry(0.14, 0.2, 24),
          new THREE.MeshBasicMaterial({ color: f.color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        beacon.position.copy(normal.clone().multiplyScalar(0.03));
        beacon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

        const hitbox = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
        hitbox.position.copy(normal.clone().multiplyScalar(0.22));
        hitbox.userData.universeObject = featObj;
        pinHead.userData.universeObject = featObj;
        fGroup.add(pinHead, stem, beacon, hitbox);
        this.planetClickables.push(hitbox, pinHead);
      } else {
        // Orbiting moon or probe
        const startAngle = Math.random() * Math.PI * 2;
        fGroup.position.set(Math.cos(startAngle) * f.orbitDist, 0, Math.sin(startAngle) * f.orbitDist);
        this.planetGroup.add(fGroup);

        const orbPts = [];
        for (let k = 0; k <= 96; k++) {
          const a = (k / 96) * Math.PI * 2;
          orbPts.push(new THREE.Vector3(Math.cos(a) * f.orbitDist, 0, Math.sin(a) * f.orbitDist));
        }
        this.planetGroup.add(
          new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(orbPts),
            new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.24 })
          )
        );

        const moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(f.orbitRadius || 0.28, 24, 24),
          new THREE.MeshStandardMaterial({ map: createRockyTexture(f.color, 0x334155, 4, 77), roughness: 0.82 })
        );
        const hitbox = new THREE.Mesh(new THREE.SphereGeometry((f.orbitRadius || 0.28) * 1.5, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
        moonMesh.userData.universeObject = featObj;
        hitbox.userData.universeObject = featObj;
        fGroup.add(moonMesh, hitbox);
        this.planetClickables.push(hitbox, moonMesh);
        this.planetOrbiters.push({ group: fGroup, dist: f.orbitDist, angle: startAngle, speed: f.speed || 0.35 });
      }

      this.planetLabelTargets.push({ group: fGroup, obj: featObj, isSurface: f.kind === "surface" });
    }

    this._startFly(new THREE.Vector3(0, 3.8, 9.6), new THREE.Vector3(0, 0, 0));
    return true;
  }

  flyToPlanetFeature(featureId) {
    const entry = this.planetLabelTargets.find((e) => e.obj.id === featureId);
    if (!entry) return;
    const worldPos = new THREE.Vector3();
    entry.group.getWorldPosition(worldPos);
    if (entry.isSurface) {
      const normal = worldPos.clone().normalize();
      const destPos = worldPos.clone().add(normal.multiplyScalar(2.4));
      this._startFly(destPos, worldPos);
    } else {
      const destPos = worldPos.clone().add(new THREE.Vector3(1.1, 0.7, 2.1));
      this._startFly(destPos, worldPos);
    }
  }

  exitPlanetView() {
    this._setActiveScaleGroup(1);
    this.flyToScale(1);
  }

  _bdLatLonToXZ(lat, lon) {
    const scale = 420;
    const cx = (90.35 + 180) / 360;
    const cy = (1 - Math.log(Math.tan((23.75 * Math.PI) / 180) + 1 / Math.cos((23.75 * Math.PI) / 180)) / Math.PI) / 2;
    const mx = (lon + 180) / 360;
    const rad = (lat * Math.PI) / 180;
    const my = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
    return new THREE.Vector3((mx - cx) * scale, 0, (my - cy) * scale);
  }

  _bdTileToBounds(tx, ty, z) {
    const n = 2 ** z;
    const scale = 420;
    const cx = (90.35 + 180) / 360;
    const cy = (1 - Math.log(Math.tan((23.75 * Math.PI) / 180) + 1 / Math.cos((23.75 * Math.PI) / 180)) / Math.PI) / 2;
    const x0 = (tx / n - cx) * scale;
    const x1 = ((tx + 1) / n - cx) * scale;
    const z0 = (ty / n - cy) * scale;
    const z1 = ((ty + 1) / n - cy) * scale;
    return { x0, x1, z0, z1, w: x1 - x0, h: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
  }

  _loadBangladeshHighResPatch(lat, lon) {
    if (!this.countryPatchGroup) return;
    this.countryPatchGroup.clear();
    const z = 12;
    const n = 2 ** z;
    const cxTile = Math.floor(((lon + 180) / 360) * n);
    const rad = (lat * Math.PI) / 180;
    const cyTile = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tx = cxTile + dx;
        const ty = cyTile + dy;
        const b = this._bdTileToBounds(tx, ty, z);
        const tex = loader.load(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`);
        tex.colorSpace = THREE.SRGBColorSpace;
        const tileMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(b.w * 1.002, b.h * 1.002),
          new THREE.MeshBasicMaterial({ map: tex })
        );
        tileMesh.rotation.x = -Math.PI / 2;
        tileMesh.position.set(b.cx, 0.012, b.cz);
        this.countryPatchGroup.add(tileMesh);
      }
    }
  }

  enterBangladeshView() {
    this.scaleGroups.forEach((g) => (g.visible = false));
    this.exoSystemGroup.visible = false;
    this.activeExoSystem = null;
    this.countryGroup.clear();
    this.countryClickables = [];
    this.countryLabelTargets = [];
    this.activeCountry = "Bangladesh";
    this.countryGroup.visible = true;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    // Base Z=8 Esri World Imagery satellite mosaic covering all of Bangladesh
    const z = 8;
    for (let tx = 190; tx <= 194; tx++) {
      for (let ty = 108; ty <= 113; ty++) {
        const b = this._bdTileToBounds(tx, ty, z);
        const tex = loader.load(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`);
        tex.colorSpace = THREE.SRGBColorSpace;
        const tileMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(b.w * 1.002, b.h * 1.002),
          new THREE.MeshBasicMaterial({ map: tex })
        );
        tileMesh.rotation.x = -Math.PI / 2;
        tileMesh.position.set(b.cx, 0, b.cz);
        this.countryGroup.add(tileMesh);
      }
    }

    // Dynamic Z=12 high-resolution zoom patch group
    this.countryPatchGroup = new THREE.Group();
    this.countryGroup.add(this.countryPatchGroup);

    // Draw Bangladesh's national border from Natural Earth polygons
    const bdCountry = this.earthAtlas.countries.find((c) => c.name === "Bangladesh");
    if (bdCountry) {
      const borderMat = new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9 });
      for (const poly of bdCountry.polygons) {
        if (!poly[0]) continue;
        const pts = poly[0].map(([lon, lat]) => {
          const p = this._bdLatLonToXZ(lat, lon);
          p.y = 0.025;
          return p;
        });
        this.countryGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), borderMat));
      }
    }

    // Add interactive 3D pins for all 8 Divisions, Cities, Rivers & Landmarks
    for (const place of BANGLADESH_PLACES) {
      const pGroup = new THREE.Group();
      const pos = this._bdLatLonToXZ(place.lat, place.lon);
      pGroup.position.set(pos.x, 0.04, pos.z);
      this.countryGroup.add(pGroup);

      const pinHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 16),
        new THREE.MeshBasicMaterial({ color: place.id === "bd-dhaka" ? 0xfacc15 : 0x38bdf8 })
      );
      pinHead.position.y = 0.14;
      const pinStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8),
        new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
      );
      pinStem.position.y = 0.07;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.11, 24),
        new THREE.MeshBasicMaterial({ color: place.id === "bd-dhaka" ? 0xfacc15 : 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      const hitbox = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
      hitbox.position.y = 0.1;

      const placeObj = { ...place, radius: 0.25 };
      hitbox.userData.universeObject = placeObj;
      pinHead.userData.universeObject = placeObj;
      pGroup.add(pinHead, pinStem, ring, hitbox);

      this.countryClickables.push(hitbox, pinHead);
      this.countryLabelTargets.push({ group: pGroup, obj: placeObj });
    }

    this._loadBangladeshHighResPatch(23.8103, 90.4125);
    this._startFly(new THREE.Vector3(0, 6.8, 5.4), new THREE.Vector3(0, 0, 0));
    return true;
  }

  flyToCountryPlace(placeId) {
    const entry = this.countryLabelTargets.find((e) => e.obj.id === placeId);
    if (!entry) return;
    const target = entry.group.position.clone();
    if (typeof entry.obj.lat === "number" && typeof entry.obj.lon === "number") {
      this._loadBangladeshHighResPatch(entry.obj.lat, entry.obj.lon);
    }
    const destPos = target.clone().add(new THREE.Vector3(0.45, 1.1, 1.25));
    this._startFly(destPos, target);
  }

  exitCountryView() {
    this._setActiveScaleGroup(0);
    this.flyToScale(0);
  }

  enterExoSystem(systemId) {
    const sys = EXO_SYSTEMS[systemId];
    if (!sys) return false;

    this.scaleGroups.forEach((g) => (g.visible = false));
    this.exoSystemGroup.clear();
    this.exoClickables = [];
    this.exoLabelTargets = [];
    this.exoOrbiters = [];
    this.exoMoons = [];
    this.activeExoSystem = sys;
    this.exoSystemGroup.visible = true;

    // Host Star Lighting
    this.exoSystemGroup.add(new THREE.PointLight(0xfff4de, 3.8, 250, 0.25));
    this.exoSystemGroup.add(new THREE.AmbientLight(0x334770, 0.55));

    // Host Star Mesh
    const starMat = createSunPlasmaMaterial(sys.star.color, sys.star.hotColor);
    this.animatedShaders.push(starMat);
    const starMesh = new THREE.Mesh(new THREE.SphereGeometry(sys.star.radius, 48, 48), starMat);
    this.exoSystemGroup.add(starMesh);

    const starObj = {
      id: `${sys.id}-star`,
      name: sys.star.name,
      emoji: "☀️",
      category: "Host Star",
      scaleIndex: this.currentScale,
      radius: sys.star.radius,
      tagline: sys.systemName,
      distanceLabel: sys.hostGalaxy,
      diameter: `Temp: ${sys.star.temp}`,
      description: sys.star.description,
      stats: [{ label: "Surface Temp", value: sys.star.temp }, { label: "Location", value: sys.hostGalaxy }],
      facts: [`Host star of ${sys.planets.length} mapped exoplanet(s) in this system.`]
    };
    starMesh.userData.universeObject = starObj;
    this.exoClickables.push(starMesh);
    this.exoLabelTargets.push({ group: starMesh, obj: starObj });

    // Exoplanets + their Orbiting Moons ("Opogroho")
    sys.planets.forEach((p, idx) => {
      const pGroup = new THREE.Group();
      const angle = idx * 1.45;
      pGroup.position.set(Math.cos(angle) * p.orbitRadius, 0, Math.sin(angle) * p.orbitRadius);
      this.exoSystemGroup.add(pGroup);

      // Orbit ring
      const pts = [];
      for (let k = 0; k <= 96; k++) {
        const a = (k / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * p.orbitRadius, 0, Math.sin(a) * p.orbitRadius));
      }
      this.exoSystemGroup.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22 })
        )
      );

      const pMesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 40, 40),
        new THREE.MeshStandardMaterial({ map: createGasGiantTexture(p.palette, idx + 7, false), roughness: 0.65 })
      );
      pGroup.add(pMesh);
      this.rotators.push({ mesh: pMesh, speed: 0.12 });

      if (p.hasAtmosphere) {
        pGroup.add(
          new THREE.Mesh(new THREE.SphereGeometry(p.radius * 1.07, 32, 32), createAtmosphereMaterial(p.hasAtmosphere, 0.85))
        );
      }
      if (p.hasRing) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(p.radius * 1.35, p.radius * 2.25, 64),
          new THREE.MeshBasicMaterial({ map: createSaturnRingTexture(), side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        ring.rotation.x = Math.PI * 0.42;
        pGroup.add(ring);
      }

      // Attach moons (opogroho) to this exoplanet
      (p.moons || []).forEach((m, mIdx) => {
        const mMesh = new THREE.Mesh(
          new THREE.SphereGeometry(m.radius, 18, 18),
          new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.8 })
        );
        const mAngle = mIdx * 2.1;
        mMesh.position.set(Math.cos(mAngle) * m.dist, 0, Math.sin(mAngle) * m.dist);
        pGroup.add(mMesh);
        this.exoMoons.push({ mesh: mMesh, dist: m.dist, angle: mAngle, speed: m.speed });
      });

      const exoObj = {
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        category: "Exoplanet",
        scaleIndex: this.currentScale,
        radius: p.radius,
        tagline: `${p.type} • ${sys.hostGalaxy}`,
        distanceLabel: sys.hostGalaxy,
        diameter: `Orbit: ${p.orbitRadius} AU-eq`,
        description: p.description,
        stats: [
          { label: "Temperature", value: p.temp },
          { label: "Gravity", value: p.gravity },
          { label: "Atmosphere", value: p.atmosphere },
          { label: "Habitability", value: p.habitability },
          { label: "Moons (Opogroho)", value: `${(p.moons || []).length}` }
        ],
        facts: [
          `Part of ${sys.systemName}.`,
          p.moons?.length ? `Orbited by ${p.moons.map((x) => x.name).join(", ")}.` : "No detected natural satellites."
        ]
      };
      pMesh.userData.universeObject = exoObj;
      pMesh.userData.exoGroup = pGroup;
      this.exoClickables.push(pMesh);
      this.exoLabelTargets.push({ group: pGroup, obj: exoObj });
      this.exoOrbiters.push({ group: pGroup, radius: p.orbitRadius, angle, speed: 0.08 / Math.pow(p.orbitRadius / 10, 1.2) });
    });

    this._startFly(new THREE.Vector3(0, 26, 48), new THREE.Vector3(0, 0, 0));
    return true;
  }

  exitExoSystem() {
    this._setActiveScaleGroup(this.currentScale);
    this.flyToScale(this.currentScale);
  }

  flyToScale(scaleIndex) {
    const scale = COSMIC_SCALES[scaleIndex];
    if (!scale) return;
    this._setActiveScaleGroup(scaleIndex);
    this._startFly(new THREE.Vector3(...scale.camPos), new THREE.Vector3(...scale.camTarget));
    this.onScaleUpdate?.(scaleIndex);
  }

  setOrbitSpeed(mult) {
    this.orbitSpeedMultiplier = mult;
  }

  flyToObject(objectId) {
    const entry = this.labelTargets.get(objectId);
    const obj = entry?.obj || UNIVERSE_OBJECTS.find((o) => o.id === objectId);
    if (!obj) return;
    this._setActiveScaleGroup(obj.scaleIndex);
    if (obj.id === "earth") {
      this.earthSpinEnabled = true;
      this.earthAtlas.highlightCountry(null);
    }
    const target = entry ? entry.group.position.clone() : new THREE.Vector3(...obj.pos);
    const offsetDist = Math.max(3.6, obj.radius * 2.7);
    const destPos = target.clone().add(new THREE.Vector3(offsetDist * 0.42, offsetDist * 0.25, offsetDist));
    this._startFly(destPos, target);
    this.onScaleUpdate?.(obj.scaleIndex);
  }

  setEarthSpin(enabled) {
    this.earthSpinEnabled = enabled;
  }

  setEarthBordersVisible(visible) {
    if (this.earthBordersMesh) this.earthBordersMesh.visible = visible;
  }

  flyToEarthLatLon(lat, lon, dist = 4.35, countryName = null) {
    this._setActiveScaleGroup(0);
    this.earthSpinEnabled = false;
    this.earthAtlas.highlightCountry(countryName);
    if (this.earthMesh) {
      this.earthMesh.updateMatrixWorld(true);
      const localPt = latLonToVector3(lat, lon, this.earthRadius);
      const worldPt = this.earthMesh.localToWorld(localPt);
      const normal = worldPt.clone().normalize();
      this._startFly(normal.multiplyScalar(dist), new THREE.Vector3(0, 0, 0));
    }
    this.onScaleUpdate?.(0);
  }

  _startFly(endPos, endTarget) {
    this.flyAnim = {
      startPos: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endPos,
      endTarget,
      progress: 0
    };
  }

  _bindEvents() {
    window.addEventListener("resize", () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
    });

    const dom = this.renderer.domElement;

    dom.addEventListener("pointermove", (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const targets = this.activePlanet
        ? this.planetClickables
        : this.activeCountry
        ? this.countryClickables
        : this.activeExoSystem
        ? this.exoClickables
        : this.clickableMeshesByScale[this.currentScale];
      const hits = this.raycaster.intersectObjects(targets, false);
      if (hits.length > 0) {
        dom.style.cursor = "pointer";
        const hit = hits[0];
        if (this.currentScale === 0 && !this.activeExoSystem && !this.activeCountry && !this.activePlanet && hit.object === this.earthMesh && this.earthAtlas.loaded) {
          const localPt = this.earthMesh.worldToLocal(hit.point.clone());
          const { lat, lon } = vector3ToLatLon(localPt, this.earthRadius);
          const loc = this.earthAtlas.lookupLocation(lat, lon);
          this.earthAtlas.highlightCountry(loc.type === "country" ? loc.name : null);
          this.onHoverObject?.(
            {
              emoji: loc.type === "country" ? "📍" : "🌊",
              name: loc.name,
              distanceLabel: formatLatLon(lat, lon)
            },
            e.clientX,
            e.clientY
          );
        } else {
          this.onHoverObject?.(hit.object.userData.universeObject, e.clientX, e.clientY);
        }
      } else {
        dom.style.cursor = "grab";
        this.onHoverObject?.(null);
      }
    });

    dom.addEventListener("pointerdown", (e) => {
      this.pointerDownPos.set(e.clientX, e.clientY);
      this.flyAnim = null;
    });

    dom.addEventListener("pointerup", (e) => {
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist > 6) return;

      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const targets = this.activePlanet
        ? this.planetClickables
        : this.activeCountry
        ? this.countryClickables
        : this.activeExoSystem
        ? this.exoClickables
        : this.clickableMeshesByScale[this.currentScale];
      const hits = this.raycaster.intersectObjects(targets, false);
      if (hits.length > 0) {
        const hit = hits[0];
        if (this.currentScale === 0 && !this.activeExoSystem && !this.activeCountry && !this.activePlanet && hit.object === this.earthMesh && this.earthAtlas.loaded) {
          const localPt = this.earthMesh.worldToLocal(hit.point.clone());
          const { lat, lon } = vector3ToLatLon(localPt, this.earthRadius);
          const loc = this.earthAtlas.lookupLocation(lat, lon);
          this.flyToEarthLatLon(lat, lon, 4.35, loc.type === "country" ? loc.name : null);
          this.onSelectEarthLocation?.(loc);
          return;
        }
        const obj = hit.object.userData.universeObject;
        if (this.activePlanet) {
          this.flyToPlanetFeature(obj.id);
        } else if (this.activeCountry) {
          this.flyToCountryPlace(obj.id);
        } else if (this.activeExoSystem) {
          this.flyToExoObject(obj.id);
        } else {
          this.flyToObject(obj.id);
        }
        this.onSelectObject?.(obj);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (document.activeElement?.tagName === "INPUT") return;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  _handleKeyboardFlight(dt) {
    if (this.keys.size === 0) return;
    const boost = this.keys.has("shift") ? 4.0 : 1;
    const speed = (10 + this.camera.position.length() * 0.35) * boost * dt;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const move = new THREE.Vector3();

    if (this.keys.has("w") || this.keys.has("arrowup")) move.addScaledVector(forward, speed);
    if (this.keys.has("s") || this.keys.has("arrowdown")) move.addScaledVector(forward, -speed);
    if (this.keys.has("a") || this.keys.has("arrowleft")) move.addScaledVector(right, -speed);
    if (this.keys.has("d") || this.keys.has("arrowright")) move.addScaledVector(right, speed);
    if (this.keys.has("e")) move.y += speed * 0.7;
    if (this.keys.has("q")) move.y -= speed * 0.7;

    if (move.lengthSq() > 0) {
      this.flyAnim = null;
      this.camera.position.add(move);
      this.controls.target.add(move);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    for (const mat of this.animatedShaders) {
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = elapsed;
    }

    for (const item of this.rotators) {
      item.mesh.rotation.y += item.speed * dt;
    }

    if (this.earthMesh && this.earthSpinEnabled) {
      this.earthMesh.rotation.y += 0.045 * dt;
    }
    if (this.earthCloudMesh) {
      this.earthCloudMesh.rotation.y += (this.earthSpinEnabled ? 0.062 : 0.012) * dt;
    }

    if (this.orbitSpeedMultiplier > 0) {
      for (const orb of this.orbiters) {
        orb.angle += orb.speed * dt * this.orbitSpeedMultiplier;
        orb.group.position.set(Math.cos(orb.angle) * orb.radius, orb.y, Math.sin(orb.angle) * orb.radius);
      }
      for (const m of this.localMoons) {
        m.angle += m.speed * dt * this.orbitSpeedMultiplier;
        m.mesh.position.set(Math.cos(m.angle) * m.dist, 0, Math.sin(m.angle) * m.dist);
      }
      if (this.activePlanet) {
        for (const po of this.planetOrbiters) {
          po.angle += po.speed * dt * this.orbitSpeedMultiplier;
          po.group.position.set(Math.cos(po.angle) * po.dist, 0, Math.sin(po.angle) * po.dist);
        }
      }
      if (this.activeExoSystem) {
        for (const eo of this.exoOrbiters) {
          eo.angle += eo.speed * dt * this.orbitSpeedMultiplier;
          eo.group.position.set(Math.cos(eo.angle) * eo.radius, 0, Math.sin(eo.angle) * eo.radius);
        }
        for (const em of this.exoMoons) {
          em.angle += em.speed * dt * this.orbitSpeedMultiplier;
          em.mesh.position.set(Math.cos(em.angle) * em.dist, 0, Math.sin(em.angle) * em.dist);
        }
      }
    }

    if (this.flyAnim) {
      this.flyAnim.progress = Math.min(1, this.flyAnim.progress + dt * 1.25);
      const t = 1 - Math.pow(1 - this.flyAnim.progress, 3);
      this.camera.position.lerpVectors(this.flyAnim.startPos, this.flyAnim.endPos, t);
      this.controls.target.lerpVectors(this.flyAnim.startTarget, this.flyAnim.endTarget, t);
      // Hyperdrive FOV kick during warp
      const warpPulse = Math.sin(this.flyAnim.progress * Math.PI) * 14;
      this.camera.fov = 55 + warpPulse;
      this.camera.updateProjectionMatrix();
      if (this.flyAnim.progress >= 1) {
        this.flyAnim = null;
        this.camera.fov = 55;
        this.camera.updateProjectionMatrix();
      }
    } else {
      this._handleKeyboardFlight(dt);
    }

    this.controls.update();
    this.onDistanceUpdate?.(this.camera.position.length());
    this._projectLabels();
    this.composer.render();
  }

  flyToExoObject(id) {
    const entry = this.exoLabelTargets.find((e) => e.obj.id === id);
    if (!entry) return;
    const target = entry.group.position.clone();
    const offsetDist = Math.max(3.2, entry.obj.radius * 3.0);
    const destPos = target.clone().add(new THREE.Vector3(offsetDist * 0.45, offsetDist * 0.25, offsetDist));
    this._startFly(destPos, target);
  }

  _projectLabels() {
    if (!this.onUpdateLabels) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const labels = [];
    const v = new THREE.Vector3();

    const sourceList = this.activePlanet
      ? this.planetLabelTargets
      : this.activeCountry
      ? this.countryLabelTargets
      : this.activeExoSystem
      ? this.exoLabelTargets
      : Array.from(this.labelTargets.values()).filter((e) => e.obj.scaleIndex === this.currentScale);

    for (const { group, obj } of sourceList) {
      group.getWorldPosition(v);
      v.y += (obj.radius || 1) * 0.95;
      v.project(this.camera);
      if (v.z > 1 || v.z < -1) continue;
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      if (x < 20 || x > w - 20 || y < 50 || y > h - 80) continue;
      labels.push({ obj, x, y });
    }
    this.onUpdateLabels(labels);
  }
}

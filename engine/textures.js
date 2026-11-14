import * as THREE from "three";

// Simple deterministic 2D value noise for procedural planetary terrain & clouds
function hash2(x, y, seed = 1) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y, octaves = 5, seed = 1) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq, seed + i * 13);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

export function createEarthTextures() {
  const w = 1024;
  const h = 512;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cCtx = colorCanvas.getContext("2d");

  const cloudCanvas = document.createElement("canvas");
  cloudCanvas.width = w;
  cloudCanvas.height = h;
  const clCtx = cloudCanvas.getContext("2d");

  const cityCanvas = document.createElement("canvas");
  cityCanvas.width = w;
  cityCanvas.height = h;
  const cityCtx = cityCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext("2d");

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rCtx = roughCanvas.getContext("2d");

  const imgData = cCtx.createImageData(w, h);
  const clData = clCtx.createImageData(w, h);
  const cityData = cityCtx.createImageData(w, h);
  const bumpData = bCtx.createImageData(w, h);
  const roughData = rCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const lat = (y / h) * Math.PI - Math.PI / 2;
    const absLat = Math.abs(lat) / (Math.PI / 2);

    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const angle = (x / w) * Math.PI * 2;
      const nx = Math.cos(angle) * 2.2 + 5;
      const ny = Math.sin(angle) * 2.2 + 5;
      const nz = (y / h) * 4.4;

      const elevation = fbm(nx + nz * 0.35, ny + nz * 0.7, 6, 7);
      const moisture = fbm(nx * 1.4, ny * 1.4 + nz, 4, 21);

      let r, g, b, bumpVal = 128, roughVal = 210;
      if (absLat > 0.84 + (elevation - 0.5) * 0.12) {
        r = 235; g = 243; b = 255;
        bumpVal = 155;
        roughVal = 180;
      } else if (elevation < 0.51) {
        const depth = elevation / 0.51;
        r = Math.floor(6 + depth * 20);
        g = Math.floor(32 + depth * 68);
        b = Math.floor(92 + depth * 98);
        bumpVal = 110;
        roughVal = 55; // Glossy ocean specular reflection
      } else {
        const land = (elevation - 0.51) / 0.49;
        bumpVal = Math.min(255, Math.floor(135 + land * 120));
        roughVal = 225; // Matte continents
        if (land > 0.68) {
          r = 148; g = 142; b = 134;
        } else if (absLat < 0.35 && moisture < 0.45) {
          r = 192; g = 162; b = 110;
        } else {
          r = Math.floor(28 + land * 62);
          g = Math.floor(98 + moisture * 46 - land * 28);
          b = Math.floor(36 + land * 24);
        }
      }

      imgData.data[idx] = r; imgData.data[idx + 1] = g; imgData.data[idx + 2] = b; imgData.data[idx + 3] = 255;
      bumpData.data[idx] = bumpVal; bumpData.data[idx + 1] = bumpVal; bumpData.data[idx + 2] = bumpVal; bumpData.data[idx + 3] = 255;
      roughData.data[idx] = roughVal; roughData.data[idx + 1] = roughVal; roughData.data[idx + 2] = roughVal; roughData.data[idx + 3] = 255;

      // Multi-swirl clouds
      const cloud = fbm(nx * 2.1 + 10, ny * 2.1 + nz * 1.2, 5, 99);
      const alpha = cloud > 0.53 ? Math.min(235, (cloud - 0.53) * 600) : 0;
      clData.data[idx] = 248; clData.data[idx + 1] = 251; clData.data[idx + 2] = 255; clData.data[idx + 3] = alpha;

      // City lights on temperate coastlines
      const isLand = elevation >= 0.51 && absLat < 0.72;
      const cityNoise = hash2(x, y, 303);
      const isCity = isLand && elevation < 0.61 && cityNoise > 0.972;
      cityData.data[idx] = isCity ? 255 : 0;
      cityData.data[idx + 1] = isCity ? 195 : 0;
      cityData.data[idx + 2] = isCity ? 95 : 0;
      cityData.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(imgData, 0, 0);
  clCtx.putImageData(clData, 0, 0);
  cityCtx.putImageData(cityData, 0, 0);
  bCtx.putImageData(bumpData, 0, 0);
  rCtx.putImageData(roughData, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const cloudMap = new THREE.CanvasTexture(cloudCanvas);
  const cityMap = new THREE.CanvasTexture(cityCanvas);
  cityMap.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  return { map, cloudMap, cityMap, bumpMap, roughnessMap };
}

export function createRockyTexture(baseHex, craterHex, seed = 3, craters = 85) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const base = new THREE.Color(baseHex);
  const crater = new THREE.Color(craterHex);
  const imgData = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const n = fbm((x / w) * 6, (y / h) * 3, 5, seed);
      const c = base.clone().lerp(crater, n * 0.75);
      imgData.data[idx] = Math.floor(c.r * 255);
      imgData.data[idx + 1] = Math.floor(c.g * 255);
      imgData.data[idx + 2] = Math.floor(c.b * 255);
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Add impact craters
  for (let i = 0; i < craters; i++) {
    const cx = hash2(i, 1, seed) * w;
    const cy = hash2(i, 2, seed) * h;
    const r = 3 + hash2(i, 3, seed) * 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGasGiantTexture(palette, seed = 11, hasRedSpot = false) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const colors = palette.map((c) => new THREE.Color(c));
  const imgData = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const idx = (y * w + x) * 4;
      const turb = fbm(u * 8, v * 12, 4, seed) * 0.08;
      const bandPos = Math.abs(Math.sin((v + turb) * Math.PI * 6));
      const colorIdx = Math.min(colors.length - 1, Math.floor(bandPos * colors.length));
      const nextIdx = Math.min(colors.length - 1, colorIdx + 1);
      const frac = (bandPos * colors.length) - colorIdx;
      const col = colors[colorIdx].clone().lerp(colors[nextIdx], frac);

      imgData.data[idx] = Math.floor(col.r * 255);
      imgData.data[idx + 1] = Math.floor(col.g * 255);
      imgData.data[idx + 2] = Math.floor(col.b * 255);
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  if (hasRedSpot) {
    const grad = ctx.createRadialGradient(w * 0.62, h * 0.62, 2, w * 0.62, h * 0.62, 28);
    grad.addColorStop(0, "rgba(198, 72, 42, 0.95)");
    grad.addColorStop(0.6, "rgba(218, 115, 72, 0.65)");
    grad.addColorStop(1, "rgba(218, 115, 72, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(w * 0.62, h * 0.62, 28, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSaturnRingTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");

  for (let x = 0; x < size; x++) {
    const t = x / size;
    let alpha = 0;
    if (t > 0.15 && t < 0.96) {
      const wave = Math.sin(t * 95) * 0.25 + 0.75;
      const cassini = (t > 0.58 && t < 0.64) ? 0.08 : 1;
      alpha = wave * cassini * (1 - Math.abs(t - 0.55) * 0.7);
    }
    const r = Math.floor(215 + Math.sin(t * 40) * 20);
    const g = Math.floor(195 + Math.sin(t * 40) * 18);
    const b = Math.floor(160 + Math.sin(t * 40) * 15);
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
    ctx.fillRect(x, 0, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGlowSpriteTexture(innerColor = "#ffffff", outerColor = "rgba(56,189,248,0)") {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.28, innerColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

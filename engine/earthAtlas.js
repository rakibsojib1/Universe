import * as THREE from "three";

const ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function decodeTopologyArcs(topology) {
  const { scale, translate } = topology.transform || { scale: [1, 1], translate: [0, 0] };
  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
}

function stitchRing(arcIndices, decodedArcs) {
  const coords = [];
  for (const idx of arcIndices) {
    const arc = idx >= 0 ? decodedArcs[idx] : [...decodedArcs[~idx]].reverse();
    for (let i = 0; i < arc.length; i++) {
      if (coords.length > 0 && i === 0) continue;
      coords.push(arc[i]);
    }
  }
  return coords;
}

function splitAntimeridianRing(ring) {
  // Split segments that jump > 180 deg longitude so canvas lines don't streak across the globe
  const segments = [[]];
  for (let i = 0; i < ring.length; i++) {
    const pt = ring[i];
    const cur = segments[segments.length - 1];
    if (cur.length > 0 && Math.abs(pt[0] - cur[cur.length - 1][0]) > 180) {
      segments.push([pt]);
    } else {
      cur.push(pt);
    }
  }
  return segments;
}

function ringCentroidAndBbox(ring) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  let sumLon = 0, sumLat = 0;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    sumLon += lon;
    sumLat += lat;
  }
  const n = ring.length || 1;
  return {
    bbox: [minLon, maxLon, minLat, maxLat],
    centroid: [sumLon / n, sumLat / n]
  };
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (Math.abs(xi - xj) > 180) continue;
    const intersect = (yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function classifyOcean(lat, lon) {
  if (lat > 66.5) return "Arctic Ocean";
  if (lat < -60) return "Southern Ocean";
  if (lat >= 5 && lat <= 23 && lon >= 80 && lon <= 98) return "Bay of Bengal";
  if (lat >= 5 && lat <= 25 && lon >= 55 && lon <= 78) return "Arabian Sea";
  if (lat >= 30 && lat <= 46 && lon >= -6 && lon <= 36) return "Mediterranean Sea";
  if (lat >= 9 && lat <= 23 && lon >= -88 && lon <= -60) return "Caribbean Sea";
  if (lat >= 0 && lat <= 25 && lon >= 100 && lon <= 122) return "South China Sea";
  if (lon >= 20 && lon <= 146 && lat < 30) return "Indian Ocean";
  if (lon > -70 && lon < 20) return "Atlantic Ocean";
  return "Pacific Ocean";
}

function inferRegion(lat, lon) {
  if (lat < -60) return "Antarctica";
  if (lon >= -170 && lon <= -50 && lat >= 12) return "North & Central America";
  if (lon >= -85 && lon <= -32 && lat < 12) return "South America";
  if (lon >= -25 && lon <= 45 && lat >= 35) return "Europe";
  if (lon >= -20 && lon <= 52 && lat >= -36 && lat < 35) return "Africa";
  if (lon > 110 && lon <= 180 && lat < -10) return "Oceania";
  return "Asia & Middle East";
}

export function formatLatLon(lat, lon) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

export function vector3ToLatLon(localVec, radius) {
  const r = radius || localVec.length() || 1;
  const lat = 90 - Math.acos(THREE.MathUtils.clamp(localVec.y / r, -1, 1)) * (180 / Math.PI);
  let phi = Math.atan2(localVec.z, -localVec.x);
  if (phi < 0) phi += Math.PI * 2;
  const lon = phi * (180 / Math.PI) - 180;
  return { lat, lon };
}

export function latLonToVector3(lat, lon, radius) {
  const phi = (lon + 180) * (Math.PI / 180);
  const theta = (90 - lat) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(theta) * Math.cos(phi),
    radius * Math.cos(theta),
    radius * Math.sin(theta) * Math.sin(phi)
  );
}

export class EarthAtlas {
  constructor() {
    this.countries = [];
    this.loaded = false;
    this.highlightedName = null;

    this.borderCanvas = document.createElement("canvas");
    this.borderCanvas.width = 2048;
    this.borderCanvas.height = 1024;
    this.borderTex = new THREE.CanvasTexture(this.borderCanvas);
    this.borderTex.colorSpace = THREE.SRGBColorSpace;

    this.highlightCanvas = document.createElement("canvas");
    this.highlightCanvas.width = 2048;
    this.highlightCanvas.height = 1024;
    this.highlightTex = new THREE.CanvasTexture(this.highlightCanvas);
    this.highlightTex.colorSpace = THREE.SRGBColorSpace;
  }

  async load() {
    if (this.loaded) return this.countries;
    try {
      const res = await fetch(ATLAS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const topo = await res.json();
      const decodedArcs = decodeTopologyArcs(topo);
      const geoms = topo.objects?.countries?.geometries || [];

      this.countries = geoms
        .map((g) => {
          const name = g.properties?.name || `Territory ${g.id}`;
          const polygons = [];
          if (g.type === "Polygon") {
            polygons.push(g.arcs.map((ring) => stitchRing(ring, decodedArcs)));
          } else if (g.type === "MultiPolygon") {
            for (const poly of g.arcs) {
              polygons.push(poly.map((ring) => stitchRing(ring, decodedArcs)));
            }
          }
          // Pick largest outer ring for primary centroid
          let bestRing = polygons[0]?.[0] || [[0, 0]];
          let bestSpan = -1;
          const allBboxes = [];
          for (const poly of polygons) {
            if (!poly[0]) continue;
            const { bbox } = ringCentroidAndBbox(poly[0]);
            allBboxes.push(bbox);
            const span = (bbox[1] - bbox[0]) * (bbox[3] - bbox[2]);
            if (span > bestSpan) {
              bestSpan = span;
              bestRing = poly[0];
            }
          }
          const { centroid } = ringCentroidAndBbox(bestRing);
          return {
            id: `country-${g.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            name,
            polygons,
            bboxes: allBboxes,
            lon: centroid[0],
            lat: centroid[1],
            region: inferRegion(centroid[1], centroid[0])
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      this._drawBorders();
      this.loaded = true;
    } catch (err) {
      console.warn("EarthAtlas failed to load:", err);
    }
    return this.countries;
  }

  _lonLatToXY(lon, lat, w, h) {
    return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
  }

  _drawBorders() {
    const ctx = this.borderCanvas.getContext("2d");
    const w = this.borderCanvas.width;
    const h = this.borderCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(186, 230, 253, 0.58)";
    ctx.lineWidth = 1.1;
    ctx.lineJoin = "round";

    for (const c of this.countries) {
      for (const poly of c.polygons) {
        const outer = poly[0];
        if (!outer) continue;
        const segments = splitAntimeridianRing(outer);
        for (const seg of segments) {
          if (seg.length < 2) continue;
          ctx.beginPath();
          seg.forEach(([lon, lat], idx) => {
            const [x, y] = this._lonLatToXY(lon, lat, w, h);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
      }
    }
    this.borderTex.needsUpdate = true;
  }

  highlightCountry(countryName) {
    if (this.highlightedName === countryName) return;
    this.highlightedName = countryName;

    const ctx = this.highlightCanvas.getContext("2d");
    const w = this.highlightCanvas.width;
    const h = this.highlightCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!countryName) {
      this.highlightTex.needsUpdate = true;
      return;
    }

    const country = this.countries.find((c) => c.name === countryName);
    if (!country) {
      this.highlightTex.needsUpdate = true;
      return;
    }

    ctx.fillStyle = "rgba(56, 189, 248, 0.28)";
    ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";

    for (const poly of country.polygons) {
      const outer = poly[0];
      if (!outer) continue;
      const segments = splitAntimeridianRing(outer);
      for (const seg of segments) {
        if (seg.length < 2) continue;
        ctx.beginPath();
        seg.forEach(([lon, lat], idx) => {
          const [x, y] = this._lonLatToXY(lon, lat, w, h);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        if (segments.length === 1) ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    this.highlightTex.needsUpdate = true;
  }

  lookupLocation(lat, lon) {
    for (const c of this.countries) {
      for (let pIdx = 0; pIdx < c.polygons.length; pIdx++) {
        const bbox = c.bboxes[pIdx];
        if (!bbox) continue;
        if (lon < bbox[0] || lon > bbox[1] || lat < bbox[2] || lat > bbox[3]) continue;
        const poly = c.polygons[pIdx];
        if (pointInRing(lon, lat, poly[0])) {
          // Check holes
          let inHole = false;
          for (let h = 1; h < poly.length; h++) {
            if (pointInRing(lon, lat, poly[h])) {
              inHole = true;
              break;
            }
          }
          if (!inHole) {
            return { type: "country", country: c, name: c.name, lat, lon };
          }
        }
      }
    }
    return { type: "ocean", name: classifyOcean(lat, lon), lat, lon };
  }

  buildDossier(loc) {
    const coordStr = formatLatLon(loc.lat, loc.lon);
    const nsHemi = loc.lat >= 0 ? "Northern Hemisphere" : "Southern Hemisphere";
    const ewHemi = loc.lon >= 0 ? "Eastern Hemisphere" : "Western Hemisphere";

    if (loc.type === "country" && loc.country) {
      const c = loc.country;
      return {
        id: c.id,
        name: c.name,
        emoji: "📍",
        category: `Earth • ${c.region}`,
        scaleIndex: 0,
        radius: 2.6,
        lat: c.lat,
        lon: c.lon,
        tagline: `Sovereign Territory / Region in ${c.region} • ${coordStr}`,
        distanceLabel: "0 km (Earth Surface)",
        diameter: `Region: ${c.region}`,
        description: `${c.name} is located in ${c.region} (${nsHemi}, ${ewHemi}). You are viewing its real geographic position on Earth's 3D globe with satellite terrain, ocean bathymetry, and live country borders.`,
        stats: [
          { label: "Coordinates", value: coordStr },
          { label: "Region", value: c.region },
          { label: "Latitude Hemi", value: nsHemi },
          { label: "Longitude Hemi", value: ewHemi }
        ],
        facts: [
          `Part of Earth's 195+ nations and territories mapped in Natural Earth 3D geometry.`,
          `Click anywhere else on the globe or search any country name in the top Warp bar to fly there.`
        ]
      };
    }

    return {
      id: `ocean-${loc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: loc.name,
      emoji: "🌊",
      category: "Earth • Global Ocean",
      scaleIndex: 0,
      radius: 2.6,
      lat: loc.lat,
      lon: loc.lon,
      tagline: `Earth's Hydrosphere • ${coordStr}`,
      distanceLabel: "0 km (Earth Surface)",
      diameter: "71% of Earth's Surface",
      description: `You clicked on the ${loc.name} at ${coordStr}. Earth's interconnected oceans hold ~1.335 billion cubic kilometers of water and regulate global climate.`,
      stats: [
        { label: "Coordinates", value: coordStr },
        { label: "Hemisphere", value: `${nsHemi.split(" ")[0]} / ${ewHemi.split(" ")[0]}` }
      ],
      facts: [
        "Over 80% of Earth's oceans remain unmapped in high-resolution sonar detail.",
        "Click any landmass on the globe to inspect its country and borders."
      ]
    };
  }
}

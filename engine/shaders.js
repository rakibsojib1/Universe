import * as THREE from "three";

export function createAtmosphereMaterial(colorHex = 0x38bdf8, intensity = 0.85) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uIntensity: { value: intensity }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 3.2);
        gl_FragColor = vec4(uColor, fresnel * uIntensity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false
  });
}

export function createSunPlasmaMaterial(baseHex = 0xff9d2e, hotHex = 0xfff3b0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(baseHex) },
      uHotColor: { value: new THREE.Color(hotHex) }
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      void main() {
        vPos = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uHotColor;
      varying vec3 vPos;
      varying vec3 vNormal;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      void main() {
        vec3 p = normalize(vPos) * 4.5;
        float n = noise(p + vec3(uTime * 0.25, uTime * 0.15, 0.0)) * 0.6
                + noise(p * 2.3 - vec3(0.0, uTime * 0.35, uTime * 0.2)) * 0.3
                + noise(p * 5.0 + uTime * 0.4) * 0.1;
        vec3 col = mix(uBaseColor * 0.55, uHotColor, smoothstep(0.25, 0.85, n));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

export function createAccretionDiskMaterial(innerHex = 0xfff0c2, outerHex = 0xea580c) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInnerColor: { value: new THREE.Color(innerHex) },
      uOuterColor: { value: new THREE.Color(outerHex) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uInnerColor;
      uniform vec3 uOuterColor;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float angle = atan(p.y, p.x);

        float ringMask = smoothstep(0.32, 0.42, r) * (1.0 - smoothstep(0.55, 1.0, r));
        float swirl = sin(angle * 6.0 - uTime * 2.6 + r * 18.0) * 0.5 + 0.5;
        float fine = sin(angle * 14.0 - uTime * 4.2 + r * 35.0) * 0.5 + 0.5;
        float intensity = ringMask * (0.55 + 0.3 * swirl + 0.15 * fine);

        vec3 col = mix(uInnerColor, uOuterColor, smoothstep(0.35, 0.92, r));
        gl_FragColor = vec4(col * (1.15 + swirl * 0.35), intensity * 0.95);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

export function createCMBMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      void main() {
        vec3 p = vPos * 7.5;
        float n = noise(p) * 0.5 + noise(p * 2.1) * 0.3 + noise(p * 4.7) * 0.2;
        vec3 cold = vec3(0.06, 0.18, 0.45);
        vec3 mid = vec3(0.12, 0.52, 0.65);
        vec3 warm = vec3(0.95, 0.58, 0.18);
        vec3 col = n < 0.5 ? mix(cold, mid, n * 2.0) : mix(mid, warm, (n - 0.5) * 2.0);
        gl_FragColor = vec4(col, 0.24);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false
  });
}

export function createMilkyWaySkyboxMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      void main() {
        // Tilt the galactic plane by ~28 degrees
        vec3 p = vDir;
        float band = exp(-pow((p.y * 0.88 - p.x * 0.42) * 5.2, 2.0));
        float cloud = noise(p * 4.5) * 0.55 + noise(p * 11.0) * 0.3 + noise(p * 24.0) * 0.15;
        float dustRift = smoothstep(0.38, 0.62, noise(p * 7.5 + 3.1));

        vec3 spaceBg = vec3(0.004, 0.007, 0.018);
        vec3 milkyCol = mix(vec3(0.06, 0.10, 0.22), vec3(0.28, 0.22, 0.32), cloud);
        float glow = band * cloud * (1.0 - dustRift * 0.65);

        gl_FragColor = vec4(spaceBg + milkyCol * glow * 0.55, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false
  });
}

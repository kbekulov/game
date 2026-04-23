import * as pc from "playcanvas";

import { clamp, lerp, smoothstep } from "./math";

export interface TextureSet {
  readonly diffuseMap?: pc.Texture;
  readonly normalMap?: pc.Texture;
  readonly emissiveMap?: pc.Texture;
  readonly opacityMap?: pc.Texture;
  readonly diffuseMapTiling?: pc.Vec2;
  readonly normalMapTiling?: pc.Vec2;
  readonly emissiveMapTiling?: pc.Vec2;
  readonly opacityMapTiling?: pc.Vec2;
  readonly bumpiness?: number;
  readonly opacityMapChannel?: string;
}

interface TextureSample {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
  readonly height: number;
}

type Sampler = (u: number, v: number) => TextureSample;

interface EnvironmentTextureLibrary {
  readonly grass: TextureSet;
  readonly dirt: TextureSet;
  readonly rock: TextureSet;
  readonly stone: TextureSet;
  readonly trim: TextureSet;
  readonly wood: TextureSet;
  readonly leaf: TextureSet;
  readonly flowerA: TextureSet;
  readonly flowerB: TextureSet;
}

interface WeaponTextureLibrary {
  readonly slide: TextureSet;
  readonly frame: TextureSet;
  readonly steel: TextureSet;
  readonly magazine: TextureSet;
  readonly flash: TextureSet;
}

interface SkyTextureLibrary {
  readonly atmosphere: TextureSet;
  readonly nearClouds: TextureSet;
  readonly farClouds: TextureSet;
}

export const applyTextureSet = (material: pc.StandardMaterial, textureSet?: TextureSet): void => {
  if (!textureSet) {
    return;
  }

  if (textureSet.diffuseMap) {
    material.diffuseMap = textureSet.diffuseMap;
  }

  if (textureSet.normalMap) {
    material.normalMap = textureSet.normalMap;
    material.bumpiness = textureSet.bumpiness ?? 1;
  }

  if (textureSet.emissiveMap) {
    material.emissiveMap = textureSet.emissiveMap;
  }

  if (textureSet.opacityMap) {
    material.opacityMap = textureSet.opacityMap;
    material.opacityMapChannel = textureSet.opacityMapChannel ?? "a";
  }

  if (textureSet.diffuseMapTiling) {
    material.diffuseMapTiling = textureSet.diffuseMapTiling.clone();
  }

  if (textureSet.normalMapTiling) {
    material.normalMapTiling = textureSet.normalMapTiling.clone();
  }

  if (textureSet.emissiveMapTiling) {
    material.emissiveMapTiling = textureSet.emissiveMapTiling.clone();
  }

  if (textureSet.opacityMapTiling) {
    material.opacityMapTiling = textureSet.opacityMapTiling.clone();
  }
};

export const createEnvironmentTextureLibrary = (
  device: pc.GraphicsDevice
): EnvironmentTextureLibrary => ({
  grass: createDiffuseNormalSet(device, 256, 256, sampleGrassTexture, 1.25, 4),
  dirt: createDiffuseNormalSet(device, 256, 256, sampleDirtTexture, 1, 3),
  rock: createDiffuseNormalSet(device, 256, 256, sampleRockTexture, 1.35, 2.4),
  stone: createDiffuseNormalSet(device, 256, 256, sampleStoneTexture, 1.1, 2.2),
  trim: createDiffuseNormalSet(device, 256, 256, sampleTrimTexture, 0.65, 2),
  wood: createDiffuseNormalSet(device, 256, 256, sampleWoodTexture, 0.9, 2.8),
  leaf: createDiffuseNormalSet(device, 256, 256, sampleLeafTexture, 0.55, 3),
  flowerA: createDiffuseNormalSet(device, 128, 128, sampleFlowerATexture, 0.25, 1.4),
  flowerB: createDiffuseNormalSet(device, 128, 128, sampleFlowerBTexture, 0.25, 1.4)
});

export const createWeaponTextureLibrary = (
  device: pc.GraphicsDevice
): WeaponTextureLibrary => ({
  slide: createDiffuseNormalSet(device, 256, 256, sampleSlideTexture, 0.85, 2),
  frame: createDiffuseNormalSet(device, 256, 256, sampleFrameTexture, 0.75, 3),
  steel: createDiffuseNormalSet(device, 256, 256, sampleSteelTexture, 0.9, 2.5),
  magazine: createDiffuseNormalSet(device, 256, 256, sampleMagazineTexture, 0.8, 2.3),
  flash: {
    emissiveMap: createColorTexture(device, 128, 128, sampleFlashTexture, false),
    emissiveMapTiling: new pc.Vec2(1, 1)
  }
});

export const createSkyTextureLibrary = (
  device: pc.GraphicsDevice
): SkyTextureLibrary => ({
  atmosphere: {
    emissiveMap: createColorTexture(device, 1024, 512, sampleSkyTexture, false)
  },
  nearClouds: createCloudTextureSet(device, 1024, 512, 17, 1.6),
  farClouds: createCloudTextureSet(device, 1024, 512, 41, 1.1)
});

const createCloudTextureSet = (
  device: pc.GraphicsDevice,
  width: number,
  height: number,
  seed: number,
  tilingX: number
): TextureSet => {
  const cloudTexture = createColorTexture(
    device,
    width,
    height,
    (u, v) => sampleCloudTexture(u, v, seed),
    false
  );

  return {
    emissiveMap: cloudTexture,
    opacityMap: cloudTexture,
    emissiveMapTiling: new pc.Vec2(tilingX, 1),
    opacityMapTiling: new pc.Vec2(tilingX, 1),
    opacityMapChannel: "a"
  };
};

const createDiffuseNormalSet = (
  device: pc.GraphicsDevice,
  width: number,
  height: number,
  sampler: Sampler,
  bumpiness: number,
  tiling: number
): TextureSet => {
  const diffuseBytes = new Uint8ClampedArray(width * height * 4);
  const heights = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const pixel = index * 4;
      const sample = sampler(x / (width - 1), y / (height - 1));

      diffuseBytes[pixel] = clamp(Math.round(sample.r * 255), 0, 255);
      diffuseBytes[pixel + 1] = clamp(Math.round(sample.g * 255), 0, 255);
      diffuseBytes[pixel + 2] = clamp(Math.round(sample.b * 255), 0, 255);
      diffuseBytes[pixel + 3] = clamp(Math.round((sample.a ?? 1) * 255), 0, 255);
      heights[index] = clamp(sample.height, 0, 1);
    }
  }

  return {
    diffuseMap: textureFromBytes(device, width, height, diffuseBytes, true),
    normalMap: createNormalTexture(device, width, height, heights),
    diffuseMapTiling: new pc.Vec2(tiling, tiling),
    normalMapTiling: new pc.Vec2(tiling, tiling),
    bumpiness
  };
};

const createColorTexture = (
  device: pc.GraphicsDevice,
  width: number,
  height: number,
  sampler: Sampler,
  repeat: boolean
): pc.Texture => {
  const bytes = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width + x) * 4;
      const sample = sampler(x / (width - 1), y / (height - 1));

      bytes[pixel] = clamp(Math.round(sample.r * 255), 0, 255);
      bytes[pixel + 1] = clamp(Math.round(sample.g * 255), 0, 255);
      bytes[pixel + 2] = clamp(Math.round(sample.b * 255), 0, 255);
      bytes[pixel + 3] = clamp(Math.round((sample.a ?? 1) * 255), 0, 255);
    }
  }

  return textureFromBytes(device, width, height, bytes, repeat);
};

const textureFromBytes = (
  device: pc.GraphicsDevice,
  width: number,
  height: number,
  bytes: Uint8ClampedArray,
  repeat: boolean
): pc.Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D canvas context unavailable for texture generation.");
  }

  const imageData = context.createImageData(width, height);
  imageData.data.set(bytes);
  context.putImageData(imageData, 0, 0);

  const texture = new pc.Texture(device, {
    width,
    height,
    format: pc.PIXELFORMAT_R8_G8_B8_A8
  });
  texture.addressU = repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE;
  texture.addressV = repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE;
  texture.minFilter = repeat ? pc.FILTER_LINEAR_MIPMAP_LINEAR : pc.FILTER_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.setSource(canvas);

  return texture;
};

const createNormalTexture = (
  device: pc.GraphicsDevice,
  width: number,
  height: number,
  heights: Float32Array
): pc.Texture => {
  const bytes = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const left = sampleHeight(heights, width, height, x - 1, y);
      const right = sampleHeight(heights, width, height, x + 1, y);
      const back = sampleHeight(heights, width, height, x, y - 1);
      const front = sampleHeight(heights, width, height, x, y + 1);
      const normal = new pc.Vec3(left - right, back - front, 0.55).normalize();
      const pixel = (y * width + x) * 4;

      bytes[pixel] = Math.round((normal.x * 0.5 + 0.5) * 255);
      bytes[pixel + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      bytes[pixel + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      bytes[pixel + 3] = 255;
    }
  }

  return textureFromBytes(device, width, height, bytes, true);
};

const sampleHeight = (
  heights: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number => {
  const wrappedX = (x + width) % width;
  const wrappedY = (y + height) % height;
  return heights[wrappedY * width + wrappedX];
};

const sampleGrassTexture = (u: number, v: number): TextureSample => {
  const macro = fbm(u * 5.4, v * 5.4, 11, 5);
  const blades = Math.abs(Math.sin((u * 36 + v * 14 + macro * 3.2) * Math.PI));
  const fiber = fbm(u * 28, v * 28, 19, 3);
  const dryPatch = smoothstep(0.64, 0.88, fbm(u * 2.4, v * 2.4, 23, 4));
  const height = clamp(0.26 + macro * 0.4 + fiber * 0.22 + blades * 0.16, 0, 1);
  const warm = dryPatch * 0.12;

  return {
    r: lerp(0.14, 0.3, height) + warm,
    g: lerp(0.28, 0.56, height) - warm * 0.18,
    b: lerp(0.07, 0.18, macro),
    height
  };
};

const sampleDirtTexture = (u: number, v: number): TextureSample => {
  const clumps = fbm(u * 9, v * 9, 5, 5);
  const pebbles = smoothstep(0.72, 0.94, fbm(u * 30, v * 30, 8, 3));
  const grooves = Math.abs(Math.sin((u * 11 + fbm(u * 6, v * 6, 13, 3) * 0.8) * Math.PI));
  const dust = fbm(u * 3.2, v * 3.2, 17, 4);
  const height = clamp(0.2 + clumps * 0.46 + pebbles * 0.2 + grooves * 0.12, 0, 1);

  return {
    r: lerp(0.28, 0.54, dust) + clumps * 0.1,
    g: lerp(0.18, 0.36, dust) + pebbles * 0.04,
    b: lerp(0.1, 0.18, clumps),
    height
  };
};

const sampleRockTexture = (u: number, v: number): TextureSample => {
  const body = fbm(u * 6.5, v * 6.5, 29, 5);
  const grit = fbm(u * 24, v * 24, 31, 3);
  const fractures = smoothstep(
    0.82,
    0.97,
    1 - Math.abs(Math.sin((u * 18 + v * 11 + body * 3.2) * Math.PI))
  );
  const height = clamp(0.3 + body * 0.42 + grit * 0.18 + fractures * 0.22, 0, 1);
  const cool = fbm(u * 3, v * 3, 37, 3);

  return {
    r: lerp(0.24, 0.46, body) + cool * 0.03,
    g: lerp(0.24, 0.44, grit) + cool * 0.04,
    b: lerp(0.25, 0.5, cool),
    height
  };
};

const sampleStoneTexture = (u: number, v: number): TextureSample => {
  const slabs = fbm(u * 5, v * 5, 43, 4);
  const grain = fbm(u * 18, v * 18, 47, 3);
  const wear = smoothstep(0.55, 0.9, fbm(u * 2.6, v * 2.6, 53, 4));
  const chisel = Math.abs(Math.sin((v * 30 + slabs * 2.4) * Math.PI)) * 0.1;
  const height = clamp(0.24 + slabs * 0.38 + grain * 0.18 + chisel, 0, 1);

  return {
    r: lerp(0.38, 0.62, slabs) + wear * 0.04,
    g: lerp(0.37, 0.6, grain) + wear * 0.04,
    b: lerp(0.36, 0.56, wear),
    height
  };
};

const sampleTrimTexture = (u: number, v: number): TextureSample => {
  const brushed = fbm(u * 44, v * 5.5, 61, 4);
  const smudge = fbm(u * 3.6, v * 3.6, 67, 3);
  const fineLines = Math.abs(Math.sin((u * 180 + smudge * 12) * Math.PI)) * 0.06;
  const height = clamp(0.18 + brushed * 0.34 + fineLines, 0, 1);

  return {
    r: lerp(0.2, 0.36, smudge) + brushed * 0.06,
    g: lerp(0.21, 0.37, smudge) + brushed * 0.05,
    b: lerp(0.23, 0.42, brushed),
    height
  };
};

const sampleWoodTexture = (u: number, v: number): TextureSample => {
  const warp = fbm(u * 3.4, v * 10, 71, 4);
  const grain = Math.abs(Math.sin((v * 24 + warp * 6.5) * Math.PI));
  const knots = smoothstep(0.82, 0.96, fbm(u * 7.2, v * 7.2, 79, 4));
  const height = clamp(0.18 + grain * 0.42 + knots * 0.16 + warp * 0.12, 0, 1);

  return {
    r: lerp(0.22, 0.44, grain) + knots * 0.08,
    g: lerp(0.13, 0.28, warp) + grain * 0.04,
    b: lerp(0.07, 0.15, knots),
    height
  };
};

const sampleLeafTexture = (u: number, v: number): TextureSample => {
  const body = fbm(u * 7, v * 7, 83, 4);
  const veins = Math.abs(Math.sin((u * 22 + body * 4) * Math.PI)) * 0.18;
  const spots = smoothstep(0.72, 0.95, fbm(u * 26, v * 26, 89, 3)) * 0.12;
  const height = clamp(0.22 + body * 0.36 + veins + spots, 0, 1);

  return {
    r: lerp(0.12, 0.24, body),
    g: lerp(0.28, 0.54, height),
    b: lerp(0.08, 0.16, body),
    height
  };
};

const sampleFlowerATexture = (u: number, v: number): TextureSample => {
  const radial = 1 - Math.hypot(u - 0.5, v - 0.5) * 1.8;
  const shimmer = fbm(u * 10, v * 10, 97, 3);
  const height = clamp(radial * 0.3 + shimmer * 0.2 + 0.12, 0, 1);

  return {
    r: lerp(0.8, 0.98, radial),
    g: lerp(0.66, 0.9, radial),
    b: lerp(0.18, 0.34, shimmer),
    height
  };
};

const sampleFlowerBTexture = (u: number, v: number): TextureSample => {
  const radial = 1 - Math.hypot(u - 0.5, v - 0.5) * 1.9;
  const shimmer = fbm(u * 9, v * 9, 101, 3);
  const height = clamp(radial * 0.28 + shimmer * 0.18 + 0.1, 0, 1);

  return {
    r: lerp(0.54, 0.84, radial),
    g: lerp(0.16, 0.38, shimmer),
    b: lerp(0.22, 0.48, radial),
    height
  };
};

const sampleSlideTexture = (u: number, v: number): TextureSample => {
  const brush = fbm(u * 110, v * 8, 107, 4);
  const wear = fbm(u * 5, v * 5, 109, 3);
  const scratches = smoothstep(0.8, 0.98, fbm(u * 180, v * 24, 113, 2)) * 0.12;
  const serration = Math.abs(Math.sin((u * 14 + v * 1.6) * Math.PI)) * 0.08;
  const height = clamp(0.22 + brush * 0.34 + scratches + serration, 0, 1);

  return {
    r: lerp(0.12, 0.24, wear) + brush * 0.05,
    g: lerp(0.12, 0.25, wear) + brush * 0.05,
    b: lerp(0.13, 0.28, brush) + wear * 0.04,
    height
  };
};

const sampleFrameTexture = (u: number, v: number): TextureSample => {
  const stipple = smoothstep(0.5, 0.92, fbm(u * 46, v * 46, 127, 4));
  const grain = fbm(u * 8, v * 8, 131, 3);
  const moldLine = smoothstep(0.48, 0.52, Math.abs(v - 0.5)) * 0.02;
  const height = clamp(0.18 + stipple * 0.4 + grain * 0.16 + moldLine, 0, 1);

  return {
    r: lerp(0.17, 0.26, grain),
    g: lerp(0.18, 0.28, stipple),
    b: lerp(0.16, 0.24, grain),
    height
  };
};

const sampleSteelTexture = (u: number, v: number): TextureSample => {
  const polish = fbm(u * 90, v * 12, 137, 4);
  const smears = fbm(u * 4.4, v * 4.4, 139, 3);
  const scratches = smoothstep(0.84, 0.97, fbm(u * 140, v * 40, 149, 2)) * 0.1;
  const height = clamp(0.2 + polish * 0.32 + scratches, 0, 1);

  return {
    r: lerp(0.28, 0.42, smears) + polish * 0.06,
    g: lerp(0.29, 0.44, smears) + polish * 0.06,
    b: lerp(0.32, 0.48, polish) + smears * 0.04,
    height
  };
};

const sampleMagazineTexture = (u: number, v: number): TextureSample => {
  const stamped = Math.abs(Math.sin((v * 26 + fbm(u * 4, v * 4, 151, 3) * 3) * Math.PI)) * 0.09;
  const grain = fbm(u * 54, v * 14, 157, 4);
  const oil = fbm(u * 3.4, v * 3.4, 163, 3);
  const height = clamp(0.18 + grain * 0.3 + stamped, 0, 1);

  return {
    r: lerp(0.14, 0.22, oil) + grain * 0.03,
    g: lerp(0.14, 0.23, oil) + grain * 0.03,
    b: lerp(0.16, 0.26, grain),
    height
  };
};

const sampleFlashTexture = (u: number, v: number): TextureSample => {
  const dx = u - 0.5;
  const dy = v - 0.5;
  const radius = Math.hypot(dx, dy);
  const glow = smoothstep(0.5, 0, radius);

  return {
    r: lerp(0.72, 1, glow),
    g: lerp(0.46, 0.88, glow),
    b: lerp(0.18, 0.42, glow),
    a: glow,
    height: glow
  };
};

const sampleSkyTexture = (u: number, v: number): TextureSample => {
  const zenith = smoothstep(0, 1, v);
  const haze = fbm(u * 5, v * 10, 173, 3) * 0.08;
  const sunBloom = Math.exp(-Math.pow((u - 0.72) * 4.5, 2) - Math.pow((v - 0.2) * 8, 2)) * 0.18;

  return {
    r: lerp(0.78, 0.28, zenith) + haze + sunBloom,
    g: lerp(0.88, 0.52, zenith) + haze * 0.8 + sunBloom,
    b: lerp(0.98, 0.86, zenith) + haze * 0.5,
    height: 0
  };
};

const sampleCloudTexture = (u: number, v: number, seed: number): TextureSample => {
  const arc = smoothstep(0.98, 0.08, v);
  const coverage =
    fbm(u * 3.6 + seed * 0.03, v * 6.2 + seed * 0.05, seed, 5) * 0.78 +
    fbm(u * 8.8 + seed * 0.07, v * 12 + seed * 0.04, seed + 7, 3) * 0.22;
  const wisps = smoothstep(0.54, 0.88, coverage) * arc;
  const alpha = clamp((wisps - 0.3) * 1.45, 0, 0.9);
  const colorLift = 0.88 + coverage * 0.16;

  return {
    r: colorLift,
    g: colorLift * 0.98,
    b: colorLift * 0.96,
    a: alpha,
    height: coverage
  };
};

const fbm = (
  x: number,
  y: number,
  seed: number,
  octaves: number
): number => {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let totalAmplitude = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += noise2d(x * frequency, y * frequency, seed + octave * 17) * amplitude;
    totalAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2.02;
  }

  return totalAmplitude === 0 ? 0 : value / totalAmplitude;
};

const noise2d = (x: number, y: number, seed: number): number => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2d(x0, y0, seed);
  const b = hash2d(x0 + 1, y0, seed);
  const c = hash2d(x0, y0 + 1, seed);
  const d = hash2d(x0 + 1, y0 + 1, seed);

  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
};

const hash2d = (x: number, y: number, seed: number): number => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
};

import * as pc from "playcanvas";

const configureTexture = (texture: pc.Texture, repeat = true): void => {
  texture.addressU = repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE;
  texture.addressV = repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE;
  texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.anisotropy = 8;
};

const createCanvasTexture = (
  app: pc.AppBase,
  size: number,
  draw: (context: CanvasRenderingContext2D, size: number) => void
): pc.Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to create canvas context for procedural texture.");
  }

  draw(context, size);

  const texture = new pc.Texture(app.graphicsDevice, {
    width: size,
    height: size,
    mipmaps: true
  });
  texture.setSource(canvas);
  configureTexture(texture);
  return texture;
};

const createNoiseLayer = (
  context: CanvasRenderingContext2D,
  size: number,
  count: number,
  colorFactory: () => string,
  radius: [number, number]
): void => {
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = colorFactory();
    context.beginPath();
    context.arc(
      Math.random() * size,
      Math.random() * size,
      radius[0] + Math.random() * (radius[1] - radius[0]),
      0,
      Math.PI * 2
    );
    context.fill();
  }
};

const createMaterial = (
  setup: (material: pc.StandardMaterial) => void
): pc.StandardMaterial => {
  const material = new pc.StandardMaterial();
  setup(material);
  material.update();
  return material;
};

export interface TownMaterials {
  cobble: pc.StandardMaterial;
  trimStone: pc.StandardMaterial;
  plasterWarm: pc.StandardMaterial;
  plasterLight: pc.StandardMaterial;
  plasterRose: pc.StandardMaterial;
  roofTile: pc.StandardMaterial;
  shutterWood: pc.StandardMaterial;
  darkWood: pc.StandardMaterial;
  iron: pc.StandardMaterial;
  brass: pc.StandardMaterial;
  matteBlack: pc.StandardMaterial;
  glove: pc.StandardMaterial;
  fountainStone: pc.StandardMaterial;
  fountainWater: pc.StandardMaterial;
  awning: pc.StandardMaterial;
  windowGlow: pc.StandardMaterial;
  lampGlow: pc.StandardMaterial;
  targetFace: pc.StandardMaterial;
  targetHit: pc.StandardMaterial;
  targetStand: pc.StandardMaterial;
  sky: pc.StandardMaterial;
}

export const createTownMaterials = (app: pc.AppBase): TownMaterials => {
  const cobbleTexture = createCanvasTexture(app, 256, (context, size) => {
    context.fillStyle = "#71624f";
    context.fillRect(0, 0, size, size);
    const rows = 7;
    const columns = 7;
    const cell = size / rows;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const offset = row % 2 === 0 ? 0 : cell * 0.5;
        const x = column * cell + offset - (row % 2 === 0 ? 0 : cell * 0.5);
        const y = row * cell;
        context.fillStyle =
          row % 2 === 0 ? "rgba(138, 123, 100, 0.95)" : "rgba(126, 110, 92, 0.95)";
        context.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      }
    }

    createNoiseLayer(
      context,
      size,
      180,
      () => `rgba(255,255,255,${0.03 + Math.random() * 0.05})`,
      [0.4, 1.6]
    );
  });

  const trimTexture = createCanvasTexture(app, 256, (context, size) => {
    context.fillStyle = "#8f877d";
    context.fillRect(0, 0, size, size);
    const blockSize = size / 8;
    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        context.fillStyle =
          (row + column) % 2 === 0 ? "rgba(225,225,225,0.08)" : "rgba(40,40,40,0.06)";
        context.fillRect(column * blockSize, row * blockSize, blockSize - 2, blockSize - 2);
      }
    }
  });

  const plasterTexture = createCanvasTexture(app, 256, (context, size) => {
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#d9c6af");
    gradient.addColorStop(1, "#c7b197");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    createNoiseLayer(
      context,
      size,
      420,
      () => `rgba(255,255,255,${0.012 + Math.random() * 0.035})`,
      [0.5, 1.8]
    );
    createNoiseLayer(
      context,
      size,
      320,
      () => `rgba(80,56,36,${0.008 + Math.random() * 0.02})`,
      [0.5, 2]
    );
  });

  const roofTexture = createCanvasTexture(app, 256, (context, size) => {
    context.fillStyle = "#7b3f28";
    context.fillRect(0, 0, size, size);
    const rowHeight = size / 18;
    for (let row = 0; row < 18; row += 1) {
      const y = row * rowHeight;
      context.fillStyle = row % 2 === 0 ? "#9b5335" : "#84452d";
      for (let column = 0; column < 10; column += 1) {
        const tileWidth = size / 10;
        const x = column * tileWidth + (row % 2) * tileWidth * 0.5 - tileWidth * 0.5;
        context.fillRect(x + 1, y + 2, tileWidth - 2, rowHeight - 3);
      }
    }
  });

  const woodTexture = createCanvasTexture(app, 256, (context, size) => {
    context.fillStyle = "#5e4431";
    context.fillRect(0, 0, size, size);
    for (let stripe = 0; stripe < 18; stripe += 1) {
      context.fillStyle = stripe % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
      context.fillRect(stripe * 16, 0, 10, size);
    }
    createNoiseLayer(
      context,
      size,
      120,
      () => `rgba(255,255,255,${0.03 + Math.random() * 0.04})`,
      [0.3, 0.9]
    );
  });

  const ironTexture = createCanvasTexture(app, 128, (context, size) => {
    context.fillStyle = "#202327";
    context.fillRect(0, 0, size, size);
    createNoiseLayer(
      context,
      size,
      140,
      () => `rgba(255,255,255,${0.02 + Math.random() * 0.03})`,
      [0.2, 0.8]
    );
  });

  const skyTexture = createCanvasTexture(app, 512, (context, size) => {
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#e0edf8");
    gradient.addColorStop(0.44, "#f0d4ad");
    gradient.addColorStop(0.72, "#d68b59");
    gradient.addColorStop(1, "#a55b36");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    createNoiseLayer(
      context,
      size,
      40,
      () => `rgba(255,255,255,${0.02 + Math.random() * 0.04})`,
      [10, 34]
    );
  });

  const cobble = createMaterial((material) => {
    material.diffuse = new pc.Color(1, 1, 1);
    material.diffuseMap = cobbleTexture;
    material.diffuseMapTiling = new pc.Vec2(18, 18);
    material.gloss = 0.28;
    material.metalness = 0;
  });

  const trimStone = createMaterial((material) => {
    material.diffuse = new pc.Color(1, 1, 1);
    material.diffuseMap = trimTexture;
    material.diffuseMapTiling = new pc.Vec2(4, 4);
    material.gloss = 0.24;
    material.metalness = 0;
  });

  const createPlasterVariant = (color: pc.Color) =>
    createMaterial((material) => {
      material.diffuse = color;
      material.diffuseMap = plasterTexture;
      material.diffuseMapTiling = new pc.Vec2(3.5, 3.5);
      material.gloss = 0.15;
      material.metalness = 0;
    });

  const plasterWarm = createPlasterVariant(new pc.Color(1.03, 0.94, 0.84));
  const plasterLight = createPlasterVariant(new pc.Color(1.04, 1.01, 0.96));
  const plasterRose = createPlasterVariant(new pc.Color(1.0, 0.86, 0.8));

  const roofTile = createMaterial((material) => {
    material.diffuse = new pc.Color(1, 1, 1);
    material.diffuseMap = roofTexture;
    material.diffuseMapTiling = new pc.Vec2(2.4, 2.4);
    material.gloss = 0.16;
  });

  const shutterWood = createMaterial((material) => {
    material.diffuse = new pc.Color(0.52, 0.34, 0.22);
    material.diffuseMap = woodTexture;
    material.diffuseMapTiling = new pc.Vec2(1, 1);
    material.gloss = 0.12;
  });

  const darkWood = createMaterial((material) => {
    material.diffuse = new pc.Color(0.32, 0.22, 0.16);
    material.diffuseMap = woodTexture;
    material.diffuseMapTiling = new pc.Vec2(1.1, 1.1);
    material.gloss = 0.11;
  });

  const iron = createMaterial((material) => {
    material.diffuse = new pc.Color(0.14, 0.14, 0.15);
    material.diffuseMap = ironTexture;
    material.diffuseMapTiling = new pc.Vec2(1, 1);
    material.gloss = 0.38;
    material.metalness = 0.62;
  });

  const brass = createMaterial((material) => {
    material.diffuse = new pc.Color(0.81, 0.68, 0.28);
    material.gloss = 0.62;
    material.metalness = 0.78;
  });

  const matteBlack = createMaterial((material) => {
    material.diffuse = new pc.Color(0.08, 0.08, 0.09);
    material.gloss = 0.34;
    material.metalness = 0.08;
  });

  const glove = createMaterial((material) => {
    material.diffuse = new pc.Color(0.17, 0.18, 0.18);
    material.gloss = 0.1;
    material.metalness = 0;
  });

  const fountainStone = createMaterial((material) => {
    material.diffuse = new pc.Color(0.72, 0.71, 0.68);
    material.diffuseMap = trimTexture;
    material.diffuseMapTiling = new pc.Vec2(2.5, 2.5);
    material.gloss = 0.22;
  });

  const fountainWater = createMaterial((material) => {
    material.diffuse = new pc.Color(0.18, 0.32, 0.38);
    material.emissive = new pc.Color(0.04, 0.1, 0.14);
    material.emissiveIntensity = 0.5;
    material.gloss = 0.76;
  });

  const awning = createMaterial((material) => {
    material.diffuse = new pc.Color(0.72, 0.18, 0.11);
    material.gloss = 0.14;
  });

  const windowGlow = createMaterial((material) => {
    material.useLighting = false;
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(0.95, 0.66, 0.28);
    material.emissiveIntensity = 1.45;
  });

  const lampGlow = createMaterial((material) => {
    material.useLighting = false;
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 0.74, 0.34);
    material.emissiveIntensity = 1.85;
  });

  const targetFace = createMaterial((material) => {
    material.diffuse = new pc.Color(0.88, 0.9, 0.88);
    material.gloss = 0.24;
    material.metalness = 0.58;
  });

  const targetHit = createMaterial((material) => {
    material.diffuse = new pc.Color(0.9, 0.28, 0.18);
    material.gloss = 0.28;
    material.metalness = 0.54;
  });

  const targetStand = createMaterial((material) => {
    material.diffuse = new pc.Color(0.18, 0.18, 0.18);
    material.gloss = 0.22;
    material.metalness = 0.48;
  });

  const sky = createMaterial((material) => {
    material.useLighting = false;
    material.useFog = false;
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 1, 1);
    material.emissiveMap = skyTexture;
    material.emissiveIntensity = 1.55;
    material.cull = pc.CULLFACE_FRONT;
    material.depthWrite = false;
  });

  return {
    cobble,
    trimStone,
    plasterWarm,
    plasterLight,
    plasterRose,
    roofTile,
    shutterWood,
    darkWood,
    iron,
    brass,
    matteBlack,
    glove,
    fountainStone,
    fountainWater,
    awning,
    windowGlow,
    lampGlow,
    targetFace,
    targetHit,
    targetStand,
    sky
  };
};

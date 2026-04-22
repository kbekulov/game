import * as pc from "playcanvas";

const canvas = document.getElementById("application");
const introCard = document.getElementById("intro-card");
const engageButton = document.getElementById("engage-button");
const reticle = document.getElementById("reticle");
const screenFlash = document.getElementById("screen-flash");

const scoreValue = document.getElementById("score-value");
const comboValue = document.getElementById("combo-value");
const accuracyValue = document.getElementById("accuracy-value");
const targetsValue = document.getElementById("targets-value");
const statusPill = document.getElementById("status-pill");
const statusText = document.getElementById("status-text");

const app = new pc.Application(canvas, {
  graphicsDeviceOptions: {
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
app.start();

const world = new pc.Entity("world");
app.root.addChild(world);

app.scene.ambientLight = new pc.Color(0.18, 0.22, 0.3);
app.scene.fog = pc.FOG_LINEAR;
app.scene.fogColor = new pc.Color(0.03, 0.05, 0.08);
app.scene.fogStart = 26;
app.scene.fogEnd = 74;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (degrees) => degrees * (Math.PI / 180);
const toColor = ([r, g, b]) => new pc.Color(r, g, b);

function createMaterial({
  diffuse,
  emissive = [0, 0, 0],
  emissiveIntensity = 1,
  metalness = 0.12,
  gloss = 0.7,
  opacity = 1
}) {
  const material = new pc.StandardMaterial();
  material.diffuse = toColor(diffuse);
  material.emissive = toColor(emissive);
  material.emissiveIntensity = emissiveIntensity;
  material.useMetalness = true;
  material.metalness = metalness;
  material.gloss = gloss;
  material.opacity = opacity;

  if (opacity < 1) {
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = false;
  }

  material.update();
  return material;
}

const materials = {
  floor: createMaterial({
    diffuse: [0.08, 0.11, 0.15],
    emissive: [0.015, 0.03, 0.05],
    metalness: 0.28,
    gloss: 0.52
  }),
  wall: createMaterial({
    diffuse: [0.12, 0.16, 0.22],
    emissive: [0.02, 0.03, 0.04],
    metalness: 0.24,
    gloss: 0.65
  }),
  trim: createMaterial({
    diffuse: [0.22, 0.26, 0.34],
    emissive: [0.12, 0.28, 0.34],
    emissiveIntensity: 1.6,
    metalness: 0.55,
    gloss: 0.82
  }),
  accentBlue: createMaterial({
    diffuse: [0.28, 0.44, 0.56],
    emissive: [0.45, 0.88, 1],
    emissiveIntensity: 1.9,
    metalness: 0.42,
    gloss: 0.85
  }),
  accentMint: createMaterial({
    diffuse: [0.28, 0.48, 0.38],
    emissive: [0.52, 1, 0.82],
    emissiveIntensity: 1.8,
    metalness: 0.38,
    gloss: 0.85
  }),
  accentOrange: createMaterial({
    diffuse: [0.56, 0.34, 0.24],
    emissive: [1, 0.56, 0.36],
    emissiveIntensity: 2.1,
    metalness: 0.4,
    gloss: 0.86
  }),
  droneShell: createMaterial({
    diffuse: [0.18, 0.2, 0.28],
    emissive: [0.06, 0.09, 0.16],
    metalness: 0.38,
    gloss: 0.76
  }),
  beam: createMaterial({
    diffuse: [0.76, 0.95, 1],
    emissive: [0.7, 0.95, 1],
    emissiveIntensity: 2.8,
    metalness: 0.08,
    gloss: 0.92
  }),
  flash: createMaterial({
    diffuse: [1, 0.84, 0.58],
    emissive: [1, 0.82, 0.48],
    emissiveIntensity: 3.2,
    metalness: 0.04,
    gloss: 0.92
  }),
  glass: createMaterial({
    diffuse: [0.26, 0.38, 0.52],
    emissive: [0.12, 0.24, 0.32],
    emissiveIntensity: 1.4,
    metalness: 0.18,
    gloss: 0.74,
    opacity: 0.72
  })
};

function addRenderEntity(parent, name, type, material, position, scale, rotation) {
  const entity = new pc.Entity(name);
  entity.addComponent("render", {
    type,
    castShadows: true,
    receiveShadows: true
  });
  entity.render.material = material;
  entity.setLocalPosition(...position);
  entity.setLocalScale(...scale);

  if (rotation) {
    entity.setLocalEulerAngles(...rotation);
  }

  parent.addChild(entity);
  return entity;
}

function addLight(parent, name, options, position, rotation) {
  const entity = new pc.Entity(name);
  entity.addComponent("light", options);

  if (position) {
    entity.setLocalPosition(...position);
  }

  if (rotation) {
    entity.setLocalEulerAngles(...rotation);
  }

  parent.addChild(entity);
  return entity;
}

function addDecorativeColumn(parent, x, z, height, material, glowMaterial) {
  const base = new pc.Entity("column");
  base.setLocalPosition(x, height * 0.5, z);
  parent.addChild(base);

  addRenderEntity(base, "shaft", "box", material, [0, 0, 0], [0.7, height, 0.7]);
  addRenderEntity(base, "glow-strip-a", "box", glowMaterial, [0, 0, 0.37], [0.08, height * 0.9, 0.04]);
  addRenderEntity(base, "glow-strip-b", "box", glowMaterial, [0.37, 0, 0], [0.04, height * 0.9, 0.08]);
  addRenderEntity(base, "cap", "box", glowMaterial, [0, height * 0.52, 0], [1.1, 0.12, 1.1]);

  return base;
}

const arenaBounds = {
  minX: -15.2,
  maxX: 15.2,
  minZ: -15.2,
  maxZ: 15.2
};

const collisionBoxes = [];
const animatedDecor = [];
const effects = [];
const drones = [];

const arena = new pc.Entity("arena");
world.addChild(arena);

addRenderEntity(arena, "ground", "box", materials.floor, [0, -0.35, 0], [34, 0.7, 34]);
addRenderEntity(arena, "deck", "box", materials.wall, [0, -0.02, 0], [30.5, 0.08, 30.5]);

for (let i = -13; i <= 13; i += 4) {
  addRenderEntity(arena, `lane-x-${i}`, "box", materials.trim, [i, 0.02, 0], [0.06, 0.02, 28]);
  addRenderEntity(arena, `lane-z-${i}`, "box", materials.trim, [0, 0.02, i], [28, 0.02, 0.06]);
}

const wallSegments = [
  { pos: [0, 2.2, -16], scale: [32, 4.4, 1.2] },
  { pos: [0, 2.2, 16], scale: [32, 4.4, 1.2] },
  { pos: [-16, 2.2, 0], scale: [1.2, 4.4, 32] },
  { pos: [16, 2.2, 0], scale: [1.2, 4.4, 32] }
];

for (const segment of wallSegments) {
  addRenderEntity(arena, "wall", "box", materials.wall, segment.pos, segment.scale);
}

const obstacleDefinitions = [
  { x: -8.5, z: 6, width: 2.2, depth: 1.8, height: 2.4, material: materials.wall },
  { x: -5.2, z: -2.8, width: 1.4, depth: 4.4, height: 1.6, material: materials.wall },
  { x: 0, z: -5.8, width: 5.6, depth: 1.4, height: 1.25, material: materials.wall },
  { x: 5, z: 2.2, width: 2.6, depth: 2.4, height: 2.1, material: materials.wall },
  { x: 8.2, z: -7.4, width: 1.8, depth: 1.8, height: 3.4, material: materials.wall },
  { x: -1.8, z: 8.4, width: 3.6, depth: 1.2, height: 1.3, material: materials.wall }
];

for (const obstacle of obstacleDefinitions) {
  addRenderEntity(
    arena,
    "obstacle",
    "box",
    obstacle.material,
    [obstacle.x, obstacle.height * 0.5, obstacle.z],
    [obstacle.width, obstacle.height, obstacle.depth]
  );

  addRenderEntity(
    arena,
    "obstacle-trim",
    "box",
    materials.trim,
    [obstacle.x, obstacle.height + 0.08, obstacle.z],
    [obstacle.width + 0.2, 0.1, obstacle.depth + 0.2]
  );

  collisionBoxes.push({
    minX: obstacle.x - obstacle.width * 0.5,
    maxX: obstacle.x + obstacle.width * 0.5,
    minZ: obstacle.z - obstacle.depth * 0.5,
    maxZ: obstacle.z + obstacle.depth * 0.5
  });
}

const pylonPositions = [
  [-13.2, -13.2, materials.accentOrange],
  [-13.2, 13.2, materials.accentMint],
  [13.2, -13.2, materials.accentBlue],
  [13.2, 13.2, materials.accentOrange]
];

for (const [x, z, glowMaterial] of pylonPositions) {
  const pylon = addDecorativeColumn(arena, x, z, 5.5, materials.wall, glowMaterial);

  addLight(
    pylon,
    "beacon",
    {
      type: "point",
      intensity: 1.25,
      range: 18,
      color: glowMaterial.emissive
    },
    [0, 2.8, 0]
  );
}

for (let i = 0; i < 9; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const shard = addRenderEntity(
    arena,
    `shard-${i}`,
    "box",
    i % 3 === 0 ? materials.accentBlue : materials.glass,
    [side * (11 + (i % 3) * 1.4), 5.5 + (i % 4) * 0.7, -11 + i * 2.6],
    [0.18, 1.4 + (i % 2) * 1.3, 0.18],
    [i * 12, i * 30, i * 9]
  );

  animatedDecor.push({
    entity: shard,
    spin: new pc.Vec3(14 + i * 2, 32 + i * 3, 6 + i),
    drift: 0.18 + i * 0.03,
    originY: shard.getLocalPosition().y,
    phase: i * 0.8
  });
}

addRenderEntity(arena, "sun-core", "sphere", materials.accentOrange, [0, 12, -19], [2.8, 2.8, 2.8]);
addRenderEntity(arena, "sun-halo", "sphere", materials.glass, [0, 12, -19], [5.8, 5.8, 5.8]);

addLight(
  world,
  "key-light",
  {
    type: "directional",
    intensity: 1.65,
    castShadows: true,
    color: new pc.Color(1, 0.89, 0.77),
    shadowDistance: 42,
    shadowResolution: 2048
  },
  [0, 0, 0],
  [48, -36, 0]
);

addLight(
  world,
  "fill-light",
  {
    type: "directional",
    intensity: 0.6,
    color: new pc.Color(0.45, 0.68, 1)
  },
  [0, 0, 0],
  [20, 120, 0]
);

const player = new pc.Entity("player");
player.setLocalPosition(0, 0, 10.5);
world.addChild(player);

const camera = new pc.Entity("camera");
camera.addComponent("camera", {
  clearColor: new pc.Color(0.022, 0.038, 0.065),
  fov: 72,
  nearClip: 0.05,
  farClip: 120
});
camera.setLocalPosition(0, 1.62, 0);
player.addChild(camera);

const weaponRig = new pc.Entity("weapon-rig");
weaponRig.setLocalPosition(0.36, -0.28, -0.78);
camera.addChild(weaponRig);

const weaponBody = addRenderEntity(weaponRig, "weapon-body", "box", materials.wall, [0, 0, 0], [0.26, 0.16, 0.78]);
addRenderEntity(weaponRig, "weapon-top", "box", materials.trim, [0, 0.12, -0.02], [0.16, 0.05, 0.34]);
addRenderEntity(weaponRig, "weapon-core", "box", materials.accentBlue, [0.08, 0.04, -0.04], [0.06, 0.06, 0.34]);
const muzzle = addRenderEntity(weaponRig, "muzzle", "box", materials.beam, [0, 0.02, -0.5], [0.09, 0.09, 0.12]);
const weaponGlow = addRenderEntity(weaponRig, "weapon-glow", "box", materials.glass, [0, -0.1, 0.12], [0.22, 0.05, 0.24]);

animatedDecor.push({
  entity: weaponGlow,
  spin: new pc.Vec3(0, 0, 0),
  drift: 0.08,
  originY: weaponGlow.getLocalPosition().y,
  phase: 0.3
});

const spawnPoints = [
  new pc.Vec3(-10.5, 2.8, -9),
  new pc.Vec3(-10, 2.1, 0),
  new pc.Vec3(-8.8, 2.6, 8),
  new pc.Vec3(-3, 2.3, -10.5),
  new pc.Vec3(-2.5, 3, 9.2),
  new pc.Vec3(1.5, 2.2, -0.8),
  new pc.Vec3(4.2, 2.6, -9.5),
  new pc.Vec3(5.8, 2.3, 9.2),
  new pc.Vec3(9.6, 2.5, -3.5),
  new pc.Vec3(10.8, 2.9, 5.5)
];

function pickSpawnPoint(excludedIndex) {
  const index = Math.floor(Math.random() * spawnPoints.length);

  if (index === excludedIndex && spawnPoints.length > 1) {
    return pickSpawnPoint(excludedIndex);
  }

  return { index, point: spawnPoints[index] };
}

function createDrone(id, primaryMaterial, pulseMaterial) {
  const root = new pc.Entity(`drone-${id}`);
  const initialSpawn = pickSpawnPoint(-1);

  root.setLocalPosition(initialSpawn.point.clone());
  arena.addChild(root);

  const shell = addRenderEntity(root, "shell", "sphere", materials.droneShell, [0, 0, 0], [0.9, 0.46, 0.9]);
  const core = addRenderEntity(root, "core", "sphere", primaryMaterial, [0, 0, 0], [0.42, 0.42, 0.42]);
  const ring = addRenderEntity(root, "ring", "box", pulseMaterial, [0, 0, 0], [1.18, 0.06, 1.18], [0, 0, 45]);
  const finA = addRenderEntity(root, "fin-a", "box", materials.droneShell, [0.62, 0, 0], [0.28, 0.05, 0.8]);
  const finB = addRenderEntity(root, "fin-b", "box", materials.droneShell, [-0.62, 0, 0], [0.28, 0.05, 0.8]);
  const glow = addRenderEntity(root, "glow", "sphere", materials.glass, [0, 0, 0], [1.25, 0.62, 1.25]);

  addLight(
    root,
    "drone-light",
    {
      type: "point",
      intensity: 0.7,
      range: 7.5,
      color: primaryMaterial.emissive
    },
    [0, 0, 0]
  );

  return {
    id,
    root,
    shell,
    core,
    ring,
    finA,
    finB,
    glow,
    spawnIndex: initialSpawn.index,
    radius: 0.72,
    age: id * 0.6,
    amplitude: 0.65 + id * 0.08,
    speed: 0.78 + id * 0.12,
    yawRate: 60 + id * 8,
    cooldown: 0,
    hitFlash: 0,
    visible: true,
    origin: initialSpawn.point.clone()
  };
}

drones.push(createDrone(0, materials.accentBlue, materials.accentMint));
drones.push(createDrone(1, materials.accentOrange, materials.accentBlue));
drones.push(createDrone(2, materials.accentMint, materials.accentOrange));
drones.push(createDrone(3, materials.accentBlue, materials.accentOrange));
drones.push(createDrone(4, materials.accentOrange, materials.accentMint));
drones.push(createDrone(5, materials.accentMint, materials.accentBlue));

const state = {
  yaw: 180,
  pitch: -8,
  speed: 5.2,
  sprintSpeed: 8.6,
  radius: 0.42,
  eyeHeight: 1.62,
  bob: 0,
  recoil: 0,
  score: 0,
  shots: 0,
  hits: 0,
  combo: 1,
  comboClock: 0,
  statusClock: 0,
  lastHitClock: 0,
  shootCooldown: 0
};

const input = {
  keys: new Set(),
  locked: false
};

let audioContext = null;

function ensureAudio() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(type, frequency, duration, gain, rampFrequency) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  if (rampFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(rampFrequency, now + duration);
  }

  gainNode.gain.setValueAtTime(gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

function setStatus(pill, message, duration = 1.2) {
  statusPill.textContent = pill;
  statusText.textContent = message;
  state.statusClock = duration;
}

function setEngagedUI(engaged) {
  input.locked = engaged;
  introCard.classList.toggle("hidden", engaged);

  if (engaged) {
    setStatus("Arena live", "Track the glow cores and keep the combo rolling.");
  } else {
    setStatus("Stand by", "Click the button or the canvas to re-enter pointer lock.");
  }
}

function requestPointerLock() {
  ensureAudio();
  canvas.requestPointerLock();
}

engageButton.addEventListener("click", requestPointerLock);
canvas.addEventListener("click", () => {
  if (!input.locked) {
    requestPointerLock();
  } else {
    fire();
  }
});

document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== canvas) {
    input.keys.clear();
  }

  setEngagedUI(document.pointerLockElement === canvas);
});

window.addEventListener("blur", () => {
  input.keys.clear();
});

document.addEventListener("keydown", (event) => {
  input.keys.add(event.code);
});

document.addEventListener("keyup", (event) => {
  input.keys.delete(event.code);
});

document.addEventListener("mousemove", (event) => {
  if (!input.locked) {
    return;
  }

  state.yaw -= event.movementX * 0.12;
  state.pitch = clamp(state.pitch - event.movementY * 0.09, -72, 78);
});

document.addEventListener("mousedown", (event) => {
  if (event.button !== 0) {
    return;
  }

  if (input.locked) {
    fire();
  }
});

function collidesAt(x, z, radius) {
  if (
    x - radius < arenaBounds.minX ||
    x + radius > arenaBounds.maxX ||
    z - radius < arenaBounds.minZ ||
    z + radius > arenaBounds.maxZ
  ) {
    return true;
  }

  return collisionBoxes.some((box) => {
    const nearestX = clamp(x, box.minX, box.maxX);
    const nearestZ = clamp(z, box.minZ, box.maxZ);
    const dx = x - nearestX;
    const dz = z - nearestZ;

    return dx * dx + dz * dz < radius * radius;
  });
}

function movePlayer(dt) {
  const forwardInput = (input.keys.has("KeyW") ? 1 : 0) - (input.keys.has("KeyS") ? 1 : 0);
  const strafeInput = (input.keys.has("KeyD") ? 1 : 0) - (input.keys.has("KeyA") ? 1 : 0);
  const moveMagnitude = Math.hypot(forwardInput, strafeInput);
  const moving = moveMagnitude > 0;
  const speed = input.keys.has("ShiftLeft") || input.keys.has("ShiftRight")
    ? state.sprintSpeed
    : state.speed;

  if (moving) {
    const yawRadians = rad(state.yaw);
    const sinYaw = Math.sin(yawRadians);
    const cosYaw = Math.cos(yawRadians);
    const normalizer = 1 / moveMagnitude;
    const localX = strafeInput * normalizer;
    const localZ = forwardInput * normalizer;
    const worldX = localX * cosYaw - localZ * sinYaw;
    const worldZ = -localX * sinYaw - localZ * cosYaw;
    const stepX = worldX * speed * dt;
    const stepZ = worldZ * speed * dt;
    const current = player.getLocalPosition();
    let nextX = current.x;
    let nextZ = current.z;

    if (!collidesAt(current.x + stepX, current.z, state.radius)) {
      nextX += stepX;
    }

    if (!collidesAt(nextX, current.z + stepZ, state.radius)) {
      nextZ += stepZ;
    }

    player.setLocalPosition(nextX, 0, nextZ);
    state.bob += dt * (speed * 1.2);
  } else {
    state.bob += dt * 1.2;
  }

  player.setLocalEulerAngles(0, state.yaw, 0);
  camera.setLocalEulerAngles(state.pitch, 0, 0);

  const bobWave = moving ? Math.sin(state.bob * 1.8) * 0.035 : Math.sin(state.bob) * 0.008;
  const swayWave = moving ? Math.cos(state.bob * 0.9) * 0.028 : 0;

  camera.setLocalPosition(0, state.eyeHeight + bobWave, 0);

  state.recoil = Math.max(0, state.recoil - dt * 8);
  weaponRig.setLocalPosition(
    0.36 + swayWave,
    -0.28 - Math.abs(bobWave) * 0.8 - state.recoil * 0.06,
    -0.78 + state.recoil * 0.08
  );
  weaponRig.setLocalEulerAngles(
    2 + Math.sin(state.bob * 0.9) * 1.8 + state.recoil * 4,
    180 + swayWave * 14,
    -1.5 + swayWave * 9
  );
}

function intersectRaySphere(origin, direction, center, radius) {
  const offset = origin.clone().sub(center);
  const b = offset.dot(direction);
  const c = offset.dot(offset) - radius * radius;
  const discriminant = b * b - c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const nearHit = -b - sqrtDiscriminant;
  const farHit = -b + sqrtDiscriminant;

  if (nearHit > 0) {
    return nearHit;
  }

  if (farHit > 0) {
    return farHit;
  }

  return null;
}

function spawnBeam(start, end) {
  const entity = new pc.Entity("beam");
  entity.addComponent("render", {
    type: "box",
    castShadows: false,
    receiveShadows: false
  });
  entity.render.material = materials.beam;

  const mid = start.clone().lerp(start, end, 0.5);
  const length = start.distance(end);

  entity.setPosition(mid);
  entity.lookAt(end);
  entity.setLocalScale(0.028, 0.028, length);
  world.addChild(entity);

  effects.push({
    entity,
    ttl: 0.08,
    maxTtl: 0.08,
    kind: "beam"
  });
}

function spawnImpact(point, strong) {
  const entity = new pc.Entity("impact");
  entity.addComponent("render", {
    type: "sphere",
    castShadows: false,
    receiveShadows: false
  });
  entity.render.material = strong ? materials.accentOrange : materials.flash;
  entity.setPosition(point);
  entity.setLocalScale(0.14, 0.14, 0.14);
  world.addChild(entity);

  effects.push({
    entity,
    ttl: strong ? 0.22 : 0.14,
    maxTtl: strong ? 0.22 : 0.14,
    kind: "impact",
    strong
  });
}

function triggerHudFlash(hit) {
  reticle.classList.add("recoil");
  screenFlash.classList.add("active");

  if (hit) {
    reticle.classList.add("hit");
  }

  window.setTimeout(() => {
    reticle.classList.remove("recoil");
    reticle.classList.remove("hit");
  }, 90);

  window.setTimeout(() => {
    screenFlash.classList.remove("active");
  }, 80);
}

function recycleDrone(drone) {
  const spawn = pickSpawnPoint(drone.spawnIndex);
  drone.spawnIndex = spawn.index;
  drone.origin.copy(spawn.point);
  drone.cooldown = 0;
  drone.visible = true;
  drone.root.enabled = true;
  drone.hitFlash = 0;
}

function handleDroneHit(drone, hitPoint) {
  drone.visible = false;
  drone.cooldown = 0.72;
  drone.hitFlash = 0.4;
  drone.root.enabled = false;

  state.hits += 1;
  state.combo = state.comboClock > 0 ? state.combo + 1 : 1;
  state.comboClock = 1.8;
  state.score += 100 + (state.combo - 1) * 25;
  state.lastHitClock = 0.6;

  spawnImpact(hitPoint, true);
  triggerHudFlash(true);
  setStatus(
    `Combo x${state.combo}`,
    `Clean hit on drone ${drone.id + 1}. Keep pressure on the next target.`,
    0.9
  );

  playTone("triangle", 520, 0.06, 0.05, 900);
}

function fire() {
  if (!input.locked || state.shootCooldown > 0) {
    return;
  }

  ensureAudio();
  state.shootCooldown = 0.12;
  state.shots += 1;
  state.recoil = Math.min(state.recoil + 1, 1.5);

  const origin = camera.getPosition().clone();
  const direction = camera.forward.clone().normalize();
  let closestDrone = null;
  let closestDistance = 60;

  for (const drone of drones) {
    if (!drone.visible) {
      continue;
    }

    const distance = intersectRaySphere(origin, direction, drone.root.getPosition(), drone.radius);

    if (distance !== null && distance < closestDistance) {
      closestDistance = distance;
      closestDrone = drone;
    }
  }

  const end = origin.clone().add(direction.clone().scale(closestDistance));

  spawnBeam(origin, end);

  if (closestDrone) {
    handleDroneHit(closestDrone, end);
  } else {
    state.combo = 1;
    state.comboClock = 0;
    spawnImpact(end, false);
    triggerHudFlash(false);
    setStatus("Sweep wider", "No contact. Lead the hover path and fire again.", 0.7);
    playTone("sawtooth", 210, 0.05, 0.03, 120);
  }

  muzzle.setLocalScale(0.12, 0.12, 0.16);
  weaponBody.setLocalScale(0.27, 0.17, 0.79);
  playTone("square", 150, 0.05, 0.04, 90);
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];

    effect.ttl -= dt;

    if (effect.ttl <= 0) {
      effect.entity.destroy();
      effects.splice(i, 1);
      continue;
    }

    if (effect.kind === "impact") {
      const progress = 1 - effect.ttl / effect.maxTtl;
      const size = effect.strong ? lerp(0.14, 0.62, progress) : lerp(0.08, 0.24, progress);
      effect.entity.setLocalScale(size, size, size);
    } else if (effect.kind === "beam") {
      const progress = effect.ttl / effect.maxTtl;
      effect.entity.setLocalScale(0.028 * progress, 0.028 * progress, effect.entity.getLocalScale().z);
    }
  }
}

function updateDecor(dt, time) {
  for (const item of animatedDecor) {
    const currentRotation = item.entity.getLocalEulerAngles();

    item.entity.setLocalEulerAngles(
      currentRotation.x + item.spin.x * dt,
      currentRotation.y + item.spin.y * dt,
      currentRotation.z + item.spin.z * dt
    );

    const currentPosition = item.entity.getLocalPosition();
    item.entity.setLocalPosition(
      currentPosition.x,
      item.originY + Math.sin(time * item.drift + item.phase) * 0.25,
      currentPosition.z
    );
  }

  muzzle.setLocalScale(
    lerp(muzzle.getLocalScale().x, 0.09, dt * 16),
    lerp(muzzle.getLocalScale().y, 0.09, dt * 16),
    lerp(muzzle.getLocalScale().z, 0.12, dt * 16)
  );

  weaponBody.setLocalScale(
    lerp(weaponBody.getLocalScale().x, 0.26, dt * 12),
    lerp(weaponBody.getLocalScale().y, 0.16, dt * 12),
    lerp(weaponBody.getLocalScale().z, 0.78, dt * 12)
  );
}

function updateDrones(dt, time) {
  let visibleCount = 0;

  for (const drone of drones) {
    drone.age += dt;

    if (!drone.visible) {
      drone.cooldown -= dt;

      if (drone.cooldown <= 0) {
        recycleDrone(drone);
      }

      continue;
    }

    visibleCount += 1;

    const hover = Math.sin(drone.age * (1.3 + drone.speed)) * 0.28;
    const orbit = Math.sin(drone.age * drone.speed) * drone.amplitude;
    const orbitZ = Math.cos(drone.age * (drone.speed * 0.92)) * drone.amplitude * 0.6;

    drone.root.setLocalPosition(
      drone.origin.x + orbit,
      drone.origin.y + hover,
      drone.origin.z + orbitZ
    );

    drone.root.setLocalEulerAngles(0, time * drone.yawRate, 0);
    drone.ring.setLocalEulerAngles(time * 160, 0, 45);
    drone.finA.setLocalEulerAngles(0, 0, Math.sin(drone.age * 4.8) * 10);
    drone.finB.setLocalEulerAngles(0, 0, -Math.sin(drone.age * 4.8) * 10);

    const pulse = 1 + Math.sin(drone.age * 6) * 0.08;
    drone.core.setLocalScale(0.42 * pulse, 0.42 * pulse, 0.42 * pulse);
    drone.glow.setLocalScale(1.12 * pulse, 0.58 * pulse, 1.12 * pulse);
  }

  targetsValue.textContent = String(visibleCount);
}

function updateHud(dt) {
  if (state.comboClock > 0) {
    state.comboClock -= dt;
  } else {
    state.combo = 1;
  }

  if (state.lastHitClock > 0) {
    state.lastHitClock -= dt;
  }

  if (state.statusClock > 0) {
    state.statusClock -= dt;
  } else if (input.locked) {
    statusPill.textContent = state.lastHitClock > 0 ? "Target down" : "Arena live";
    statusText.textContent = state.lastHitClock > 0
      ? "The field is reshuffling. Scan high and wide."
      : "Drones keep drifting between lanes. Stay mobile and chain shots.";
  }

  scoreValue.textContent = String(state.score).padStart(4, "0");
  comboValue.textContent = `x${Math.max(1, state.combo)}`;

  const accuracy = state.shots === 0 ? 0 : Math.round((state.hits / state.shots) * 100);
  accuracyValue.textContent = `${accuracy}%`;

  if (state.shootCooldown > 0) {
    state.shootCooldown -= dt;
  }
}

setEngagedUI(false);

let elapsed = 0;

app.on("update", (dt) => {
  elapsed += dt;
  updateDecor(dt, elapsed);
  updateDrones(dt, elapsed);
  updateEffects(dt);
  updateHud(dt);
  movePlayer(dt);
});

window.addEventListener("resize", () => {
  app.resizeCanvas(canvas.width, canvas.height);
});

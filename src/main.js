import * as pc from "playcanvas";

import { FIRE_COOLDOWN, TARGET_COUNT } from "./game/config.js";
import { Hud } from "./game/hud.js";
import { InputController } from "./game/input.js";
import { PlayerController } from "./game/player-controller.js";
import { buildScene } from "./game/scene.js";
import { TargetManager } from "./game/targets.js";

const canvas = document.getElementById("application");
const app = new pc.Application(canvas);

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
app.start();

const hud = new Hud();
const input = new InputController(canvas);
const { playerRig, camera, materials } = buildScene(app);
const player = new PlayerController(playerRig, camera, input);
const targets = new TargetManager(app, materials);

targets.spawnInitialTargets(TARGET_COUNT);

let score = 0;
let shots = 0;
let hits = 0;
let streak = 0;
let fireCooldown = 0;

const isPointerLocked = () => document.pointerLockElement === canvas;

const syncHud = () => {
  hud.setScore(score);
  hud.setAccuracy(shots === 0 ? 0 : (hits / shots) * 100);
  hud.setTargets(targets.getActiveCount());
  hud.setStreak(streak);
};

canvas.addEventListener("click", () => {
  if (!isPointerLocked()) {
    canvas.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  hud.setPointerLocked(isPointerLocked());
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

hud.setPointerLocked(false);
syncHud();

app.on("update", (dt) => {
  fireCooldown = Math.max(0, fireCooldown - dt);

  player.update(dt);
  targets.update(dt);

  if (input.consumeFire() && isPointerLocked() && fireCooldown <= 0) {
    fireCooldown = FIRE_COOLDOWN;
    shots += 1;

    const shot = targets.shoot(player.getEyePosition(), player.getAimDirection());
    hud.registerShot(shot.hit);

    if (shot.hit) {
      hits += 1;
      streak += 1;
      score += 100 + Math.max(0, streak - 1) * 15;
      hud.setStatus("Direct hit. Keep sweeping the range.");
    } else {
      streak = 0;
      hud.setStatus("No contact. Track the next lane and fire again.");
    }

    syncHud();
    return;
  }

  hud.setTargets(targets.getActiveCount());
});

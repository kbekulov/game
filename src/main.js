import * as pc from "playcanvas";

import { Hud } from "./game/hud.js";
import { InputController } from "./game/input.js";
import { PlayerController } from "./game/player-controller.js";
import { buildScene } from "./game/scene.js";

const canvas = document.getElementById("application");
const app = new pc.Application(canvas);

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
app.start();

const hud = new Hud();
const input = new InputController(canvas);
const { playerRig, camera, describePosition, environmentReady } = buildScene(app);
const player = new PlayerController(playerRig, camera, input);
const environmentState = {
  loading: true,
  degraded: false
};

const isPointerLocked = () => document.pointerLockElement === canvas;

const formatBearing = (yaw) => {
  const normalized = ((yaw % 360) + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const direction = directions[Math.round(normalized / 45) % directions.length];
  return `${direction} ${Math.round(normalized)}°`;
};

const syncHud = () => {
  const info = describePosition(player.getPosition());

  hud.setLandmark(info.landmark);
  hud.setBearing(formatBearing(player.getYaw()));
  hud.setDepth(`${info.depth}m`);
  hud.setOmen(info.omen);

  if (environmentState.loading) {
    hud.setStatus(
      isPointerLocked()
        ? "The grove is taking shape. Higher-fidelity sky and forest detail are still streaming in."
        : "Higher-fidelity sky and forest detail are still loading. Click the viewport to enter when you're ready."
    );
    return;
  }

  if (!isPointerLocked()) {
    hud.setStatus(
      environmentState.degraded
        ? "Click the viewport to enter the forest. Some higher-fidelity detail failed to load, but the grove is still explorable."
        : "Click the viewport to leave the trailhead and enter the forest."
    );
    return;
  }

  hud.setStatus(info.status);
};

canvas.addEventListener("click", () => {
  if (!isPointerLocked()) {
    canvas.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  hud.setPointerLocked(isPointerLocked());
});

document.addEventListener("pointerlockerror", () => {
  hud.setStatus("Pointer lock was blocked. Click directly inside the viewport to enter the forest.");
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

hud.setPointerLocked(false);
syncHud();

environmentReady.then(({ failedCount }) => {
  environmentState.loading = false;
  environmentState.degraded = failedCount > 0;
  syncHud();
}).catch((error) => {
  console.error(error);
  environmentState.loading = false;
  environmentState.degraded = true;
  syncHud();
});

app.on("update", (dt) => {
  player.update(dt);
  syncHud();
});

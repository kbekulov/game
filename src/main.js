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
const { playerRig, camera, describePosition } = buildScene(app);
const player = new PlayerController(playerRig, camera, input);

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
  hud.setStatus(
    isPointerLocked()
      ? info.status
      : "Click the viewport to leave the trailhead and enter the forest."
  );
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
  player.update(dt);
  syncHud();
});

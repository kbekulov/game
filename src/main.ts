import { GameController } from "@/game/game-controller.ts";

const canvas = document.getElementById("application") as HTMLCanvasElement | null;
const uiRoot = document.getElementById("ui-root") as HTMLElement | null;

if (!canvas || !uiRoot) {
  throw new Error("Application canvas or UI root is missing.");
}

new GameController(canvas, uiRoot);

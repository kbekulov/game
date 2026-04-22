import "./styles.css";

import { Game } from "./app/Game";

const canvas = document.getElementById("application");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #application canvas");
}

new Game(canvas);

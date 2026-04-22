import { GameController } from "@/game/game-controller.ts";

const canvas = document.getElementById("application") as HTMLCanvasElement | null;
const uiRoot = document.getElementById("ui-root") as HTMLElement | null;

const renderFatalError = (title: string, detail: string): void => {
  const host = uiRoot ?? document.body;

  if (!host) {
    return;
  }

  host.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      background: radial-gradient(circle at top, rgba(196, 112, 52, 0.24), rgba(10, 8, 7, 0.94));
      color: #f4eee3;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      z-index: 1000;
    ">
      <div style="
        width: min(720px, calc(100vw - 48px));
        padding: 28px;
        border: 1px solid rgba(242, 211, 176, 0.2);
        background: rgba(18, 14, 12, 0.86);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
      ">
        <div style="
          margin-bottom: 8px;
          color: #e2b178;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        ">Startup Error</div>
        <h1 style="
          margin: 0 0 12px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(1.9rem, 4vw, 3rem);
          line-height: 1;
        ">${title}</h1>
        <p style="
          margin: 0 0 14px;
          color: rgba(244, 238, 227, 0.84);
          line-height: 1.6;
        ">The game could not finish booting. A hard refresh may help after a new deploy.</p>
        <pre style="
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: #f2d3b0;
          font-size: 13px;
          line-height: 1.6;
        ">${detail}</pre>
      </div>
    </div>
  `;
};

if (!canvas || !uiRoot) {
  throw new Error("Application canvas or UI root is missing.");
}

window.addEventListener("error", (event) => {
  const detail = event.error instanceof Error ? event.error.stack ?? event.error.message : String(event.message);
  renderFatalError("Runtime exception", detail);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.stack ?? event.reason.message : String(event.reason);
  renderFatalError("Unhandled promise rejection", reason);
});

try {
  new GameController(canvas, uiRoot);
} catch (error) {
  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(error);
  renderFatalError("Initialization failed", detail);
}

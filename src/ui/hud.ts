import type { RuntimeSettings } from "@/core/config.ts";

export type GamePhase = "intro" | "playing" | "paused" | "won" | "lost";

export interface HudBindings {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onSensitivityChange: (value: number) => void;
}

export class HudController {
  private readonly healthEl: HTMLElement;
  private readonly ammoEl: HTMLElement;
  private readonly reserveEl: HTMLElement;
  private readonly enemiesEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly overlayEl: HTMLElement;
  private readonly overlayTitleEl: HTMLElement;
  private readonly overlayBodyEl: HTMLElement;
  private readonly statsEl: HTMLElement;
  private readonly crosshairEl: HTMLElement;
  private readonly sensitivityInput: HTMLInputElement;
  private readonly startButton: HTMLButtonElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;

  constructor(container: HTMLElement, settings: RuntimeSettings) {
    container.innerHTML = `
      <div class="hud-shell">
        <div class="hud-top">
          <div class="hud-card hud-objective">
            <div class="hud-kicker">Mission</div>
            <div id="hud-enemies"></div>
          </div>
          <div class="hud-card hud-health">
            <div class="hud-kicker">Health</div>
            <div id="hud-health" class="hud-large"></div>
          </div>
        </div>

        <div class="hud-center">
          <div id="hud-crosshair" class="hud-crosshair">
            <span></span><span></span><span></span><span></span>
          </div>
          <div id="hud-status" class="hud-status"></div>
        </div>

        <div class="hud-bottom">
          <div class="hud-card hud-controls">WASD move, Mouse aim, Shift sprint, Click fire, R reload, Esc pause.</div>
          <div class="hud-card hud-ammo">
            <div class="hud-kicker">Rifle</div>
            <div class="hud-ammo-value"><span id="hud-ammo">24</span><small>/</small><span id="hud-reserve">144</span></div>
          </div>
        </div>

        <div id="hud-overlay" class="hud-overlay visible">
          <div class="hud-panel">
            <div class="hud-kicker">PlayCanvas Baseline</div>
            <h1 id="hud-overlay-title">Townline Baseline</h1>
            <p id="hud-overlay-body">Clear the dummy squad in the test yard. Keep it simple. Keep it readable.</p>
            <div id="hud-stats" class="hud-stats"></div>
            <div class="hud-actions">
              <button id="hud-start-button" type="button">Start</button>
              <button id="hud-resume-button" type="button">Resume</button>
              <button id="hud-restart-button" type="button">Restart</button>
            </div>
            <label class="hud-slider">
              <span>Mouse Sensitivity</span>
              <input id="hud-sensitivity" type="range" min="0.5" max="2" step="0.05" value="${settings.mouseSensitivity.toFixed(2)}" />
            </label>
          </div>
        </div>
      </div>
    `;

    this.healthEl = container.querySelector("#hud-health") as HTMLElement;
    this.ammoEl = container.querySelector("#hud-ammo") as HTMLElement;
    this.reserveEl = container.querySelector("#hud-reserve") as HTMLElement;
    this.enemiesEl = container.querySelector("#hud-enemies") as HTMLElement;
    this.statusEl = container.querySelector("#hud-status") as HTMLElement;
    this.overlayEl = container.querySelector("#hud-overlay") as HTMLElement;
    this.overlayTitleEl = container.querySelector("#hud-overlay-title") as HTMLElement;
    this.overlayBodyEl = container.querySelector("#hud-overlay-body") as HTMLElement;
    this.statsEl = container.querySelector("#hud-stats") as HTMLElement;
    this.crosshairEl = container.querySelector("#hud-crosshair") as HTMLElement;
    this.sensitivityInput = container.querySelector("#hud-sensitivity") as HTMLInputElement;
    this.startButton = container.querySelector("#hud-start-button") as HTMLButtonElement;
    this.resumeButton = container.querySelector("#hud-resume-button") as HTMLButtonElement;
    this.restartButton = container.querySelector("#hud-restart-button") as HTMLButtonElement;
  }

  bind(actions: HudBindings): void {
    this.startButton.addEventListener("click", actions.onStart);
    this.resumeButton.addEventListener("click", actions.onResume);
    this.restartButton.addEventListener("click", actions.onRestart);
    this.sensitivityInput.addEventListener("input", () => {
      actions.onSensitivityChange(Number(this.sensitivityInput.value));
    });
  }

  setHealth(value: number): void {
    this.healthEl.textContent = `${Math.max(0, Math.ceil(value))}`;
  }

  setAmmo(current: number, reserve: number): void {
    this.ammoEl.textContent = String(current);
    this.reserveEl.textContent = String(reserve);
  }

  setEnemies(remaining: number, total: number): void {
    this.enemiesEl.textContent = `${remaining} of ${total} dummies remain.`;
  }

  setStatus(message: string): void {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle("visible", message.length > 0);
  }

  setPhase(phase: GamePhase, statsText = ""): void {
    const showOverlay = phase !== "playing";
    this.overlayEl.classList.toggle("visible", showOverlay);
    this.crosshairEl.classList.toggle("muted", phase !== "playing");
    this.startButton.classList.toggle("visible", phase === "intro");
    this.resumeButton.classList.toggle("visible", phase === "paused");
    this.restartButton.classList.toggle("visible", phase === "paused" || phase === "won" || phase === "lost");

    if (phase === "intro") {
      this.overlayTitleEl.textContent = "Townline Baseline";
      this.overlayBodyEl.textContent =
        "Clear the dummy squad in the test yard. Keep it simple. Keep it readable.";
      this.statsEl.textContent = "";
    } else if (phase === "paused") {
      this.overlayTitleEl.textContent = "Paused";
      this.overlayBodyEl.textContent = "Adjust your sensitivity or jump back into the arena.";
      this.statsEl.textContent = statsText;
    } else if (phase === "won") {
      this.overlayTitleEl.textContent = "Area Secure";
      this.overlayBodyEl.textContent = "All dummies are down. The baseline loop is intact.";
      this.statsEl.textContent = statsText;
    } else if (phase === "lost") {
      this.overlayTitleEl.textContent = "You Were Dropped";
      this.overlayBodyEl.textContent = "The dummy squad shredded you before the yard was cleared.";
      this.statsEl.textContent = statsText;
    }
  }
}

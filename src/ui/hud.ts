import { DEFAULT_SETTINGS, GAME_CONFIG, UI_CONFIG, type RuntimeSettings } from "@/core/config.ts";

export type GamePhase = "intro" | "playing" | "paused" | "won" | "lost";

export interface HudBindings {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onSensitivityChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
}

export class HudController {
  private readonly root: HTMLElement;
  private readonly objectiveEl: HTMLElement;
  private readonly ammoEl: HTMLElement;
  private readonly reserveEl: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly overlayEl: HTMLElement;
  private readonly overlayTitleEl: HTMLElement;
  private readonly overlayBodyEl: HTMLElement;
  private readonly crosshairEl: HTMLElement;
  private readonly hitMarkerEl: HTMLElement;
  private readonly sensitivityInput: HTMLInputElement;
  private readonly volumeInput: HTMLInputElement;
  private readonly statsEl: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;

  constructor(private readonly container: HTMLElement, settings: RuntimeSettings = DEFAULT_SETTINGS) {
    this.container.innerHTML = `
      <div class="hud-shell">
        <div class="hud-top">
          <div class="hud-objective">
            <div class="hud-kicker">Objective</div>
            <div id="hud-objective-text"></div>
          </div>
          <div id="hud-timer" class="hud-timer"></div>
        </div>

        <div class="hud-center">
          <div id="hud-crosshair" class="hud-crosshair">
            <span></span><span></span><span></span><span></span>
          </div>
          <div id="hud-hit-marker" class="hud-hit-marker">×</div>
          <div id="hud-status" class="hud-status"></div>
        </div>

        <div class="hud-bottom">
          <div class="hud-controls">${UI_CONFIG.controlHints}</div>
          <div class="hud-ammo">
            <div class="hud-kicker">Sidearm</div>
            <div class="hud-ammo-value"><span id="hud-ammo">17</span><small>/</small><span id="hud-reserve">68</span></div>
          </div>
        </div>

        <div id="hud-overlay" class="hud-overlay visible">
          <div class="hud-card">
            <div class="hud-kicker">Vertical Slice</div>
            <h1 id="hud-overlay-title">${UI_CONFIG.startTitle}</h1>
            <p id="hud-overlay-body">${UI_CONFIG.objectiveText}</p>
            <div id="hud-stats" class="hud-stats"></div>
            <div class="hud-actions">
              <button id="hud-start-button" type="button">Deploy</button>
              <button id="hud-resume-button" type="button">Resume</button>
              <button id="hud-restart-button" type="button">Restart</button>
            </div>
            <div class="hud-options">
              <label>
                <span>Mouse Sensitivity</span>
                <input id="hud-sensitivity" type="range" min="0.5" max="2" step="0.05" value="${settings.mouseSensitivity.toFixed(2)}" />
              </label>
              <label>
                <span>Volume</span>
                <input id="hud-volume" type="range" min="0" max="1" step="0.05" value="${settings.masterVolume.toFixed(2)}" />
              </label>
            </div>
          </div>
        </div>
      </div>
    `;

    this.root = this.container.querySelector(".hud-shell") as HTMLElement;
    this.objectiveEl = this.container.querySelector("#hud-objective-text") as HTMLElement;
    this.ammoEl = this.container.querySelector("#hud-ammo") as HTMLElement;
    this.reserveEl = this.container.querySelector("#hud-reserve") as HTMLElement;
    this.timerEl = this.container.querySelector("#hud-timer") as HTMLElement;
    this.statusEl = this.container.querySelector("#hud-status") as HTMLElement;
    this.overlayEl = this.container.querySelector("#hud-overlay") as HTMLElement;
    this.overlayTitleEl = this.container.querySelector("#hud-overlay-title") as HTMLElement;
    this.overlayBodyEl = this.container.querySelector("#hud-overlay-body") as HTMLElement;
    this.crosshairEl = this.container.querySelector("#hud-crosshair") as HTMLElement;
    this.hitMarkerEl = this.container.querySelector("#hud-hit-marker") as HTMLElement;
    this.sensitivityInput = this.container.querySelector("#hud-sensitivity") as HTMLInputElement;
    this.volumeInput = this.container.querySelector("#hud-volume") as HTMLInputElement;
    this.statsEl = this.container.querySelector("#hud-stats") as HTMLElement;
    this.startButton = this.container.querySelector("#hud-start-button") as HTMLButtonElement;
    this.resumeButton = this.container.querySelector("#hud-resume-button") as HTMLButtonElement;
    this.restartButton = this.container.querySelector("#hud-restart-button") as HTMLButtonElement;
  }

  bind(actions: HudBindings): void {
    this.startButton.addEventListener("click", actions.onStart);
    this.resumeButton.addEventListener("click", actions.onResume);
    this.restartButton.addEventListener("click", actions.onRestart);

    this.sensitivityInput.addEventListener("input", () => {
      actions.onSensitivityChange(Number(this.sensitivityInput.value));
    });
    this.volumeInput.addEventListener("input", () => {
      actions.onVolumeChange(Number(this.volumeInput.value));
    });
  }

  setObjective(remaining: number, total: number): void {
    this.objectiveEl.textContent = `${remaining} of ${total} steel targets remain in the district.`;
  }

  setAmmo(current: number, reserve: number): void {
    this.ammoEl.textContent = String(current);
    this.reserveEl.textContent = String(reserve);
  }

  setTimer(seconds: number): void {
    const clamped = Math.max(0, seconds);
    const minutes = Math.floor(clamped / 60);
    const remaining = Math.floor(clamped % 60);
    this.timerEl.textContent = `${minutes}:${remaining.toString().padStart(2, "0")}`;
  }

  setStatus(message: string): void {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle("visible", message.length > 0);
  }

  flashHitMarker(): void {
    this.hitMarkerEl.classList.add("visible");
    window.setTimeout(() => this.hitMarkerEl.classList.remove("visible"), 75);
  }

  setPhase(phase: GamePhase, statsText = ""): void {
    const isOverlayVisible = phase !== "playing";
    this.overlayEl.classList.toggle("visible", isOverlayVisible);
    this.crosshairEl.classList.toggle("muted", phase !== "playing");
    this.startButton.classList.toggle("visible", phase === "intro");
    this.resumeButton.classList.toggle("visible", phase === "paused");
    this.restartButton.classList.toggle("visible", phase === "paused" || phase === "won" || phase === "lost");

    if (phase === "intro") {
      this.overlayTitleEl.textContent = UI_CONFIG.startTitle;
      this.overlayBodyEl.textContent = UI_CONFIG.objectiveText;
      this.statsEl.textContent = "";
    } else if (phase === "paused") {
      this.overlayTitleEl.textContent = "Paused";
      this.overlayBodyEl.textContent = "Take a breath, adjust your settings, and get back on target.";
      this.statsEl.textContent = statsText;
    } else if (phase === "won") {
      this.overlayTitleEl.textContent = "Course Complete";
      this.overlayBodyEl.textContent = "Every steel target is down. The district is clear.";
      this.statsEl.textContent = statsText;
    } else if (phase === "lost") {
      this.overlayTitleEl.textContent = "Course Failed";
      this.overlayBodyEl.textContent = "Time expired before the town was cleared.";
      this.statsEl.textContent = statsText;
    }
  }

  updateSettings(settings: RuntimeSettings): void {
    this.sensitivityInput.value = settings.mouseSensitivity.toFixed(2);
    this.volumeInput.value = settings.masterVolume.toFixed(2);
  }
}

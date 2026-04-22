export class Hud {
  private readonly healthValue = this.byId("health-value");
  private readonly targetsValue = this.byId("targets-value");
  private readonly stateValue = this.byId("state-value");
  private readonly objectiveText = this.byId("objective-text");
  private readonly ammoValue = this.byId("ammo-value");
  private readonly reserveValue = this.byId("reserve-value");
  private readonly weaponMessage = this.byId("weapon-message");
  private readonly reticle = this.byId("reticle");
  private readonly introOverlay = this.byId("intro-overlay");
  private readonly resultOverlay = this.byId("result-overlay");
  private readonly resultEyebrow = this.byId("result-eyebrow");
  private readonly resultTitle = this.byId("result-title");
  private readonly resultBody = this.byId("result-body");
  private readonly engageButton = this.byId("engage-button") as HTMLButtonElement;
  private readonly restartButton = this.byId("restart-button") as HTMLButtonElement;
  private readonly screenFlash = this.byId("screen-flash");

  onEngage(handler: () => void): void {
    this.engageButton.addEventListener("click", () => {
      this.engageButton.blur();
      handler();
    });
  }

  onRestart(handler: () => void): void {
    this.restartButton.addEventListener("click", () => {
      this.restartButton.blur();
      handler();
    });
  }

  setObjective(text: string): void {
    this.objectiveText.textContent = text;
  }

  setHealth(value: number): void {
    this.healthValue.textContent = `${Math.max(0, Math.round(value))}`;
  }

  setTargets(alive: number, total: number): void {
    this.targetsValue.textContent = `${alive} / ${total}`;
  }

  setState(text: string): void {
    this.stateValue.textContent = text;
  }

  setAmmo(ammo: number, reserve: number, message: string): void {
    this.ammoValue.textContent = `${ammo}`;
    this.reserveValue.textContent = `${reserve}`;
    this.weaponMessage.textContent = message;
  }

  setReticleKick(amount: number): void {
    const spread = `${6 + amount * 18}px`;
    this.reticle.style.setProperty("--reticle-spread", spread);
  }

  flashDamage(): void {
    this.screenFlash.classList.remove("active");
    void this.screenFlash.offsetWidth;
    this.screenFlash.classList.add("active");
  }

  showIntro(visible: boolean): void {
    this.introOverlay.classList.toggle("visible", visible);
    this.introOverlay.setAttribute("aria-hidden", String(!visible));
    this.engageButton.disabled = !visible;

    if (!visible && document.activeElement === this.engageButton) {
      this.engageButton.blur();
    }
  }

  showResult(visible: boolean, eyebrow = "Status", title = "", body = ""): void {
    this.resultOverlay.classList.toggle("visible", visible);
    this.resultOverlay.setAttribute("aria-hidden", String(!visible));
    this.resultEyebrow.textContent = eyebrow;
    this.resultTitle.textContent = title;
    this.resultBody.textContent = body;
    this.restartButton.disabled = !visible;

    if (!visible && document.activeElement === this.restartButton) {
      this.restartButton.blur();
    }
  }

  private byId(id: string): HTMLElement {
    const element = document.getElementById(id);

    if (!element) {
      throw new Error(`Missing HUD element: ${id}`);
    }

    return element;
  }
}

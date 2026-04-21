export class Hud {
  constructor() {
    this.scoreValue = document.getElementById("score");
    this.accuracyValue = document.getElementById("accuracy");
    this.targetsValue = document.getElementById("targets-live");
    this.streakValue = document.getElementById("streak");
    this.statusText = document.getElementById("status-text");
    this.centerMessage = document.getElementById("center-message");
    this.lockState = document.getElementById("lock-state");
    this.reticle = document.getElementById("reticle");
    this.hitMarker = document.getElementById("hit-marker");

    this.reticleTimer = null;
    this.hitMarkerTimer = null;
  }

  setScore(value) {
    this.scoreValue.textContent = String(value);
  }

  setAccuracy(value) {
    this.accuracyValue.textContent = `${Math.round(value)}%`;
  }

  setTargets(value) {
    this.targetsValue.textContent = String(value);
  }

  setStreak(value) {
    this.streakValue.textContent = String(value);
  }

  setStatus(text) {
    this.statusText.textContent = text;
  }

  setPointerLocked(locked) {
    this.centerMessage.classList.toggle("is-hidden", locked);
    this.lockState.textContent = locked ? "Pointer locked" : "Pointer unlocked";

    if (locked) {
      this.setStatus("Range live. Sweep the arena and land clean shots.");
      return;
    }

    this.setStatus("Click the viewport to lock the pointer and enter the range.");
  }

  registerShot(hit) {
    this.reticle.classList.remove("is-hit", "is-miss");
    void this.reticle.offsetWidth;
    this.reticle.classList.add(hit ? "is-hit" : "is-miss");

    window.clearTimeout(this.reticleTimer);
    this.reticleTimer = window.setTimeout(() => {
      this.reticle.classList.remove("is-hit", "is-miss");
    }, 120);

    if (!hit) {
      return;
    }

    this.hitMarker.classList.add("is-visible");
    window.clearTimeout(this.hitMarkerTimer);
    this.hitMarkerTimer = window.setTimeout(() => {
      this.hitMarker.classList.remove("is-visible");
    }, 140);
  }
}

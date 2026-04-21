export class Hud {
  constructor() {
    this.landmarkValue = document.getElementById("landmark");
    this.bearingValue = document.getElementById("bearing");
    this.depthValue = document.getElementById("depth");
    this.omenValue = document.getElementById("omen");
    this.statusText = document.getElementById("status-text");
    this.centerMessage = document.getElementById("center-message");
    this.lockState = document.getElementById("lock-state");
  }

  setLandmark(value) {
    this.landmarkValue.textContent = value;
  }

  setBearing(value) {
    this.bearingValue.textContent = value;
  }

  setDepth(value) {
    this.depthValue.textContent = value;
  }

  setOmen(value) {
    this.omenValue.textContent = value;
  }

  setStatus(text) {
    this.statusText.textContent = text;
  }

  setPointerLocked(locked) {
    this.centerMessage.classList.toggle("is-hidden", locked);
    this.lockState.textContent = locked ? "Pointer locked" : "Pointer unlocked";
  }
}

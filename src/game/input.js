export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookDelta = { x: 0, y: 0 };
    this.fireQueued = false;

    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.lookDelta.x = 0;
      this.lookDelta.y = 0;
      this.fireQueued = false;
    });

    window.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement !== this.canvas) {
        return;
      }

      this.lookDelta.x += event.movementX;
      this.lookDelta.y += event.movementY;
    });

    window.addEventListener("mousedown", (event) => {
      if (event.button !== 0) {
        return;
      }

      if (document.pointerLockElement === this.canvas) {
        this.fireQueued = true;
      }
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  consumeLookDelta() {
    const delta = {
      x: this.lookDelta.x,
      y: this.lookDelta.y
    };

    this.lookDelta.x = 0;
    this.lookDelta.y = 0;

    return delta;
  }

  consumeFire() {
    const queued = this.fireQueued;
    this.fireQueued = false;
    return queued;
  }
}

type ActionName =
  | "moveForward"
  | "moveBackward"
  | "moveLeft"
  | "moveRight"
  | "walk"
  | "sprint"
  | "jump"
  | "reload"
  | "pressCheck"
  | "restart"
  | "fire";

const KEY_BINDINGS: Record<Exclude<ActionName, "fire">, string[]> = {
  moveForward: ["KeyW", "ArrowUp"],
  moveBackward: ["KeyS", "ArrowDown"],
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  walk: ["ControlLeft", "ControlRight"],
  sprint: ["ShiftLeft", "ShiftRight"],
  jump: ["Space"],
  reload: ["KeyR"],
  pressCheck: ["KeyV"],
  restart: ["KeyR"]
};

export class InputManager {
  readonly canvas: HTMLCanvasElement;
  private readonly keysDown = new Set<string>();
  private readonly keysPressed = new Set<string>();
  private readonly keysReleased = new Set<string>();
  private readonly buttonsDown = new Set<number>();
  private readonly buttonsPressed = new Set<number>();
  private readonly buttonsReleased = new Set<number>();
  private accumulatedMouseX = 0;
  private accumulatedMouseY = 0;
  private pointerLocked = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.tabIndex = 0;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }

  requestPointerLock(): void {
    void this.canvas.requestPointerLock();
  }

  releasePointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  isActionDown(action: ActionName): boolean {
    if (action === "fire") {
      return this.buttonsDown.has(0);
    }

    return KEY_BINDINGS[action].some((code) => this.keysDown.has(code));
  }

  wasActionPressed(action: ActionName): boolean {
    if (action === "fire") {
      return this.buttonsPressed.has(0);
    }

    return KEY_BINDINGS[action].some((code) => this.keysPressed.has(code));
  }

  wasActionReleased(action: ActionName): boolean {
    if (action === "fire") {
      return this.buttonsReleased.has(0);
    }

    return KEY_BINDINGS[action].some((code) => this.keysReleased.has(code));
  }

  consumeLookDelta(): { x: number; y: number } {
    const delta = {
      x: this.accumulatedMouseX,
      y: this.accumulatedMouseY
    };

    this.accumulatedMouseX = 0;
    this.accumulatedMouseY = 0;

    return delta;
  }

  endFrame(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.buttonsPressed.clear();
    this.buttonsReleased.clear();
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.keysDown.has(event.code)) {
      this.keysPressed.add(event.code);
    }

    this.keysDown.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code);
    this.keysReleased.add(event.code);
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (!this.buttonsDown.has(event.button)) {
      this.buttonsPressed.add(event.button);
    }

    this.buttonsDown.add(event.button);
  };

  private onMouseUp = (event: MouseEvent): void => {
    this.buttonsDown.delete(event.button);
    this.buttonsReleased.add(event.button);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) {
      return;
    }

    this.accumulatedMouseX += event.movementX;
    this.accumulatedMouseY += event.movementY;
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  };

  private onBlur = (): void => {
    this.keysDown.clear();
    this.buttonsDown.clear();
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.buttonsPressed.clear();
    this.buttonsReleased.clear();
    this.accumulatedMouseX = 0;
    this.accumulatedMouseY = 0;
  };

  private onContextMenu = (event: Event): void => {
    event.preventDefault();
  };
}

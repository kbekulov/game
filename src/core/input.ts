export interface LookDelta {
  x: number;
  y: number;
}

export class InputManager {
  private readonly currentKeys = new Set<string>();
  private readonly previousKeys = new Set<string>();
  private readonly currentMouseButtons = new Set<number>();
  private readonly previousMouseButtons = new Set<number>();
  private lookDelta: LookDelta = { x: 0, y: 0 };
  private pointerLocked = false;
  private readonly pointerLockListeners = new Set<(locked: boolean) => void>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
  }

  beginFrame(): void {
    // Input state is finalized in endFrame.
  }

  endFrame(): void {
    this.previousKeys.clear();
    for (const key of this.currentKeys) {
      this.previousKeys.add(key);
    }

    this.previousMouseButtons.clear();
    for (const button of this.currentMouseButtons) {
      this.previousMouseButtons.add(button);
    }

    this.lookDelta = { x: 0, y: 0 };
  }

  isDown(code: string): boolean {
    return this.currentKeys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.currentKeys.has(code) && !this.previousKeys.has(code);
  }

  wasMousePressed(button = 0): boolean {
    return this.currentMouseButtons.has(button) && !this.previousMouseButtons.has(button);
  }

  consumeLookDelta(): LookDelta {
    return { x: this.lookDelta.x, y: this.lookDelta.y };
  }

  requestPointerLock(): void {
    if (!this.pointerLocked) {
      this.canvas.requestPointerLock();
    }
  }

  exitPointerLock(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  onPointerLockChange(listener: (locked: boolean) => void): () => void {
    this.pointerLockListeners.add(listener);

    return () => {
      this.pointerLockListeners.delete(listener);
    };
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.currentKeys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.currentKeys.delete(event.code);
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    this.currentMouseButtons.add(event.button);
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    this.currentMouseButtons.delete(event.button);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) {
      return;
    }

    this.lookDelta.x += event.movementX;
    this.lookDelta.y += event.movementY;
  };

  private readonly handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;

    for (const listener of this.pointerLockListeners) {
      listener(this.pointerLocked);
    }
  };
}

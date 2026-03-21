// InputManager — Keyboard & Mouse state tracking (singleton)
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouseDown = false;
        this.mouseDX = 0;
        this.mouseDY = 0;

        this._onKeyDown = (e) => { this.keys[e.code] = true; };
        this._onKeyUp = (e) => { this.keys[e.code] = false; };
        this._onMouseDown = (e) => { if (e.button === 0) this.mouseDown = true; };
        this._onMouseUp = (e) => { if (e.button === 0) this.mouseDown = false; };
        this._onMouseMove = (e) => {
            this.mouseDX += e.movementX || 0;
            this.mouseDY += e.movementY || 0;
        };

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('mousemove', this._onMouseMove);
    }

    isPressed(code) { return !!this.keys[code]; }

    consumeMouse() {
        const dx = this.mouseDX;
        const dy = this.mouseDY;
        this.mouseDX = 0;
        this.mouseDY = 0;
        return { dx, dy };
    }

    resetMouse() {
        this.mouseDX = 0;
        this.mouseDY = 0;
    }

    dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('mousemove', this._onMouseMove);
    }
}

// Singleton
export const input = new InputManager();

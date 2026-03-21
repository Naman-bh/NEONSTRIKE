// ModeManager — controls lifecycle of game modes (Wave, FreeAim, Scenario)

export class ModeManager {
    constructor(engine, physics, player, weaponManager, settings) {
        this.engine = engine;
        this.physics = physics;
        this.player = player;
        this.weaponManager = weaponManager;
        this.settings = settings;
        this.activeMode = null;
    }

    startMode(mode) {
        this.stopCurrentMode();
        this.activeMode = mode;
        mode.init(this.engine, this.physics, this.player, this.weaponManager, this.settings);
    }

    stopCurrentMode() {
        if (this.activeMode) {
            this.activeMode.cleanup();
            this.activeMode = null;
        }
    }

    restart() {
        if (this.activeMode) {
            const mode = this.activeMode;
            mode.cleanup();
            mode.init(this.engine, this.physics, this.player, this.weaponManager, this.settings);
        }
    }

    update(dt) {
        if (this.activeMode) {
            this.activeMode.update(dt);
        }
    }

    pause() {
        if (this.activeMode && this.activeMode.pause) {
            this.activeMode.pause();
        }
    }

    resume() {
        if (this.activeMode && this.activeMode.resume) {
            this.activeMode.resume();
        }
    }
}

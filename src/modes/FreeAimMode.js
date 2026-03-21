// FreeAimMode — infinite free aim training with selectable focus
import * as THREE from 'three';
import { TrainingRoom } from '../training/TrainingRoom.js';
import { TargetSpawner } from '../training/TargetSpawner.js';
import { ScoringEngine } from '../training/ScoringEngine.js';
import { FREE_AIM_CONFIGS } from '../training/ScenarioDefinitions.js';
import { input } from '../core/InputManager.js';
import { audio } from '../audio/AudioManager.js';

export class FreeAimMode {
    constructor(focus, callbacks) {
        // focus: 'flicking' | 'tracking' | 'precision'
        this.focus = focus;
        this.config = FREE_AIM_CONFIGS[focus];
        this.callbacks = callbacks; // { onEnd(results) }
    }

    init(engine, physics, player, weaponManager, settings) {
        this.engine = engine;
        this.physics = physics;
        this.player = player;
        this.weaponManager = weaponManager;
        this.paused = false;

        // Clear scene (keep camera)
        const camera = engine.camera;
        while (engine.scene.children.length > 0) {
            engine.scene.remove(engine.scene.children[0]);
        }
        engine.scene.add(camera);

        // Build training room
        this.room = new TrainingRoom(engine.scene);
        this.room.build(this.config.roomSize, {
            accentColor: 0xff8800, // Orange for training
        });

        // Set player position
        const [px, py, pz] = this.config.playerPos;
        player.resetToPosition(px, py, pz);
        player.reset();
        weaponManager.reset();

        // Scoring
        this.scoring = new ScoringEngine();

        // Target spawner
        this.spawner = new TargetSpawner(engine.scene, {
            maxActive: this.config.spawnConfig.maxActive,
            spawnDelay: this.config.spawnConfig.spawnDelay,
            targetConfig: this.config.targetConfig,
            spawnZone: this.config.spawnConfig.spawnZone,
            roomSize: this.config.roomSize,
        });

        // Training HUD
        this.trainingHud = document.getElementById('training-hud');
        if (this.trainingHud) this.trainingHud.classList.remove('hidden');

        // End key (Tab to end training)
        this._endPrev = false;
        this.elapsed = 0;
    }

    update(dt) {
        if (this.paused) return;

        this.elapsed += dt;

        // Physics
        this.physics.step(dt);

        // Player
        this.player.update(dt, this.engine.scene);

        // Tab to end training
        const endNow = input.isPressed('Tab');
        if (endNow && !this._endPrev && this.elapsed > 2) {
            this._endTraining();
            this._endPrev = endNow;
            return;
        }
        this._endPrev = endNow;

        // Weapons — fire & check hits against targets
        const targets = this.spawner.getActiveTargets();
        const hits = this.weaponManager.update(dt, targets);

        // Track shots (detect trigger pull from weaponManager)
        if (this.weaponManager._justFired) {
            this.scoring.registerShot();
        }

        hits.forEach(({ enemy: target }) => {
            target.onHit();
            const points = this.scoring.registerHit(target);
            audio.playHit();
            this._showHitMarker();
        });

        // Update spawner
        this.spawner.update(dt);

        // Room follow light
        this.room.updatePlayerLight(this.player.getPosition());

        // Update training HUD
        this._updateHUD();
    }

    _updateHUD() {
        const timer = document.getElementById('training-timer');
        const score = document.getElementById('training-live-score');
        const accuracy = document.getElementById('training-live-accuracy');
        const kills = document.getElementById('training-live-kills');
        const weaponName = document.getElementById('training-weapon-name');
        const ammoCurrent = document.getElementById('training-ammo-current');
        const ammoReserve = document.getElementById('training-ammo-reserve');

        if (timer) {
            const min = Math.floor(this.elapsed / 60);
            const sec = Math.floor(this.elapsed % 60);
            timer.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
        }
        if (score) score.textContent = this.scoring.score.toLocaleString();
        if (accuracy) accuracy.textContent = `${this.scoring.getAccuracyPercent()}%`;
        if (kills) kills.textContent = this.scoring.kills;

        // Weapon info
        const w = this.weaponManager.current;
        if (weaponName) weaponName.textContent = w.name;
        if (ammoCurrent) ammoCurrent.textContent = w.currentClip;
        if (ammoReserve) ammoReserve.textContent = w.reserve;
    }

    _showHitMarker() {
        const marker = document.getElementById('hit-marker-training');
        if (marker) {
            marker.classList.remove('hidden');
            setTimeout(() => marker.classList.add('hidden'), 150);
        }
    }

    _endTraining() {
        const results = this.scoring.getResults(this.config.gradeThresholds);
        results.focus = this.focus;
        if (this.callbacks.onEnd) {
            this.callbacks.onEnd(results);
        }
    }

    pause() { this.paused = true; }
    resume() { this.paused = false; }

    cleanup() {
        // Hide training HUD
        if (this.trainingHud) this.trainingHud.classList.add('hidden');

        // Cleanup spawner and room
        if (this.spawner) this.spawner.cleanup();
        if (this.room) this.room.cleanup();
    }
}

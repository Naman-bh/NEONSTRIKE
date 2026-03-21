// ScenarioMode — timed scenario drill runner
import * as THREE from 'three';
import { TrainingRoom } from '../training/TrainingRoom.js';
import { TargetSpawner } from '../training/TargetSpawner.js';
import { ScoringEngine } from '../training/ScoringEngine.js';
import { SCENARIOS } from '../training/ScenarioDefinitions.js';
import { input } from '../core/InputManager.js';
import { audio } from '../audio/AudioManager.js';

export class ScenarioMode {
    constructor(scenarioId, callbacks) {
        this.scenarioId = scenarioId;
        this.config = SCENARIOS[scenarioId];
        this.callbacks = callbacks; // { onEnd(results) }
    }

    init(engine, physics, player, weaponManager, settings) {
        this.engine = engine;
        this.physics = physics;
        this.player = player;
        this.weaponManager = weaponManager;
        this.paused = false;

        // Clear scene
        const camera = engine.camera;
        while (engine.scene.children.length > 0) {
            engine.scene.remove(engine.scene.children[0]);
        }
        engine.scene.add(camera);

        // Build scenario room
        this.room = new TrainingRoom(engine.scene);
        this.room.build(this.config.roomSize, {
            accentColor: 0xaa44ff, // Purple for scenarios
            coverPositions: this.config.coverPositions || [],
            gridWall: this.config.gridWall || null,
        });

        // Set player position
        const [px, py, pz] = this.config.playerPos;
        player.resetToPosition(px, py, pz);
        player.reset();
        weaponManager.reset();

        // Scoring
        this.scoring = new ScoringEngine();

        // Target spawner
        const spawnCfg = this.config.spawnConfig;
        this.spawner = new TargetSpawner(engine.scene, {
            maxActive: spawnCfg.maxActive,
            spawnDelay: spawnCfg.spawnDelay,
            targetConfig: this.config.targetConfig,
            spawnZone: spawnCfg.spawnZone,
            roomSize: this.config.roomSize,
            coverPositions: this.config.coverPositions || [],
            gridCols: spawnCfg.gridCols,
            gridRows: spawnCfg.gridRows,
        });

        // Timer
        this.timeRemaining = this.config.duration;
        this.finished = false;

        // Show training HUD
        this.trainingHud = document.getElementById('training-hud');
        if (this.trainingHud) this.trainingHud.classList.remove('hidden');
    }

    update(dt) {
        if (this.paused || this.finished) return;

        // Countdown timer
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this._endScenario();
            return;
        }

        // Physics
        this.physics.step(dt);

        // Player
        this.player.update(dt, this.engine.scene);

        // Weapons vs targets
        const targets = this.spawner.getActiveTargets();
        const hits = this.weaponManager.update(dt, targets);

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

        // Update HUD
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
            const min = Math.floor(this.timeRemaining / 60);
            const sec = Math.floor(this.timeRemaining % 60);
            timer.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
            // Flash red when low
            if (this.timeRemaining <= 10) {
                timer.style.color = '#ff2d2d';
            } else {
                timer.style.color = '';
            }
        }
        if (score) score.textContent = this.scoring.score.toLocaleString();
        if (accuracy) accuracy.textContent = `${this.scoring.getAccuracyPercent()}%`;
        if (kills) kills.textContent = this.scoring.kills;

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

    _endScenario() {
        this.finished = true;
        const results = this.scoring.getResults(this.config.gradeThresholds);
        results.scenarioId = this.scenarioId;
        results.scenarioName = this.config.name;
        if (this.callbacks.onEnd) {
            this.callbacks.onEnd(results);
        }
    }

    pause() { this.paused = true; }
    resume() { this.paused = false; }

    cleanup() {
        if (this.trainingHud) this.trainingHud.classList.add('hidden');
        if (this.spawner) this.spawner.cleanup();
        if (this.room) this.room.cleanup();
    }
}

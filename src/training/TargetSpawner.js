// TargetSpawner — configurable target spawner for training and scenarios
import * as THREE from 'three';
import { Target } from './Target.js';

export class TargetSpawner {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.targets = [];
        this.maxActive = config.maxActive || 1;
        this.spawnDelay = config.spawnDelay || 0;
        this.targetConfig = config.targetConfig || {};
        this.spawnZone = config.spawnZone || 'wall_face'; // 'wall_face' | 'grid_wall' | 'full_360' | 'center_lane' | 'distributed'
        this.roomSize = config.roomSize || { w: 30, h: 8, d: 30 };
        this.coverPositions = config.coverPositions || [];

        this._spawnTimer = 0;
        this._spawnQueue = 0; // How many targets need to be spawned
        this._batchKillCount = 0;
        this._batchSize = config.batchSize || this.maxActive;

        // Grid wall config (for gridshot)
        this._gridCols = config.gridCols || 3;
        this._gridRows = config.gridRows || 2;
    }

    update(dt) {
        // Update existing targets
        this.targets.forEach(t => t.update(dt));

        // Clean up dead targets
        const deadTargets = this.targets.filter(t => !t.alive);
        deadTargets.forEach(t => {
            this.scene.remove(t.mesh);
            t.dispose();
        });
        this.targets = this.targets.filter(t => t.alive);

        // Spawn timer
        this._spawnTimer += dt;

        const active = this.targets.length;
        if (active < this.maxActive && this._spawnTimer >= this.spawnDelay) {
            this._spawnOne();
            this._spawnTimer = 0;
        }
    }

    _spawnOne() {
        const pos = this._getSpawnPosition();
        const config = { ...this.targetConfig };

        // Override config for peek targets
        if (config.movePattern === 'peek' && this.coverPositions.length > 0) {
            const cover = this.coverPositions[Math.floor(Math.random() * this.coverPositions.length)];
            const behindOffset = (cover.d || 1) / 2 + 0.5;
            config.peekHidePos = new THREE.Vector3(cover.x, 1, cover.z - behindOffset);
            config.peekShowPos = new THREE.Vector3(cover.x + (cover.w || 2) / 2 + 0.5, 1, cover.z);
        }

        const target = new Target(pos, config);
        this.targets.push(target);
        this.scene.add(target.mesh);

        if (config.movePattern === 'peek') {
            target.startPeek();
        }
    }

    _getSpawnPosition() {
        const { w, h, d } = this.roomSize;

        switch (this.spawnZone) {
            case 'grid_wall': {
                // Random grid cell on the back wall
                const col = Math.floor(Math.random() * this._gridCols);
                const row = Math.floor(Math.random() * this._gridRows);
                const cellW = (w * 0.8) / this._gridCols;
                const cellH = (h * 0.7) / this._gridRows;
                const x = -w * 0.4 + (col + 0.5) * cellW;
                const y = 1 + (row + 0.5) * cellH;
                return new THREE.Vector3(x, y, -d / 2 + 1);
            }

            case 'wall_face': {
                // Random position on the front-facing wall
                const x = (Math.random() - 0.5) * w * 0.7;
                const y = 1.5 + Math.random() * (h - 3);
                return new THREE.Vector3(x, y, -d / 2 + 1);
            }

            case 'full_360': {
                // Random position around the player (center)
                const angle = Math.random() * Math.PI * 2;
                const dist = 8 + Math.random() * 5;
                const x = Math.cos(angle) * dist;
                const z = Math.sin(angle) * dist;
                const y = 1 + Math.random() * 3;
                return new THREE.Vector3(
                    Math.max(-w / 2 + 1, Math.min(w / 2 - 1, x)),
                    y,
                    Math.max(-d / 2 + 1, Math.min(d / 2 - 1, z))
                );
            }

            case 'center_lane': {
                // Center of the room, for strafing
                return new THREE.Vector3(0, 1.2, -d / 3);
            }

            case 'distributed': {
                // Spread across the room
                const x = (Math.random() - 0.5) * w * 0.7;
                const z = (Math.random() - 0.5) * d * 0.4 - d * 0.1;
                const y = 1 + Math.random() * 2;
                return new THREE.Vector3(x, y, z);
            }

            default:
                return new THREE.Vector3(0, 2, -5);
        }
    }

    getActiveTargets() {
        return this.targets.filter(t => t.alive && t.canBeHit());
    }

    reset() {
        this.targets.forEach(t => {
            this.scene.remove(t.mesh);
            t.dispose();
        });
        this.targets = [];
        this._spawnTimer = 0;
    }

    cleanup() {
        this.reset();
    }
}

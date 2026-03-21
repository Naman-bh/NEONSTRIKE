// WaveMode — encapsulates all wave survival gameplay logic
import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { FastEnemy } from '../entities/FastEnemy.js';
import { Pickup } from '../entities/Pickup.js';
import { Grenade } from '../entities/Grenade.js';
import { LevelBuilder } from '../world/LevelBuilder.js';
import { HUD } from '../ui/HUD.js';
import { Minimap } from '../ui/Minimap.js';
import { audio } from '../audio/AudioManager.js';
import { input } from '../core/InputManager.js';
import {
    WAVE_BASE_COUNT, WAVE_INCREMENT, WAVE_HEALTH_SCALE,
    WAVE_SPEED_SCALE, WAVE_DELAY, ARENA_SIZE,
    PICKUP_SPAWN_CHANCE, PICKUP_HEALTH_AMOUNT, PICKUP_AMMO_AMOUNT,
    GRENADE_MAX, GRENADE_THROW_FORCE,
} from '../utils/constants.js';
import { randomPointInArena, distanceXZ } from '../utils/math.js';

export class WaveMode {
    constructor(callbacks) {
        // callbacks: { onGameOver(results), onPause() }
        this.callbacks = callbacks;
    }

    init(engine, physics, player, weaponManager, settings) {
        this.engine = engine;
        this.physics = physics;
        this.player = player;
        this.weaponManager = weaponManager;
        this.settings = settings;

        // Build wave arena
        this.level = new LevelBuilder(engine.scene, physics);
        this.level.build();

        // State
        this.enemies = [];
        this.pickups = [];
        this.grenades = [];
        this.currentWave = 1;
        this.waveTimer = 1;
        this.waveActive = false;
        this.gameStartTime = performance.now();
        this.grenadeCount = GRENADE_MAX;
        this.totalShots = 0;
        this.totalHits = 0;
        this.grenadePrev = false;
        this.paused = false;

        // HUD
        this.hud = new HUD();
        this.minimap = new Minimap();

        // Reset player & weapons
        player.reset();
        weaponManager.reset();
        this.hud.resetCombo();

        // Show HUD elements
        const hudEl = document.getElementById('hud');
        const minimapCanvas = document.getElementById('minimap');
        if (hudEl) hudEl.classList.remove('hidden');
        if (minimapCanvas) minimapCanvas.style.display = 'block';
    }

    update(dt) {
        if (this.paused) return;

        // Physics
        this.physics.step(dt);

        // Player
        this.player.update(dt, this.engine.scene);

        // Grenade throwing
        const grenadeKeyNow = input.isPressed('KeyG');
        if (grenadeKeyNow && !this.grenadePrev) {
            this._throwGrenade();
        }
        this.grenadePrev = grenadeKeyNow;

        // Weapons — fire & check hits
        const hits = this.weaponManager.update(dt, this.enemies);
        hits.forEach(({ enemy, point }) => {
            enemy.takeDamage(this.weaponManager.current.damage);
            audio.playHit();
            this.hud.showHitMarker();
            this.totalHits++;

            if (!enemy.alive) {
                this.player.score++;
                audio.playEnemyDeath();
                const isCombo = this.hud.registerKill(enemy.enemyType || 'basic');
                if (isCombo) {
                    audio.playCombo();
                }
                // Chance to spawn pickup
                if (Math.random() < PICKUP_SPAWN_CHANCE) {
                    this._spawnPickup(enemy.mesh.position.clone());
                }
            }
        });

        // Enemies
        const playerPos = this.player.getPosition();
        this.enemies.forEach(enemy => {
            const dmg = enemy.update(dt, playerPos);
            if (dmg && dmg > 0 && this.player.alive) {
                this.player.takeDamage(dmg);
                if (!this.player.isInvincible) {
                    audio.playDamage();
                    this.hud.flashDamage();
                }
                if (!this.player.alive) {
                    this._showGameOver();
                }
            }
        });

        // Grenades
        this.grenades.forEach(g => {
            const explosion = g.update(dt);
            if (explosion) {
                const expMesh = g.getExplosionMesh();
                if (expMesh) this.engine.addToScene(expMesh);
                audio.playExplosion();

                this.enemies.forEach(enemy => {
                    if (!enemy.alive) return;
                    const d = distanceXZ(enemy.mesh.position, explosion.position);
                    if (d < explosion.radius) {
                        const falloff = 1 - (d / explosion.radius);
                        const dmg = Math.round(explosion.damage * falloff);
                        enemy.takeDamage(dmg);
                        if (!enemy.alive) {
                            this.player.score++;
                            audio.playEnemyDeath();
                            this.hud.registerKill(enemy.enemyType || 'basic');
                        }
                    }
                });
            }
        });

        // Pickups
        this.pickups.forEach(p => {
            p.update(dt);
            const collected = p.checkCollect(playerPos);
            if (collected === 'health') {
                this.player.heal(PICKUP_HEALTH_AMOUNT);
                audio.playPickup();
            } else if (collected === 'ammo') {
                this.weaponManager.current.reserve += PICKUP_AMMO_AMOUNT;
                audio.playPickup();
            }
        });

        // Clean up dead enemies & collected pickups
        this.enemies = this.enemies.filter(e => {
            if (!e.alive && e.deathTimer > 2) {
                this.engine.removeFromScene(e.mesh);
                return false;
            }
            return true;
        });
        this.pickups = this.pickups.filter(p => {
            if (p.collected) {
                this.engine.removeFromScene(p.mesh);
                return false;
            }
            return true;
        });
        this.grenades = this.grenades.filter(g => {
            if (!g.alive) {
                this.engine.removeFromScene(g.mesh);
                if (g.explosionMesh) this.engine.removeFromScene(g.explosionMesh);
                return false;
            }
            return true;
        });

        // Wave progression
        const aliveEnemies = this.enemies.filter(e => e.alive).length;
        if (this.waveActive && aliveEnemies === 0) {
            this.waveActive = false;
            this.currentWave++;
            this.waveTimer = WAVE_DELAY;
        }
        if (!this.waveActive) {
            this.waveTimer -= dt;
            if (this.waveTimer <= 0) {
                this._spawnWave();
            }
        }

        // Level ambient + player follow light
        this.level.update(dt);
        if (this.level._playerLight) {
            const pp = this.player.getPosition();
            this.level._playerLight.position.set(pp.x, pp.y + 2, pp.z);
        }

        // HUD
        this.hud.update(dt, this.player, this.weaponManager, this.currentWave, this.grenadeCount);

        // Minimap
        this.minimap.update(this.player, this.enemies, this.pickups, this.grenades);
    }

    pause() { this.paused = true; }
    resume() { this.paused = false; }

    cleanup() {
        // Remove all entities from scene
        this.enemies.forEach(e => this.engine.removeFromScene(e.mesh));
        this.pickups.forEach(p => this.engine.removeFromScene(p.mesh));
        this.grenades.forEach(g => {
            this.engine.removeFromScene(g.mesh);
            if (g.explosionMesh) this.engine.removeFromScene(g.explosionMesh);
        });
        this.enemies = [];
        this.pickups = [];
        this.grenades = [];

        // Remove level geometry
        if (this.level) {
            // Remove all scene children added by level (we'll rebuild on next init)
            // Since LevelBuilder adds directly to scene, we clear and re-add camera
            const camera = this.engine.camera;
            while (this.engine.scene.children.length > 0) {
                this.engine.scene.remove(this.engine.scene.children[0]);
            }
            this.engine.scene.add(camera);
        }

        // Hide HUD
        const hudEl = document.getElementById('hud');
        const minimapCanvas = document.getElementById('minimap');
        if (hudEl) hudEl.classList.add('hidden');
        if (minimapCanvas) minimapCanvas.style.display = 'none';
    }

    getResults() {
        const elapsed = Math.floor((performance.now() - this.gameStartTime) / 1000);
        const min = Math.floor(elapsed / 60);
        const sec = elapsed % 60;
        const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;
        return {
            kills: this.player.score,
            waves: this.currentWave,
            time: timeStr,
            combo: this.hud.maxCombo,
            date: Date.now(),
        };
    }

    // ===== Private methods =====

    _spawnWave() {
        const baseCount = WAVE_BASE_COUNT + (this.currentWave - 1) * WAVE_INCREMENT;
        const hpMult = Math.pow(WAVE_HEALTH_SCALE, this.currentWave - 1);
        const spdMult = Math.pow(WAVE_SPEED_SCALE, this.currentWave - 1);

        this.hud.announce(`WAVE ${this.currentWave}`);

        for (let i = 0; i < baseCount; i++) {
            let pos;
            do {
                pos = randomPointInArena(ARENA_SIZE, 8);
            } while (pos.distanceTo(this.player.getPosition()) < 15);

            let enemy;
            if (this.currentWave >= 5 && i % 5 === 0) {
                enemy = new TankEnemy(pos, hpMult * 0.5, spdMult);
            } else if (this.currentWave >= 3 && i % 3 === 0) {
                enemy = new FastEnemy(pos, hpMult, spdMult);
            } else {
                enemy = new Enemy(pos, hpMult, spdMult);
            }

            this.enemies.push(enemy);
            this.engine.addToScene(enemy.mesh);
        }

        if (this.currentWave % 2 === 0 && this.grenadeCount < GRENADE_MAX) {
            this.grenadeCount++;
        }
        this.waveActive = true;
    }

    _throwGrenade() {
        if (this.grenadeCount <= 0) return;
        this.grenadeCount--;

        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.engine.camera.quaternion);
        dir.y = 0;
        dir.normalize();

        const g = new Grenade(this.player.getPosition(), dir, GRENADE_THROW_FORCE);
        this.grenades.push(g);
        this.engine.addToScene(g.mesh);
    }

    _spawnPickup(position) {
        const type = Math.random() < 0.5 ? 'health' : 'ammo';
        const p = new Pickup(position, type);
        this.pickups.push(p);
        this.engine.addToScene(p.mesh);
    }

    _showGameOver() {
        if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver(this.getResults());
        }
    }
}

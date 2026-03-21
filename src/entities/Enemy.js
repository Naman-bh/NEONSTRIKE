// Enemy — 3D entity with AI state machine
import * as THREE from 'three';
import {
    ENEMY_BASE_HEALTH, ENEMY_SPEED, ENEMY_ATTACK_RANGE,
    ENEMY_ATTACK_DAMAGE, ENEMY_ATTACK_RATE, ENEMY_DETECT_RANGE, ENEMY_SIZE,
    ARENA_SIZE
} from '../utils/constants.js';
import { distanceXZ, clamp, randomRange } from '../utils/math.js';

const STATES = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    DEAD: 'dead',
};

export class Enemy {
    constructor(position, healthMultiplier = 1, speedMultiplier = 1) {
        this.maxHealth = Math.round(ENEMY_BASE_HEALTH * healthMultiplier);
        this.health = this.maxHealth;
        this.speed = ENEMY_SPEED * speedMultiplier;
        this.alive = true;
        this.state = STATES.PATROL;
        this.attackTimer = 0;
        this.stateTimer = 0;

        // Visual — glowing enemy capsule
        this.mesh = this._createMesh();
        this.mesh.position.copy(position);
        this.mesh.position.y = ENEMY_SIZE.h / 2;

        // Patrol target
        this.patrolTarget = this._randomPatrolPoint();

        // Death animation
        this.deathTimer = 0;
    }

    _createMesh() {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.CylinderGeometry(
            ENEMY_SIZE.w / 2, ENEMY_SIZE.w / 2, ENEMY_SIZE.h - 0.4, 8
        );
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x880022,
            emissive: 0xff1144,
            emissiveIntensity: 0.3,
            metalness: 0.6,
            roughness: 0.3,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        // Head (sphere)
        const headGeo = new THREE.SphereGeometry(ENEMY_SIZE.w / 2.2, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0xaa0033,
            emissive: 0xff2255,
            emissiveIntensity: 0.5,
            metalness: 0.5,
            roughness: 0.3,
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = ENEMY_SIZE.h / 2 - 0.1;
        head.castShadow = true;
        group.add(head);

        // Eyes (neon glow)
        const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, ENEMY_SIZE.h / 2, -0.25);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, ENEMY_SIZE.h / 2, -0.25);
        group.add(rightEye);

        // Neon ring
        const ringGeo = new THREE.TorusGeometry(ENEMY_SIZE.w / 2 + 0.05, 0.02, 8, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff1144,
            transparent: true,
            opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0;
        group.add(ring);

        // Health bar (billboarded)
        const hbBg = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.08),
            new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.6 })
        );
        hbBg.position.y = ENEMY_SIZE.h / 2 + 0.5;
        group.add(hbBg);

        const hbFill = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.08),
            new THREE.MeshBasicMaterial({ color: 0xff2244 })
        );
        hbFill.position.y = ENEMY_SIZE.h / 2 + 0.5;
        hbFill.position.z = 0.001;
        group.add(hbFill);
        this._healthBarFill = hbFill;
        this._healthBarBg = hbBg;

        return group;
    }

    _randomPatrolPoint() {
        const half = ARENA_SIZE / 2 - 5;
        return new THREE.Vector3(
            randomRange(-half, half),
            0,
            randomRange(-half, half)
        );
    }

    update(dt, playerPos) {
        if (!this.alive) {
            this.deathTimer += dt;
            // Sink into ground
            this.mesh.position.y -= dt * 1.5;
            this.mesh.rotation.x += dt * 2;
            if (this.deathTimer > 1.5) {
                this.mesh.visible = false;
            }
            return null; // no damage to player
        }

        const dist = distanceXZ(this.mesh.position, playerPos);
        this.attackTimer -= dt;
        this.stateTimer += dt;

        // State transitions
        if (dist < ENEMY_ATTACK_RANGE) {
            this.state = STATES.ATTACK;
        } else if (dist < ENEMY_DETECT_RANGE) {
            this.state = STATES.CHASE;
        } else if (this.stateTimer > 5) {
            this.state = STATES.PATROL;
            this.patrolTarget = this._randomPatrolPoint();
            this.stateTimer = 0;
        }

        let damageToPlayer = 0;

        switch (this.state) {
            case STATES.PATROL:
                this._moveToward(this.patrolTarget, dt, 0.5);
                if (distanceXZ(this.mesh.position, this.patrolTarget) < 2) {
                    this.patrolTarget = this._randomPatrolPoint();
                }
                break;

            case STATES.CHASE:
                this._moveToward(playerPos, dt, 1.0);
                break;

            case STATES.ATTACK:
                this._moveToward(playerPos, dt, 0.6);
                // Look at player
                this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
                if (this.attackTimer <= 0 && dist < ENEMY_ATTACK_RANGE) {
                    damageToPlayer = ENEMY_ATTACK_DAMAGE;
                    this.attackTimer = ENEMY_ATTACK_RATE;
                }
                break;
        }

        // Billboard health bar toward camera
        if (this._healthBarFill && this._healthBarBg) {
            const hp = this.health / this.maxHealth;
            this._healthBarFill.scale.x = hp;
            this._healthBarFill.position.x = -(1 - hp) / 2;
        }

        // Neon pulse
        const pulse = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
        const bodyMesh = this.mesh.children[0];
        if (bodyMesh && bodyMesh.material) {
            bodyMesh.material.emissiveIntensity = this.state === STATES.ATTACK ? 0.8 : pulse;
        }

        return damageToPlayer;
    }

    _moveToward(target, dt, speedScale) {
        const dir = new THREE.Vector3(
            target.x - this.mesh.position.x,
            0,
            target.z - this.mesh.position.z
        );
        if (dir.lengthSq() > 0.1) {
            dir.normalize();
            this.mesh.position.x += dir.x * this.speed * speedScale * dt;
            this.mesh.position.z += dir.z * this.speed * speedScale * dt;
            // Keep within arena
            const half = ARENA_SIZE / 2 - 1;
            this.mesh.position.x = clamp(this.mesh.position.x, -half, half);
            this.mesh.position.z = clamp(this.mesh.position.z, -half, half);
            // Face movement direction
            this.mesh.lookAt(
                this.mesh.position.x + dir.x,
                this.mesh.position.y,
                this.mesh.position.z + dir.z
            );
        }
    }

    takeDamage(amount) {
        if (!this.alive) return;
        this.health -= amount;
        // Flash white on hit
        const bodyMesh = this.mesh.children[0];
        if (bodyMesh && bodyMesh.material) {
            const origColor = bodyMesh.material.color.clone();
            bodyMesh.material.emissive.set(0xffffff);
            bodyMesh.material.emissiveIntensity = 2;
            setTimeout(() => {
                if (bodyMesh.material) {
                    bodyMesh.material.emissive.set(0xff1144);
                    bodyMesh.material.emissiveIntensity = 0.3;
                }
            }, 80);
        }
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            this.state = STATES.DEAD;
        }
    }
}

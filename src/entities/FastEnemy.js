// FastEnemy — quick, low HP, small, agile
import * as THREE from 'three';
import {
    FAST_ENEMY_HEALTH, FAST_ENEMY_SPEED, FAST_ENEMY_DAMAGE,
    FAST_ENEMY_SIZE, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_RATE,
    ENEMY_DETECT_RANGE, ARENA_SIZE
} from '../utils/constants.js';
import { distanceXZ, clamp, randomRange } from '../utils/math.js';

const STATES = { IDLE: 'idle', PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', DEAD: 'dead' };

export class FastEnemy {
    constructor(position, healthMultiplier = 1, speedMultiplier = 1) {
        this.maxHealth = Math.round(FAST_ENEMY_HEALTH * healthMultiplier);
        this.health = this.maxHealth;
        this.speed = FAST_ENEMY_SPEED * speedMultiplier;
        this.alive = true;
        this.state = STATES.CHASE; // fast enemies are aggressive
        this.attackTimer = 0;
        this.stateTimer = 0;
        this.enemyType = 'fast';

        this.mesh = this._createMesh();
        this.mesh.position.copy(position);
        this.mesh.position.y = FAST_ENEMY_SIZE.h / 2;

        this.patrolTarget = this._randomPatrolPoint();
        this.deathTimer = 0;
    }

    _createMesh() {
        const group = new THREE.Group();
        const S = FAST_ENEMY_SIZE;

        // Body — slim cone shape
        const bodyGeo = new THREE.ConeGeometry(S.w / 2, S.h - 0.2, 6);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x004422,
            emissive: 0x00ff44,
            emissiveIntensity: 0.4,
            metalness: 0.5,
            roughness: 0.3,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.04, 4, 4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08, S.h / 2 - 0.25, -0.15);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.08, S.h / 2 - 0.25, -0.15);
        group.add(rightEye);

        // Speed trail ring
        const ringGeo = new THREE.TorusGeometry(S.w / 2 + 0.05, 0.015, 6, 12);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -S.h / 2 + 0.1;
        group.add(ring);

        // Health bar
        const hbBg = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.6 })
        );
        hbBg.position.y = S.h / 2 + 0.3;
        group.add(hbBg);

        const hbFill = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x00ff44 })
        );
        hbFill.position.y = S.h / 2 + 0.3;
        hbFill.position.z = 0.001;
        group.add(hbFill);
        this._healthBarFill = hbFill;
        this._healthBarBg = hbBg;

        return group;
    }

    _randomPatrolPoint() {
        const half = ARENA_SIZE / 2 - 5;
        return new THREE.Vector3(randomRange(-half, half), 0, randomRange(-half, half));
    }

    update(dt, playerPos) {
        if (!this.alive) {
            this.deathTimer += dt;
            this.mesh.position.y -= dt * 2;
            this.mesh.rotation.z += dt * 5;
            if (this.deathTimer > 1.5) this.mesh.visible = false;
            return null;
        }

        const dist = distanceXZ(this.mesh.position, playerPos);
        this.attackTimer -= dt;
        this.stateTimer += dt;

        // Fast enemies are always aggressive
        if (dist < ENEMY_ATTACK_RANGE - 2) this.state = STATES.ATTACK;
        else if (dist < ENEMY_DETECT_RANGE + 10) this.state = STATES.CHASE;
        else {
            this.state = STATES.PATROL;
            if (this.stateTimer > 3) {
                this.patrolTarget = this._randomPatrolPoint();
                this.stateTimer = 0;
            }
        }

        let damageToPlayer = 0;

        switch (this.state) {
            case STATES.PATROL:
                this._moveToward(this.patrolTarget, dt, 0.8);
                if (distanceXZ(this.mesh.position, this.patrolTarget) < 2)
                    this.patrolTarget = this._randomPatrolPoint();
                break;
            case STATES.CHASE:
                this._moveToward(playerPos, dt, 1.2);
                break;
            case STATES.ATTACK:
                this._moveToward(playerPos, dt, 0.9);
                this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
                if (this.attackTimer <= 0 && dist < ENEMY_ATTACK_RANGE) {
                    damageToPlayer = FAST_ENEMY_DAMAGE;
                    this.attackTimer = ENEMY_ATTACK_RATE * 0.6;
                }
                break;
        }

        // Health bar
        if (this._healthBarFill) {
            const hp = this.health / this.maxHealth;
            this._healthBarFill.scale.x = hp;
            this._healthBarFill.position.x = -(0.6 * (1 - hp)) / 2;
        }

        // Quick pulse
        const pulse = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
        const bodyMesh = this.mesh.children[0];
        if (bodyMesh?.material) {
            bodyMesh.material.emissiveIntensity = this.state === STATES.ATTACK ? 1.0 : pulse;
        }

        return damageToPlayer;
    }

    _moveToward(target, dt, speedScale) {
        const dir = new THREE.Vector3(target.x - this.mesh.position.x, 0, target.z - this.mesh.position.z);
        if (dir.lengthSq() > 0.1) {
            dir.normalize();
            this.mesh.position.x += dir.x * this.speed * speedScale * dt;
            this.mesh.position.z += dir.z * this.speed * speedScale * dt;
            const half = ARENA_SIZE / 2 - 1;
            this.mesh.position.x = clamp(this.mesh.position.x, -half, half);
            this.mesh.position.z = clamp(this.mesh.position.z, -half, half);
            this.mesh.lookAt(this.mesh.position.x + dir.x, this.mesh.position.y, this.mesh.position.z + dir.z);
        }
    }

    takeDamage(amount) {
        if (!this.alive) return;
        this.health -= amount;
        const bodyMesh = this.mesh.children[0];
        if (bodyMesh?.material) {
            bodyMesh.material.emissive.set(0xffffff);
            bodyMesh.material.emissiveIntensity = 2;
            setTimeout(() => {
                if (bodyMesh.material) {
                    bodyMesh.material.emissive.set(0x00ff44);
                    bodyMesh.material.emissiveIntensity = 0.4;
                }
            }, 60);
        }
        if (this.health <= 0) { this.health = 0; this.alive = false; this.state = STATES.DEAD; }
    }
}

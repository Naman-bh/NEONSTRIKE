// TankEnemy — high HP, slow, heavy damage
import * as THREE from 'three';
import {
    TANK_ENEMY_HEALTH, TANK_ENEMY_SPEED, TANK_ENEMY_DAMAGE,
    TANK_ENEMY_SIZE, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_RATE,
    ENEMY_DETECT_RANGE, ARENA_SIZE
} from '../utils/constants.js';
import { distanceXZ, clamp, randomRange } from '../utils/math.js';

const STATES = { IDLE: 'idle', PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', DEAD: 'dead' };

export class TankEnemy {
    constructor(position, healthMultiplier = 1, speedMultiplier = 1) {
        this.maxHealth = Math.round(TANK_ENEMY_HEALTH * healthMultiplier);
        this.health = this.maxHealth;
        this.speed = TANK_ENEMY_SPEED * speedMultiplier;
        this.alive = true;
        this.state = STATES.PATROL;
        this.attackTimer = 0;
        this.stateTimer = 0;
        this.enemyType = 'tank';

        this.mesh = this._createMesh();
        this.mesh.position.copy(position);
        this.mesh.position.y = TANK_ENEMY_SIZE.h / 2;

        this.patrolTarget = this._randomPatrolPoint();
        this.deathTimer = 0;
    }

    _createMesh() {
        const group = new THREE.Group();
        const S = TANK_ENEMY_SIZE;

        // Body — thick armored cylinder
        const bodyGeo = new THREE.CylinderGeometry(S.w / 2, S.w / 2 + 0.1, S.h - 0.5, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x221144,
            emissive: 0x6622cc,
            emissiveIntensity: 0.3,
            metalness: 0.7,
            roughness: 0.2,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(S.w / 2, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0x331166,
            emissive: 0x8833ff,
            emissiveIntensity: 0.5,
            metalness: 0.5,
            roughness: 0.3,
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = S.h / 2 - 0.1;
        head.castShadow = true;
        group.add(head);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.08, 4, 4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.18, S.h / 2, -0.35);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.18, S.h / 2, -0.35);
        group.add(rightEye);

        // Armor rings
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(S.w / 2 + 0.08, 0.03, 8, 16);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x8833ff, transparent: true, opacity: 0.5 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = -0.4 + i * 0.4;
            group.add(ring);
        }

        // Health bar
        const hbBg = new THREE.Mesh(
            new THREE.PlaneGeometry(1.4, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.6 })
        );
        hbBg.position.y = S.h / 2 + 0.6;
        group.add(hbBg);

        const hbFill = new THREE.Mesh(
            new THREE.PlaneGeometry(1.4, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x8833ff })
        );
        hbFill.position.y = S.h / 2 + 0.6;
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
            this.mesh.position.y -= dt * 1.0;
            this.mesh.rotation.x += dt * 1;
            if (this.deathTimer > 2) this.mesh.visible = false;
            return null;
        }

        const dist = distanceXZ(this.mesh.position, playerPos);
        this.attackTimer -= dt;
        this.stateTimer += dt;

        if (dist < ENEMY_ATTACK_RANGE + 2) this.state = STATES.ATTACK;
        else if (dist < ENEMY_DETECT_RANGE + 5) this.state = STATES.CHASE;
        else if (this.stateTimer > 6) {
            this.state = STATES.PATROL;
            this.patrolTarget = this._randomPatrolPoint();
            this.stateTimer = 0;
        }

        let damageToPlayer = 0;

        switch (this.state) {
            case STATES.PATROL:
                this._moveToward(this.patrolTarget, dt, 0.4);
                if (distanceXZ(this.mesh.position, this.patrolTarget) < 2)
                    this.patrolTarget = this._randomPatrolPoint();
                break;
            case STATES.CHASE:
                this._moveToward(playerPos, dt, 0.8);
                break;
            case STATES.ATTACK:
                this._moveToward(playerPos, dt, 0.5);
                this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
                if (this.attackTimer <= 0 && dist < ENEMY_ATTACK_RANGE + 2) {
                    damageToPlayer = TANK_ENEMY_DAMAGE;
                    this.attackTimer = ENEMY_ATTACK_RATE * 1.2;
                }
                break;
        }

        // Health bar
        if (this._healthBarFill) {
            const hp = this.health / this.maxHealth;
            this._healthBarFill.scale.x = hp;
            this._healthBarFill.position.x = -(1.4 * (1 - hp)) / 2;
        }

        // Pulse
        const pulse = 0.3 + Math.sin(Date.now() * 0.003) * 0.2;
        const bodyMesh = this.mesh.children[0];
        if (bodyMesh?.material) {
            bodyMesh.material.emissiveIntensity = this.state === STATES.ATTACK ? 0.8 : pulse;
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
                    bodyMesh.material.emissive.set(0x6622cc);
                    bodyMesh.material.emissiveIntensity = 0.3;
                }
            }, 80);
        }
        if (this.health <= 0) { this.health = 0; this.alive = false; this.state = STATES.DEAD; }
    }
}

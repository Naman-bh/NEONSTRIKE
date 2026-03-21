// Player — FPS camera controller, movement, health
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { input } from '../core/InputManager.js';
import {
    PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_JUMP_FORCE,
    PLAYER_HEIGHT, PLAYER_MAX_HEALTH, MOUSE_SENSITIVITY,
    DASH_SPEED, DASH_DURATION, DASH_COOLDOWN
} from '../utils/constants.js';
import { clamp } from '../utils/math.js';

export class Player {
    constructor(camera, physicsWorld) {
        this.camera = camera;
        this.physicsWorld = physicsWorld;

        this.health = PLAYER_MAX_HEALTH;
        this.maxHealth = PLAYER_MAX_HEALTH;
        this.alive = true;
        this.score = 0;

        // Euler for look
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.pitchLimit = Math.PI / 2 - 0.05;

        // Physics body
        const shape = new CANNON.Sphere(0.4);
        this.body = new CANNON.Body({ mass: 80, shape, linearDamping: 0.9 });
        this.body.position.set(0, PLAYER_HEIGHT, 0);
        this.body.fixedRotation = true;
        this.physicsWorld.world.addBody(this.body);

        // Ground check
        this.onGround = false;
        this.groundRay = new THREE.Raycaster();

        // Velocity tracking
        this.moveDir = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();

        // Dash ability
        this.dashCooldown = 0;
        this.dashTimer = 0;
        this.isDashing = false;
        this.dashDir = new THREE.Vector3();
        this.isInvincible = false;
        this._prevDashKey = false;

        // External sensitivity override
        this.sensitivityOverride = null;

        // Pointer lock
        this.locked = false;
        document.addEventListener('pointerlockchange', () => {
            this.locked = !!document.pointerLockElement;
        });
    }

    requestPointerLock(canvas) {
        canvas.requestPointerLock();
    }

    update(dt, scene) {
        if (!this.alive) return;

        // --- Mouse look ---
        if (this.locked) {
            const { dx, dy } = input.consumeMouse();
            this.euler.setFromQuaternion(this.camera.quaternion);
            const sens = this.sensitivityOverride || MOUSE_SENSITIVITY;
            this.euler.y -= dx * sens;
            this.euler.x -= dy * sens;
            this.euler.x = clamp(this.euler.x, -this.pitchLimit, this.pitchLimit);
            this.camera.quaternion.setFromEuler(this.euler);
        }

        // --- Movement ---
        this.camera.getWorldDirection(this.forward);
        this.forward.y = 0;
        this.forward.normalize();
        this.right.crossVectors(this.forward, new THREE.Vector3(0, 1, 0)).normalize();

        this.moveDir.set(0, 0, 0);
        if (input.isPressed('KeyW')) this.moveDir.add(this.forward);
        if (input.isPressed('KeyS')) this.moveDir.sub(this.forward);
        if (input.isPressed('KeyA')) this.moveDir.sub(this.right);
        if (input.isPressed('KeyD')) this.moveDir.add(this.right);

        if (this.moveDir.lengthSq() > 0) {
            this.moveDir.normalize();
            const speed = input.isPressed('ShiftLeft') ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
            this.body.velocity.x = this.moveDir.x * speed;
            this.body.velocity.z = this.moveDir.z * speed;
        } else {
            this.body.velocity.x *= 0.85;
            this.body.velocity.z *= 0.85;
        }

        // --- Ground check (simple y check) ---
        this.onGround = this.body.position.y <= PLAYER_HEIGHT + 0.1;

        // --- Jump ---
        if (input.isPressed('Space') && this.onGround) {
            this.body.velocity.y = PLAYER_JUMP_FORCE;
        }

        // Keep player at min height (prevent falling through floor)
        if (this.body.position.y < PLAYER_HEIGHT) {
            this.body.position.y = PLAYER_HEIGHT;
            this.body.velocity.y = Math.max(0, this.body.velocity.y);
        }

        // --- Dash ---
        this.dashCooldown = Math.max(0, this.dashCooldown - dt);
        const dashKeyNow = input.isPressed('KeyQ');
        if (dashKeyNow && !this._prevDashKey && this.dashCooldown <= 0 && !this.isDashing) {
            this.isDashing = true;
            this.dashTimer = DASH_DURATION;
            this.dashCooldown = DASH_COOLDOWN;
            this.isInvincible = true;
            // Dash in current movement direction or forward
            if (this.moveDir.lengthSq() > 0) {
                this.dashDir.copy(this.moveDir).normalize();
            } else {
                this.dashDir.copy(this.forward);
            }
        }
        this._prevDashKey = dashKeyNow;

        if (this.isDashing) {
            this.dashTimer -= dt;
            this.body.velocity.x = this.dashDir.x * DASH_SPEED;
            this.body.velocity.z = this.dashDir.z * DASH_SPEED;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.isInvincible = false;
            }
        }

        // Sync camera position
        this.camera.position.set(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }

    takeDamage(amount) {
        if (!this.alive || this.isInvincible) return;
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.alive = false;
        }
        return this.health;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    getPosition() {
        return new THREE.Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }

    reset() {
        this.health = PLAYER_MAX_HEALTH;
        this.alive = true;
        this.score = 0;
        this.body.position.set(0, PLAYER_HEIGHT, 0);
        this.body.velocity.set(0, 0, 0);
        this.euler.set(0, 0, 0);
        this.camera.quaternion.setFromEuler(this.euler);
        this.dashCooldown = 0;
        this.dashTimer = 0;
        this.isDashing = false;
        this.isInvincible = false;
    }

    resetToPosition(x, y, z) {
        this.reset();
        this.body.position.set(x, y, z);
        this.camera.position.set(x, y, z);
    }
}

// Grenade — throwable AoE explosive
import * as THREE from 'three';
import { GRENADE_FUSE, GRENADE_RADIUS, GRENADE_DAMAGE } from '../utils/constants.js';
import { distanceXZ } from '../utils/math.js';

export class Grenade {
    constructor(position, direction, force) {
        this.alive = true;
        this.exploded = false;
        this.fuseTimer = GRENADE_FUSE;
        this.blinkTimer = 0;
        this.explosionTimer = 0;

        // Visual
        this.mesh = this._createMesh();
        this.mesh.position.copy(position);
        this.mesh.position.y += 1.0;

        // Velocity (arc trajectory)
        this.velocity = new THREE.Vector3(
            direction.x * force,
            force * 0.5,
            direction.z * force
        );

        // Explosion visual
        this.explosionMesh = null;
    }

    _createMesh() {
        const group = new THREE.Group();

        // Grenade body
        const geo = new THREE.SphereGeometry(0.15, 8, 8);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.3,
        });
        const body = new THREE.Mesh(geo, mat);
        group.add(body);

        // Indicator light
        const lightGeo = new THREE.SphereGeometry(0.04, 6, 6);
        this._indicatorMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const light = new THREE.Mesh(lightGeo, this._indicatorMat);
        light.position.y = 0.15;
        group.add(light);

        return group;
    }

    update(dt) {
        if (this.exploded) {
            this.explosionTimer += dt;
            // Expand explosion visual
            if (this.explosionMesh) {
                const scale = Math.min(this.explosionTimer * 20, GRENADE_RADIUS);
                this.explosionMesh.scale.set(scale, scale, scale);
                const mat = this.explosionMesh.children[0]?.material;
                if (mat) {
                    mat.opacity = Math.max(0, 1 - this.explosionTimer * 3);
                }
                if (this.explosionTimer > 0.5) {
                    this.alive = false;
                }
            }
            return null;
        }

        // Physics (simple arc)
        this.velocity.y -= 20 * dt; // gravity
        this.mesh.position.x += this.velocity.x * dt;
        this.mesh.position.y += this.velocity.y * dt;
        this.mesh.position.z += this.velocity.z * dt;

        // Bounce off ground
        if (this.mesh.position.y < 0.15) {
            this.mesh.position.y = 0.15;
            this.velocity.y = Math.abs(this.velocity.y) * 0.3;
            this.velocity.x *= 0.7;
            this.velocity.z *= 0.7;
        }

        // Spin
        this.mesh.rotation.x += dt * 5;
        this.mesh.rotation.z += dt * 3;

        // Fuse countdown
        this.fuseTimer -= dt;

        // Blink indicator — faster as fuse runs down
        this.blinkTimer += dt;
        const blinkRate = this.fuseTimer < 1.0 ? 0.08 : this.fuseTimer < 2.0 ? 0.2 : 0.4;
        const isOn = Math.sin(this.blinkTimer / blinkRate * Math.PI) > 0;
        this._indicatorMat.color.setHex(isOn ? 0xff0000 : 0x440000);

        // Explode!
        if (this.fuseTimer <= 0) {
            return this._explode();
        }

        return null;
    }

    _explode() {
        this.exploded = true;
        this.explosionTimer = 0;
        this.mesh.visible = false;

        // Create explosion visual
        const group = new THREE.Group();
        const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        group.add(sphere);

        // Inner core
        const coreGeo = new THREE.SphereGeometry(0.5, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        group.position.copy(this.mesh.position);
        this.explosionMesh = group;

        return {
            position: this.mesh.position.clone(),
            radius: GRENADE_RADIUS,
            damage: GRENADE_DAMAGE,
        };
    }

    getExplosionMesh() {
        return this.explosionMesh;
    }
}

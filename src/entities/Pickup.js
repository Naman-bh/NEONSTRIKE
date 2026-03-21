// Pickup — health and ammo collectibles
import * as THREE from 'three';
import { PICKUP_HEALTH_AMOUNT, PICKUP_AMMO_AMOUNT } from '../utils/constants.js';
import { distanceXZ } from '../utils/math.js';

export class Pickup {
    constructor(position, type = 'health') {
        this.type = type; // 'health' or 'ammo'
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;

        const color = type === 'health' ? 0x00ff88 : 0x00ccff;
        const emissive = type === 'health' ? 0x00ff88 : 0x00ccff;

        const group = new THREE.Group();

        // Core shape
        const geo = type === 'health'
            ? new THREE.OctahedronGeometry(0.25, 0)
            : new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const mat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 1.5,
            metalness: 0.8,
            roughness: 0.2,
            transparent: true,
            opacity: 0.85,
        });
        const core = new THREE.Mesh(geo, mat);
        group.add(core);

        // Glow ring
        const ringGeo = new THREE.TorusGeometry(0.35, 0.015, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.4,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        group.position.copy(position);
        group.position.y = 0.5;

        this.mesh = group;
        this._core = core;
        this._ring = ring;
    }

    update(dt) {
        if (this.collected) return;
        // Bob and rotate
        this.bobOffset += dt * 2;
        this.mesh.position.y = 0.5 + Math.sin(this.bobOffset) * 0.15;
        this._core.rotation.y += dt * 2;
        this._core.rotation.x += dt * 0.5;
        this._ring.rotation.z += dt * 1.5;
    }

    checkCollect(playerPos) {
        if (this.collected) return null;
        if (distanceXZ(this.mesh.position, playerPos) < 1.2) {
            this.collected = true;
            this.mesh.visible = false;
            return this.type;
        }
        return null;
    }

    static getAmount(type) {
        return type === 'health' ? PICKUP_HEALTH_AMOUNT : PICKUP_AMMO_AMOUNT;
    }
}

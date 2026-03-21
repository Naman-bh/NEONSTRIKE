// Math utility helpers
import * as THREE from 'three';

export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function distanceXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
}

export function randomPointInArena(arenaSize, margin = 5) {
    const half = arenaSize / 2 - margin;
    return new THREE.Vector3(
        randomRange(-half, half),
        0,
        randomRange(-half, half)
    );
}

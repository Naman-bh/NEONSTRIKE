// Target — shootable neon target entity for aim training
import * as THREE from 'three';

export class Target {
    constructor(position, config = {}) {
        this.radius = config.radius || 0.5;
        this.speed = config.speed || 0;
        this.lifetime = config.lifetime || Infinity;
        this.movePattern = config.movePattern || 'static';
        this.alive = true;
        this.age = 0;
        this.spawnTime = performance.now();

        // Movement state
        this._movePhase = Math.random() * Math.PI * 2;
        this._moveOrigin = position.clone();
        this._moveAxis = config.moveAxis || 'x'; // axis of movement
        this._moveRange = config.moveRange || 5;

        // Peek state (for angle-peek scenario)
        this._peekHidePos = config.peekHidePos ? config.peekHidePos.clone() : null;
        this._peekShowPos = config.peekShowPos ? config.peekShowPos.clone() : null;
        this._peekState = 'hidden'; // 'hidden' | 'showing' | 'visible' | 'hiding'
        this._peekTimer = 0;
        this._peekDuration = config.peekDuration || 1.2;

        // Build mesh
        const geo = new THREE.SphereGeometry(this.radius, 24, 24);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.8,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.95,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(this.radius * 1.1, this.radius * 1.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
        });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.ring.lookAt(new THREE.Vector3(0, 0, 1)); // Face camera generally
        this.mesh.add(this.ring);

        // Point light for glow
        this.light = new THREE.PointLight(0x00f0ff, 0.5, 5);
        this.mesh.add(this.light);
    }

    update(dt) {
        if (!this.alive) return;

        this.age += dt;

        // Check lifetime expiration
        if (this.lifetime !== Infinity && this.age >= this.lifetime) {
            this.onExpire();
            return;
        }

        // Movement patterns
        switch (this.movePattern) {
            case 'static':
                // No movement
                break;

            case 'drift':
                // Slow random drift
                this._movePhase += dt * 0.5;
                const driftX = Math.sin(this._movePhase * 1.3) * this.speed * 0.5;
                const driftY = Math.cos(this._movePhase * 0.9) * this.speed * 0.3;
                this.mesh.position.x = this._moveOrigin.x + driftX;
                this.mesh.position.y = this._moveOrigin.y + driftY;
                break;

            case 'strafe_sine':
                // Smooth left-right strafe
                this._movePhase += dt * this.speed * 0.3;
                const offset = Math.sin(this._movePhase) * this._moveRange;
                if (this._moveAxis === 'x') {
                    this.mesh.position.x = this._moveOrigin.x + offset;
                } else {
                    this.mesh.position.z = this._moveOrigin.z + offset;
                }
                break;

            case 'peek':
                this._updatePeek(dt);
                break;
        }

        // Pulse glow effect
        const pulse = 0.3 + Math.sin(this.age * 4) * 0.15;
        this.ring.material.opacity = pulse;
        this.light.intensity = 0.3 + Math.sin(this.age * 3) * 0.2;
    }

    _updatePeek(dt) {
        if (!this._peekHidePos || !this._peekShowPos) return;

        this._peekTimer += dt;

        switch (this._peekState) {
            case 'hidden':
                this.mesh.position.copy(this._peekHidePos);
                this.mesh.visible = false;
                break;

            case 'showing': {
                const t = Math.min(this._peekTimer / 0.3, 1);
                this.mesh.position.lerpVectors(this._peekHidePos, this._peekShowPos, t);
                this.mesh.visible = true;
                if (t >= 1) {
                    this._peekState = 'visible';
                    this._peekTimer = 0;
                }
                break;
            }

            case 'visible':
                this.mesh.position.copy(this._peekShowPos);
                if (this._peekTimer >= this._peekDuration) {
                    this._peekState = 'hiding';
                    this._peekTimer = 0;
                }
                break;

            case 'hiding': {
                const t = Math.min(this._peekTimer / 0.3, 1);
                this.mesh.position.lerpVectors(this._peekShowPos, this._peekHidePos, t);
                if (t >= 1) {
                    this._peekState = 'hidden';
                    this._peekTimer = 0;
                    this.onExpire(); // Missed the peek
                }
                break;
            }
        }
    }

    startPeek() {
        this._peekState = 'showing';
        this._peekTimer = 0;
        this.mesh.visible = true;
        this.spawnTime = performance.now(); // Reset reaction timer
    }

    canBeHit() {
        if (!this.alive) return false;
        if (this.movePattern === 'peek') {
            return this._peekState === 'showing' || this._peekState === 'visible';
        }
        return true;
    }

    onHit() {
        if (!this.alive) return;
        this.alive = false;
        this.mesh.material.color.setHex(0x00ff88);
        this.mesh.material.emissive.setHex(0x00ff88);
        this.mesh.material.emissiveIntensity = 2.0;
        this.light.color.setHex(0x00ff88);
        this.light.intensity = 2.0;

        // Quick shrink-and-fade death
        const startScale = this.mesh.scale.x;
        const startTime = performance.now();
        const animate = () => {
            const elapsed = (performance.now() - startTime) / 200;
            if (elapsed >= 1) {
                this.mesh.visible = false;
                return;
            }
            const s = startScale * (1 - elapsed);
            this.mesh.scale.set(s, s, s);
            this.mesh.material.opacity = 1 - elapsed;
            requestAnimationFrame(animate);
        };
        animate();
    }

    onExpire() {
        if (!this.alive) return;
        this.alive = false;
        this.mesh.material.color.setHex(0xff2d2d);
        this.mesh.material.emissive.setHex(0xff2d2d);
        this.mesh.material.emissiveIntensity = 1.5;
        setTimeout(() => { this.mesh.visible = false; }, 300);
    }

    getReactionTime() {
        return performance.now() - this.spawnTime;
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.ring.geometry.dispose();
        this.ring.material.dispose();
        this.light.dispose();
    }
}

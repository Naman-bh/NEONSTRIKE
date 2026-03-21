// WeaponManager — handles weapon switching, firing, reloading
import * as THREE from 'three';
import { input } from '../core/InputManager.js';
import { WEAPONS } from '../utils/constants.js';
import { audio } from '../audio/AudioManager.js';

export class WeaponManager {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;

        // Set up weapons
        this.weapons = [
            { ...WEAPONS.pistol, currentClip: WEAPONS.pistol.clipSize, reserve: WEAPONS.pistol.maxReserve },
            { ...WEAPONS.rifle, currentClip: WEAPONS.rifle.clipSize, reserve: WEAPONS.rifle.maxReserve },
            { ...WEAPONS.shotgun, currentClip: WEAPONS.shotgun.clipSize, reserve: WEAPONS.shotgun.maxReserve },
        ];
        this.currentIndex = 0;
        this.fireTimer = 0;
        this.reloading = false;
        this.reloadTimer = 0;

        // Muzzle flash
        this.muzzleFlash = this._createMuzzleFlash();
        this.scene.add(this.muzzleFlash);
        this.muzzleFlashTimer = 0;

        // Raycaster for shooting
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 150;

        // Weapon model (simple box)
        this.weaponMesh = this._createWeaponMesh();
        this.camera.add(this.weaponMesh);

        // Scroll weapon switch
        this._onWheel = (e) => {
            if (e.deltaY > 0) this.switchWeapon(1);
            else if (e.deltaY < 0) this.switchWeapon(-1);
        };
        document.addEventListener('wheel', this._onWheel);

        this._prevKeys = {};
    }

    get current() { return this.weapons[this.currentIndex]; }

    // ===== Materials (shared) =====
    _mats() {
        if (this._cachedMats) return this._cachedMats;
        this._cachedMats = {
            darkMetal: new THREE.MeshStandardMaterial({ color: 0x1a1a24, metalness: 0.92, roughness: 0.18 }),
            medMetal: new THREE.MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.88, roughness: 0.22 }),
            lightMetal: new THREE.MeshStandardMaterial({ color: 0x3a3a4e, metalness: 0.85, roughness: 0.25 }),
            barrel: new THREE.MeshStandardMaterial({ color: 0x0e0e18, metalness: 0.95, roughness: 0.12 }),
            grip: new THREE.MeshStandardMaterial({ color: 0x1e1e28, metalness: 0.4, roughness: 0.7 }),
            gripTex: new THREE.MeshStandardMaterial({ color: 0x15151f, metalness: 0.3, roughness: 0.85 }),
            cyanGlow: new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.5, metalness: 0.5, roughness: 0.3 }),
            orangeGlow: new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff7700, emissiveIntensity: 2.0, metalness: 0.5, roughness: 0.3 }),
            greenGlow: new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.8, metalness: 0.5, roughness: 0.3 }),
            sight: new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.9, roughness: 0.15 }),
            wood: new THREE.MeshStandardMaterial({ color: 0x3d2b1f, metalness: 0.1, roughness: 0.8 }),
        };
        return this._cachedMats;
    }

    // ===== Pistol Model =====
    _createPistolMesh() {
        const m = this._mats();
        const g = new THREE.Group();

        // Slide (upper receiver)
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.28), m.darkMetal);
        slide.position.set(0, 0.02, -0.02);
        g.add(slide);

        // Slide serrations (rear)
        for (let i = 0; i < 5; i++) {
            const serr = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.003, 0.008), m.lightMetal);
            serr.position.set(0, 0.02, 0.08 + i * 0.016);
            g.add(serr);
        }

        // Barrel (protruding from slide)
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.12, 12), m.barrel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.22);
        g.add(barrel);

        // Barrel inner bore
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, 0.02, -0.285);
        g.add(bore);

        // Frame (lower receiver)
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.035, 0.22), m.medMetal);
        frame.position.set(0, -0.015, 0.01);
        g.add(frame);

        // Trigger guard
        const guardShape = new THREE.Shape();
        guardShape.moveTo(0, 0);
        guardShape.lineTo(0.04, 0);
        guardShape.lineTo(0.04, -0.04);
        guardShape.lineTo(0, -0.04);
        const guardGeo = new THREE.BoxGeometry(0.048, 0.035, 0.045);
        const guard = new THREE.Mesh(guardGeo, m.medMetal);
        guard.position.set(0, -0.05, -0.02);
        g.add(guard);

        // Trigger
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.025, 0.01), m.lightMetal);
        trigger.position.set(0, -0.04, -0.01);
        trigger.rotation.x = -0.3;
        g.add(trigger);

        // Grip (angled)
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.1, 0.05), m.gripTex);
        grip.position.set(0, -0.08, 0.06);
        grip.rotation.x = 0.15;
        g.add(grip);

        // Grip texture lines
        for (let i = 0; i < 6; i++) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.002, 0.052), m.lightMetal);
            line.position.set(0, -0.045 - i * 0.012, 0.06);
            line.rotation.x = 0.15;
            g.add(line);
        }

        // Magazine baseplate
        const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.008, 0.042), m.lightMetal);
        magBase.position.set(0, -0.13, 0.06);
        g.add(magBase);

        // Front sight
        const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.008), m.sight);
        fSight.position.set(0, 0.055, -0.12);
        g.add(fSight);
        // Front sight dot
        const fDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6), m.cyanGlow);
        fDot.position.set(0, 0.065, -0.12);
        g.add(fDot);

        // Rear sight
        const rSightL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.015, 0.008), m.sight);
        rSightL.position.set(-0.012, 0.052, 0.08);
        g.add(rSightL);
        const rSightR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.015, 0.008), m.sight);
        rSightR.position.set(0.012, 0.052, 0.08);
        g.add(rSightR);

        // Neon accent strip along slide
        const accent = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.2), m.cyanGlow);
        accent.position.set(0.027, 0.01, -0.02);
        g.add(accent);
        const accent2 = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.2), m.cyanGlow);
        accent2.position.set(-0.027, 0.01, -0.02);
        g.add(accent2);

        // Ejection port
        const ePort = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.035), new THREE.MeshBasicMaterial({ color: 0x080810 }));
        ePort.position.set(0.016, 0.035, 0.02);
        g.add(ePort);

        g.position.set(0.28, -0.22, -0.35);
        g.rotation.set(0, 0, 0);
        return g;
    }

    // ===== Rifle Model =====
    _createRifleMesh() {
        const m = this._mats();
        const g = new THREE.Group();

        // Upper receiver
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.38), m.darkMetal);
        upper.position.set(0, 0.02, -0.05);
        g.add(upper);

        // Lower receiver
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.04, 0.25), m.medMetal);
        lower.position.set(0, -0.015, 0.02);
        g.add(lower);

        // Barrel (long)
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.3, 12), m.barrel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.39);
        g.add(barrel);

        // Barrel bore
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.02, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, 0.02, -0.545);
        g.add(bore);

        // Handguard / rail over barrel
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.05, 0.22), m.medMetal);
        handguard.position.set(0, 0.02, -0.3);
        g.add(handguard);

        // Handguard ventilation slots
        for (let i = 0; i < 6; i++) {
            const slot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.006), new THREE.MeshBasicMaterial({ color: 0x080812 }));
            slot.position.set(0, 0.035, -0.2 - i * 0.03);
            g.add(slot);
        }

        // Picatinny rail on top
        for (let i = 0; i < 14; i++) {
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.008), m.lightMetal);
            tooth.position.set(0, 0.05, -0.18 + i * 0.025);
            g.add(tooth);
        }

        // Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.12, 0.04), m.darkMetal);
        mag.position.set(0, -0.085, 0.02);
        mag.rotation.x = -0.08;
        g.add(mag);

        // Magazine baseplate
        const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.042), m.lightMetal);
        magPlate.position.set(0, -0.145, 0.015);
        g.add(magPlate);

        // Trigger guard
        const tGuard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.03, 0.05), m.medMetal);
        tGuard.position.set(0, -0.045, -0.01);
        g.add(tGuard);

        // Trigger
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.008), m.lightMetal);
        trigger.position.set(0, -0.035, -0.005);
        trigger.rotation.x = -0.25;
        g.add(trigger);

        // Grip (pistol grip)
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.09, 0.045), m.gripTex);
        grip.position.set(0, -0.075, 0.06);
        grip.rotation.x = 0.25;
        g.add(grip);

        // Grip texture
        for (let i = 0; i < 5; i++) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.002, 0.047), m.lightMetal);
            line.position.set(0, -0.04 - i * 0.013, 0.06);
            line.rotation.x = 0.25;
            g.add(line);
        }

        // Stock (buttstock)
        const stockTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), m.darkMetal);
        stockTube.rotation.x = Math.PI / 2;
        stockTube.position.set(0, 0.01, 0.24);
        g.add(stockTube);

        // Stock pad
        const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.02), m.gripTex);
        stockPad.position.set(0, 0.01, 0.33);
        g.add(stockPad);

        // Charging handle
        const chHandle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.02), m.lightMetal);
        chHandle.position.set(0, 0.052, 0.1);
        g.add(chHandle);

        // Front sight post
        const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.025, 0.006), m.sight);
        fSight.position.set(0, 0.058, -0.36);
        g.add(fSight);
        const fDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6), m.greenGlow);
        fDot.position.set(0, 0.072, -0.36);
        g.add(fDot);

        // Rear sight
        const rSightL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.006), m.sight);
        rSightL.position.set(-0.01, 0.055, 0.06);
        g.add(rSightL);
        const rSightR = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.006), m.sight);
        rSightR.position.set(0.01, 0.055, 0.06);
        g.add(rSightR);

        // Neon accent strip (both sides)
        const acc1 = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.35), m.cyanGlow);
        acc1.position.set(0.029, 0.005, -0.05);
        g.add(acc1);
        const acc2 = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.35), m.cyanGlow);
        acc2.position.set(-0.029, 0.005, -0.05);
        g.add(acc2);

        // Muzzle brake
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.04, 8), m.darkMetal);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0.02, -0.55);
        g.add(muzzle);

        // Forward grip (optional angled foregrip)
        const fGrip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.05, 0.025), m.gripTex);
        fGrip.position.set(0, -0.02, -0.25);
        fGrip.rotation.x = 0.1;
        g.add(fGrip);

        g.position.set(0.28, -0.23, -0.28);
        g.rotation.set(0, 0, 0);
        return g;
    }

    // ===== Shotgun Model =====
    _createShotgunMesh() {
        const m = this._mats();
        const g = new THREE.Group();

        // Receiver
        const recv = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.25), m.darkMetal);
        recv.position.set(0, 0.02, 0.0);
        g.add(recv);

        // Barrel (wide)
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.42, 12), m.barrel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.035, -0.33);
        g.add(barrel);

        // Barrel bore
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, 0.035, -0.545);
        g.add(bore);

        // Magazine tube (under barrel)
        const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.35, 10), m.medMetal);
        magTube.rotation.x = Math.PI / 2;
        magTube.position.set(0, -0.005, -0.3);
        g.add(magTube);

        // Pump / forend
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.1), m.wood);
        pump.position.set(0, 0.01, -0.22);
        g.add(pump);

        // Pump grip ridges
        for (let i = 0; i < 6; i++) {
            const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.067, 0.004, 0.008), m.gripTex);
            ridge.position.set(0, 0.01, -0.19 - i * 0.015);
            g.add(ridge);
        }

        // Ejection port
        const ePort = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.04), new THREE.MeshBasicMaterial({ color: 0x080810 }));
        ePort.position.set(0.02, 0.04, 0.02);
        g.add(ePort);

        // Trigger guard
        const tGuard = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.03, 0.055), m.medMetal);
        tGuard.position.set(0, -0.03, 0.03);
        g.add(tGuard);

        // Trigger
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.022, 0.008), m.lightMetal);
        trigger.position.set(0, -0.02, 0.03);
        trigger.rotation.x = -0.2;
        g.add(trigger);

        // Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.09, 0.05), m.gripTex);
        grip.position.set(0, -0.07, 0.08);
        grip.rotation.x = 0.2;
        g.add(grip);

        // Grip texture
        for (let i = 0; i < 5; i++) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.002, 0.052), m.lightMetal);
            line.position.set(0, -0.035 - i * 0.014, 0.08);
            line.rotation.x = 0.2;
            g.add(line);
        }

        // Stock (wooden style)
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.2), m.wood);
        stock.position.set(0, 0.015, 0.22);
        g.add(stock);

        // Stock butt pad
        const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.06, 0.015), m.gripTex);
        buttPad.position.set(0, 0.015, 0.32);
        g.add(buttPad);

        // Front bead sight
        const fBead = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), m.orangeGlow);
        fBead.position.set(0, 0.062, -0.48);
        g.add(fBead);

        // Vent rib on top of barrel
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.004, 0.35), m.lightMetal);
        rib.position.set(0, 0.055, -0.3);
        g.add(rib);

        // Neon accent strips
        const acc1 = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.22), m.orangeGlow);
        acc1.position.set(0.032, 0.01, 0.0);
        g.add(acc1);
        const acc2 = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.22), m.orangeGlow);
        acc2.position.set(-0.032, 0.01, 0.0);
        g.add(acc2);

        // Shell on receiver (decorative)
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 8), new THREE.MeshStandardMaterial({ color: 0xcc3333, metalness: 0.3, roughness: 0.5 }));
        shell.rotation.z = Math.PI / 2;
        shell.position.set(0.035, 0.05, 0.04);
        g.add(shell);

        g.position.set(0.28, -0.24, -0.3);
        g.rotation.set(0, 0, 0);
        return g;
    }

    // Build all weapon meshes and add active one to camera
    _createWeaponMesh() {
        this._weaponMeshes = [
            this._createPistolMesh(),
            this._createRifleMesh(),
            this._createShotgunMesh(),
        ];
        // Start with pistol visible
        return this._weaponMeshes[0];
    }

    _createMuzzleFlash() {
        const geo = new THREE.SphereGeometry(0.08, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0,
        });
        const flash = new THREE.Mesh(geo, mat);
        flash.visible = false;
        return flash;
    }

    switchWeapon(dir) {
        if (this.reloading) return;
        this.currentIndex = (this.currentIndex + dir + this.weapons.length) % this.weapons.length;
        this._updateWeaponModel();
    }

    _updateWeaponModel() {
        // Remove current weapon mesh from camera
        if (this.weaponMesh) {
            this.camera.remove(this.weaponMesh);
        }
        // Swap to the new weapon mesh
        this.weaponMesh = this._weaponMeshes[this.currentIndex];
        this.camera.add(this.weaponMesh);
    }

    update(dt, enemies) {
        this.fireTimer -= dt;
        const hits = [];

        // Key-based weapon switching
        if (input.isPressed('Digit1') && !this._prevKeys['Digit1']) { this.currentIndex = 0; this._updateWeaponModel(); }
        if (input.isPressed('Digit2') && !this._prevKeys['Digit2']) { this.currentIndex = 1; this._updateWeaponModel(); }
        if (input.isPressed('Digit3') && !this._prevKeys['Digit3']) { this.currentIndex = 2; this._updateWeaponModel(); }
        this._prevKeys['Digit1'] = input.isPressed('Digit1');
        this._prevKeys['Digit2'] = input.isPressed('Digit2');
        this._prevKeys['Digit3'] = input.isPressed('Digit3');

        // Reload
        if (input.isPressed('KeyR') && !this.reloading && this.current.currentClip < this.current.clipSize && this.current.reserve > 0) {
            this.reloading = true;
            this.reloadTimer = this.current.reloadTime;
            audio.playReload();
        }

        if (this.reloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                const needed = this.current.clipSize - this.current.currentClip;
                const available = Math.min(needed, this.current.reserve);
                this.current.currentClip += available;
                this.current.reserve -= available;
                this.reloading = false;
            }
        }

        // Fire
        const canFire = !this.reloading && this.fireTimer <= 0 && this.current.currentClip > 0;
        const wantsFire = this.current.auto ? input.mouseDown : (input.mouseDown && this.fireTimer <= -0.05);

        if (canFire && wantsFire) {
            this.fireTimer = this.current.fireRate;
            this.current.currentClip--;

            // Play sound
            if (this.currentIndex === 0) audio.playShoot();
            else if (this.currentIndex === 1) audio.playRifleShoot();
            else audio.playShotgunShoot();

            // Raycast — multi-pellet for shotgun
            const pelletCount = this.current.pellets || 1;
            for (let p = 0; p < pelletCount; p++) {
                const spread = this.current.spread;
                const dir = new THREE.Vector3(
                    (Math.random() - 0.5) * spread,
                    (Math.random() - 0.5) * spread,
                    -1
                );
                dir.applyQuaternion(this.camera.quaternion);
                dir.normalize();

                this.raycaster.set(this.camera.position, dir);

                // Check enemy hits
                const enemyMeshes = enemies.filter(e => e.alive).map(e => e.mesh);
                const intersects = this.raycaster.intersectObjects(enemyMeshes, true);

                if (intersects.length > 0) {
                    const hit = intersects[0];
                    const enemy = enemies.find(e => {
                        return e.mesh === hit.object || e.mesh === hit.object.parent;
                    });
                    if (enemy && enemy.alive) {
                        // Don't add duplicate hits for same pellet burst (to same enemy)
                        if (!hits.find(h => h.enemy === enemy)) {
                            hits.push({ enemy, point: hit.point });
                        }
                    }
                }
            }

            // Muzzle flash
            this._showMuzzleFlash();

            // Recoil animation
            this._recoil();

            // Auto reload when empty
            if (this.current.currentClip === 0 && this.current.reserve > 0) {
                this.reloading = true;
                this.reloadTimer = this.current.reloadTime;
                audio.playReload();
            }
        }

        // Update muzzle flash
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
            if (this.muzzleFlashTimer <= 0) {
                this.muzzleFlash.visible = false;
            }
        }

        return hits;
    }

    _showMuzzleFlash() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);
        this.muzzleFlash.position.copy(this.camera.position).add(dir.multiplyScalar(0.8));
        this.muzzleFlash.visible = true;
        this.muzzleFlash.material.opacity = 0.9;
        this.muzzleFlashTimer = 0.05;
    }

    _recoil() {
        // Simple recoil — nudge weapon mesh back then restore
        const w = this.weaponMesh;
        const origZ = w.position.z;
        const origRx = w.rotation.x;
        w.position.z = origZ + 0.05;
        w.rotation.x = origRx - 0.06;
        // Animate back
        setTimeout(() => {
            w.position.z = origZ;
            w.rotation.x = origRx;
        }, 70);
    }

    reset() {
        this.weapons.forEach((w, i) => {
            const bases = [WEAPONS.pistol, WEAPONS.rifle, WEAPONS.shotgun];
            const base = bases[i];
            w.currentClip = base.clipSize;
            w.reserve = base.maxReserve;
        });
        this.currentIndex = 0;
        this.reloading = false;
        this.fireTimer = 0;
        this._updateWeaponModel();
    }

    dispose() {
        document.removeEventListener('wheel', this._onWheel);
    }
}

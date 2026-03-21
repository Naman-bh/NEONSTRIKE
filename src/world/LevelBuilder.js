// LevelBuilder — creates the arena environment
import * as THREE from 'three';
import { ARENA_SIZE, ARENA_WALL_HEIGHT } from '../utils/constants.js';

export class LevelBuilder {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physics = physicsWorld;
        this.objects = [];
    }

    build() {
        this._createFloor();
        this._createWalls();
        this._createCover();
        this._createLighting();
        this._createSkybox();
        this._createDecor();
    }

    _createFloor() {
        // Main floor
        const geo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE, 20, 20);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a,
            metalness: 0.4,
            roughness: 0.6,
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid lines
        const gridHelper = new THREE.GridHelper(ARENA_SIZE, 30, 0x3a3a5e, 0x2a2a4e);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.5;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        // Floor physics
        this.physics.createStaticBox(
            { x: ARENA_SIZE, y: 0.2, z: ARENA_SIZE },
            { x: 0, y: -0.1, z: 0 }
        );
    }

    _createWalls() {
        const half = ARENA_SIZE / 2;
        const h = ARENA_WALL_HEIGHT;
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x1e1e32,
            metalness: 0.5,
            roughness: 0.4,
            transparent: true,
            opacity: 0.9,
        });

        const wallNeonMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.6,
        });

        const walls = [
            { pos: [0, h / 2, -half], size: [ARENA_SIZE, h, 0.5] },  // north
            { pos: [0, h / 2, half], size: [ARENA_SIZE, h, 0.5] },   // south
            { pos: [-half, h / 2, 0], size: [0.5, h, ARENA_SIZE] },   // west
            { pos: [half, h / 2, 0], size: [0.5, h, ARENA_SIZE] },    // east
        ];

        walls.forEach(({ pos, size }) => {
            const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
            const wall = new THREE.Mesh(geo, wallMat);
            wall.position.set(...pos);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);

            // Neon strip at top of wall
            const stripGeo = new THREE.BoxGeometry(size[0], 0.05, size[2]);
            const strip = new THREE.Mesh(stripGeo, wallNeonMat);
            strip.position.set(pos[0], h, pos[2]);
            this.scene.add(strip);

            // Physics
            this.physics.createStaticBox(
                { x: size[0], y: size[1], z: size[2] },
                { x: pos[0], y: pos[1], z: pos[2] }
            );
        });
    }

    _createCover() {
        // Scatter cover objects (boxes/pillars) around the arena
        const coverMat = new THREE.MeshStandardMaterial({
            color: 0x2e2e48,
            metalness: 0.5,
            roughness: 0.35,
        });
        const neonEdgeMat = new THREE.MeshBasicMaterial({
            color: 0xff2d6b,
            transparent: true,
            opacity: 0.7,
        });

        const coverPositions = [
            // Inner ring of cover
            { x: 10, z: 10, w: 3, h: 2.5, d: 1.5 },
            { x: -10, z: 10, w: 1.5, h: 3, d: 3 },
            { x: 10, z: -10, w: 1.5, h: 3, d: 3 },
            { x: -10, z: -10, w: 3, h: 2.5, d: 1.5 },
            // Outer pillars
            { x: 20, z: 0, w: 2, h: 4, d: 2 },
            { x: -20, z: 0, w: 2, h: 4, d: 2 },
            { x: 0, z: 20, w: 2, h: 4, d: 2 },
            { x: 0, z: -20, w: 2, h: 4, d: 2 },
            // Mid scattered
            { x: 15, z: 15, w: 4, h: 1.5, d: 1 },
            { x: -15, z: -15, w: 1, h: 1.5, d: 4 },
            { x: -15, z: 15, w: 2, h: 2, d: 2 },
            { x: 15, z: -15, w: 2, h: 2, d: 2 },
            // Center structure
            { x: 0, z: 0, w: 4, h: 1.5, d: 4 },
        ];

        coverPositions.forEach(({ x, z, w, h, d }) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            const box = new THREE.Mesh(geo, coverMat);
            box.position.set(x, h / 2, z);
            box.castShadow = true;
            box.receiveShadow = true;
            this.scene.add(box);

            // Neon edge on top
            const edgeGeo = new THREE.BoxGeometry(w + 0.05, 0.04, d + 0.05);
            const edge = new THREE.Mesh(edgeGeo, neonEdgeMat);
            edge.position.set(x, h, z);
            this.scene.add(edge);

            // Physics
            this.physics.createStaticBox(
                { x: w, y: h, z: d },
                { x, y: h / 2, z }
            );

            this.objects.push(box);
        });
    }

    _createLighting() {
        // Hemisphere light (sky + ground fill)
        const hemi = new THREE.HemisphereLight(0x4466aa, 0x222244, 0.8);
        this.scene.add(hemi);

        // Ambient — brighter base fill
        const ambient = new THREE.AmbientLight(0x334466, 1.2);
        this.scene.add(ambient);

        // Directional (moon) — stronger
        const dir = new THREE.DirectionalLight(0x6688cc, 1.5);
        dir.position.set(20, 35, 10);
        dir.castShadow = true;
        dir.shadow.mapSize.width = 2048;
        dir.shadow.mapSize.height = 2048;
        dir.shadow.camera.near = 0.5;
        dir.shadow.camera.far = 120;
        dir.shadow.camera.left = -40;
        dir.shadow.camera.right = 40;
        dir.shadow.camera.top = 40;
        dir.shadow.camera.bottom = -40;
        this.scene.add(dir);

        // Secondary fill light from opposite side
        const fill = new THREE.DirectionalLight(0x334466, 0.6);
        fill.position.set(-15, 20, -10);
        this.scene.add(fill);

        // Neon point lights — more, brighter, wider range
        const neonPositions = [
            { pos: [15, 4, 15], color: 0x00f0ff },
            { pos: [-15, 4, -15], color: 0xff2d6b },
            { pos: [15, 4, -15], color: 0x00f0ff },
            { pos: [-15, 4, 15], color: 0xff2d6b },
            { pos: [0, 5, 0], color: 0x7733ff },
            // Extra corner lights for coverage
            { pos: [25, 5, 25], color: 0x00f0ff },
            { pos: [-25, 5, -25], color: 0xff2d6b },
            { pos: [25, 5, -25], color: 0x00ccff },
            { pos: [-25, 5, 25], color: 0xff4488 },
            // Mid-wall lights
            { pos: [0, 4, 25], color: 0x00f0ff },
            { pos: [0, 4, -25], color: 0x00f0ff },
            { pos: [25, 4, 0], color: 0xff2d6b },
            { pos: [-25, 4, 0], color: 0xff2d6b },
        ];

        neonPositions.forEach(({ pos, color }) => {
            const light = new THREE.PointLight(color, 3.0, 40);
            light.position.set(...pos);
            this.scene.add(light);
        });

        // Player follow light (attached to scene, updated in main loop)
        this._playerLight = new THREE.PointLight(0xffffff, 0.8, 15);
        this._playerLight.position.set(0, 3, 0);
        this.scene.add(this._playerLight);
    }

    _createSkybox() {
        // Gradient sky using a large sphere with shader material
        const skyGeo = new THREE.SphereGeometry(100, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0a0a24) },
                bottomColor: { value: new THREE.Color(0x000000) },
            },
            vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y * 0.5 + 0.5;
          gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
        }
      `,
            side: THREE.BackSide,
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    _createDecor() {
        // Floating particles / dust motes
        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * ARENA_SIZE;
            positions[i * 3 + 1] = Math.random() * ARENA_WALL_HEIGHT;
            positions[i * 3 + 2] = (Math.random() - 0.5) * ARENA_SIZE;
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x00f0ff,
            size: 0.08,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        this.scene.add(particles);
        this._particles = particles;
    }

    update(dt) {
        // Slowly rotate decorative particles
        if (this._particles) {
            this._particles.rotation.y += dt * 0.02;
        }
    }
}

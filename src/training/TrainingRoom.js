// TrainingRoom — parametric room builder for training and scenario modes
import * as THREE from 'three';

export class TrainingRoom {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
    }

    /**
     * Build a clean training room
     * @param {object} size - { w, h, d } room dimensions
     * @param {object} options - { coverPositions?, gridWall?, color? }
     */
    build(size, options = {}) {
        const { w, h, d } = size;
        const color = options.color || 0x1a1a2e;
        const wallColor = options.wallColor || 0x16162a;
        const accentColor = options.accentColor || 0x00f0ff;

        // Floor
        const floorGeo = new THREE.PlaneGeometry(w, d);
        const floorMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.2,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this._add(floor);

        // Floor grid lines
        this._addGrid(w, d, accentColor);

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(w, d);
        const ceilMat = new THREE.MeshStandardMaterial({
            color: 0x0e0e1a,
            roughness: 0.9,
        });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = h;
        this._add(ceil);

        // Walls (4 sides)
        const wallMat = new THREE.MeshStandardMaterial({
            color: wallColor,
            roughness: 0.7,
            metalness: 0.1,
        });

        // Back wall (z = -d/2)
        this._addWall(w, h, 0, h / 2, -d / 2, 0, wallMat.clone());
        // Front wall (z = d/2)
        this._addWall(w, h, 0, h / 2, d / 2, Math.PI, wallMat.clone());
        // Left wall (x = -w/2)
        this._addWall(d, h, -w / 2, h / 2, 0, Math.PI / 2, wallMat.clone());
        // Right wall (x = w/2)
        this._addWall(d, h, w / 2, h / 2, 0, -Math.PI / 2, wallMat.clone());

        // Neon edge strips along wall/ceiling intersections
        this._addEdgeStrips(w, h, d, accentColor);

        // Lighting — bright and uniform for training
        const ambient = new THREE.AmbientLight(0x404060, 1.5);
        this._add(ambient);

        const hemi = new THREE.HemisphereLight(0x8888cc, 0x222244, 0.8);
        this._add(hemi);

        // 4 overhead point lights
        const lightPositions = [
            [-w / 4, h - 0.5, -d / 4],
            [w / 4, h - 0.5, -d / 4],
            [-w / 4, h - 0.5, d / 4],
            [w / 4, h - 0.5, d / 4],
        ];
        lightPositions.forEach(([x, y, z]) => {
            const light = new THREE.PointLight(0xffffff, 1.2, w);
            light.position.set(x, y, z);
            this._add(light);
        });

        // Center player light
        this._playerLight = new THREE.PointLight(0xffffff, 0.8, 15);
        this._playerLight.position.set(0, 3, 0);
        this._add(this._playerLight);

        // Cover objects (for scenario rooms)
        if (options.coverPositions) {
            options.coverPositions.forEach(cover => {
                this._addCover(cover);
            });
        }

        // Grid wall (for gridshot)
        if (options.gridWall) {
            this._addGridWall(options.gridWall, accentColor);
        }
    }

    _add(obj) {
        this.scene.add(obj);
        this.objects.push(obj);
    }

    _addWall(width, height, x, y, z, rotY, material) {
        const geo = new THREE.PlaneGeometry(width, height);
        const wall = new THREE.Mesh(geo, material);
        wall.position.set(x, y, z);
        wall.rotation.y = rotY;
        wall.receiveShadow = true;
        this._add(wall);
    }

    _addGrid(w, d, color) {
        const gridMat = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15,
        });

        const step = 2;
        const lines = [];

        for (let x = -w / 2; x <= w / 2; x += step) {
            lines.push(new THREE.Vector3(x, 0.01, -d / 2));
            lines.push(new THREE.Vector3(x, 0.01, d / 2));
        }
        for (let z = -d / 2; z <= d / 2; z += step) {
            lines.push(new THREE.Vector3(-w / 2, 0.01, z));
            lines.push(new THREE.Vector3(w / 2, 0.01, z));
        }

        const gridGeo = new THREE.BufferGeometry().setFromPoints(lines);
        const grid = new THREE.LineSegments(gridGeo, gridMat);
        this._add(grid);
    }

    _addEdgeStrips(w, h, d, color) {
        const stripMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
        });

        // Bottom edges
        const edgeData = [
            // Bottom edges
            { pos: [0, 0.01, -d / 2], size: [w, 0.05, 0.05] },
            { pos: [0, 0.01, d / 2], size: [w, 0.05, 0.05] },
            { pos: [-w / 2, 0.01, 0], size: [0.05, 0.05, d] },
            { pos: [w / 2, 0.01, 0], size: [0.05, 0.05, d] },
            // Top edges
            { pos: [0, h, -d / 2], size: [w, 0.05, 0.05] },
            { pos: [0, h, d / 2], size: [w, 0.05, 0.05] },
            { pos: [-w / 2, h, 0], size: [0.05, 0.05, d] },
            { pos: [w / 2, h, 0], size: [0.05, 0.05, d] },
            // Vertical edges
            { pos: [-w / 2, h / 2, -d / 2], size: [0.05, h, 0.05] },
            { pos: [w / 2, h / 2, -d / 2], size: [0.05, h, 0.05] },
            { pos: [-w / 2, h / 2, d / 2], size: [0.05, h, 0.05] },
            { pos: [w / 2, h / 2, d / 2], size: [0.05, h, 0.05] },
        ];

        edgeData.forEach(({ pos, size }) => {
            const geo = new THREE.BoxGeometry(...size);
            const strip = new THREE.Mesh(geo, stripMat.clone());
            strip.position.set(...pos);
            this._add(strip);
        });
    }

    _addCover(cover) {
        const { x, z, w: cw, h: ch, d: cd } = cover;
        const geo = new THREE.BoxGeometry(cw, ch, cd);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            roughness: 0.6,
            metalness: 0.3,
        });
        const box = new THREE.Mesh(geo, mat);
        box.position.set(x, ch / 2, z);
        box.castShadow = true;
        this._add(box);

        // Neon top edge
        const edgeMat = new THREE.MeshBasicMaterial({
            color: 0xaa44ff,
            transparent: true,
            opacity: 0.6,
        });
        const edgeGeo = new THREE.BoxGeometry(cw + 0.1, 0.05, cd + 0.1);
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(x, ch, z);
        this._add(edge);
    }

    _addGridWall(config, color) {
        // Visual grid lines on the back wall for Gridshot reference
        const { cols, rows, wallZ, wallW, wallH } = config;
        const cellW = wallW / cols;
        const cellH = wallH / rows;
        const lineMat = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
        });

        const points = [];
        // Vertical lines
        for (let c = 0; c <= cols; c++) {
            const x = -wallW / 2 + c * cellW;
            points.push(new THREE.Vector3(x, 0.5, wallZ + 0.02));
            points.push(new THREE.Vector3(x, wallH + 0.5, wallZ + 0.02));
        }
        // Horizontal lines
        for (let r = 0; r <= rows; r++) {
            const y = 0.5 + r * cellH;
            points.push(new THREE.Vector3(-wallW / 2, y, wallZ + 0.02));
            points.push(new THREE.Vector3(wallW / 2, y, wallZ + 0.02));
        }

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const gridLines = new THREE.LineSegments(geo, lineMat);
        this._add(gridLines);
    }

    updatePlayerLight(playerPos) {
        if (this._playerLight) {
            this._playerLight.position.set(playerPos.x, playerPos.y + 2, playerPos.z);
        }
    }

    cleanup() {
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.objects = [];
    }
}

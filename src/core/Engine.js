// Core Engine — Renderer, Scene, Camera, Animation Loop
import * as THREE from 'three';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.006);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 1.7, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.8;

        this.clock = new THREE.Clock();
        this.deltaTime = 0;
        this.elapsedTime = 0;

        this._onResize = this._onResize.bind(this);
        window.addEventListener('resize', this._onResize);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update() {
        this.deltaTime = Math.min(this.clock.getDelta(), 0.05); // cap at 50ms
        this.elapsedTime = this.clock.getElapsedTime();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    addToScene(...objects) {
        objects.forEach(obj => this.scene.add(obj));
    }

    removeFromScene(...objects) {
        objects.forEach(obj => this.scene.remove(obj));
    }

    dispose() {
        window.removeEventListener('resize', this._onResize);
        this.renderer.dispose();
    }
}

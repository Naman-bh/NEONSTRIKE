// PhysicsWorld — Cannon-es world setup & sync
import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 5;
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.1;

        this.meshBodyPairs = [];
    }

    addBody(body, mesh = null) {
        this.world.addBody(body);
        if (mesh) {
            this.meshBodyPairs.push({ mesh, body });
        }
    }

    removeBody(body) {
        this.world.removeBody(body);
        this.meshBodyPairs = this.meshBodyPairs.filter(p => p.body !== body);
    }

    step(dt) {
        this.world.step(1 / 60, dt, 3);
        // Sync Three.js meshes with physics bodies
        for (const pair of this.meshBodyPairs) {
            pair.mesh.position.copy(pair.body.position);
            pair.mesh.quaternion.copy(pair.body.quaternion);
        }
    }

    createStaticBox(size, position) {
        const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
        const shape = new CANNON.Box(halfExtents);
        const body = new CANNON.Body({ mass: 0, shape });
        body.position.set(position.x, position.y, position.z);
        this.world.addBody(body);
        return body;
    }

    dispose() {
        this.meshBodyPairs = [];
    }
}

// Minimap — canvas-based radar overlay
import { ARENA_SIZE } from '../utils/constants.js';

export class Minimap {
    constructor() {
        this.canvas = document.getElementById('minimap');
        this.ctx = this.canvas.getContext('2d');
        this.size = 150;
        this.canvas.width = this.size;
        this.canvas.height = this.size;
    }

    update(player, enemies, pickups, grenades) {
        const ctx = this.ctx;
        const s = this.size;
        const half = s / 2;
        const scale = s / ARENA_SIZE;

        // Clear
        ctx.clearRect(0, 0, s, s);

        // Background
        ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
        ctx.beginPath();
        ctx.arc(half, half, half - 2, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(half, half, half - 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.translate(half, half);

        const playerPos = player.getPosition();

        // Arena boundary
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.lineWidth = 0.5;
        const arenaHalf = ARENA_SIZE / 2 * scale;
        ctx.strokeRect(-arenaHalf, -arenaHalf, arenaHalf * 2, arenaHalf * 2);

        // Draw enemies
        enemies.forEach(e => {
            if (!e.alive) return;
            const ex = (e.mesh.position.x - playerPos.x) * scale;
            const ez = (e.mesh.position.z - playerPos.z) * scale;
            if (Math.sqrt(ex * ex + ez * ez) > half - 5) return;

            const type = e.enemyType || 'basic';
            if (type === 'tank') ctx.fillStyle = '#8833ff';
            else if (type === 'fast') ctx.fillStyle = '#00ff44';
            else ctx.fillStyle = '#ff2244';

            ctx.beginPath();
            ctx.arc(ex, ez, type === 'tank' ? 4 : type === 'fast' ? 2 : 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw pickups
        pickups.forEach(p => {
            if (p.collected) return;
            const px = (p.mesh.position.x - playerPos.x) * scale;
            const pz = (p.mesh.position.z - playerPos.z) * scale;
            if (Math.sqrt(px * px + pz * pz) > half - 5) return;

            ctx.fillStyle = p.type === 'health' ? '#00ff88' : '#00ccff';
            ctx.beginPath();
            ctx.arc(px, pz, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw grenades
        if (grenades) {
            grenades.forEach(g => {
                if (!g.alive || g.exploded) return;
                const gx = (g.mesh.position.x - playerPos.x) * scale;
                const gz = (g.mesh.position.z - playerPos.z) * scale;
                if (Math.sqrt(gx * gx + gz * gz) > half - 5) return;
                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.arc(gx, gz, 2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw player (center)
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Player direction indicator
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -10);
        ctx.stroke();

        ctx.restore();
    }
}

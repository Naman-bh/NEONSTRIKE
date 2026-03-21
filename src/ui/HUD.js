// HUD — updates HTML overlay elements
import { DASH_COOLDOWN } from '../utils/constants.js';

export class HUD {
    constructor() {
        this.els = {
            healthBar: document.getElementById('health-bar'),
            healthText: document.getElementById('health-text'),
            ammoCurrent: document.getElementById('ammo-current'),
            ammoReserve: document.getElementById('ammo-reserve'),
            weaponName: document.getElementById('weapon-name'),
            scoreValue: document.getElementById('score-value'),
            waveValue: document.getElementById('wave-value'),
            damageOverlay: document.getElementById('damage-overlay'),
            hitMarker: document.getElementById('hit-marker'),
            grenadeValue: document.getElementById('grenade-value'),
            dashBar: document.getElementById('dash-bar'),
            killFeed: document.getElementById('kill-feed'),
            comboContainer: document.getElementById('combo-container'),
            comboCount: document.getElementById('combo-count'),
        };
        this._damageFlashTimer = 0;
        this._hitMarkerTimer = 0;

        // Combo system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.comboTimeout = 3.0; // seconds between kills to maintain combo

        // Kill feed
        this._killFeedItems = [];
    }

    update(dt, player, weaponManager, wave, grenadeCount) {
        // Health
        const hp = player.health / player.maxHealth;
        this.els.healthBar.style.width = `${hp * 100}%`;
        this.els.healthText.textContent = Math.ceil(player.health);

        // Health bar color
        if (hp > 0.5) {
            this.els.healthBar.style.background = '#00ff88';
            this.els.healthBar.style.boxShadow = '0 0 8px rgba(0,255,136,0.4)';
            this.els.healthText.style.color = '#00ff88';
        } else if (hp > 0.25) {
            this.els.healthBar.style.background = '#ffaa00';
            this.els.healthBar.style.boxShadow = '0 0 8px rgba(255,170,0,0.4)';
            this.els.healthText.style.color = '#ffaa00';
        } else {
            this.els.healthBar.style.background = '#ff2d2d';
            this.els.healthBar.style.boxShadow = '0 0 8px rgba(255,45,45,0.4)';
            this.els.healthText.style.color = '#ff2d2d';
        }

        // Ammo
        const wep = weaponManager.current;
        this.els.ammoCurrent.textContent = wep.currentClip;
        this.els.ammoReserve.textContent = wep.reserve;
        this.els.weaponName.textContent = weaponManager.reloading
            ? 'RELOADING...'
            : wep.name;

        // Score & wave
        this.els.scoreValue.textContent = player.score;
        this.els.waveValue.textContent = wave;

        // Grenades
        if (this.els.grenadeValue) {
            this.els.grenadeValue.textContent = grenadeCount !== undefined ? grenadeCount : 0;
        }

        // Dash cooldown
        if (this.els.dashBar) {
            const cd = player.dashCooldown || 0;
            const pct = 1 - (cd / DASH_COOLDOWN);
            this.els.dashBar.style.width = `${pct * 100}%`;
            if (pct >= 1) {
                this.els.dashBar.style.background = '#00f0ff';
            } else {
                this.els.dashBar.style.background = '#555';
            }
        }

        // Damage overlay timer
        if (this._damageFlashTimer > 0) {
            this._damageFlashTimer -= dt;
            if (this._damageFlashTimer <= 0) {
                this.els.damageOverlay.classList.remove('flash');
            }
        }

        // Hit marker timer
        if (this._hitMarkerTimer > 0) {
            this._hitMarkerTimer -= dt;
            if (this._hitMarkerTimer <= 0) {
                this.els.hitMarker.classList.add('hidden');
            }
        }

        // Combo timer
        if (this.comboCount > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
                this.els.comboContainer.classList.add('hidden');
            }
        }
    }

    flashDamage() {
        this.els.damageOverlay.classList.add('flash');
        this._damageFlashTimer = 0.15;
    }

    showHitMarker() {
        this.els.hitMarker.classList.remove('hidden');
        this._hitMarkerTimer = 0.2;
    }

    announce(text) {
        const existing = document.getElementById('wave-announce');
        if (existing) existing.remove();
        const div = document.createElement('div');
        div.id = 'wave-announce';
        div.textContent = text;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2200);
    }

    // Kill feed
    addKillFeedItem(enemyType) {
        const typeNames = {
            'basic': 'DRONE',
            'tank': 'TANK',
            'fast': 'SCOUT',
        };
        const name = typeNames[enemyType] || 'ENEMY';

        const div = document.createElement('div');
        div.className = 'kill-feed-item';
        div.textContent = `✕ ${name} ELIMINATED`;
        this.els.killFeed.prepend(div);

        // Keep only last 5
        while (this.els.killFeed.children.length > 5) {
            this.els.killFeed.lastChild.remove();
        }

        // Auto-remove after 3s
        setTimeout(() => {
            if (div.parentNode) div.remove();
        }, 3000);
    }

    // Combo
    registerKill(enemyType) {
        this.comboCount++;
        this.comboTimer = this.comboTimeout;
        if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;

        this.addKillFeedItem(enemyType);

        if (this.comboCount >= 2) {
            this.els.comboContainer.classList.remove('hidden');
            this.els.comboCount.textContent = `${this.comboCount}x`;
            // Re-trigger animation
            this.els.comboCount.style.animation = 'none';
            void this.els.comboCount.offsetHeight;
            this.els.comboCount.style.animation = 'comboPulse 0.3s ease-out';
            return true; // combo achieved
        }
        return false;
    }

    resetCombo() {
        this.comboCount = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.els.comboContainer.classList.add('hidden');
        // Clear kill feed
        this.els.killFeed.innerHTML = '';
    }
}

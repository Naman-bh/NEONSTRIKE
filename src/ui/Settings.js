// Settings — user preferences with localStorage persistence
import { audio } from '../audio/AudioManager.js';

const DEFAULTS = {
    mouseSensitivity: 0.002,
    sfxVolume: 0.5,
    musicVolume: 0.3,
    fov: 75,
};

const STORAGE_KEY = 'neon-strike-settings';

export class Settings {
    constructor() {
        this.values = { ...DEFAULTS };
        this.load();
        this._setupUI();
    }

    load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.values = { ...DEFAULTS, ...parsed };
            }
        } catch (e) { /* ignore */ }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
        } catch (e) { /* ignore */ }
    }

    _setupUI() {
        const screen = document.getElementById('settings-screen');
        if (!screen) return;

        // Sensitivity slider
        const sensSlider = document.getElementById('setting-sensitivity');
        const sensVal = document.getElementById('setting-sensitivity-val');
        if (sensSlider) {
            sensSlider.value = this.values.mouseSensitivity * 1000;
            sensVal.textContent = this.values.mouseSensitivity.toFixed(3);
            sensSlider.addEventListener('input', () => {
                this.values.mouseSensitivity = parseFloat(sensSlider.value) / 1000;
                sensVal.textContent = this.values.mouseSensitivity.toFixed(3);
                this.save();
            });
        }

        // SFX Volume
        const sfxSlider = document.getElementById('setting-sfx');
        const sfxVal = document.getElementById('setting-sfx-val');
        if (sfxSlider) {
            sfxSlider.value = this.values.sfxVolume * 100;
            sfxVal.textContent = Math.round(this.values.sfxVolume * 100) + '%';
            sfxSlider.addEventListener('input', () => {
                this.values.sfxVolume = parseFloat(sfxSlider.value) / 100;
                sfxVal.textContent = Math.round(this.values.sfxVolume * 100) + '%';
                audio.setVolume('sfx', this.values.sfxVolume);
                this.save();
            });
        }

        // Music Volume
        const musicSlider = document.getElementById('setting-music');
        const musicVal = document.getElementById('setting-music-val');
        if (musicSlider) {
            musicSlider.value = this.values.musicVolume * 100;
            musicVal.textContent = Math.round(this.values.musicVolume * 100) + '%';
            musicSlider.addEventListener('input', () => {
                this.values.musicVolume = parseFloat(musicSlider.value) / 100;
                musicVal.textContent = Math.round(this.values.musicVolume * 100) + '%';
                audio.setVolume('music', this.values.musicVolume);
                this.save();
            });
        }

        // FOV
        const fovSlider = document.getElementById('setting-fov');
        const fovVal = document.getElementById('setting-fov-val');
        if (fovSlider) {
            fovSlider.value = this.values.fov;
            fovVal.textContent = this.values.fov + '°';
            fovSlider.addEventListener('input', () => {
                this.values.fov = parseInt(fovSlider.value);
                fovVal.textContent = this.values.fov + '°';
                this.save();
            });
        }

        // Back button
        const btnBack = document.getElementById('btn-settings-back');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                screen.classList.add('hidden');
                // Show whichever menu was active before
                const pauseMenu = document.getElementById('pause-menu');
                const mainMenu = document.getElementById('main-menu');
                if (this._openedFrom === 'pause') pauseMenu.classList.remove('hidden');
                else mainMenu.classList.remove('hidden');
            });
        }
    }

    show(from = 'menu') {
        this._openedFrom = from;
        const screen = document.getElementById('settings-screen');
        if (screen) screen.classList.remove('hidden');

        // Sync slider values
        const sensSlider = document.getElementById('setting-sensitivity');
        if (sensSlider) sensSlider.value = this.values.mouseSensitivity * 1000;
        const sfxSlider = document.getElementById('setting-sfx');
        if (sfxSlider) sfxSlider.value = this.values.sfxVolume * 100;
        const musicSlider = document.getElementById('setting-music');
        if (musicSlider) musicSlider.value = this.values.musicVolume * 100;
        const fovSlider = document.getElementById('setting-fov');
        if (fovSlider) fovSlider.value = this.values.fov;
    }

    applyToEngine(engine, player) {
        if (engine?.camera) {
            engine.camera.fov = this.values.fov;
            engine.camera.updateProjectionMatrix();
        }
    }
}

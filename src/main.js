// main.js — Game entry point (thin orchestrator)
import { Engine } from './core/Engine.js';
import { PhysicsWorld } from './core/PhysicsWorld.js';
import { input } from './core/InputManager.js';
import { Player } from './entities/Player.js';
import { WeaponManager } from './weapons/WeaponManager.js';
import { GameState, STATES } from './state/GameState.js';
import { Settings } from './ui/Settings.js';
import { ModeManager } from './modes/ModeManager.js';
import { WaveMode } from './modes/WaveMode.js';
import { FreeAimMode } from './modes/FreeAimMode.js';
import { ScenarioMode } from './modes/ScenarioMode.js';
import { saveTrainingScore, loadTrainingScores } from './training/ScoringEngine.js';
import { audio } from './audio/AudioManager.js';

// ===== DOM Elements =====
const canvas = document.getElementById('game');
const loadingScreen = document.getElementById('loading-screen');
const loaderBar = document.getElementById('loader-bar-fill');
const loaderText = document.getElementById('loader-text');
const mainMenu = document.getElementById('main-menu');
const hudEl = document.getElementById('hud');
const minimapCanvas = document.getElementById('minimap');
const pauseMenu = document.getElementById('pause-menu');
const gameOverScreen = document.getElementById('game-over');
const settingsScreen = document.getElementById('settings-screen');
const highscoresScreen = document.getElementById('highscores-screen');

// Main menu buttons
const btnWaveMode = document.getElementById('btn-play');
const btnAimTraining = document.getElementById('btn-aim-training');
const btnScenarios = document.getElementById('btn-scenarios');
const btnSettingsMenu = document.getElementById('btn-settings-menu');
const btnHighscoresMenu = document.getElementById('btn-highscores-menu');

// Pause menu buttons
const btnResume = document.getElementById('btn-resume');
const btnRestartPause = document.getElementById('btn-restart-pause');
const btnSettingsPause = document.getElementById('btn-settings-pause');

// Game over buttons
const btnRestart = document.getElementById('btn-restart');
const finalKills = document.getElementById('final-kills');
const finalWaves = document.getElementById('final-waves');
const finalTime = document.getElementById('final-time');
const finalCombo = document.getElementById('final-combo');
const newHighscore = document.getElementById('new-highscore');

// High scores
const btnHighscoresBack = document.getElementById('btn-highscores-back');

// Aim Training submenu
const aimSelectScreen = document.getElementById('aim-select-screen');
const btnAimBack = document.getElementById('btn-aim-back');

// Scenario Select submenu
const scenarioSelectScreen = document.getElementById('scenario-select-screen');
const btnScenarioBack = document.getElementById('btn-scenario-back');

// Training end screen
const trainingEndScreen = document.getElementById('training-end-screen');
const btnTrainingRetry = document.getElementById('btn-training-retry');
const btnTrainingMenu = document.getElementById('btn-training-menu');

// Scenario end screen
const scenarioEndScreen = document.getElementById('scenario-end-screen');
const btnScenarioRetry = document.getElementById('btn-scenario-retry');
const btnScenarioMenu = document.getElementById('btn-scenario-menu');

// ===== Core Systems =====
let engine, physics, player, weaponManager, gameState, settings, modeManager;
let escPrev = false;
let currentModeType = null; // 'wave' | 'training' | 'scenario'
let lastFreeAimFocus = null;
let lastScenarioId = null;

// ===== High Score System =====
const HS_KEY = 'neon-strike-highscores';

function loadHighScores(key = HS_KEY) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
}

function saveHighScore(score, key = HS_KEY) {
    const scores = loadHighScores(key);
    scores.push(score);
    scores.sort((a, b) => b.kills - a.kills || b.waves - a.waves);
    const top5 = scores.slice(0, 5);
    localStorage.setItem(key, JSON.stringify(top5));
    return top5;
}

function renderHighScores(container, scores) {
    if (!container) return;
    container.innerHTML = '';
    if (scores.length === 0) {
        container.innerHTML = '<div class="hs-empty">No scores yet. Play to set a record!</div>';
        return;
    }
    scores.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = 'hs-row';
        row.innerHTML = `
            <span class="hs-rank">#${i + 1}</span>
            <span class="hs-kills">${s.kills} kills</span>
            <span class="hs-wave">W${s.waves}</span>
            <span class="hs-time">${s.time}</span>
        `;
        container.appendChild(row);
    });
}

// ===== Init =====
function init() {
    engine = new Engine(canvas);
    physics = new PhysicsWorld();
    gameState = new GameState();
    settings = new Settings();

    player = new Player(engine.camera, physics);
    weaponManager = new WeaponManager(engine.camera, engine.scene);
    engine.scene.add(engine.camera);

    modeManager = new ModeManager(engine, physics, player, weaponManager, settings);

    // Apply settings
    settings.applyToEngine(engine, player);
    player.sensitivityOverride = settings.values.mouseSensitivity;

    simulateLoading();
}

function simulateLoading() {
    let progress = 0;
    const stages = [
        'Loading renderer...',
        'Building arena...',
        'Initializing weapons...',
        'Spawning enemies...',
        'Calibrating HUD...',
        'Ready!',
    ];

    const interval = setInterval(() => {
        progress += 15 + Math.random() * 10;
        if (progress > 100) progress = 100;
        loaderBar.style.width = `${progress}%`;
        const stageIndex = Math.min(Math.floor(progress / 20), stages.length - 1);
        loaderText.textContent = stages[stageIndex];

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                mainMenu.classList.remove('hidden');
                gameState.transition(STATES.MENU);
            }, 500);
        }
    }, 300);
}

// ===== Apply Audio & Settings =====
function applySettings() {
    audio.init();
    audio.resume();
    audio.setVolume('sfx', settings.values.sfxVolume);
    audio.setVolume('music', settings.values.musicVolume);
    engine.camera.fov = settings.values.fov;
    engine.camera.updateProjectionMatrix();
    player.sensitivityOverride = settings.values.mouseSensitivity;
}

// ===== Hide all screens utility =====
function hideAllScreens() {
    mainMenu.classList.add('hidden');
    if (pauseMenu) pauseMenu.classList.add('hidden');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    if (hudEl) hudEl.classList.add('hidden');
    if (minimapCanvas) minimapCanvas.style.display = 'none';
    if (aimSelectScreen) aimSelectScreen.classList.add('hidden');
    if (scenarioSelectScreen) scenarioSelectScreen.classList.add('hidden');
    if (trainingEndScreen) trainingEndScreen.classList.add('hidden');
    if (scenarioEndScreen) scenarioEndScreen.classList.add('hidden');
    if (settingsScreen) settingsScreen.classList.add('hidden');
    if (highscoresScreen) highscoresScreen.classList.add('hidden');
}

function showMenu() {
    hideAllScreens();
    modeManager.stopCurrentMode();
    currentModeType = null;
    mainMenu.classList.remove('hidden');
    gameState.transition(STATES.MENU);
    document.exitPointerLock();
}

// ===== WAVE MODE =====
function startWaveMode() {
    applySettings();
    hideAllScreens();
    currentModeType = 'wave';

    const waveMode = new WaveMode({
        onGameOver: (results) => showWaveGameOver(results),
    });
    modeManager.startMode(waveMode);

    gameState.transition(STATES.PLAYING);
    player.requestPointerLock(canvas);
}

function showWaveGameOver(results) {
    gameState.transition(STATES.GAME_OVER);
    if (hudEl) hudEl.classList.add('hidden');
    if (minimapCanvas) minimapCanvas.style.display = 'none';
    gameOverScreen.classList.remove('hidden');
    document.exitPointerLock();

    finalKills.textContent = results.kills;
    finalWaves.textContent = results.waves;
    finalTime.textContent = results.time;
    finalCombo.textContent = results.combo;

    const scores = saveHighScore(results);
    const isNew = scores[0] && scores[0].date === results.date;
    if (newHighscore) {
        if (isNew && results.kills > 0) {
            newHighscore.classList.remove('hidden');
        } else {
            newHighscore.classList.add('hidden');
        }
    }
    renderHighScores(document.getElementById('gameover-scores'), scores);
}

// ===== AIM TRAINING MODE =====
function showAimSelect() {
    hideAllScreens();
    if (aimSelectScreen) aimSelectScreen.classList.remove('hidden');
    gameState.transition(STATES.AIM_SELECT);
}

function startFreeAim(focus) {
    applySettings();
    hideAllScreens();
    currentModeType = 'training';
    lastFreeAimFocus = focus;

    const freeAimMode = new FreeAimMode(focus, {
        onEnd: (results) => showTrainingEnd(results),
    });
    modeManager.startMode(freeAimMode);

    gameState.transition(STATES.TRAINING);
    player.requestPointerLock(canvas);
}

function showTrainingEnd(results) {
    gameState.transition(STATES.TRAINING_END);
    if (document.getElementById('training-hud')) {
        document.getElementById('training-hud').classList.add('hidden');
    }
    trainingEndScreen.classList.remove('hidden');
    document.exitPointerLock();

    const gradeEl = document.getElementById('training-grade');
    if (gradeEl) gradeEl.textContent = results.grade;
    const scoreEl = document.getElementById('training-score');
    if (scoreEl) scoreEl.textContent = results.score.toLocaleString();
    const accEl = document.getElementById('training-accuracy');
    if (accEl) accEl.textContent = `${results.accuracyPercent}%`;
    const shotsEl = document.getElementById('training-shots');
    if (shotsEl) shotsEl.textContent = results.shotsFired;
    const hitsEl = document.getElementById('training-hits');
    if (hitsEl) hitsEl.textContent = results.shotsHit;
}

// ===== SCENARIO MODE =====
function showScenarioSelect() {
    hideAllScreens();
    if (scenarioSelectScreen) scenarioSelectScreen.classList.remove('hidden');
    gameState.transition(STATES.SCENARIO_SELECT);
}

function startScenario(scenarioId) {
    applySettings();
    hideAllScreens();
    currentModeType = 'scenario';
    lastScenarioId = scenarioId;

    const scenarioMode = new ScenarioMode(scenarioId, {
        onEnd: (results) => showScenarioEnd(results),
    });
    modeManager.startMode(scenarioMode);

    gameState.transition(STATES.SCENARIO);
    player.requestPointerLock(canvas);
}

function showScenarioEnd(results) {
    gameState.transition(STATES.SCENARIO_END);
    if (document.getElementById('training-hud')) {
        document.getElementById('training-hud').classList.add('hidden');
    }
    scenarioEndScreen.classList.remove('hidden');
    document.exitPointerLock();

    const gradeEl = document.getElementById('scenario-grade');
    if (gradeEl) gradeEl.textContent = results.grade;
    const scoreEl = document.getElementById('scenario-score');
    if (scoreEl) scoreEl.textContent = results.score.toLocaleString();
    const accEl = document.getElementById('scenario-accuracy');
    if (accEl) accEl.textContent = `${results.accuracyPercent}%`;
    const killsEl = document.getElementById('scenario-kills');
    if (killsEl) killsEl.textContent = results.kills;
    const reactionEl = document.getElementById('scenario-reaction');
    if (reactionEl) reactionEl.textContent = `${results.avgReaction}ms`;

    // Save and display scenario high scores
    const hsKey = `neon-strike-scenario-${results.scenarioId}`;
    const scores = saveTrainingScore({ score: results.score, accuracy: results.accuracyPercent, grade: results.grade, date: results.date }, hsKey);
    const scoresContainer = document.getElementById('scenario-scores');
    if (scoresContainer) {
        scoresContainer.innerHTML = '';
        scores.forEach((s, i) => {
            const row = document.createElement('div');
            row.className = 'hs-row';
            row.innerHTML = `
                <span class="hs-rank">#${i + 1}</span>
                <span class="hs-kills">${s.score.toLocaleString()} pts</span>
                <span class="hs-wave">${s.accuracy}%</span>
                <span class="hs-time">${s.grade}</span>
            `;
            scoresContainer.appendChild(row);
        });
    }
}

// ===== PAUSE/RESUME =====
function pauseGame() {
    modeManager.pause();
    gameState.transition(STATES.PAUSED);
    pauseMenu.classList.remove('hidden');
    document.exitPointerLock();
}

function resumeGame() {
    pauseMenu.classList.add('hidden');
    // Determine which playing state to return to
    if (currentModeType === 'wave') {
        gameState.transition(STATES.PLAYING);
    } else if (currentModeType === 'training') {
        gameState.transition(STATES.TRAINING);
    } else if (currentModeType === 'scenario') {
        gameState.transition(STATES.SCENARIO);
    }
    modeManager.resume();
    player.requestPointerLock(canvas);
    // Re-apply settings in case changed
    player.sensitivityOverride = settings.values.mouseSensitivity;
    engine.camera.fov = settings.values.fov;
    engine.camera.updateProjectionMatrix();
    audio.setVolume('sfx', settings.values.sfxVolume);
    audio.setVolume('music', settings.values.musicVolume);
}

function restartCurrentMode() {
    pauseMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    trainingEndScreen.classList.add('hidden');
    scenarioEndScreen.classList.add('hidden');
    if (currentModeType === 'wave') {
        startWaveMode();
    } else if (currentModeType === 'training' && lastFreeAimFocus) {
        startFreeAim(lastFreeAimFocus);
    } else if (currentModeType === 'scenario' && lastScenarioId) {
        startScenario(lastScenarioId);
    }
}

// ===== Event Listeners =====

// Main Menu
if (btnWaveMode) btnWaveMode.addEventListener('click', () => startWaveMode());
if (btnAimTraining) btnAimTraining.addEventListener('click', () => showAimSelect());
if (btnScenarios) btnScenarios.addEventListener('click', () => showScenarioSelect());

// Aim Select submenu
if (btnAimBack) btnAimBack.addEventListener('click', () => showMenu());

// Aim focus buttons
document.querySelectorAll('[data-aim-focus]').forEach(btn => {
    btn.addEventListener('click', () => startFreeAim(btn.dataset.aimFocus));
});

// Scenario Select submenu
if (btnScenarioBack) btnScenarioBack.addEventListener('click', () => showMenu());

// Scenario cards
document.querySelectorAll('[data-scenario]').forEach(btn => {
    btn.addEventListener('click', () => startScenario(btn.dataset.scenario));
});

// Pause menu
if (btnResume) btnResume.addEventListener('click', () => resumeGame());
if (btnRestartPause) btnRestartPause.addEventListener('click', () => restartCurrentMode());

// Game Over
if (btnRestart) btnRestart.addEventListener('click', () => restartCurrentMode());

// Training End
if (btnTrainingRetry) btnTrainingRetry.addEventListener('click', () => restartCurrentMode());
if (btnTrainingMenu) btnTrainingMenu.addEventListener('click', () => showMenu());

// Scenario End
if (btnScenarioRetry) btnScenarioRetry.addEventListener('click', () => restartCurrentMode());
if (btnScenarioMenu) btnScenarioMenu.addEventListener('click', () => showMenu());

// Settings
if (btnSettingsMenu) {
    btnSettingsMenu.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        settings.show('menu');
    });
}
if (btnSettingsPause) {
    btnSettingsPause.addEventListener('click', () => {
        pauseMenu.classList.add('hidden');
        settings.show('pause');
    });
}

// High scores
if (btnHighscoresMenu) {
    btnHighscoresMenu.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        highscoresScreen.classList.remove('hidden');
        renderHighScores(document.getElementById('highscores-list'), loadHighScores());
    });
}
if (btnHighscoresBack) {
    btnHighscoresBack.addEventListener('click', () => {
        highscoresScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });
}

// ===== Game Loop =====
function gameLoop() {
    requestAnimationFrame(gameLoop);
    engine.update();
    const dt = engine.deltaTime;

    const isActive = gameState.is(STATES.PLAYING) ||
                     gameState.is(STATES.TRAINING) ||
                     gameState.is(STATES.SCENARIO);

    if (!isActive) {
        engine.render();
        return;
    }

    // Escape to pause
    const escNow = input.isPressed('Escape');
    if (escNow && !escPrev) {
        pauseGame();
        escPrev = escNow;
        engine.render();
        return;
    }
    escPrev = escNow;

    // Delegate to active mode
    modeManager.update(dt);

    // Render
    engine.render();
}

// ===== Handle pointer lock loss =====
document.addEventListener('pointerlockchange', () => {
    const isActive = gameState.is(STATES.PLAYING) ||
                     gameState.is(STATES.TRAINING) ||
                     gameState.is(STATES.SCENARIO);
    if (!document.pointerLockElement && isActive) {
        pauseGame();
    }
});

// ===== Start =====
init();
gameLoop();

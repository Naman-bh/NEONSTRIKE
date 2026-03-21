// Game-wide tuning constants
export const PLAYER_SPEED = 8;
export const PLAYER_SPRINT_SPEED = 14;
export const PLAYER_JUMP_FORCE = 7;
export const PLAYER_HEIGHT = 1.7;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_GRAVITY = -20;

export const MOUSE_SENSITIVITY = 0.002;

// Weapons
export const WEAPONS = {
  pistol: {
    name: 'PISTOL',
    damage: 25,
    fireRate: 0.3,       // seconds between shots
    clipSize: 12,
    maxReserve: 60,
    reloadTime: 1.5,
    range: 100,
    spread: 0.02,
    auto: false,
  },
  rifle: {
    name: 'RIFLE',
    damage: 15,
    fireRate: 0.1,
    clipSize: 30,
    maxReserve: 120,
    reloadTime: 2.0,
    range: 120,
    spread: 0.04,
    auto: true,
  },
  shotgun: {
    name: 'SHOTGUN',
    damage: 18,
    fireRate: 0.9,
    clipSize: 6,
    maxReserve: 30,
    reloadTime: 2.2,
    range: 40,
    spread: 0.12,
    auto: false,
    pellets: 8,
  }
};

// Enemies
export const ENEMY_BASE_HEALTH = 60;
export const ENEMY_SPEED = 3;
export const ENEMY_ATTACK_RANGE = 10;
export const ENEMY_ATTACK_DAMAGE = 5;
export const ENEMY_ATTACK_RATE = 1.8; // seconds
export const ENEMY_DETECT_RANGE = 22;
export const ENEMY_SIZE = { w: 0.8, h: 1.6, d: 0.8 };

// Waves
export const WAVE_BASE_COUNT = 4;
export const WAVE_INCREMENT = 2;
export const WAVE_HEALTH_SCALE = 1.15;
export const WAVE_SPEED_SCALE = 1.05;
export const WAVE_DELAY = 3; // seconds between waves

// Arena
export const ARENA_SIZE = 60;
export const ARENA_WALL_HEIGHT = 6;

// Pickups
export const PICKUP_HEALTH_AMOUNT = 50;
export const PICKUP_AMMO_AMOUNT = 15;
export const PICKUP_SPAWN_CHANCE = 0.50;

// Grenades
export const GRENADE_DAMAGE = 80;
export const GRENADE_RADIUS = 8;
export const GRENADE_FUSE = 3.0;
export const GRENADE_MAX = 3;
export const GRENADE_THROW_FORCE = 18;

// Dash
export const DASH_SPEED = 35;
export const DASH_DURATION = 0.15;
export const DASH_COOLDOWN = 3.0;

// Enemy types
export const TANK_ENEMY_HEALTH = 200;
export const TANK_ENEMY_SPEED = 1.5;
export const TANK_ENEMY_DAMAGE = 12;
export const TANK_ENEMY_SIZE = { w: 1.2, h: 2.2, d: 1.2 };

export const FAST_ENEMY_HEALTH = 30;
export const FAST_ENEMY_SPEED = 7;
export const FAST_ENEMY_DAMAGE = 3;
export const FAST_ENEMY_SIZE = { w: 0.5, h: 1.0, d: 0.5 };

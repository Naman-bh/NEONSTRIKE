# NEONSTRIKE

A fast-paced 3D first-person shooter built entirely in the browser using **Three.js** and **cannon-es** physics.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-r172-black?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)

## Gameplay

Fight waves of enemies in a neon-lit arena. Survive as long as you can, rack up combos, and climb the high score board.

### Game Modes

- **Wave Mode** — Endless waves of increasingly difficult enemies (standard, fast, tank variants)
- **Aim Training** — Practice flicking, tracking, and precision with dedicated drills
- **Scenarios** — Timed challenges: Gridshot, Strafe Duel, Angle Peek, Micro Adjust, 180 Flick, Multi Target

### Weapons

| # | Weapon | Style |
|---|--------|-------|
| 1 | Pistol | Reliable sidearm |
| 2 | Rifle | Full-auto firepower |
| 3 | Shotgun | Devastating at close range |

### Features

- Physics-based movement with sprinting, jumping, and dash
- Grenade throwables
- Enemy AI with patrol, chase, and attack states
- Health and ammo pickups
- Combo system and kill feed
- Minimap
- Customizable sensitivity, FOV, and audio settings
- Local high score tracking

## Controls

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` | Move |
| `Mouse` | Look |
| `Click` | Shoot |
| `R` | Reload |
| `Space` | Jump |
| `Shift` | Sprint |
| `1` `2` `3` | Switch weapon |
| `G` | Grenade |
| `Q` | Dash |
| `Esc` | Pause |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- **Three.js** — 3D rendering
- **cannon-es** — Physics engine
- **Howler.js** — Audio
- **Vite** — Build tool

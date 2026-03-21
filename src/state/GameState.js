// GameState — state machine for game flow
export const STATES = {
    LOADING: 'loading',
    MENU: 'menu',
    // Mode selection submenus
    AIM_SELECT: 'aim_select',
    SCENARIO_SELECT: 'scenario_select',
    // Active gameplay
    PLAYING: 'playing',         // Wave mode
    TRAINING: 'training',       // Free aim training
    SCENARIO: 'scenario',       // Scenario drill
    // Overlays
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    TRAINING_END: 'training_end',
    SCENARIO_END: 'scenario_end',
};

export class GameState {
    constructor() {
        this.current = STATES.LOADING;
        this.listeners = {};
    }

    transition(newState) {
        const prev = this.current;
        this.current = newState;
        if (this.listeners[newState]) {
            this.listeners[newState].forEach(fn => fn(prev));
        }
    }

    on(state, callback) {
        if (!this.listeners[state]) this.listeners[state] = [];
        this.listeners[state].push(callback);
    }

    is(state) {
        return this.current === state;
    }
}

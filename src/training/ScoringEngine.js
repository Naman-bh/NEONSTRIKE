// ScoringEngine — score, accuracy, grade calculation for training & scenarios

export class ScoringEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.score = 0;
        this.kills = 0;
        this.reactionTimes = [];
        this.startTime = performance.now();
        this._hitStreak = 0;
        this._lastHitTime = 0;
    }

    registerShot() {
        this.shotsFired++;
    }

    registerHit(target) {
        this.shotsHit++;
        this.kills++;

        // Reaction time
        const reactionMs = target.getReactionTime();
        this.reactionTimes.push(reactionMs);

        // Base points
        let points = 100;

        // Reaction bonus: faster hit = more points (max 300 bonus)
        points += Math.max(0, Math.floor(300 - reactionMs / 3));

        // Combo bonus: consecutive hits within 1.5s
        const now = performance.now();
        if (now - this._lastHitTime < 1500) {
            this._hitStreak++;
            points += this._hitStreak * 50;
        } else {
            this._hitStreak = 1;
        }
        this._lastHitTime = now;

        this.score += points;
        return points;
    }

    registerMiss() {
        this._hitStreak = 0;
    }

    getAccuracy() {
        return this.shotsFired > 0 ? this.shotsHit / this.shotsFired : 0;
    }

    getAccuracyPercent() {
        return (this.getAccuracy() * 100).toFixed(1);
    }

    getAvgReactionTime() {
        if (this.reactionTimes.length === 0) return 0;
        const sum = this.reactionTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.reactionTimes.length);
    }

    getElapsedTime() {
        return (performance.now() - this.startTime) / 1000;
    }

    calculateGrade(thresholds) {
        const acc = this.getAccuracy() * 100;
        const t = thresholds || { S: 90, A: 75, B: 55, C: 35 };
        if (acc >= t.S) return 'S';
        if (acc >= t.A) return 'A';
        if (acc >= t.B) return 'B';
        if (acc >= t.C) return 'C';
        return 'D';
    }

    getResults(thresholds) {
        const elapsed = this.getElapsedTime();
        const min = Math.floor(elapsed / 60);
        const sec = Math.floor(elapsed % 60);

        // Accuracy end bonus
        const accBonus = Math.floor(this.getAccuracy() * 500);
        const finalScore = this.score + accBonus;

        return {
            score: finalScore,
            shotsFired: this.shotsFired,
            shotsHit: this.shotsHit,
            accuracy: this.getAccuracy(),
            accuracyPercent: this.getAccuracyPercent(),
            avgReaction: this.getAvgReactionTime(),
            kills: this.kills,
            grade: this.calculateGrade(thresholds),
            time: `${min}:${sec.toString().padStart(2, '0')}`,
            date: Date.now(),
        };
    }
}

// Leaderboard helpers
export function loadTrainingScores(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
}

export function saveTrainingScore(entry, key) {
    const scores = loadTrainingScores(key);
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const top5 = scores.slice(0, 5);
    localStorage.setItem(key, JSON.stringify(top5));
    return top5;
}

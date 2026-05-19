export type Screen =
    | "boot"
    | "menu"
    | "calibrate"
    | "game"
    | "results"
    | "about"
    | "history"

export type Difficulty = "easy" | "normal" | "hard"

export interface Round {
    trueFps: number // actual FPS the animation ran at
    guess: number | null // player's guess
    scorePct: number // 0-100 accuracy for this round
    curve: { a: number; b: number; delta: number }
}

export interface HistoryEntry {
    ts: number // epoch ms
    difficulty: Difficulty
    score: number // 0-100 average
    rounds: number // round count
    monitorHz: number
}

export interface GameState {
    screen: Screen
    monitorHz: number // 0 if not yet calibrated
    rounds: Round[]
    currentRound: number // 0-based index into rounds
    totalRounds: number
    difficulty: Difficulty
    audioEnabled: boolean
    history: HistoryEntry[]
    brightness: 0 | 1 | 2 // CRT brightness knob (0=dim, 1=normal, 2=bright)
    contrast: 0 | 1 | 2 // CRT contrast knob
    volume: 0 | 1 | 2 // SFX volume knob (0=low, 1=mid, 2=high)
}

// Master-gain mapping for the VOL knob. Default sits at 1 (mid).
export const VOLUME_LEVELS = [0.35, 0.7, 1.0] as const

const LS_KEY = "phosphor.settings.v1"
const HISTORY_KEY = "phosphor.history.v1"
const HISTORY_CAP = 50

interface Persisted {
    monitorHz: number
    difficulty: Difficulty
    audioEnabled: boolean
    brightness: 0 | 1 | 2
    contrast: 0 | 1 | 2
    volume: 0 | 1 | 2
}

function loadPersisted(): Partial<Persisted> {
    if (typeof localStorage === "undefined") return {}
    try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return {}
        return JSON.parse(raw) as Persisted
    } catch {
        return {}
    }
}

function savePersisted() {
    if (typeof localStorage === "undefined") return
    try {
        localStorage.setItem(
            LS_KEY,
            JSON.stringify({
                monitorHz: game.monitorHz,
                difficulty: game.difficulty,
                audioEnabled: game.audioEnabled,
                brightness: game.brightness,
                contrast: game.contrast,
                volume: game.volume,
            } satisfies Persisted),
        )
    } catch {
        /* ignore quota */
    }
}

function loadHistory(): HistoryEntry[] {
    if (typeof localStorage === "undefined") return []
    try {
        const raw = localStorage.getItem(HISTORY_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as HistoryEntry[]
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function saveHistory() {
    if (typeof localStorage === "undefined") return
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(game.history))
    } catch {
        /* ignore quota */
    }
}

function initial(): GameState {
    const p = loadPersisted()
    return {
        screen: "boot",
        monitorHz: p.monitorHz ?? 0,
        rounds: [],
        currentRound: 0,
        totalRounds: 5,
        difficulty: p.difficulty ?? "normal",
        audioEnabled: p.audioEnabled ?? true,
        history: loadHistory(),
        brightness: p.brightness ?? 1,
        contrast: p.contrast ?? 1,
        volume: p.volume ?? 2,
    }
}

export const game = $state<GameState>(initial())

export function goto(screen: Screen) {
    game.screen = screen
}

export function setMonitorHz(hz: number) {
    game.monitorHz = hz
    savePersisted()
}

export function setDifficulty(d: Difficulty) {
    game.difficulty = d
    // Round count + curve pool depend on difficulty, so any in-progress
    // round set is no longer valid.
    game.rounds = []
    game.currentRound = 0
    savePersisted()
}

export function roundsForDifficulty(d: Difficulty): number {
    // Base 5; each step up adds 5 more rounds.
    if (d === "easy") return 5
    if (d === "normal") return 10
    return 15
}

export function setAudioEnabled(on: boolean) {
    game.audioEnabled = on
    savePersisted()
}

export function cycleBrightness() {
    game.brightness = ((game.brightness + 1) % 3) as 0 | 1 | 2
    savePersisted()
}

export function cycleContrast() {
    game.contrast = ((game.contrast + 1) % 3) as 0 | 1 | 2
    savePersisted()
}

export function cycleVolume() {
    game.volume = ((game.volume + 1) % 3) as 0 | 1 | 2
    savePersisted()
}

export function startNewGame(rounds: Round[]) {
    game.rounds = rounds
    game.currentRound = 0
    game.screen = "game"
}

export function submitGuess(guess: number) {
    const round = game.rounds[game.currentRound]
    if (!round) return
    round.guess = guess
    round.scorePct = computeScore(guess, round.trueFps)
}

export function nextRound() {
    if (game.currentRound + 1 >= game.rounds.length) {
        game.screen = "results"
    } else {
        game.currentRound += 1
    }
}

export function resetGame() {
    game.rounds = []
    game.currentRound = 0
}

export function totalScore(): number {
    if (game.rounds.length === 0) return 0
    const sum = game.rounds.reduce((a, r) => a + r.scorePct, 0)
    return sum / game.rounds.length
}

export function recordResult() {
    if (game.rounds.length === 0) return
    if (game.rounds.some(r => r.guess === null)) return
    const entry: HistoryEntry = {
        ts: Date.now(),
        difficulty: game.difficulty,
        score: totalScore(),
        rounds: game.rounds.length,
        monitorHz: game.monitorHz,
    }
    game.history = [entry, ...game.history].slice(0, HISTORY_CAP)
    saveHistory()
}

export function bestScore(d: Difficulty): number | null {
    let best: number | null = null
    for (const e of game.history) {
        if (e.difficulty !== d) continue
        if (best === null || e.score > best) best = e.score
    }
    return best
}

export function clearHistory() {
    game.history = []
    saveHistory()
}

/**
 * Score: 100 at perfect, dropping with relative error.
 * |guess - true| / true mapped through a falloff curve.
 */
function computeScore(guess: number, trueFps: number): number {
    const err = Math.abs(guess - trueFps) / trueFps
    // 0% error → 100, 10% → ~80, 25% → ~50, 50% → ~20, 100%+ → ~0
    const score = 100 * Math.exp(-err * 3.5)
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
}

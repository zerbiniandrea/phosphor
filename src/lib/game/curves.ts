import type { Difficulty } from "./state.svelte"

export interface CurveParams {
    a: number
    b: number
    delta: number
}

const POOLS: Record<Difficulty, CurveParams[]> = {
    // EASY — simple low-ratio Lissajous; few lobes, easy to track the dot.
    easy: [
        { a: 2, b: 3, delta: Math.PI / 2 },
        { a: 3, b: 2, delta: Math.PI / 2 },
        { a: 2, b: 5, delta: Math.PI / 4 },
        { a: 5, b: 2, delta: Math.PI / 3 },
        { a: 3, b: 4, delta: 0 },
        { a: 4, b: 3, delta: Math.PI / 2 },
    ],
    // NORMAL — the original well-rounded set (the user-validated default).
    normal: [
        { a: 3, b: 2, delta: Math.PI / 2 },
        { a: 5, b: 4, delta: Math.PI / 3 },
        { a: 3, b: 4, delta: 0 },
        { a: 5, b: 6, delta: Math.PI / 4 },
        { a: 2, b: 3, delta: Math.PI / 2 },
        { a: 7, b: 4, delta: Math.PI / 6 },
        { a: 4, b: 5, delta: Math.PI / 3 },
    ],
    // HARD — high-ratio busy knots; lots of lobes, harder to follow the dot.
    hard: [
        { a: 7, b: 5, delta: Math.PI / 6 },
        { a: 5, b: 7, delta: Math.PI / 3 },
        { a: 7, b: 8, delta: 0 },
        { a: 9, b: 7, delta: Math.PI / 4 },
        { a: 11, b: 8, delta: Math.PI / 5 },
        { a: 7, b: 9, delta: Math.PI / 3 },
        { a: 11, b: 7, delta: Math.PI / 6 },
        { a: 9, b: 8, delta: Math.PI / 4 },
        { a: 13, b: 9, delta: Math.PI / 5 },
    ],
}

function randomizeCurve(base: CurveParams): CurveParams {
    const delta = Math.random() * Math.PI
    // 50/50 swap of a and b to flip orientation.
    const flip = Math.random() < 0.5
    return flip ? { a: base.b, b: base.a, delta } : { a: base.a, b: base.b, delta }
}

/**
 * Build a curve sequence of length `count` for the given difficulty.
 * Pool is shuffled (no duplicate base shapes within a wrap), each curve
 * gets a random delta and a random orientation flip.
 */
export function buildCurveSequence(difficulty: Difficulty, count: number): CurveParams[] {
    const pool = [...POOLS[difficulty]]
    // Fisher-Yates shuffle.
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const result: CurveParams[] = []
    for (let i = 0; i < count; i++) {
        result.push(randomizeCurve(pool[i % pool.length]))
    }
    return result
}

export function dotSpeedFor(difficulty: Difficulty): number {
    // radians/sec for the Lissajous parameter sweep
    if (difficulty === "easy") return 0.4
    if (difficulty === "hard") return 1.0
    return 0.6
}

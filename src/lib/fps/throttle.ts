/**
 * Achievable FPS = monitorHz / round(monitorHz / targetFps).
 * On 144Hz: 144, 72, 48, 36, 28.8... — true FPS is always a divisor.
 */
export function achievableFps(targetFps: number, monitorHz: number): number {
    const divisor = Math.max(1, Math.round(monitorHz / targetFps))
    return monitorHz / divisor
}

/**
 * Pick `count` distinct random target FPS values that map to distinct
 * achievable FPS values on a given monitor. Avoids the trivial monitorHz itself
 * unless includeMax is true.
 */
export function pickRandomFps(
    monitorHz: number,
    count: number,
    opts: { minFps?: number; includeMax?: boolean } = {},
): number[] {
    const { minFps = 10, includeMax = false } = opts
    const maxDivisor = Math.floor(monitorHz / minFps)
    const startDivisor = includeMax ? 1 : 2
    const pool: number[] = []
    for (let d = startDivisor; d <= maxDivisor; d++) {
        pool.push(monitorHz / d)
    }
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, count)
}

/**
 * Pick FPS values with a difficulty-specific spacing strategy:
 * - easy: spread across the full divisor range (big gaps between consecutive values)
 * - normal: uniformly random
 * - hard: tight cluster of consecutive divisors (small gaps, hard to discriminate)
 */
export function pickFpsForDifficulty(
    monitorHz: number,
    count: number,
    difficulty: "easy" | "normal" | "hard",
    opts: { minFps?: number } = {},
): number[] {
    const { minFps = 10 } = opts
    const maxDivisor = Math.floor(monitorHz / minFps)
    const divisors: number[] = []
    for (let d = 2; d <= maxDivisor; d++) divisors.push(d)
    if (divisors.length === 0) return []

    const toFps = (ds: number[]) => ds.map(d => monitorHz / d)

    if (difficulty === "easy") {
        if (divisors.length <= count) {
            const out = [...divisors]
            shuffle(out)
            return toFps(out)
        }
        // Evenly spaced indices across the divisor list.
        const picked: number[] = []
        const step = (divisors.length - 1) / (count - 1)
        for (let i = 0; i < count; i++) {
            picked.push(divisors[Math.round(i * step)])
        }
        shuffle(picked)
        return toFps(picked)
    }

    if (difficulty === "hard") {
        if (divisors.length <= count) {
            const out = [...divisors]
            shuffle(out)
            return toFps(out)
        }
        // Pick a random window of `count` consecutive divisors.
        const start = Math.floor(Math.random() * (divisors.length - count + 1))
        const picked = divisors.slice(start, start + count)
        shuffle(picked)
        return toFps(picked)
    }

    // normal — uniformly random.
    shuffle(divisors)
    return toFps(divisors.slice(0, count))
}

function shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
}

/**
 * Drive `onTick` at approximately `targetFps` using rAF + frame skipping.
 * Returns a stop function.
 */
export function startFrameLoop(
    targetFps: number,
    onTick: (elapsedSec: number, dtSec: number) => void,
): () => void {
    const interval = 1000 / targetFps
    let stopped = false
    let startTime = 0
    let lastEmit = 0
    let lastEmitTime = 0

    const tick = (now: number) => {
        if (stopped) return
        if (startTime === 0) {
            startTime = now
            lastEmit = now
            lastEmitTime = now
        }
        if (now - lastEmit + 0.5 >= interval) {
            const dt = (now - lastEmitTime) / 1000
            const elapsed = (now - startTime) / 1000
            onTick(elapsed, dt)
            lastEmit = now
            lastEmitTime = now
        }
        requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    return () => {
        stopped = true
    }
}

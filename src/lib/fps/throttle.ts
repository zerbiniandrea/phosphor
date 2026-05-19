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
 * Pick FPS values with a difficulty-specific spacing strategy.
 * Sampling is uniform in FPS space (not divisor space), so values spread
 * across the monitor's FPS range instead of crowding into the low end
 * where the divisor pool is dense (e.g. at 240Hz, divisors 2..20 give 19
 * FPS values but 14 of them sit below 25 fps).
 *
 * - easy: evenly spaced across the FPS range (max spread)
 * - normal: stratified random — one value per FPS bin
 * - hard: tight cluster around a randomly-placed FPS center
 */
export function pickFpsForDifficulty(
    monitorHz: number,
    count: number,
    difficulty: "easy" | "normal" | "hard",
    opts: { minFps?: number } = {},
): number[] {
    const { minFps = 10 } = opts
    const maxDivisor = Math.floor(monitorHz / minFps)
    // Achievable FPS pool sorted ascending. Includes d=1 (native refresh)
    // so high-refresh monitors can test discrimination at their top end.
    const pool: number[] = []
    for (let d = 1; d <= maxDivisor; d++) pool.push(monitorHz / d)
    pool.sort((a, b) => a - b)
    if (pool.length === 0) return []
    if (pool.length <= count) {
        const out = [...pool]
        shuffle(out)
        return out
    }

    const fpsMin = pool[0]
    const fpsMax = pool[pool.length - 1]
    const range = fpsMax - fpsMin

    if (difficulty === "easy") {
        // Evenly spaced FPS targets across [fpsMin, fpsMax], snapped to
        // the nearest unused pool value.
        const used = new Set<number>()
        const out: number[] = []
        for (let i = 0; i < count; i++) {
            const target = fpsMin + range * (i / (count - 1))
            const v = nearestUnused(target, pool, used)
            if (v !== null) {
                used.add(v)
                out.push(v)
            }
        }
        shuffle(out)
        return out
    }

    if (difficulty === "hard") {
        // Random center uniformly placed across the FPS range, then take
        // the `count` pool values closest to it in FPS. The center
        // distribution is uniform in FPS rather than divisor index, so
        // clusters land at high, mid, and low FPS in proportion to the
        // FPS range each region covers.
        const center = fpsMin + Math.random() * range
        const byDist = [...pool].toSorted(
            (a, b) => Math.abs(a - center) - Math.abs(b - center),
        )
        const picked = byDist.slice(0, count)
        shuffle(picked)
        return picked
    }

    // normal — stratified across `count` equal-width FPS bins, one value
    // per bin; empty bins are filled from remaining unused pool entries.
    const used = new Set<number>()
    const out: number[] = []
    for (let i = 0; i < count; i++) {
        const lo = fpsMin + range * (i / count)
        const hi = fpsMin + range * ((i + 1) / count)
        const candidates: number[] = []
        for (const v of pool) {
            if (used.has(v)) continue
            if (v >= lo && (v < hi || (i === count - 1 && v <= hi))) {
                candidates.push(v)
            }
        }
        if (candidates.length > 0) {
            const v = candidates[Math.floor(Math.random() * candidates.length)]
            used.add(v)
            out.push(v)
        }
    }
    while (out.length < count) {
        const remaining: number[] = []
        for (const v of pool) if (!used.has(v)) remaining.push(v)
        if (remaining.length === 0) break
        const v = remaining[Math.floor(Math.random() * remaining.length)]
        used.add(v)
        out.push(v)
    }
    shuffle(out)
    return out
}

function nearestUnused(
    target: number,
    sorted: number[],
    used: Set<number>,
): number | null {
    let best: number | null = null
    let bestDist = Infinity
    for (const v of sorted) {
        if (used.has(v)) continue
        const d = Math.abs(v - target)
        if (d < bestDist) {
            best = v
            bestDist = d
        }
    }
    return best
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

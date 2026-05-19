// Common monitor refresh rates we'll snap detections to.
export const COMMON_RATES = [
    60, 75, 90, 100, 120, 144, 165, 170, 175, 180, 200, 240, 280, 300, 360, 480, 540,
]

// Snap to a common rate if within this percentage of it (handles rAF
// jitter, e.g. 143.2 → 144). Kept tight (1.5%) so unusual native rates
// aren't pulled to the nearest listed common value.
const SNAP_TOLERANCE = 0.015

// Frames to discard at the very start — the first few rAF callbacks
// after page mount tend to be irregular.
const WARMUP_FRAMES = 10

export interface DetectResult {
    rawHz: number // raw measurement
    snappedHz: number // nearest common rate
    samples: number // number of frame deltas sampled
    confident: boolean // true if jitter is low
}

/**
 * Sample requestAnimationFrame deltas for `durationMs` to derive monitor Hz.
 * Discards `WARMUP_FRAMES` initial samples to avoid mount-time jitter.
 */
export function detectMaxFps(durationMs = 1500): Promise<DetectResult> {
    return new Promise(resolve => {
        const deltas: number[] = []
        let last = performance.now()
        let frame = 0
        let measureStart = 0

        const tick = (now: number) => {
            const dt = now - last
            last = now
            frame++

            if (frame <= WARMUP_FRAMES) {
                // Discard warmup frames entirely.
                requestAnimationFrame(tick)
                return
            }
            if (measureStart === 0) measureStart = now

            // Reject outliers (tab throttled, GC pause, etc.).
            if (dt > 0 && dt < 100) deltas.push(dt)

            if (now - measureStart < durationMs) {
                requestAnimationFrame(tick)
            } else {
                resolve(finalize(deltas))
            }
        }
        requestAnimationFrame(tick)
    })
}

function finalize(deltas: number[]): DetectResult {
    if (deltas.length === 0) {
        return { rawHz: 60, snappedHz: 60, samples: 0, confident: false }
    }
    const sorted = [...deltas].toSorted((a, b) => a - b)
    // Trimmed mean (drop top/bottom 10%) rather than median. Median snaps
    // to a single quantized value (e.g. dt readings of {3, 4, 3, 4, ...}
    // give median 4ms → 250Hz even when the true rate is 280Hz). Mean
    // averages through quantization buckets correctly; trimming protects
    // against GC pauses and other spike outliers.
    const trim = Math.floor(sorted.length * 0.1)
    const core = sorted.slice(trim, sorted.length - trim)
    const mean = core.reduce((a, b) => a + b, 0) / core.length
    const rawHz = 1000 / mean

    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    const jitter = q3 - q1
    const confident = jitter < mean * 0.1

    const snappedHz = snapToCommon(rawHz)
    return { rawHz, snappedHz, samples: deltas.length, confident }
}

function snapToCommon(hz: number): number {
    let best = COMMON_RATES[0]
    let bestDist = Math.abs(hz - best)
    for (const r of COMMON_RATES) {
        const d = Math.abs(hz - r)
        if (d < bestDist) {
            best = r
            bestDist = d
        }
    }
    // If within tolerance, snap. Otherwise round to nearest integer so
    // genuine non-standard refresh rates (244, 175, etc.) are preserved.
    if (bestDist / best <= SNAP_TOLERANCE) return best
    return Math.round(hz)
}

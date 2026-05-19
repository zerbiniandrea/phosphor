// Common monitor refresh rates we'll snap detections to.
const COMMON_RATES = [60, 75, 90, 100, 120, 144, 165, 180, 200, 240, 300, 360, 480]

// Snap to a common rate if within this percentage of it (handles jitter
// causing e.g. 142.7 to read close-enough to 144).
const SNAP_TOLERANCE = 0.05

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
    const median = sorted[Math.floor(sorted.length / 2)]
    const rawHz = 1000 / median

    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    const jitter = q3 - q1
    const confident = jitter < median * 0.1

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
    // If within tolerance, snap. Otherwise round to nearest 5 to be safe.
    if (bestDist / best <= SNAP_TOLERANCE) return best
    if (hz > COMMON_RATES[COMMON_RATES.length - 1] + 30) {
        return Math.round(hz / 10) * 10
    }
    return Math.round(hz / 5) * 5
}

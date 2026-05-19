/**
 * Lightweight WebAudio SFX module. All sounds are synthesized — no assets.
 * - hum: continuous low CRT mains-hum loop, very quiet
 * - tick: short blip for menu nav
 * - submit: confirming chirp
 * - success/fail: result feedback
 */

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let humNodes: { osc: OscillatorNode; gain: GainNode } | null = null
let currentLevel = 0.7

function getCtx(): AudioContext | null {
    if (ctx) return ctx
    if (typeof window === "undefined") return null
    const AC =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    masterGain = ctx.createGain()
    masterGain.gain.value = currentLevel
    masterGain.connect(ctx.destination)
    return ctx
}

/** Set master gain (0 = mute). Smoothly ramps to avoid clicks. */
export function setMasterLevel(level: number) {
    currentLevel = level
    const c = getCtx()
    if (!c || !masterGain) return
    masterGain.gain.cancelScheduledValues(c.currentTime)
    masterGain.gain.linearRampToValueAtTime(level, c.currentTime + 0.15)
}

export function ensureUnlocked() {
    // Browsers require a user gesture before resuming an AudioContext.
    const c = getCtx()
    if (!c) return
    if (c.state === "suspended") c.resume()
}

export function startHum() {
    const c = getCtx()
    if (!c || !masterGain || humNodes) return
    const osc = c.createOscillator()
    const gain = c.createGain()
    const filter = c.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 240
    osc.type = "sawtooth"
    osc.frequency.value = 60 // mains hum
    gain.gain.value = 0
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(masterGain)
    osc.start()
    gain.gain.linearRampToValueAtTime(0.02, c.currentTime + 1.5)
    humNodes = { osc, gain }
}

export function stopHum() {
    if (!humNodes || !ctx) return
    const { osc, gain } = humNodes
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
    osc.stop(ctx.currentTime + 0.5)
    humNodes = null
}

function blip(opts: {
    freq: number
    duration: number
    type?: OscillatorType
    volume?: number
    sweepTo?: number
}) {
    const c = getCtx()
    if (!c || !masterGain) return
    const { freq, duration, type = "square", volume = 0.08, sweepTo } = opts
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    if (sweepTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + duration)
    }
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration)
    osc.connect(gain)
    gain.connect(masterGain)
    osc.start()
    osc.stop(c.currentTime + duration + 0.05)
}

/**
 * Mechanical-key-ish click: a tiny noise burst shaped by a sharp envelope.
 * Each invocation slightly varies pitch so consecutive presses don't sound robotic.
 */
function keyClick(volume = 0.06) {
    const c = getCtx()
    if (!c || !masterGain) return
    const dur = 0.025 + Math.random() * 0.02
    const now = c.currentTime

    // White-noise burst
    const buffer = c.createBuffer(1, 1024, c.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = c.createBufferSource()
    noise.buffer = buffer

    const bp = c.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 1800 + Math.random() * 1400
    bp.Q.value = 6

    const gain = c.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)

    noise.connect(bp)
    bp.connect(gain)
    gain.connect(masterGain)
    noise.start(now)
    noise.stop(now + dur + 0.02)
}

/**
 * Degauss thunk: low coil-impact thump + lowpassed sawtooth buzz with an
 * amplitude wobble that mirrors the visual `degauss` transition's cosine
 * wobble. ~0.32s, matched to the transition duration in transitions.ts.
 */
function degaussThunk(volume = 0.12) {
    const c = getCtx()
    if (!c || !masterGain) return
    const now = c.currentTime
    const dur = 0.32

    // Low thump — physical impact of the coil firing.
    const thump = c.createOscillator()
    thump.type = "sine"
    thump.frequency.setValueAtTime(95, now)
    thump.frequency.exponentialRampToValueAtTime(32, now + 0.13)
    const thumpGain = c.createGain()
    thumpGain.gain.setValueAtTime(0, now)
    thumpGain.gain.linearRampToValueAtTime(volume, now + 0.005)
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
    thump.connect(thumpGain)
    thumpGain.connect(masterGain)
    thump.start(now)
    thump.stop(now + 0.18)

    // Electromagnetic buzz — lowpassed sawtooth, wobbled to match the visual.
    const buzz = c.createOscillator()
    buzz.type = "sawtooth"
    buzz.frequency.setValueAtTime(130, now)
    buzz.frequency.linearRampToValueAtTime(75, now + dur)

    const lp = c.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 550
    lp.Q.value = 3

    const buzzGain = c.createGain()
    buzzGain.gain.setValueAtTime(0, now)
    buzzGain.gain.linearRampToValueAtTime(volume * 0.55, now + 0.02)
    buzzGain.gain.linearRampToValueAtTime(volume * 0.18, now + 0.1)
    buzzGain.gain.linearRampToValueAtTime(volume * 0.38, now + 0.18)
    buzzGain.gain.linearRampToValueAtTime(volume * 0.12, now + 0.26)
    buzzGain.gain.exponentialRampToValueAtTime(0.0001, now + dur)

    buzz.connect(lp)
    lp.connect(buzzGain)
    buzzGain.connect(masterGain)
    buzz.start(now)
    buzz.stop(now + dur + 0.02)
}

export const sfx = {
    tick: () => blip({ freq: 1200, duration: 0.04, type: "square", volume: 0.05 }),
    select: () =>
        blip({ freq: 800, duration: 0.08, type: "square", volume: 0.09, sweepTo: 1200 }),
    submit: () =>
        blip({ freq: 600, duration: 0.12, type: "square", volume: 0.1, sweepTo: 900 }),
    success: () => {
        blip({ freq: 800, duration: 0.08, type: "triangle", volume: 0.09 })
        setTimeout(
            () => blip({ freq: 1200, duration: 0.12, type: "triangle", volume: 0.09 }),
            70,
        )
    },
    fail: () =>
        blip({ freq: 240, duration: 0.18, type: "sawtooth", volume: 0.1, sweepTo: 120 }),
    power: () => {
        blip({ freq: 80, duration: 0.4, type: "sawtooth", volume: 0.12, sweepTo: 30 })
    },
    key: () => keyClick(0.05),
    degauss: () => degaussThunk(0.12),
    postBeep: () => blip({ freq: 1760, duration: 0.06, type: "square", volume: 0.08 }),
    bootComplete: () => {
        blip({ freq: 523, duration: 0.1, type: "triangle", volume: 0.09 })
        setTimeout(
            () => blip({ freq: 784, duration: 0.1, type: "triangle", volume: 0.09 }),
            90,
        )
        setTimeout(
            () => blip({ freq: 1046, duration: 0.18, type: "triangle", volume: 0.09 }),
            180,
        )
    },
}

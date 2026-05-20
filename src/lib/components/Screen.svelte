<script lang="ts">
    import { sfx } from "../audio/sfx"
    import {
        cycleBrightness,
        cycleContrast,
        cycleVolume,
        game,
    } from "../game/state.svelte"

    let { children } = $props<{ children: import("svelte").Snippet }>()

    // Brightness/contrast: map 0/1/2 to filter values. Defaults at level 1.
    const brightnessFilter = $derived(["0.78", "1", "1.18"][game.brightness])
    const contrastFilter = $derived(["0.82", "1", "1.2"][game.contrast])

    // Each knob has 3 positions → rotate the indicator notch.
    const brightnessAngle = $derived([-60, 0, 60][game.brightness])
    const contrastAngle = $derived([-60, 0, 60][game.contrast])
    const volumeAngle = $derived([-60, 0, 60][game.volume])

    function onBrightness() {
        cycleBrightness()
        sfx.tick()
    }
    function onContrast() {
        cycleContrast()
        sfx.tick()
    }
    function onVolume() {
        cycleVolume()
        sfx.tick()
    }

    // Occasional CRT glitch burst (noise + sweeping hum bar + content jitter)
    // — runs only while the menu is active. Lives at the Screen layer so
    // the overlay covers the entire CRT interior, not just the menu box.
    let glitching = $state(false)
    let glitchTimer = 0

    function scheduleGlitch(delay: number) {
        glitchTimer = window.setTimeout(() => {
            glitching = true
            window.setTimeout(() => {
                glitching = false
                scheduleGlitch(8000 + Math.random() * 7000)
            }, 900)
        }, delay)
    }

    $effect(() => {
        window.clearTimeout(glitchTimer)
        glitching = false
        if (game.screen === "menu") scheduleGlitch(2000)
        return () => window.clearTimeout(glitchTimer)
    })
</script>

<div
    class="bezel"
    style:--crt-brightness={brightnessFilter}
    style:--crt-contrast={contrastFilter}
>
    <div class="screen">
        <div class="curvature" class:glitching>
            <div class="content">
                {@render children()}
            </div>
            <div class="glitch-noise" aria-hidden="true"></div>
            <div class="glitch-band" aria-hidden="true"></div>
            <div class="scanlines" aria-hidden="true"></div>
            <div class="vignette" aria-hidden="true"></div>
            <div class="glare" aria-hidden="true"></div>
            <div class="glass" aria-hidden="true"></div>
        </div>
    </div>

    <!-- Bottom chrome strip: LED, brand, knobs. -->
    <div class="chrome" aria-hidden="false">
        <div class="led-cluster">
            <span class="led on"></span>
            <span class="led-label">PWR</span>
        </div>

        <div class="brand">
            <span class="brand-mark">PHOSPHOR</span>
            <span class="brand-sub">REV · {__COMMIT_SHA__}</span>
        </div>

        <div class="knobs">
            <button
                class="knob-btn"
                type="button"
                onclick={onBrightness}
                aria-label="brightness"
                title="brightness"
            >
                <span class="knob">
                    <span class="knob-rim"></span>
                    <span class="knob-face">
                        <span
                            class="knob-notch"
                            style:transform="translateX(-50%) rotate({brightnessAngle}deg)"
                        ></span>
                    </span>
                </span>
                <span class="knob-meta">
                    <span class="knob-label">BRT</span>
                    <span class="knob-pos">
                        <span class="pos-dot" class:on={game.brightness === 0}></span>
                        <span class="pos-dot" class:on={game.brightness === 1}></span>
                        <span class="pos-dot" class:on={game.brightness === 2}></span>
                    </span>
                </span>
            </button>
            <button
                class="knob-btn"
                type="button"
                onclick={onContrast}
                aria-label="contrast"
                title="contrast"
            >
                <span class="knob">
                    <span class="knob-rim"></span>
                    <span class="knob-face">
                        <span
                            class="knob-notch"
                            style:transform="translateX(-50%) rotate({contrastAngle}deg)"
                        ></span>
                    </span>
                </span>
                <span class="knob-meta">
                    <span class="knob-label">CON</span>
                    <span class="knob-pos">
                        <span class="pos-dot" class:on={game.contrast === 0}></span>
                        <span class="pos-dot" class:on={game.contrast === 1}></span>
                        <span class="pos-dot" class:on={game.contrast === 2}></span>
                    </span>
                </span>
            </button>
            <button
                class="knob-btn"
                type="button"
                onclick={onVolume}
                aria-label="volume"
                title="volume"
            >
                <span class="knob">
                    <span class="knob-rim"></span>
                    <span class="knob-face">
                        <span
                            class="knob-notch"
                            style:transform="translateX(-50%) rotate({volumeAngle}deg)"
                        ></span>
                    </span>
                </span>
                <span class="knob-meta">
                    <span class="knob-label">VOL</span>
                    <span class="knob-pos">
                        <span
                            class="pos-dot"
                            class:on={game.volume === 0}
                            class:muted={!game.audioEnabled}
                        ></span>
                        <span
                            class="pos-dot"
                            class:on={game.volume === 1}
                            class:muted={!game.audioEnabled}
                        ></span>
                        <span
                            class="pos-dot"
                            class:on={game.volume === 2}
                            class:muted={!game.audioEnabled}
                        ></span>
                    </span>
                </span>
            </button>
        </div>
    </div>
</div>

<style>
    .bezel {
        /* Constrained so the dark room shows around the monitor — reveals
           the phosphor spill on the wall and the bezel as a physical object
           sitting in space. Aspect-ratio gives it a CRT-ish 4:3 proportion. */
        width: min(86vw, 116vh);
        height: min(86vh, calc(86vw * 3 / 4));
        aspect-ratio: 4 / 3;
        padding: 2.4rem 2.4rem 4.4rem 2.4rem;
        /* Larger radius so the corners reveal more of the room — the
           noise + phosphor spill in the body shows through there. */
        border-radius: 42px;
        /* Bezel is a radial gradient that DARKENS toward the outer edge so
           it matches the body background color at the boundary. */
        background:
            radial-gradient(
                ellipse at 50% -20%,
                rgba(255, 255, 255, 0.03),
                transparent 50%
            ),
            radial-gradient(
                ellipse 95% 92% at 50% 45%,
                #44473f 0%,
                #353830 35%,
                #22241e 65%,
                #14160f 88%,
                #0a0b08 100%
            );
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 -2px 10px rgba(0, 0, 0, 0.65),
            /* Hard inner ring of the case */ 0 0 0 1px rgba(0, 0, 0, 0.7),
            /* Phosphor-tinted light spill onto the wall behind */ 0 0 80px 20px
                rgba(51, 255, 102, 0.05),
            0 0 160px 60px rgba(51, 255, 102, 0.03),
            /* Soft ambient shadow */ 0 0 40px 12px rgba(0, 0, 0, 0.5),
            0 0 120px 40px rgba(0, 0, 0, 0.3);
        position: relative;
    }

    /* tiny bezel "screws" — top corners, recessed into the case */
    .bezel::before,
    .bezel::after {
        content: "";
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: radial-gradient(
            circle at 30% 30%,
            #6a6d62,
            #20221c 70%,
            #08090a 100%
        );
        box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.18),
            inset 0 -1px 1px rgba(0, 0, 0, 0.7),
            0 1px 1px rgba(0, 0, 0, 0.6);
    }
    .bezel::before {
        top: 22px;
        left: 22px;
    }
    .bezel::after {
        top: 22px;
        right: 22px;
    }

    .screen {
        width: 100%;
        height: 100%;
        border-radius: 14px;
        background: #050805;
        overflow: hidden;
        position: relative;
        filter: brightness(var(--crt-brightness, 1)) contrast(var(--crt-contrast, 1));
        /* Engraved recess + visible plastic gasket.
           Inset top-shadow = case lip casting into the screen.
           Outer rings = matte-black gasket frame around the glass,
           with directional TL highlight / BR shadow so the gasket reads
           as a real raised piece of plastic, not a painted border. */
        box-shadow:
            /* (1) Inner darkness — phosphor glass falls off into a deep tube */
            inset 0 0 80px rgba(0, 0, 0, 0.9),
            inset 0 0 25px rgba(0, 0, 0, 0.6),
            /* (1) Engraved: case lip casts shadow into the top of the recess */ inset 0
                3px 5px rgba(0, 0, 0, 0.8),
            /* (1) Tiny highlight at the bottom of the recess (light bouncing) */ inset
                0 -1px 0 rgba(255, 255, 255, 0.04),
            /* (2) Hard hairline at the glass edge */ 0 0 0 1px rgba(0, 0, 0, 0.95),
            /* (2) Matte black plastic gasket ring — 7px wide */ 0 0 0 7px #0a0c08,
            /* (1) TL-shifted highlight peeking out from behind the gasket */ -1px -1px 0
                7px rgba(255, 255, 255, 0.09),
            /* (1) BR-shifted shadow peeking out — gasket casts shadow on bezel */ 2px 2px
                0 7px rgba(0, 0, 0, 0.65);
    }

    .curvature {
        position: absolute;
        inset: 0;
        transform: perspective(1400px) rotateX(0.6deg);
        transform-origin: center top;
        animation:
            flicker 6s infinite,
            vshift 18s infinite;
    }

    .content {
        position: absolute;
        inset: 0;
        padding: 2.5rem 2.8rem;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* Glitch overlays — sit between content and the screen-effect overlays
       so scanlines/vignette/glass still apply on top. */
    .glitch-noise,
    .glitch-band {
        pointer-events: none;
        position: absolute;
        inset: 0;
        z-index: 9;
        opacity: 0;
    }

    .glitch-noise {
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.7  0 0 0 0 1  0 0 0 0 0.78  0 0 0 0.9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        mix-blend-mode: screen;
    }

    .glitch-band {
        background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 42%,
            rgba(182, 255, 200, 0.18) 48%,
            rgba(255, 255, 255, 0.22) 50%,
            rgba(182, 255, 200, 0.18) 52%,
            transparent 58%,
            transparent 100%
        );
        mix-blend-mode: screen;
        transform: translateY(-100%);
    }

    .curvature.glitching .glitch-noise {
        animation: glitch-noise 0.9s steps(9, end) both;
    }
    .curvature.glitching .glitch-band {
        animation: glitch-band 0.9s linear both;
    }
    .curvature.glitching .content {
        animation: glitch-shift 0.9s steps(9, end) both;
    }

    @keyframes glitch-noise {
        0%,
        100% {
            opacity: 0;
            background-position: 0 0;
        }
        15% {
            opacity: 0.55;
            background-position: -40px 18px;
        }
        30% {
            opacity: 0.35;
            background-position: 24px -12px;
        }
        45% {
            opacity: 0.6;
            background-position: -10px 30px;
        }
        65% {
            opacity: 0.3;
            background-position: 18px -22px;
        }
        85% {
            opacity: 0.15;
            background-position: -6px 8px;
        }
    }

    @keyframes glitch-band {
        0% {
            transform: translateY(-30%);
            opacity: 0;
        }
        15% {
            opacity: 1;
        }
        85% {
            opacity: 1;
        }
        100% {
            transform: translateY(130%);
            opacity: 0;
        }
    }

    @keyframes glitch-shift {
        0%,
        100% {
            transform: translateX(0);
            filter: none;
        }
        15% {
            transform: translateX(-4px);
            filter: hue-rotate(20deg) brightness(1.1);
        }
        30% {
            transform: translateX(3px);
            filter: hue-rotate(-15deg);
        }
        45% {
            transform: translateX(-2px);
            filter: brightness(1.2) saturate(1.4);
        }
        65% {
            transform: translateX(2px);
        }
        85% {
            transform: translateX(-1px);
        }
    }

    /* Horizontal scanlines */
    .scanlines {
        pointer-events: none;
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0px,
            rgba(0, 0, 0, 0) 2px,
            rgba(0, 0, 0, 0.18) 3px,
            rgba(0, 0, 0, 0.18) 3px
        );
        mix-blend-mode: multiply;
        z-index: 10;
    }

    /* Subtle vertical aperture-grille rgb */
    .scanlines::before {
        content: "";
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
            to right,
            rgba(255, 0, 80, 0.04) 0,
            rgba(0, 255, 120, 0.04) 1px,
            rgba(80, 120, 255, 0.04) 2px,
            transparent 3px
        );
        mix-blend-mode: screen;
    }

    .vignette {
        pointer-events: none;
        position: absolute;
        inset: 0;
        background: radial-gradient(
            ellipse at center,
            transparent 40%,
            rgba(0, 0, 0, 0.35) 80%,
            rgba(0, 0, 0, 0.85) 100%
        );
        z-index: 11;
    }

    /* faint top-left glare */
    .glare {
        pointer-events: none;
        position: absolute;
        top: -10%;
        left: -10%;
        width: 60%;
        height: 50%;
        background: radial-gradient(
            ellipse at top left,
            rgba(255, 255, 255, 0.025),
            transparent 60%
        );
        z-index: 12;
    }

    /* Curved-glass reflection — a broad diagonal sweep across the screen. */
    .glass {
        pointer-events: none;
        position: absolute;
        inset: 0;
        background: linear-gradient(
            118deg,
            transparent 0%,
            transparent 8%,
            rgba(255, 255, 255, 0.055) 22%,
            rgba(255, 255, 255, 0.025) 33%,
            transparent 44%,
            transparent 100%
        );
        mix-blend-mode: screen;
        z-index: 13;
    }

    /* Bottom chrome strip: LED · brand · knobs.
       Vertically centered inside the 5rem bottom padding area —
       (5rem - 3.4rem) / 2 = 0.8rem of breathing room above and below. */
    .chrome {
        position: absolute;
        bottom: 0.8rem;
        left: 0;
        right: 0;
        height: 3.4rem;
        /* Horizontal inset matches the bezel's side padding so PWR / knobs
           line up with the screen's left/right edges. */
        padding: 0 2.8rem;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        color: rgba(220, 222, 215, 0.7);
        text-shadow: 0 1px 1px rgba(0, 0, 0, 0.75);
        font-family: var(--font-crt);
        font-size: 0.9rem;
        font-weight: 700;
        -webkit-text-stroke: 0.15px currentColor;
        letter-spacing: 0.2rem;
        user-select: none;
    }

    .led-cluster {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .led {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #1a0808;
        box-shadow:
            inset 0 1px 1px rgba(0, 0, 0, 0.85),
            0 0 0 1px rgba(0, 0, 0, 0.5);
        transition: background 0.15s;
    }
    .led.on {
        background: var(--phosphor);
        box-shadow:
            inset 0 1px 1px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(0, 0, 0, 0.55),
            0 0 6px var(--phosphor),
            0 0 12px var(--phosphor-dim);
        animation: led-pulse 2.4s ease-in-out infinite;
    }
    .led-label {
        color: rgba(220, 222, 215, 0.7);
        text-shadow: 0 1px 1px rgba(0, 0, 0, 0.75);
    }

    .brand {
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1.05;
    }
    .brand-mark {
        font-size: 1.1rem;
        letter-spacing: 0.45rem;
        color: rgba(232, 234, 224, 0.78);
        text-shadow:
            0 1px 1px rgba(0, 0, 0, 0.8),
            0 -1px 0 rgba(255, 255, 255, 0.05);
        -webkit-text-stroke: 0.2px currentColor;
        padding-left: 0.45rem; /* compensate trailing letter-spacing */
    }
    .brand-sub {
        margin-top: 0.15rem;
        font-size: 0.74rem;
        letter-spacing: 0.25rem;
        color: rgba(220, 222, 215, 0.55);
        text-shadow: 0 1px 1px rgba(0, 0, 0, 0.75);
    }

    .knobs {
        display: flex;
        justify-content: flex-end;
        gap: 1.4rem;
        align-items: center;
    }
    .knob-btn {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        color: rgba(220, 222, 215, 0.7);
        text-shadow: 0 1px 1px rgba(0, 0, 0, 0.75);
        font: inherit;
        letter-spacing: inherit;
    }
    .knob-btn:focus-visible {
        outline: 1px solid var(--phosphor-dim);
        outline-offset: 4px;
        border-radius: 4px;
    }

    .knob {
        position: relative;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background:
            radial-gradient(circle at 50% 130%, rgba(0, 0, 0, 0.7) 0%, transparent 60%),
            radial-gradient(circle at 35% 20%, #54574e 0%, #2a2c24 45%, #0e1009 100%);
        box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.18),
            inset 0 -2px 4px rgba(0, 0, 0, 0.85),
            0 2px 3px rgba(0, 0, 0, 0.85),
            0 0 0 1px rgba(0, 0, 0, 0.6);
        transition: transform 0.08s ease-out;
    }

    /* Knurled rim — fine ridges around the edge. */
    .knob-rim {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: repeating-conic-gradient(
            from 0deg,
            rgba(255, 255, 255, 0.08) 0deg,
            rgba(255, 255, 255, 0.08) 3deg,
            rgba(0, 0, 0, 0.25) 3deg,
            rgba(0, 0, 0, 0.25) 6deg
        );
        /* Mask everything except a thin outer ring. */
        -webkit-mask: radial-gradient(
            circle,
            transparent 36%,
            #000 38%,
            #000 48%,
            transparent 50%
        );
        mask: radial-gradient(
            circle,
            transparent 36%,
            #000 38%,
            #000 48%,
            transparent 50%
        );
        pointer-events: none;
    }

    /* Inner face that holds the rotating indicator. */
    .knob-face {
        position: absolute;
        inset: 5px;
        border-radius: 50%;
        background: radial-gradient(
            circle at 35% 28%,
            #3e413a 0%,
            #1a1c14 65%,
            #06070a 100%
        );
        box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.1),
            inset 0 -1px 2px rgba(0, 0, 0, 0.7),
            inset 0 0 0 1px rgba(0, 0, 0, 0.7);
        overflow: hidden;
    }

    .knob-notch {
        position: absolute;
        top: 1px;
        left: 50%;
        width: 2.5px;
        height: 7px;
        background: linear-gradient(to bottom, #e8eadf 0%, #c4c8b6 60%, #6e7264 100%);
        border-radius: 1.5px;
        box-shadow:
            0 0 1px rgba(0, 0, 0, 0.8),
            0 0 3px rgba(255, 255, 255, 0.15);
        transform-origin: 50% 9px;
        transition: transform 0.18s cubic-bezier(0.5, 1.5, 0.5, 1);
    }

    .knob-btn:hover .knob {
        background:
            radial-gradient(circle at 50% 130%, rgba(0, 0, 0, 0.6) 0%, transparent 60%),
            radial-gradient(circle at 35% 20%, #65685e 0%, #34372d 45%, #14160e 100%);
    }
    .knob-btn:active .knob {
        transform: scale(0.94);
    }

    .knob-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.15rem;
        line-height: 1;
    }
    .knob-label {
        font-size: 0.65rem;
        letter-spacing: 0.22rem;
    }
    .knob-pos {
        display: flex;
        gap: 2px;
    }
    .pos-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.45);
        box-shadow:
            inset 0 1px 0 rgba(0, 0, 0, 0.6),
            0 1px 0 rgba(255, 255, 255, 0.08);
        transition:
            background 0.15s,
            box-shadow 0.15s;
    }
    .pos-dot.on {
        background: var(--phosphor);
        box-shadow:
            0 0 3px var(--phosphor),
            0 0 6px var(--phosphor-dim);
    }
    /* When audio is muted, the active VOL dot signals it in red. */
    .pos-dot.on.muted {
        background: #ff2a3a;
        box-shadow:
            0 0 3px #ff2a3a,
            0 0 6px rgba(255, 42, 58, 0.55);
    }

    @keyframes led-pulse {
        0%,
        100% {
            filter: brightness(1);
        }
        50% {
            filter: brightness(1.25);
        }
    }
</style>

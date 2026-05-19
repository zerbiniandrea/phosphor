<script lang="ts">
    import { onMount } from "svelte"

    import { sfx } from "../audio/sfx"
    import { game, goto, setDifficulty, type Difficulty } from "../game/state.svelte"

    const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"]

    function cycleDifficulty() {
        const i = DIFFICULTIES.indexOf(game.difficulty)
        setDifficulty(DIFFICULTIES[(i + 1) % DIFFICULTIES.length])
    }

    type Item = { label: () => string; action: () => void }

    const items: Item[] = [
        {
            label: () => "START",
            action: () => goto(game.monitorHz ? "game" : "calibrate"),
        },
        { label: () => "CALIBRATE", action: () => goto("calibrate") },
        {
            label: () => `DIFFICULTY: ${game.difficulty.toUpperCase().padEnd(6, " ")}`,
            action: cycleDifficulty,
        },
        { label: () => "HISTORY", action: () => goto("history") },
        { label: () => "ABOUT", action: () => goto("about") },
    ]

    let selected = $state(0)

    function move(delta: number) {
        selected = (selected + delta + items.length) % items.length
        sfx.tick()
    }

    function activate() {
        sfx.select()
        items[selected].action()
    }

    function handleKey(e: KeyboardEvent) {
        if (e.key === "ArrowDown" || e.key === "j") {
            move(1)
            e.preventDefault()
        } else if (e.key === "ArrowUp" || e.key === "k") {
            move(-1)
            e.preventDefault()
        } else if (e.key === "Enter" || e.key === " ") {
            activate()
            e.preventDefault()
        }
    }

    // Occasional CRT glitch burst: static noise + a horizontal jitter and a
    // sweeping hum bar. Fires ~2s after entering the menu, then every 3–7s.
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

    onMount(() => {
        window.addEventListener("keydown", handleKey)
        scheduleGlitch(2000)
        return () => {
            window.removeEventListener("keydown", handleKey)
            window.clearTimeout(glitchTimer)
        }
    })
</script>

<div class="menu" class:glitching>
    <div class="glitch-noise" aria-hidden="true"></div>
    <div class="glitch-band" aria-hidden="true"></div>
    <header>
        <h1 class="title glow-lg">PHOSPHOR</h1>
        <p class="subtitle dim">a frame-rate perception test</p>
    </header>

    <ul class="items">
        {#each items as item, i}
            <li class:selected={i === selected}>
                <button
                    type="button"
                    class="item-btn"
                    onmouseenter={() => {
                        if (selected !== i) {
                            selected = i
                            sfx.tick()
                        }
                    }}
                    onfocus={() => (selected = i)}
                    onclick={() => {
                        selected = i
                        activate()
                    }}
                >
                    <span class="marker">{i === selected ? ">" : " "}</span>
                    <span class="label">{item.label()}</span>
                </button>
            </li>
        {/each}
    </ul>

    <footer class="hint dim">
        <span
            >[↑/↓] navigate · [ENTER] select · [M] {game.audioEnabled
                ? "mute"
                : "unmute"}</span
        >
        {#if game.monitorHz}
            <span class="calib">CALIBRATED · {game.monitorHz} Hz</span>
        {:else}
            <span class="uncalib">UNCALIBRATED</span>
        {/if}
    </footer>
</div>

<style>
    .menu {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
    }

    .glitch-noise,
    .glitch-band {
        pointer-events: none;
        position: absolute;
        inset: 0;
        z-index: 20;
        opacity: 0;
    }

    /* High-frequency static noise via inline SVG turbulence. */
    .glitch-noise {
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.7  0 0 0 0 1  0 0 0 0 0.78  0 0 0 0.9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        mix-blend-mode: screen;
    }

    /* Bright horizontal "hum bar" that sweeps top → bottom once. */
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

    .menu.glitching .glitch-noise {
        animation: glitch-noise 0.9s steps(9, end) both;
    }
    .menu.glitching .glitch-band {
        animation: glitch-band 0.9s linear both;
    }
    .menu.glitching header,
    .menu.glitching .items,
    .menu.glitching footer {
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

    header {
        text-align: center;
        margin-top: 1rem;
    }

    .title {
        font-size: 6rem;
        letter-spacing: 0.4rem;
        line-height: 1;
        color: var(--phosphor-bright);
    }

    .subtitle {
        font-size: 1.4rem;
        letter-spacing: 0.3rem;
        margin-top: 0.4rem;
    }

    .items {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        align-self: center;
        font-size: 2.4rem;
        letter-spacing: 0.4rem;
    }

    .item-btn {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        background: transparent;
        border: none;
        padding: 0.1rem 0.4rem;
        color: var(--phosphor-dim);
        text-shadow: var(--glow-sm);
        cursor: pointer;
        font: inherit;
        letter-spacing: inherit;
        transition:
            color 0.1s,
            text-shadow 0.1s;
    }
    .item-btn .label {
        white-space: pre;
    }
    .item-btn:focus-visible {
        outline: none;
    }

    .items li.selected .item-btn {
        color: var(--phosphor-bright);
        text-shadow: var(--glow-lg);
        background: transparent;
    }

    .marker {
        width: 1ch;
        color: var(--phosphor);
        animation: blink 1s steps(2, end) infinite;
    }

    .hint {
        display: flex;
        justify-content: space-between;
        font-size: 1.2rem;
        letter-spacing: 0.15rem;
        padding: 0 0.4rem;
    }

    .calib {
        color: var(--phosphor);
        text-shadow: var(--glow-sm);
    }
    .uncalib {
        color: var(--amber);
        text-shadow: 0 0 6px var(--amber);
    }
</style>

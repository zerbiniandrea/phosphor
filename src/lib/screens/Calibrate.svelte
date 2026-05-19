<script lang="ts">
    import { onMount } from "svelte"

    import { sfx } from "../audio/sfx"
    import { COMMON_RATES, detectMaxFps } from "../fps/detect"
    import { setMonitorHz, goto } from "../game/state.svelte"

    let phase = $state<"measuring" | "done">("measuring")
    let liveHz = $state(0)
    let finalHz = $state(0)
    let rawHz = $state(0)
    let selectedHz = $state(0)

    onMount(() => {
        // Animate a live readout while detection runs.
        let last = performance.now()
        let ema = 0
        let stopped = false
        const tick = (now: number) => {
            const dt = now - last
            last = now
            const instant = 1000 / Math.max(1, dt)
            ema = ema === 0 ? instant : ema * 0.85 + instant * 0.15
            liveHz = ema
            if (!stopped) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)

        detectMaxFps(1600).then(res => {
            stopped = true
            rawHz = res.rawHz
            finalHz = res.snappedHz
            selectedHz = res.snappedHz
            phase = "done"
            sfx.success()
        })
    })

    function selectRate(hz: number) {
        if (hz === selectedHz) return
        selectedHz = hz
        sfx.tick()
    }

    function shiftSelection(delta: number) {
        let i = COMMON_RATES.indexOf(selectedHz)
        if (i < 0) {
            // Detected value isn't in the chip row (e.g. an off-list raw rate
            // that didn't snap). Jump to the nearest chip first.
            let bestDist = Infinity
            for (let j = 0; j < COMMON_RATES.length; j++) {
                const d = Math.abs(COMMON_RATES[j] - selectedHz)
                if (d < bestDist) {
                    bestDist = d
                    i = j
                }
            }
        }
        const n = COMMON_RATES.length
        selectRate(COMMON_RATES[(i + delta + n) % n])
    }

    function handleContinue() {
        sfx.tick()
        setMonitorHz(selectedHz)
        goto("menu")
    }
</script>

<svelte:window
    onkeydown={e => {
        if (phase !== "done") return
        if (e.key === "Enter" || e.key === " ") {
            handleContinue()
            e.preventDefault()
        } else if (e.key === "ArrowLeft" || e.key === "h") {
            shiftSelection(-1)
            e.preventDefault()
        } else if (e.key === "ArrowRight" || e.key === "l") {
            shiftSelection(1)
            e.preventDefault()
        }
    }}
/>

<div class="calibrate">
    <header>
        <h2 class="glow">[ CALIBRATION ]</h2>
        <p class="dim">measuring monitor refresh rate</p>
    </header>

    <div class="readout">
        {#if phase === "measuring"}
            <div class="label dim">SAMPLING ...</div>
            <div class="hz live">{liveHz.toFixed(1)}<span class="unit"> Hz</span></div>
            <div class="bar"><div class="fill"></div></div>
        {:else}
            <div class="label dim">DETECTED</div>
            <div class="hz final">{selectedHz}<span class="unit"> Hz</span></div>
            <div class="raw dim">
                raw: {rawHz.toFixed(2)} Hz · snapped: {finalHz} Hz
            </div>

            <div class="override">
                <div class="override-label dim">WRONG? PICK MANUALLY</div>
                <div class="chips">
                    {#each COMMON_RATES as hz}
                        <button
                            type="button"
                            class="chip"
                            class:active={hz === selectedHz}
                            onclick={() => selectRate(hz)}
                        >
                            {hz}
                        </button>
                    {/each}
                </div>
                <p class="note dim">
                    multi-monitor setups can fool auto-detect — pick the panel
                    you're actually viewing on.
                </p>
            </div>
        {/if}
    </div>

    <footer class="hint dim">
        {#if phase === "done"}
            <span class="bright">[←/→]</span> change ·
            <span class="bright">[ENTER]</span> continue
        {:else}
            please wait ...
        {/if}
    </footer>
</div>

<style>
    .calibrate {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        text-align: center;
    }

    header h2 {
        font-size: 2rem;
        letter-spacing: 0.3rem;
    }
    header p {
        margin-top: 0.4rem;
        letter-spacing: 0.2rem;
    }

    .readout {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
    }

    .label {
        font-size: 1.4rem;
        letter-spacing: 0.4rem;
    }

    .hz {
        font-size: 7rem;
        line-height: 1;
        color: var(--phosphor-bright);
        text-shadow: var(--glow-lg);
        font-variant-numeric: tabular-nums;
    }
    .hz.live {
        color: var(--phosphor);
        animation: jitter 0.12s steps(2) infinite;
    }
    .unit {
        font-size: 2.6rem;
        color: var(--phosphor-dim);
        margin-left: 0.4rem;
    }
    .raw {
        font-size: 1.2rem;
        letter-spacing: 0.2rem;
    }

    .override {
        margin-top: 1.4rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
        max-width: 560px;
    }
    .override-label {
        font-size: 1.1rem;
        letter-spacing: 0.3rem;
    }
    .chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.35rem;
    }
    .chip {
        background: transparent;
        border: 1px solid var(--phosphor-faint);
        color: var(--phosphor-dim);
        font: inherit;
        font-size: 1.1rem;
        letter-spacing: 0.1rem;
        padding: 0.2rem 0.6rem;
        cursor: pointer;
        text-shadow: var(--glow-sm);
        font-variant-numeric: tabular-nums;
        transition:
            color 0.1s,
            border-color 0.1s,
            text-shadow 0.1s;
    }
    .chip:hover {
        color: var(--phosphor);
        border-color: var(--phosphor);
    }
    .chip.active {
        color: var(--phosphor-bright);
        border-color: var(--phosphor-bright);
        text-shadow: var(--glow-lg);
    }
    .chip:focus-visible {
        outline: none;
        color: var(--phosphor-bright);
    }
    .note {
        font-size: 1rem;
        letter-spacing: 0.1rem;
        margin: 0;
        max-width: 44ch;
        line-height: 1.4;
    }

    .bar {
        width: 320px;
        height: 4px;
        background: var(--phosphor-faint);
        overflow: hidden;
        margin-top: 1rem;
    }
    .fill {
        height: 100%;
        background: var(--phosphor);
        box-shadow: var(--glow-sm);
        animation: fill 1.6s linear forwards;
    }

    .hint {
        font-size: 1.4rem;
        letter-spacing: 0.2rem;
    }

    @keyframes fill {
        from {
            width: 0%;
        }
        to {
            width: 100%;
        }
    }
    @keyframes jitter {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-1px);
        }
    }
</style>

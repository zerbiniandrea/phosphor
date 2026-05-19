<script lang="ts">
    import { onMount } from "svelte"

    import { sfx } from "../audio/sfx"
    import { detectMaxFps } from "../fps/detect"
    import { setMonitorHz, goto } from "../game/state.svelte"

    const SAMPLE_MS = 2500
    // One-click rates that cover the bulk of consumer panels. Rare/exotic
    // rates (170, 244, 280, 500, ...) are reachable via the manual input.
    const CHIPS = [60, 75, 120, 144, 165, 240, 280]
    const MIN_HZ = 24
    const MAX_HZ = 600

    let phase = $state<"measuring" | "done">("measuring")
    let liveHz = $state(0)
    let finalHz = $state(0)
    let rawHz = $state(0)
    let selectedHz = $state(0)
    let customInput = $state("")
    let inputFocused = $state(false)

    // Sync the input display with selectedHz whenever the user isn't typing
    // in it (chip click, arrow keys, or initial detection result).
    $effect(() => {
        if (!inputFocused && selectedHz > 0) customInput = String(selectedHz)
    })

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

        detectMaxFps(SAMPLE_MS).then(res => {
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
        let i = CHIPS.indexOf(selectedHz)
        if (i < 0) {
            // Current selection is a custom rate (off-chip). Jump to the
            // nearest chip first so arrow nav has a defined anchor.
            let bestDist = Infinity
            for (let j = 0; j < CHIPS.length; j++) {
                const d = Math.abs(CHIPS[j] - selectedHz)
                if (d < bestDist) {
                    bestDist = d
                    i = j
                }
            }
        }
        const n = CHIPS.length
        selectRate(CHIPS[(i + delta + n) % n])
    }

    function commitCustom() {
        const n = Math.round(Number(customInput))
        if (!Number.isFinite(n) || n < MIN_HZ || n > MAX_HZ) {
            // Invalid — revert input text to the current selection.
            customInput = String(selectedHz)
            return
        }
        selectRate(n)
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
        // Let the numeric input own its own keys (cursor movement, typing).
        if (inputFocused) return
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
            <div class="bar">
                <div class="fill" style="animation-duration: {SAMPLE_MS}ms"></div>
            </div>
        {:else}
            <div class="label dim">DETECTED</div>
            <div class="hz final">{selectedHz}<span class="unit"> Hz</span></div>
            <div class="raw dim">
                raw: {rawHz.toFixed(2)} Hz · snapped: {finalHz} Hz
            </div>

            <div class="override">
                <div class="override-label dim">WRONG? PICK MANUALLY</div>
                <div class="chips">
                    {#each CHIPS as hz}
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
                <label class="custom" class:active={!CHIPS.includes(selectedHz)}>
                    <span class="custom-label dim">OTHER ›</span>
                    <input
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        maxlength="3"
                        bind:value={customInput}
                        onfocus={() => (inputFocused = true)}
                        onblur={() => {
                            inputFocused = false
                            commitCustom()
                        }}
                        onkeydown={e => {
                            if (e.key === "Enter") {
                                commitCustom()
                                ;(e.currentTarget as HTMLInputElement).blur()
                                e.preventDefault()
                            } else if (e.key === "Escape") {
                                customInput = String(selectedHz)
                                ;(e.currentTarget as HTMLInputElement).blur()
                            }
                        }}
                    />
                    <span class="unit-sm dim">Hz</span>
                </label>
                <p class="note dim">
                    multi-monitor setups can fool auto-detect — pick the panel you're
                    actually viewing on.
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
        /* Single-layer 1px halo — keeps the phosphor kiss without the double-
           blur fuzz that --glow-sm produces at chip-sized text. */
        text-shadow: 0 0 1px var(--phosphor-dim);
        font-variant-numeric: tabular-nums;
        transition:
            color 0.1s,
            border-color 0.1s,
            text-shadow 0.1s;
    }
    .chip:hover {
        color: var(--phosphor);
        border-color: var(--phosphor);
        text-shadow: 0 0 1px var(--phosphor);
    }
    .chip.active {
        color: var(--phosphor-bright);
        border-color: var(--phosphor-bright);
        text-shadow: 0 0 2px var(--phosphor);
    }
    .chip:focus-visible {
        outline: none;
        color: var(--phosphor-bright);
    }
    .custom {
        display: inline-flex;
        align-items: baseline;
        gap: 0.4rem;
        margin-top: 0.4rem;
        padding: 0.1rem 0.2rem;
        font-size: 1.1rem;
        letter-spacing: 0.1rem;
        cursor: text;
        color: var(--phosphor-dim);
        transition: color 0.1s;
    }
    .custom-label {
        font-size: 0.95rem;
        letter-spacing: 0.25rem;
    }
    .custom input {
        width: 3.5ch;
        background: transparent;
        border: none;
        border-bottom: 1px dashed var(--phosphor-faint);
        color: var(--phosphor);
        font: inherit;
        font-variant-numeric: tabular-nums;
        text-align: center;
        padding: 0 0.1rem;
        text-shadow: 0 0 1px var(--phosphor-dim);
        caret-color: var(--phosphor);
        transition:
            border-color 0.1s,
            color 0.1s;
    }
    .custom input:hover,
    .custom input:focus {
        border-bottom-color: var(--phosphor);
        color: var(--phosphor-bright);
        outline: none;
    }
    .custom.active input {
        border-bottom: 1px solid var(--phosphor-bright);
        color: var(--phosphor-bright);
        text-shadow: 0 0 2px var(--phosphor);
    }
    .unit-sm {
        font-size: 0.9rem;
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
        animation-name: fill;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
        /* animation-duration set inline so it tracks SAMPLE_MS. */
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

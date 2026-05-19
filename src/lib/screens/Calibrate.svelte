<script lang="ts">
    import { onMount } from "svelte"

    import { sfx } from "../audio/sfx"
    import { detectMaxFps } from "../fps/detect"
    import { setMonitorHz, goto } from "../game/state.svelte"

    let phase = $state<"measuring" | "done">("measuring")
    let liveHz = $state(0)
    let finalHz = $state(0)
    let rawHz = $state(0)

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
            setMonitorHz(res.snappedHz)
            phase = "done"
            sfx.success()
        })
    })

    function handleContinue() {
        sfx.tick()
        goto("menu")
    }
</script>

<svelte:window
    onkeydown={e => {
        if (phase === "done" && (e.key === "Enter" || e.key === " ")) handleContinue()
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
            <div class="hz final">{finalHz}<span class="unit"> Hz</span></div>
            <div class="raw dim">raw: {rawHz.toFixed(2)} Hz</div>
        {/if}
    </div>

    <footer class="hint dim">
        {#if phase === "done"}
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

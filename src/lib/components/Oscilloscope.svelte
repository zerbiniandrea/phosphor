<script lang="ts">
    import { onMount } from "svelte"

    import { startFrameLoop } from "../fps/throttle"

    let {
        targetFps,
        params,
        dotSpeed = 0.6,
    } = $props<{
        targetFps: number
        params: { a: number; b: number; delta: number }
        dotSpeed?: number
    }>()

    let canvas!: HTMLCanvasElement
    let stopFn: (() => void) | null = null

    function draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        // Phosphor persistence — uniform across difficulties.
        ctx.globalCompositeOperation = "source-over"
        ctx.fillStyle = "rgba(5, 8, 5, 0.1)"
        ctx.fillRect(0, 0, w, h)

        const cx = w / 2
        const cy = h / 2
        const r = Math.min(w, h) * 0.34

        const a = params.a
        const b = params.b
        const delta = params.delta
        const phase = t * dotSpeed

        // Static guide curve — uniform faint intensity in all modes.
        ctx.strokeStyle = "rgba(51, 255, 102, 0.12)"
        ctx.lineWidth = 1
        ctx.beginPath()
        const N = 240
        for (let i = 0; i <= N; i++) {
            const u = (i / N) * Math.PI * 2
            const x = cx + r * Math.sin(a * u + delta)
            const y = cy + r * Math.sin(b * u)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        }
        ctx.stroke()

        const u = phase
        const x = cx + r * Math.sin(a * u + delta)
        const y = cy + r * Math.sin(b * u)

        // Bright core dot — the beam.
        ctx.fillStyle = "rgba(182, 255, 200, 1)"
        ctx.shadowColor = "#33ff66"
        ctx.shadowBlur = 24
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.fillStyle = "rgba(51, 255, 102, 0.35)"
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.fill()
    }

    onMount(() => {
        const dpr = window.devicePixelRatio || 1
        const resize = () => {
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            const ctx = canvas.getContext("2d")!
            ctx.scale(dpr, dpr)
            ctx.fillStyle = "#050805"
            ctx.fillRect(0, 0, rect.width, rect.height)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        const ctx = canvas.getContext("2d")!
        stopFn = startFrameLoop(targetFps, elapsed => {
            const rect = canvas.getBoundingClientRect()
            draw(ctx, rect.width, rect.height, elapsed)
        })

        return () => {
            stopFn?.()
            ro.disconnect()
        }
    })
</script>

<div class="scope">
    <canvas bind:this={canvas}></canvas>
    <div class="grid" aria-hidden="true"></div>
    <div class="frame"></div>
</div>

<style>
    .scope {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        max-width: 460px;
        margin: 0 auto;
    }
    canvas {
        width: 100%;
        height: 100%;
        display: block;
        background: #050805;
    }
    .grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
            linear-gradient(to right, rgba(51, 255, 102, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(51, 255, 102, 0.08) 1px, transparent 1px);
        background-size: 10% 10%;
    }
    .grid::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
            linear-gradient(
                to right,
                transparent calc(50% - 0.5px),
                rgba(51, 255, 102, 0.22) calc(50% - 0.5px),
                rgba(51, 255, 102, 0.22) calc(50% + 0.5px),
                transparent calc(50% + 0.5px)
            ),
            linear-gradient(
                to bottom,
                transparent calc(50% - 0.5px),
                rgba(51, 255, 102, 0.22) calc(50% - 0.5px),
                rgba(51, 255, 102, 0.22) calc(50% + 0.5px),
                transparent calc(50% + 0.5px)
            );
    }
    .frame {
        position: absolute;
        inset: 0;
        pointer-events: none;
        border: 1px solid var(--phosphor-dim);
        box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.6);
    }
</style>

<script lang="ts">
    import { onMount } from "svelte"

    import { sfx } from "../audio/sfx"
    import Typewriter from "../components/Typewriter.svelte"
    import { goto } from "../game/state.svelte"

    const lines = [
        { text: "PHOSPHOR BIOS v0.1.0", delay: 600, speed: 14 },
        { text: "(c) NO RIGHTS RESERVED", delay: 900, speed: 14 },
        { text: "", delay: 0, speed: 0 },
        {
            text: "INITIALIZING DISPLAY ADAPTER ........... [ OK ]",
            delay: 1200,
            speed: 12,
        },
        {
            text: "PROBING REFRESH RATE ................... [ OK ]",
            delay: 200,
            speed: 12,
        },
        {
            text: "LOADING PHOSPHOR COATING ............... [ OK ]",
            delay: 200,
            speed: 12,
        },
        {
            text: "CALIBRATING ELECTRON GUN ............... [ OK ]",
            delay: 200,
            speed: 12,
        },
        { text: "", delay: 0, speed: 0 },
        { text: "BOOT SEQUENCE COMPLETE.", delay: 350, speed: 16 },
    ]

    type Phase = "off" | "booting"
    let phase = $state<Phase>("off")
    let visible = $state(0)
    let powerOn = $state(false)
    let timers: number[] = []

    function startBoot() {
        if (phase !== "off") return
        phase = "booting"
        requestAnimationFrame(() => (powerOn = true))

        let acc = 0
        lines.forEach((l, i) => {
            acc += l.delay
            timers.push(
                window.setTimeout(() => {
                    visible = i + 1
                }, acc + 80),
            )
            acc += Math.max(0, l.text.length * l.speed)
        })
        timers.push(window.setTimeout(() => sfx.bootComplete(), acc + 200))
        timers.push(window.setTimeout(() => goto("menu"), acc + 1200))
    }

    onMount(() => {
        const onKey = (e: KeyboardEvent) => {
            if (phase === "off") {
                e.preventDefault()
                // Defer one frame so the audio unlock handler in App.svelte
                // (also bound to keydown) runs first and resumes the AudioContext.
                setTimeout(startBoot, 30)
            }
        }
        const onClick = () => {
            if (phase === "off") setTimeout(startBoot, 30)
        }
        window.addEventListener("keydown", onKey)
        window.addEventListener("click", onClick)
        return () => {
            window.removeEventListener("keydown", onKey)
            window.removeEventListener("click", onClick)
            timers.forEach(t => clearTimeout(t))
        }
    })

    function handleChar(c: string, i: number) {
        if (c === " " || c === "." || c === " ") return
        if (i % 2 === 0) sfx.key()
    }

    function handleLineComplete(lineIdx: number) {
        const l = lines[lineIdx]
        if (!l) return
        if (l.text.includes("[ OK ]")) sfx.postBeep()
    }
</script>

{#if phase === "off"}
    <div class="awaiting">
        <div class="prompt glow">
            PRESS ANY KEY<span class="cursor"></span>
        </div>
        <div class="sub dim">— phosphor —</div>
    </div>
{:else}
    <div class="boot on">
        <div class="power-flash"></div>
        <div class="power-line"></div>

        <div class="terminal">
            {#each lines.slice(0, visible) as line, i (i)}
                <div class="line">
                    {#if line.text === ""}
                        &nbsp;
                    {:else}
                        <Typewriter
                            text={line.text}
                            speed={line.speed}
                            cursor={i === visible - 1 && i < lines.length - 1}
                            onChar={handleChar}
                            done={() => handleLineComplete(i)}
                        />
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .awaiting {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
    }
    .prompt {
        font-size: 2.4rem;
        letter-spacing: 0.4rem;
        color: var(--phosphor-bright);
    }
    .sub {
        font-size: 1.2rem;
        letter-spacing: 0.4rem;
    }

    .boot {
        flex: 1;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transition: opacity 0.3s ease-out;
    }
    .boot.on {
        opacity: 1;
    }

    .power-flash {
        position: absolute;
        inset: -10%;
        background: white;
        opacity: 0;
        pointer-events: none;
        z-index: 20;
        animation: flash 0.5s ease-out forwards;
    }
    @keyframes flash {
        0% {
            opacity: 0.85;
        }
        40% {
            opacity: 0.4;
        }
        100% {
            opacity: 0;
        }
    }

    .power-line {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 2px;
        background: var(--phosphor-bright);
        box-shadow: var(--glow-lg);
        transform-origin: center;
        animation: expand 0.7s ease-out forwards;
        pointer-events: none;
        z-index: 19;
    }
    @keyframes expand {
        0% {
            transform: scaleX(0.02) scaleY(0.6);
            opacity: 1;
        }
        30% {
            transform: scaleX(1) scaleY(0.6);
            opacity: 1;
        }
        100% {
            transform: scaleX(1) scaleY(60);
            opacity: 0;
        }
    }

    .terminal {
        font-size: 1.6rem;
        line-height: 1.4;
        text-shadow: var(--glow-sm);
    }
    .line {
        white-space: pre;
    }
</style>

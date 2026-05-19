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

    onMount(() => {
        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    })
</script>

<div class="menu">
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

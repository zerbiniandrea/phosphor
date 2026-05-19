<script lang="ts">
    import { sfx } from "../audio/sfx"
    import Oscilloscope from "../components/Oscilloscope.svelte"
    import { achievableFps, pickFpsForDifficulty } from "../fps/throttle"
    import { buildCurveSequence, dotSpeedFor } from "../game/curves"
    import {
        game,
        goto,
        submitGuess,
        nextRound,
        startNewGame,
        roundsForDifficulty,
        type Round,
    } from "../game/state.svelte"

    // Build rounds synchronously on every mount so each entry to the Game
    // screen starts fresh (ESC → menu → START shouldn't resume old rounds).
    {
        const hz = game.monitorHz || 60
        const count = roundsForDifficulty(game.difficulty)
        const targets = pickFpsForDifficulty(hz, count, game.difficulty, { minFps: 12 })
        const curves = buildCurveSequence(game.difficulty, targets.length)
        const rounds: Round[] = targets.map((t, i) => ({
            trueFps: achievableFps(t, hz),
            guess: null,
            scorePct: 0,
            curve: curves[i],
        }))
        startNewGame(rounds)
    }

    const currentDotSpeed = $derived(dotSpeedFor(game.difficulty))

    let guessInput = $state("")
    let phase = $state<"playing" | "reveal">("playing")
    let inputEl: HTMLInputElement | undefined = $state()

    let currentRound = $derived(game.rounds[game.currentRound])
    let currentParams = $derived(
        currentRound?.curve ?? { a: 3, b: 2, delta: Math.PI / 2 },
    )
    let displayedTrueFps = $derived(currentRound ? currentRound.trueFps : 0)

    $effect(() => {
        if (game.currentRound >= 0) {
            phase = "playing"
            guessInput = ""
            setTimeout(() => inputEl?.focus(), 50)
        }
    })

    function handleSubmit(e: Event) {
        e.preventDefault()
        const n = Number(guessInput)
        if (!Number.isFinite(n) || n <= 0) return
        submitGuess(n)
        sfx.submit()
        setTimeout(() => {
            const r = game.rounds[game.currentRound]
            if (r && r.scorePct >= 70) sfx.success()
            else if (r) sfx.fail()
        }, 140)
        phase = "reveal"
    }

    function handleNext() {
        sfx.tick()
        nextRound()
    }

    function handleQuit() {
        sfx.tick()
        goto("menu")
    }
</script>

<svelte:window
    onkeydown={e => {
        if (phase === "reveal" && (e.key === "Enter" || e.key === " ")) {
            handleNext()
        }
        if (e.key === "Escape") handleQuit()
    }}
/>

<div class="game">
    <header>
        <div class="round">
            ROUND <span class="bright">{game.currentRound + 1}</span>
            <span class="dim">/ {game.rounds.length}</span>
        </div>
        <div class="title glow">[ PHOSPHOR · OSCILLOSCOPE ]</div>
        <div class="hz dim">{game.monitorHz} Hz native</div>
    </header>

    <div class="stage">
        {#key game.currentRound}
            <Oscilloscope
                targetFps={displayedTrueFps}
                params={currentParams}
                dotSpeed={currentDotSpeed}
            />
        {/key}
    </div>

    <div class="prompt">
        {#if phase === "playing"}
            <form onsubmit={handleSubmit} class="guess-form">
                <label for="guess">
                    AT WHAT FPS IS THIS RENDERING<span class="cursor"></span>
                </label>
                <div class="input-row">
                    <input
                        id="guess"
                        type="number"
                        min="1"
                        max="500"
                        step="0.1"
                        bind:value={guessInput}
                        bind:this={inputEl}
                        autocomplete="off"
                        placeholder="FPS"
                    />
                    <button type="submit">SUBMIT</button>
                </div>
            </form>
        {:else if currentRound}
            <div class="reveal">
                <div class="reveal-row">
                    <span class="dim">YOUR GUESS</span>
                    <span class="bright">{currentRound.guess?.toFixed(1)} fps</span>
                </div>
                <div class="reveal-row">
                    <span class="dim">ACTUAL</span>
                    <span class="bright">{currentRound.trueFps.toFixed(2)} fps</span>
                </div>
                <div class="reveal-row big">
                    <span class="dim">SCORE</span>
                    <span
                        class="bright"
                        class:perfect={currentRound.scorePct >= 90}
                        class:bad={currentRound.scorePct < 30}
                    >
                        {currentRound.scorePct.toFixed(1)}
                    </span>
                </div>
                <div class="next-hint dim">
                    [ENTER] {game.currentRound + 1 >= game.rounds.length
                        ? "results"
                        : "next round"}
                </div>
            </div>
        {/if}
    </div>

    <footer class="meta dim">
        <span>[ESC] quit</span>
    </footer>
</div>

<style>
    .game {
        flex: 1;
        display: grid;
        grid-template-rows: auto 1fr auto auto;
        gap: 0.8rem;
    }

    header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 1.3rem;
        letter-spacing: 0.2rem;
    }
    .title {
        font-size: 1.4rem;
    }
    .stage {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .prompt {
        text-align: center;
        font-size: 1.5rem;
        /* Stack both phases in one cell so the stage doesn't reflow on reveal. */
        display: grid;
        grid-template-areas: "state";
        min-height: 13rem;
    }
    .guess-form,
    .reveal {
        grid-area: state;
        align-self: start;
    }

    .guess-form {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }
    .input-row {
        display: flex;
        gap: 0.8rem;
        align-items: center;
    }
    input {
        font-size: 2rem;
        width: 7ch;
        text-align: center;
        letter-spacing: 0.1rem;
        caret-color: transparent;
    }
    button {
        font-size: 1.4rem;
        letter-spacing: 0.2rem;
    }

    .reveal {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        font-size: 1.6rem;
        letter-spacing: 0.15rem;
    }
    .reveal-row {
        display: grid;
        grid-template-columns: 12ch 14ch;
        gap: 1rem;
    }
    .reveal-row .dim {
        text-align: right;
    }
    .reveal-row.big {
        font-size: 2.4rem;
        margin-top: 0.4rem;
    }
    .reveal .perfect {
        color: var(--phosphor-bright);
    }
    .reveal .bad {
        color: var(--amber);
        text-shadow: 0 0 6px var(--amber);
    }
    .next-hint {
        margin-top: 0.6rem;
        font-size: 1.2rem;
    }

    .meta {
        font-size: 1.2rem;
        letter-spacing: 0.2rem;
    }
</style>

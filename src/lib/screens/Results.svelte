<script lang="ts">
    import { onMount } from "svelte"

    import { sfx } from "../audio/sfx"
    import { game, goto, recordResult, resetGame, totalScore } from "../game/state.svelte"

    let score = $derived(totalScore())
    let verdict = $derived(scoreVerdict(score))
    let copied = $state(false)

    function scoreVerdict(s: number) {
        if (s >= 90)
            return { label: "PHOSPHOR INITIATE", color: "var(--phosphor-bright)" }
        if (s >= 75) return { label: "FRAME SAVANT", color: "var(--phosphor-bright)" }
        if (s >= 55) return { label: "DECENT EYE", color: "var(--phosphor)" }
        if (s >= 35) return { label: "STILL LEARNING", color: "var(--phosphor-dim)" }
        return { label: "CONSULT OPTOMETRIST", color: "var(--amber)" }
    }

    function bucket(s: number): string {
        if (s >= 75) return "🟢"
        if (s >= 35) return "🟡"
        return "🔴"
    }

    function buildShareText(): string {
        const diff = game.difficulty.toUpperCase()
        const grid = game.rounds.map(r => bucket(r.scorePct)).join("")
        const header = "#   ACTUAL  GUESS  SCORE"
        const rows = game.rounds.map((r, i) => {
            const n = String(i + 1).padStart(2, "0")
            const actual = r.trueFps.toFixed(1).padStart(6, " ")
            const guess = (r.guess?.toFixed(1) ?? "—").padStart(6, " ")
            const sc = r.scorePct.toFixed(1).padStart(5, " ")
            return `${n}  ${actual} ${guess}  ${sc}`
        })
        return [
            `PHOSPHOR · ${diff} · ${score.toFixed(1)}/100`,
            `${game.monitorHz} Hz native`,
            "",
            grid,
            "",
            header,
            ...rows,
        ].join("\n")
    }

    async function share() {
        const text = buildShareText()
        try {
            if (navigator.share) {
                await navigator.share({ text })
                sfx.success()
                return
            }
            await navigator.clipboard.writeText(text)
            copied = true
            sfx.success()
            setTimeout(() => (copied = false), 1600)
        } catch {
            // user dismissed share / clipboard denied — ignore
        }
    }

    function playAgain() {
        resetGame()
        goto("game")
    }
    function backToMenu() {
        resetGame()
        goto("menu")
    }

    onMount(() => {
        recordResult()
    })
</script>

<svelte:window
    onkeydown={e => {
        if (e.key === "Enter" || e.key === " ") {
            playAgain()
            e.preventDefault()
        } else if (e.key === "Escape") {
            backToMenu()
        } else if (e.key === "s" || e.key === "S") {
            share()
            e.preventDefault()
        }
    }}
/>

<div class="results">
    <header>
        <h2 class="glow">[ RESULTS ]</h2>
    </header>

    <div class="score">
        <div class="dim label">FINAL SCORE</div>
        <div class="value glow-lg">{score.toFixed(1)}<span class="dim">/100</span></div>
        <div class="verdict" style="color: {verdict.color}">{verdict.label}</div>
    </div>

    <div class="rounds-wrap">
        <ul class="rounds">
            <li class="head dim">
                <span>#</span>
                <span>ACTUAL</span>
                <span>GUESS</span>
                <span>SCORE</span>
            </li>
            {#each game.rounds as r, i}
                <li>
                    <span class="dim">{String(i + 1).padStart(2, "0")}</span>
                    <span>{r.trueFps.toFixed(1)}</span>
                    <span class="dim">{r.guess?.toFixed(1) ?? "—"}</span>
                    <span class:good={r.scorePct >= 75} class:bad={r.scorePct < 35}>
                        {r.scorePct.toFixed(1)}
                    </span>
                </li>
            {/each}
        </ul>
    </div>

    <footer class="hint dim">
        <span><span class="bright">[ENTER]</span> play again</span>
        <span><span class="bright">[S]</span> {copied ? "copied!" : "share"}</span>
        <span><span class="bright">[ESC]</span> menu</span>
    </footer>
</div>

<style>
    .results {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 0.7rem;
    }
    header h2 {
        font-size: 1.6rem;
        letter-spacing: 0.3rem;
        text-align: center;
    }

    .score {
        text-align: center;
    }
    .label {
        font-size: 1.1rem;
        letter-spacing: 0.4rem;
    }
    .value {
        font-size: 4.4rem;
        line-height: 1;
        color: var(--phosphor-bright);
        font-variant-numeric: tabular-nums;
    }
    .value .dim {
        font-size: 1.6rem;
    }
    .verdict {
        margin-top: 0.3rem;
        font-size: 1.4rem;
        letter-spacing: 0.3rem;
        text-shadow: var(--glow-md);
    }

    .rounds-wrap {
        min-height: 0;
        overflow-y: auto;
        display: flex;
        justify-content: center;
    }
    .rounds {
        display: flex;
        flex-direction: column;
        border-top: 1px solid var(--phosphor-faint);
        border-bottom: 1px solid var(--phosphor-faint);
        font-size: 1.15rem;
        letter-spacing: 0.1rem;
        width: min(100%, 480px);
        height: fit-content;
    }
    .rounds li {
        display: grid;
        grid-template-columns: 3ch 8ch 8ch 8ch;
        justify-content: space-between;
        gap: 1.5rem;
        padding: 0.18rem 0.6rem;
    }
    .rounds li.head {
        border-bottom: 1px dashed var(--phosphor-faint);
        position: sticky;
        top: 0;
        background: #050805;
    }
    .rounds li span {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    .good {
        color: var(--phosphor-bright);
        text-shadow: var(--glow-sm);
    }
    .bad {
        color: var(--amber);
        text-shadow: 0 0 4px var(--amber);
    }

    .hint {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 1.15rem;
        letter-spacing: 0.18rem;
    }
</style>

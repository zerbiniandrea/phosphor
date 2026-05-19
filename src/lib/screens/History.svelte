<script lang="ts">
    import { sfx } from "../audio/sfx"
    import {
        clearHistory,
        game,
        goto,
        type Difficulty,
        type HistoryEntry,
    } from "../game/state.svelte"

    const ORDER: Difficulty[] = ["easy", "normal", "hard"]

    type Stats = {
        difficulty: Difficulty
        count: number
        best: number | null
        avg: number | null
        last: HistoryEntry | null
    }

    const stats = $derived.by<Stats[]>(() => {
        return ORDER.map(d => {
            const entries = game.history.filter(e => e.difficulty === d)
            if (entries.length === 0) {
                return { difficulty: d, count: 0, best: null, avg: null, last: null }
            }
            const best = entries.reduce((m, e) => (e.score > m ? e.score : m), -Infinity)
            const avg = entries.reduce((s, e) => s + e.score, 0) / entries.length
            return {
                difficulty: d,
                count: entries.length,
                best,
                avg,
                last: entries[0],
            }
        })
    })

    const recent = $derived(game.history.slice(0, 8))

    function fmtTime(ts: number): string {
        const d = new Date(ts)
        const now = new Date()
        const sameDay =
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
        if (sameDay) {
            return d.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            })
        }
        const m = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        return `${d.getFullYear()}-${m}-${day}`
    }

    function back() {
        sfx.tick()
        goto("menu")
    }

    function onClear() {
        sfx.fail()
        clearHistory()
    }
</script>

<svelte:window
    onkeydown={e => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") back()
        else if (e.key === "x" || e.key === "X") onClear()
    }}
/>

<div class="history">
    <header>
        <h2 class="glow">[ HISTORY ]</h2>
    </header>

    {#if game.history.length === 0}
        <div class="empty dim">
            <p>NO RUNS RECORDED.</p>
            <p>FINISH A GAME TO LOG A RESULT.</p>
        </div>
    {:else}
        <div class="stats">
            {#each stats as s}
                <div class="card" class:empty-card={s.count === 0}>
                    <div class="diff">{s.difficulty.toUpperCase()}</div>
                    {#if s.count === 0}
                        <div class="dim small">— no runs —</div>
                    {:else}
                        <div class="row">
                            <span class="dim">BEST</span>
                            <span class="bright">{s.best?.toFixed(1)}</span>
                        </div>
                        <div class="row">
                            <span class="dim">AVG</span>
                            <span>{s.avg?.toFixed(1)}</span>
                        </div>
                        <div class="row">
                            <span class="dim">RUNS</span>
                            <span>{s.count}</span>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>

        <div class="recent-wrap">
            <div class="recent-title dim">RECENT</div>
            <ul class="recent">
                <li class="head dim">
                    <span>WHEN</span>
                    <span>DIFF</span>
                    <span>HZ</span>
                    <span>SCORE</span>
                </li>
                {#each recent as e}
                    <li>
                        <span class="dim">{fmtTime(e.ts)}</span>
                        <span>{e.difficulty.toUpperCase()}</span>
                        <span class="dim">{e.monitorHz}</span>
                        <span class:good={e.score >= 75} class:bad={e.score < 35}>
                            {e.score.toFixed(1)}
                        </span>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}

    <footer class="hint dim">
        <span><span class="bright">[ESC]</span> menu</span>
        {#if game.history.length > 0}
            <span><span class="bright">[X]</span> clear</span>
        {/if}
    </footer>
</div>

<style>
    .history {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 0.8rem;
    }
    header h2 {
        font-size: 1.6rem;
        letter-spacing: 0.3rem;
        text-align: center;
    }

    .empty {
        text-align: center;
        font-size: 1.4rem;
        letter-spacing: 0.2rem;
        margin-top: 2rem;
    }
    .empty p {
        margin: 0.3rem 0;
    }

    .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.8rem;
        font-size: 1.15rem;
        letter-spacing: 0.1rem;
    }
    .card {
        border: 1px solid var(--phosphor-faint);
        padding: 0.6rem 0.8rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }
    .card .diff {
        color: var(--phosphor-bright);
        text-shadow: var(--glow-sm);
        letter-spacing: 0.25rem;
        margin-bottom: 0.2rem;
    }
    .card .row {
        display: flex;
        justify-content: space-between;
        font-variant-numeric: tabular-nums;
    }
    .card.empty-card {
        opacity: 0.55;
    }
    .small {
        font-size: 1rem;
    }

    .recent-wrap {
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
    .recent-title {
        font-size: 1.1rem;
        letter-spacing: 0.3rem;
        text-align: center;
    }
    .recent {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        border-top: 1px solid var(--phosphor-faint);
        border-bottom: 1px solid var(--phosphor-faint);
        font-size: 1.15rem;
        letter-spacing: 0.1rem;
        margin: 0 auto;
        width: min(100%, 520px);
    }
    .recent li {
        display: grid;
        grid-template-columns: 8ch 7ch 5ch 7ch;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.18rem 0.6rem;
    }
    .recent li.head {
        border-bottom: 1px dashed var(--phosphor-faint);
        position: sticky;
        top: 0;
        background: #050805;
    }
    .recent li span {
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

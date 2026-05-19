<script lang="ts">
    import { goto } from "../game/state.svelte"
</script>

<svelte:window
    onkeydown={e => {
        if (e.key === "Escape" || e.key === "Enter") goto("menu")
    }}
/>

<div class="about">
    <header>
        <h2 class="glow">[ ABOUT PHOSPHOR ]</h2>
    </header>

    <div class="body">
        <p class="lead">
            <span class="bright">PHOSPHOR</span> is a frame-rate perception test. A Lissajous
            curve is drawn at a hidden frame rate — you guess how fast.
        </p>

        <section>
            <h3 class="section-label">[ METHOD ]</h3>
            <p>
                Your monitor's native refresh rate is measured by sampling
                requestAnimationFrame intervals.
            </p>
        </section>

        <section>
            <h3 class="section-label">[ CONSTRAINT ]</h3>
            <p>
                A browser can only render at integer divisors of that rate. On a 144Hz
                panel: 144, 72, 48, 36, 28.8 ... — the game picks from this set.
            </p>
        </section>

        <section>
            <h3 class="section-label">[ SCORING ]</h3>
            <p>
                Relative error drives the score. A perfect guess returns 100; the curve
                falls off smoothly from there.
            </p>
        </section>

        <p class="tip">
            &gt; TIP — trust the smoothness of motion, not the brightness of the trail.
        </p>
    </div>

    <footer class="hint dim">
        <span class="bright">[ENTER]</span> back to menu
    </footer>
</div>

<style>
    .about {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
    }
    header h2 {
        font-size: 1.8rem;
        letter-spacing: 0.3rem;
    }
    .body {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
        font-size: 1.4rem;
        line-height: 1.5;
        max-width: 64ch;
    }
    .body p {
        text-shadow: var(--glow-sm);
    }
    .lead {
        color: var(--phosphor);
    }
    .section-label {
        font-size: 1.05rem;
        letter-spacing: 0.3rem;
        color: var(--phosphor-dim);
        text-shadow: var(--glow-sm);
        margin-bottom: 0.3rem;
    }
    section p {
        color: var(--phosphor);
    }
    .tip {
        margin-top: 0.4rem;
        color: var(--phosphor-bright);
        text-shadow: var(--glow-md);
        letter-spacing: 0.05rem;
    }
    .hint {
        margin-top: auto;
        font-size: 1.2rem;
        letter-spacing: 0.2rem;
    }
</style>

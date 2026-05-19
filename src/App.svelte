<script lang="ts">
    import { onMount } from "svelte"

    import { ensureUnlocked, setMasterLevel, startHum, sfx } from "./lib/audio/sfx"
    import Screen from "./lib/components/Screen.svelte"
    import { degauss } from "./lib/components/transitions"
    import { game, setAudioEnabled, VOLUME_LEVELS } from "./lib/game/state.svelte"

    // Effective master gain: muted → 0, otherwise the VOL knob position.
    const audioLevel = $derived(game.audioEnabled ? VOLUME_LEVELS[game.volume] : 0)
    $effect(() => {
        setMasterLevel(audioLevel)
    })

    // Fire a degauss thunk whenever we navigate, alongside the visual
    // degauss transition. Skip the initial "boot" mount (audio is locked
    // until the user gestures anyway, and `power()` covers that moment).
    $effect(() => {
        if (game.screen !== "boot") sfx.degauss()
    })
    import About from "./lib/screens/About.svelte"
    import Boot from "./lib/screens/Boot.svelte"
    import Calibrate from "./lib/screens/Calibrate.svelte"
    import Game from "./lib/screens/Game.svelte"
    import History from "./lib/screens/History.svelte"
    import Menu from "./lib/screens/Menu.svelte"
    import Results from "./lib/screens/Results.svelte"

    function unlock() {
        ensureUnlocked()
        if (game.audioEnabled) {
            startHum()
            sfx.power()
        }
        window.removeEventListener("keydown", unlock)
        window.removeEventListener("click", unlock)
    }

    function onKey(e: KeyboardEvent) {
        if (e.key === "m" || e.key === "M") {
            setAudioEnabled(!game.audioEnabled)
        }
    }

    onMount(() => {
        window.addEventListener("keydown", unlock)
        window.addEventListener("click", unlock)
        window.addEventListener("keydown", onKey)
        return () => {
            window.removeEventListener("keydown", unlock)
            window.removeEventListener("click", unlock)
            window.removeEventListener("keydown", onKey)
        }
    })
</script>

<Screen>
    {#key game.screen}
        <div class="screen-host" in:degauss={{ duration: 320 }}>
            {#if game.screen === "boot"}
                <Boot />
            {:else if game.screen === "menu"}
                <Menu />
            {:else if game.screen === "calibrate"}
                <Calibrate />
            {:else if game.screen === "game"}
                <Game />
            {:else if game.screen === "results"}
                <Results />
            {:else if game.screen === "about"}
                <About />
            {:else if game.screen === "history"}
                <History />
            {/if}
        </div>
    {/key}
</Screen>

<style>
    .screen-host {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }
</style>

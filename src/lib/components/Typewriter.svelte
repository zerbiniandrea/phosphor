<script lang="ts">
    import { onMount } from "svelte"

    let {
        text = "",
        speed = 18,
        delay = 0,
        cursor = false,
        done = () => {},
        onChar = (_c: string, _i: number) => {},
    } = $props<{
        text: string
        speed?: number
        delay?: number
        cursor?: boolean
        done?: () => void
        onChar?: (char: string, index: number) => void
    }>()

    let shown = $state("")
    let finished = $state(false)

    onMount(() => {
        let i = 0
        let cancelled = false
        const start = () => {
            const tick = () => {
                if (cancelled) return
                shown = text.slice(0, i)
                if (i > 0) onChar(text[i - 1] ?? "", i - 1)
                i++
                if (i > text.length) {
                    finished = true
                    done()
                    return
                }
                setTimeout(tick, speed)
            }
            tick()
        }
        const t = setTimeout(start, delay)
        return () => {
            cancelled = true
            clearTimeout(t)
        }
    })
</script>

<span
    >{shown}{#if cursor && !finished}<span class="cursor"></span>{/if}</span
>

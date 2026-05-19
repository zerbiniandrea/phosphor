import type { TransitionConfig } from "svelte/transition"

/**
 * Subtle "vertical sync" transition: a quick fade with a small brightness
 * pop, like a CRT re-acquiring signal. No geometry distortion.
 */
export function crtSwitch(
    _node: Element,
    { duration = 140 }: { duration?: number } = {},
): TransitionConfig {
    return {
        duration,
        css: t => {
            const opacity = Math.min(1, t * 1.2)
            const bright = 1 + (1 - t) * 0.35
            return `opacity: ${opacity}; filter: brightness(${bright});`
        },
    }
}

/**
 * Degauss: a brief magnetic-coil pulse like an old CRT firing its degauss.
 * RGB channels separate (chromatic aberration), the image wobbles a few
 * times, then settles. Use as the entry transition on screen changes.
 */
export function degauss(
    _node: Element,
    { duration = 360 }: { duration?: number } = {},
): TransitionConfig {
    return {
        duration,
        css: t => {
            const u = 1 - t // 1 → 0 over the transition
            // Wobble damps quickly; use a couple of cosine cycles weighted by u.
            const wobble = Math.cos(t * Math.PI * 4) * 6 * u * u
            // Chromatic aberration via drop-shadow filter (cheap RGB split look).
            const shift = u * 3.5
            const blur = u * 1.8
            const bright = 1 + u * 0.35
            const sat = 1 + u * 0.8
            return `
                opacity: ${Math.min(1, t * 1.4)};
                transform: translateX(${wobble}px) skewX(${wobble * 0.08}deg);
                filter:
                    blur(${blur}px)
                    brightness(${bright})
                    saturate(${sat})
                    drop-shadow(${shift}px 0 0 rgba(255, 60, 80, 0.6))
                    drop-shadow(${-shift}px 0 0 rgba(60, 160, 255, 0.6));
            `
        },
    }
}

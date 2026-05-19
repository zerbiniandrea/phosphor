import { execSync } from "node:child_process"

import { svelte } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vite"

// Enable cross-origin isolation so performance.now() runs at high
// resolution (~5µs) instead of clamped to 1ms. Without this, frame-delta
// sampling at >250Hz quantizes (e.g. 280Hz reads as 250Hz).
const coiHeaders = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
}

function gitShortSha(): string {
    try {
        return execSync("git rev-parse --short HEAD", {
            stdio: ["ignore", "pipe", "ignore"],
        })
            .toString()
            .trim()
    } catch {
        return "unknown"
    }
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [svelte()],
    base: process.env.GITHUB_ACTIONS ? "/phosphor/" : "/",
    define: {
        __COMMIT_SHA__: JSON.stringify(gitShortSha()),
    },
    server: { headers: coiHeaders },
    preview: { headers: coiHeaders },
})

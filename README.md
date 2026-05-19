```
    █████ █   █ █████ █████ █████ █   █ █████ █████
    █   █ █   █ █   █ █     █   █ █   █ █   █ █   █
    █████ █████ █   █ █████ █████ █████ █   █ █████
    █     █   █ █   █     █ █     █   █ █   █ █ █
    █     █   █ █████ █████ █     █   █ █████ █   █

              ─── a frame-rate perception test ───
```

> a small green-phosphor CRT, a dim room, and one question:
> _how many frames per second was that?_

---

## ░ TRANSMISSION ░

The tube hums. Something flickers on screen.
You watch. You guess. The CRT judges you.

There is no leaderboard. The CRT remembers your last fifty runs
and that is enough.

## ░ POWER ON ░

```
$ pnpm install
$ pnpm dev
```

Open the URL Vite prints. Dim the lights. Let your eyes adjust.

## ░ CONTROLS ░

```
  [↑ ↓]   navigate
  [↵]     select
  [ESC]   back
  [M]     mute the hum
  [S]     (on results) copy a share card
```

## ░ CALIBRATION ░

First boot, the menu will nag you.
Calibration is one screen — it measures your monitor's refresh
ceiling and remembers it. The game uses that ceiling as the
upper bound on what it'll throw at you.

Different display? Calibrate again.

## ░ DIFFICULTY ░

```
  EASY     5 rounds   ·  gentler curve
  NORMAL  10 rounds   ·
  HARD    15 rounds   ·  meaner curve
```

Per-difficulty bests live in `MENU → HISTORY`.

## ░ SHARE CARD ░

```
  PHOSPHOR · HARD · 87.3/100
  144 Hz native

  🟢🟢🟡🟢🟢🟡🟡🟢🟢🟢🟢🟢🟡🟢🟢

  #   ACTUAL  GUESS  SCORE
  01    48.0   45.0   91.2
  ...
```

Press `S` on the results screen — it goes straight to your clipboard.

## ░ INTERNALS ░

Svelte 5 (runes) · TypeScript · Vite · pnpm.
No router, no backend, no accounts. Whatever needs to be
remembered lives in `localStorage`.

```
$ pnpm dev         ── run it
$ pnpm build       ── bundle
$ pnpm checklist   ── lint, format, typecheck
```

## ░ ON THE AESTHETIC ░

The CRT is real-ish on purpose. A slightly recessed tube. A
plastic gasket ring. A phosphor halo bleeding onto the wall
behind it. A degauss wobble whenever a screen changes. A hum
bar that occasionally sweeps the menu.

None of it is necessary. All of it is the point.

```
                                              ▒▓ END OF FILE ▓▒
```

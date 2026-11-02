# Second Gear

**Hold Shift to stop time. Queue the chaos. Let go.**

A physics puzzle game for [GitHub Game Off 2026](https://itch.io/jam/game-off-2026) (theme: **SHIFT**).

The Shift key *is* the game. Hold it and time stops: click a crate or dummy to queue a shove, click the floor to queue a thrown ball. Let go, and everything you queued happens at once, in slow motion, before time shifts back up through second gear to full speed. Knock every red target off the table in as few shifts as you can.

## Controls

| Input | Action |
|---|---|
| Hold **Shift** | Stop time |
| **Click** (time stopped) | Queue a shove on what you click, or a thrown ball at the floor |
| Release **Shift** | Everything queued happens at once |
| **Right-drag** / wheel | Turn / zoom the camera |
| **R** | Restart the level |

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/ (the itch.io HTML5 upload)
```

## Built with

- [three.js](https://threejs.org) (rendering, MIT)
- [Rapier](https://rapier.rs) (physics, Apache-2.0)
- [Vite](https://vitejs.dev) (build, MIT)
- Sound effects are synthesized at runtime with WebAudio; no audio files.

## AI use

This game was developed with AI assistance (Claude, via Claude Code) for code, level layout and testing, directed by the author. No AI-generated art or audio assets are used: everything on screen is primitive geometry and everything you hear is synthesized.

## License

MIT, see [LICENSE](LICENSE).

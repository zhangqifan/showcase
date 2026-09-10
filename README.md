# Showcase

A web app for creating device mockups and app screenshots. Upload screenshots, choose device frames (e.g. iPhone 17), switch iPhone Duo between inner and outer displays in portrait or landscape, adjust layout and background, then export in high resolution (1080×1080 or 1920×1920).

Use **Cmd+Z** to undo and **Cmd+Shift+Z** to redo (or **Ctrl+Z / Ctrl+Shift+Z** on Windows and Linux). History keeps up to 100 edits for the current page session, including media changes. Each drag or slider gesture counts as one edit; text fields retain their native undo behavior.

## Stack

- [SvelteKit](https://kit.svelte.dev/) with [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [mediabunny](https://github.com/mediabunny/mediabunny) for image handling
- [@paper-design/shaders](https://github.com/paper-design/shaders) for Static Mesh Gradient rendering

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command   | Description          |
| --------- | -------------------- |
| `npm run dev`     | Start dev server     |
| `npm test`      | Run renderer and editing history regression tests |
| `npm run build`   | Build for production |
| `npm run preview` | Preview production   |

## Third-Party Notice

This project uses [`@paper-design/shaders`](https://github.com/paper-design/shaders) for Static Mesh Gradient rendering.

- License: PolyForm Shield
- Source: https://github.com/paper-design/shaders
- Required Notice: Copyright Lost Coast Labs, Inc. (http://paper.design)

Please review the Paper Shaders license before redistributing or using this project in a product that may compete with Paper or Paper Shaders.

## License

[MIT](LICENSE) — use freely.

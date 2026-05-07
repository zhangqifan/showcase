# Showcase

Showcase contains the native Apple app scaffold and the existing Svelte web app.

## Structure

```text
showcase/
├── apple/   # Tuist-managed AppKit and UIKit apps
├── web/     # SvelteKit web app
└── LICENSE
```

## Apple

```bash
showcase-gen
```

`showcase-gen` regenerates the Tuist workspace and opens it in Xcode. Use `showcase-gen --no-open` when you only want to regenerate the workspace.

## Web

```bash
cd web
npm install
npm run dev
```

---
name: Artifact asset paths
description: Asset URL behavior for path-routed web artifacts
---

Use `import.meta.env.BASE_URL` when referencing files from an artifact's public directory. Do not use root-absolute paths such as `/icons/...` when the artifact is served below `/`.

**Why:** Root-absolute URLs escape the artifact prefix and render as broken images in the proxied preview and production route.

**How to apply:** Build public asset URLs as `${import.meta.env.BASE_URL}path/to/file` or import bundled assets through the app source.
# Development
 
 ## Build

```bash
npm install
npm run build
```

This builds `main.js` from `main.ts` using esbuild.

## Manual Install

- Open your vault folder.
- Create `.obsidian/plugins/obsidian-csv-importer/` if it doesn’t exist.
- Copy `manifest.json`, `main.js`, and `styles.css` from this repo’s root into that folder.
- In Obsidian Settings → Community plugins, enable “CSV Importer”.
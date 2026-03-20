# WCAG Watcher — Frontend

WCAG 2.1 accessibility monitoring dashboard. Pairs with the
[A11y Scanner API](../a11y-scanner-api/README.md) backend.

## Project Structure

```
a11y-monitor/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   └── App.jsx          ← main app (copy from artifact)
└── .github/
    └── workflows/
        └── deploy.yml   ← auto-deploys to GitHub Pages
```

## Setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_ORG/a11y-monitor.git
cd a11y-monitor
npm install

# 2. Copy the App.jsx content from the artifact into src/App.jsx

# 3. Update DEFAULT_API_URL in src/App.jsx to your Render URL

# 4. Update the `base` path in vite.config.js to match your repo name

# 5. Run locally
npm run dev
```

## Deploy to GitHub Pages

Two options:

### Option A: Automatic (recommended)
The included GitHub Actions workflow deploys on every push to `main`.

1. In your GitHub repo, go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Push to `main` — the workflow builds and deploys automatically
4. Your site will be at `https://YOUR_ORG.github.io/a11y-monitor/`

### Option B: Manual
```bash
npm run deploy
```
This builds and pushes to the `gh-pages` branch.
Requires **Settings → Pages → Source** set to **Deploy from a branch** (`gh-pages`).

## Configuration

The only configuration is the Scanner API URL, which can be set in two ways:

- **Hardcoded default**: Change `DEFAULT_API_URL` in `src/App.jsx`
- **At runtime**: Click ⚙ API Settings in the app header

## Notes

- All state is in-memory — refreshing the page clears URLs and results.
  This is intentional for the proof of concept. Persistent storage can be
  added later when moving to your Rails backend.
- The frontend calls `/scan/batch` on the scanner API and streams results
  via NDJSON, showing progress as each URL completes.
- CSV export includes all violations from the latest scan per URL.

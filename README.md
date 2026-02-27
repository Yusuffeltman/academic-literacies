# Academic Literacies in the Age of AI

A modular, AI-powered learning platform built for GitHub Pages hosting with Moodle and Microsoft Teams embedding.

---

## Project Structure

```
academic-literacies/
├── index.html                  ← App shell (no inline scripts — Moodle CSP safe)
├── vite.config.js              ← Build config (set your repo base path here)
├── package.json
│
├── src/
│   ├── main.js                 ← Entry point
│   ├── auth.js                 ← Firebase auth (login / register / signout)
│   ├── app.js                  ← Shell renderer + navigation
│   ├── firebase.js             ← Firebase + Gemini config ⚠️ update before deploy
│   ├── state.js                ← Shared app state + Firebase persistence
│   │
│   ├── components/
│   │   ├── video-player.js     ← Interactive YouTube player class
│   │   └── activities.js      ← quiz() and exercise() HTML generators
│   │
│   └── styles/
│       └── main.css            ← All styles (extracted from original monolith)
│
├── content/
│   ├── units.js                ← Course units — add new units here
│   ├── videos.js               ← Video metadata + chapter/interaction config
│   └── readings.js             ← Extensive Reading tiers + articles
│
└── .github/
    └── workflows/
        └── deploy.yml          ← Auto-deploy to GitHub Pages on push to main
```

---

## First-Time Setup

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/academic-literacies.git
cd academic-literacies
npm install
```

### 2. Configure Firebase
Edit `src/firebase.js` and replace all placeholder values with your Firebase project credentials.  
Get them from: Firebase Console → Project Settings → Your Apps → Web.

### 3. Configure your Gemini API key
In `src/firebase.js`, replace `YOUR_GEMINI_KEY` with your key from [Google AI Studio](https://aistudio.google.com/app/apikey).

> ⚠️ **Note:** For production, move the Gemini key to a Firebase Cloud Function so it's never exposed in the browser bundle.

### 4. Set your GitHub repo name
In `vite.config.js`, update the `base` field:
```js
base: '/your-repo-name/',
```

### 5. Run locally
```bash
npm run dev
```

### 6. Deploy
Push to `main`. GitHub Actions builds and deploys automatically.  
First deploy: go to **Settings → Pages → Source → GitHub Actions**.

---

## Embedding in Moodle

1. Build the project (`npm run build`) and ensure it's live on GitHub Pages.
2. In Moodle, add a resource of type **External URL** or **IFrame**.
3. Paste your GitHub Pages URL: `https://YOUR_USERNAME.github.io/academic-literacies/`
4. ✅ No inline scripts = no CSP issues.

---

## Embedding in Microsoft Teams

1. In your Teams class channel, click **+** (Add a tab).
2. Select **Website**.
3. Paste your GitHub Pages URL.

---

## Adding a New Unit

Open `content/units.js` and append a new object to the `UNITS` array:

```js
{
  id: 'u6',
  badge: 'Unit 6',
  title: 'Your Unit Title',
  html: () => `
    <h1>Unit 6: Your Unit Title</h1>
    <p class="lead">Your introductory paragraph.</p>

    ${ivp('your-video-key')}   // add video to content/videos.js first

    ${q('q6', 'Your question?', ['A', 'B', 'C', 'D'], 0, 'Feedback text.')}

    ${ex('e6', 'Exercise Title', 'Placeholder…', 'Instruction for student.', 'AI context string')}
  `
}
```

---

## Adding a New Video

Open `content/videos.js` and add entries to both `VIDEOS` and `VIDEO_CONFIG`:

```js
// In VIDEOS:
myVideo: { id: 'YOUTUBE_ID', title: 'Video Title' },

// In VIDEO_CONFIG:
myVideo: {
  ctx: 'Context string for the AI video tutor.',
  chapters: [
    { t: 0,   n: 'Intro' },
    { t: 120, n: 'Main Point' },
  ],
  ix: [
    { id: 'mv1', t: 90, type: 'mcq', q: 'Question?', opts: ['A','B','C','D'], ok: 1, fb: 'Feedback.' },
    { id: 'mv2', t: 180, type: 'refl', q: 'Reflection prompt?', ph: 'I think…' },
  ],
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Bundler | [Vite 5](https://vitejs.dev) |
| Auth & DB | [Firebase](https://firebase.google.com) (Auth + Realtime Database) |
| AI Feedback | [Gemini 1.5 Flash](https://aistudio.google.com) |
| Video | YouTube IFrame API |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| Fonts | Google Fonts (Playfair Display, Lora, DM Mono) |

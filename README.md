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

### Authoring standard (required)

Before editing or adding unit content, review `docs/module-content-style-guide.md`.

This guide defines the required unit flow and writing standards, including:
- Pathway Challenge structure and difficulty progression
- Essay Milestone progression and evidence checkpoints
- Heutagogy integration and moderation expectations

Use it as the default content policy for `content/units/unit01.js` to `content/units/unit20.js`.

Before opening a PR, run:
- `npm run check:unit-structure`
- `npm run build`

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

---

## Tutor Group Privacy & Security

- Tutor allocations are configured in `content/tutorial-groups/assignments.js`.
- Use `studentUids` in group lists whenever possible (preferred over email lists).
- Tutor dashboard now masks student emails by default in the UI.
- In Lecturer dashboard Quick Tools, use **Sync Tutor Groups** to publish allocations to Firebase at `tutorial-groups/assignmentsByTutor`.

### Backend enforcement (important)

Client-side filtering is not sufficient on its own. Apply Firebase Realtime Database rules so tutors can only read their assigned students.

1. Review and adapt `database.rules.json` in this repo.
2. Ensure your auth role mapping exists under `roles/{uid}`.
3. Prefer storing tutor assignments at `tutorial-groups/assignmentsByTutor/{tutorUid}` for strict server-side access control.

---

## SynthID Integrity Adapter

The marking pipeline can now store a structured `integrity.synthId` result on each grading record. This is designed as a **provider adapter**, not as a built-in universal AI detector.

### What it does

- submission auto-marking can call a SynthID verification endpoint during ingest
- the result is stored with the existing integrity object in `grading-records`
- markers see the outcome in the `AI First Read` panel
- positive results can feed the existing moderation flow

### What it does not do

- it does **not** prove human authorship
- a negative result does **not** clear a submission
- it should be used as one provenance signal alongside notebooks, drafting history, and staff review

### Deployable adapter

Firebase Functions now exposes:

- `synthIdDetectorAdapter`

Use this as the stable function URL if you want the app to call an internal adapter first, then forward to whichever detector service you are actually allowed to use.

### Environment variables

Set these in the Firebase Functions environment:

- `ALE00Y1_SYNTHID_PROVIDER_URL`
  - URL the auto-marking backend should call
  - if you use the internal adapter, point this to the deployed `synthIdDetectorAdapter` URL
- `ALE00Y1_SYNTHID_PROVIDER_TOKEN`
  - optional bearer token sent to the provider URL
- `ALE00Y1_SYNTHID_PROVIDER_API_KEY`
  - optional `x-api-key` sent to the provider URL
- `ALE00Y1_SYNTHID_SHARED_SECRET`
  - optional secret required by `synthIdDetectorAdapter`
- `ALE00Y1_SYNTHID_UPSTREAM_URL`
  - optional upstream detector endpoint the adapter should forward to
- `ALE00Y1_SYNTHID_UPSTREAM_TOKEN`
  - optional bearer token for the upstream detector
- `ALE00Y1_SYNTHID_UPSTREAM_API_KEY`
  - optional `x-api-key` for the upstream detector

### Expected provider response

The provider should return JSON shaped like:

```json
{
  "status": "detected",
  "detected": true,
  "confidence": 0.92,
  "confidenceBand": "high",
  "summary": "SynthID watermark detected in submitted content.",
  "evidence": [
    "Matched watermark signature in uploaded text asset."
  ],
  "checkedFiles": [
    {
      "name": "essay.docx",
      "modality": "text",
      "status": "checked"
    }
  ],
  "recommendedStaffAction": "Route to lecturer moderation.",
  "requiredHumanFollowUp": "Ask the student to explain their drafting process."
}
```

Valid `status` values the app understands:

- `detected`
- `not_detected`
- `uncertain`
- `unsupported`
- `unavailable`
- `error`

### Recommended deployment pattern

1. Deploy functions.
2. Set `ALE00Y1_SYNTHID_PROVIDER_URL` to the internal adapter URL.
3. Set `ALE00Y1_SYNTHID_SHARED_SECRET` and mirror that value into `ALE00Y1_SYNTHID_PROVIDER_TOKEN`.
4. Once you have access to a real detector service, set `ALE00Y1_SYNTHID_UPSTREAM_URL` and its credentials.
5. Treat positive results as moderation triggers, not as automatic misconduct findings.


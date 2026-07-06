# Jeeves — Lecturer Voice Assistant

Push-to-talk voice assistant scoped to lecturers and moderators. Built on
the existing Gemini integration (`src/ai.js`) with a skill/tool registry
so capabilities can grow without touching the agent loop.

## Architecture at a glance

```
jeeves-button.js ── listen → voice-input.js
                             │
                             ▼
                       redactor.js (PII scrub)
                             │
                             ▼
                        agent.js (runTurn)
                             │
                             ▼
                   registry.js + skills/*.js
                             │
                             ▼
                     voice-output.js (speak)
```

| File | Purpose |
|---|---|
| `registry.js` | Skill registration, scope/role gating, audit log |
| `agent.js` | Agentic loop over Gemini function-calling |
| `redactor.js` | Strip student names/emails before sending to LLM |
| `voice-input.js` | Web Speech API + Capacitor speech plugin |
| `voice-output.js` | SpeechSynthesis wrapper |
| `jeeves-button.js` | Floating mic button + hotkey |
| `index.js` | Boot entry — imported from `src/main.js` |
| `skills/*.js` | One file per capability |

## How tiering works

Every skill declares `scope: 'app' | 'desktop' | 'open'`.

- `app` — enabled by default (Tier A).
- `desktop` — enabled via `enableScope('desktop')` once a signed local
  companion is present (Tier B, not yet built).
- `open` — enabled via `enableScope('open')` for internet/email access
  (Tier C, not yet built).

Add a skill: drop a new file in `skills/`, import it from `index.js`, it
self-registers on load.

## Consent & privacy

- Opt-in flag lives at `STATE.preferences.jeevesEnabled` and persists
  via the existing `saveState()`.
- Transcripts are PII-scrubbed before being sent to Gemini; the token
  map stays in-memory on the lecturer's device.
- Every skill call writes a `jeeves_action` audit event to
  `analytics/raw-events/{dateKey}` via `window._logAnalyticsEvent`.

## Self-improvement skill

`skills/propose-code-change.js` is gated behind
`VITE_JEEVES_CODE_SKILLS=1` and restricted to `moderator` role. It calls
the `jeevesProposeCodeChange` Cloud Function, which currently queues the
request for human review (GitHub PR automation is a follow-up — see the
open questions in the plan).

## Tests

Pure-JS tests under `__tests__/` use Node's built-in test runner:

```
node --test src/components/jeeves/__tests__/*.test.js
```

## Android

Requires the `@capacitor-community/speech-recognition` plugin and
`RECORD_AUDIO` permission (both already added). Build with the existing
`npm run build:android`.

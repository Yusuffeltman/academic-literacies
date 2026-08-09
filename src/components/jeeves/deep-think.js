// src/components/jeeves/deep-think.js
// ─────────────────────────────────────────────
// Deep Think Mode — Claude-powered analytical reasoning.
// Activated via "think about...", "analyze", "deep dive" triggers.
// ─────────────────────────────────────────────

import { _aiChat } from '../../ai.js';
import { canUseDeepThink, getPermissionTier, TIER_CONFIRM, TIER_ADMIN } from './guard-rails.js';
import { getAppContext } from './context-provider.js';

const DEEP_THINK_TRIGGERS = [
  'think about',
  'analyze',
  'deep dive',
  'understand',
  'explain how',
  'figure out',
  'why is',
  'how does',
  'break down',
  'evaluate',
  'assess',
  'review',
  'look at the code',
  'find the bug',
];

const SYSTEM_PROMPT = `You are Claude, a world-class AI assistant with deep expertise in education, software engineering, and academic research. You think carefully, step by step, and provide thorough, well-reasoned answers.

You have access to the full Academic Literacies app context — use it to ground your answers in actual data.

Response style:
- Be thorough but concise — prioritize clarity over length
- Use natural prose, not bullet points (unless genuinely listing items)
- When discussing code, reference specific files and line numbers
- When discussing data, cite actual values from the context
- If uncertain, say so — never guess
- For code issues, provide specific fixes with file paths

You have these capabilities (respecting permission tiers):
- Tier 1 (Safe): Read any app data, navigate, query database
- Tier 2 (Confirm): Create items, send messages, moderate content
- Tier 3 (Admin): Write/modify code files, change configuration

Never perform destructive actions. Always confirm with user before Tier 2+ operations.`;

const MAX_TOKENS = 4096;

export function isDeepThinkRequest(transcript) {
  const lower = transcript.toLowerCase();
  return DEEP_THINK_TRIGGERS.some(t => lower.includes(t));
}

export async function runDeepThink(transcript, ctx) {
  if (!canUseDeepThink(ctx)) {
    return { 
      reply: "Deep Think mode isn't available for your role. Ask the admin to upgrade your permissions.",
      isDeepThink: true 
    };
  }

  const tier = getPermissionTier(ctx);
  const appContext = await getAppContext(ctx);

  const prompt = `APP CONTEXT:
${JSON.stringify(appContext, null, 2)}

USER REQUEST:
${transcript}

${tier >= TIER_ADMIN ? '[Admin mode: You can propose code changes and config edits]' : ''}
${tier >= TIER_CONFIRM ? '[Confirm mode: You can create and modify items]' : ''}

Provide a thorough, thoughtful response.`;

  try {
    const response = await _aiChat(prompt, {
      system: SYSTEM_PROMPT,
      maxTokens: MAX_TOKENS,
    });

    return { reply: response, isDeepThink: true, tier };
  } catch (err) {
    return { 
      reply: `Deep Think failed: ${err.message}. Try again.`,
      isDeepThink: true,
      error: err.message 
    };
  }
}

export async function runDeepThinkWithFileAccess(transcript, ctx, filePaths) {
  const tier = getPermissionTier(ctx);
  if (tier < TIER_ADMIN) {
    return { 
      reply: "File access requires Admin permissions. Upgrade your role to access code.",
      isDeepThink: true 
    };
  }

  const fileContents = await Promise.all(
    filePaths.map(async (path) => {
      try {
        const content = await _readFileFromApp(path);
        return { path, content, error: null };
      } catch (e) {
        return { path, content: null, error: e.message };
      }
    })
  );

  const prompt = `USER REQUEST:
${transcript}

RELEVANT FILES:
${fileContents.map(f => `--- ${f.path} ---\n${f.content || `[Error: ${f.error}]`}`).join('\n\n')}

Provide analysis, identify issues, and if appropriate, propose specific fixes.`;

  try {
    const response = await _aiChat(prompt, {
      system: SYSTEM_PROMPT,
      maxTokens: MAX_TOKENS,
    });

    return { reply: response, isDeepThink: true, filesAnalyzed: filePaths };
  } catch (err) {
    return { reply: `Analysis failed: ${err.message}`, isDeepThink: true };
  }
}

async function _readFileFromApp(relativePath) {
  const fullPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const response = await fetch(fullPath);
  if (!response.ok) throw new Error(`Cannot read ${relativePath}: ${response.status}`);
  return response.text();
}

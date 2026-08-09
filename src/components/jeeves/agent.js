// src/components/jeeves/agent.js
// ─────────────────────────────────────────────
// JeevesAgent — the agentic loop.
//
// Flow per turn:
//   1. Lecturer speaks → transcript
//   2. Redactor scrubs PII
//   3. Send redacted transcript + full skill catalogue to Gemini
//   4. If the model returns tool calls → run them via the registry,
//      feed results back, loop (bounded iterations)
//   5. Final text answer → rehydrate PII tokens → speak back
// ─────────────────────────────────────────────

import { _aiChatWithTools } from '../../ai.js';
import { getToolDeclarations, invokeSkill } from './registry.js';

const SYSTEM_PROMPT = `You are Jeeves — a warm, quietly witty voice assistant for a lecturer at the University of Johannesburg's "Academic Literacies in the Age of AI" course. Think of yourself as a trusted academic aide: capable, efficient, occasionally dry, never stiff. You address the lecturer as "you" (not "sir" or "madam") and use everyday language — no formal butler clichés.

Voice style (your replies will be SPOKEN, not read):
- Keep replies to 1–2 short sentences unless specifically asked for more.
- Use natural contractions ("I've", "that's", "here you go").
- Skip bullet points, markdown, or long lists — speak them as flowing prose ("The three team leaders are Thandi, Sipho, and Naledi").
- A little warmth goes a long way: "Done." "Got it." "Here you go." "One moment…" are perfect openers.
- If something worked, say so briefly. If it didn't, say what went wrong in one sentence and offer the next step.
- Never read out internal IDs, URLs, or JSON verbatim — translate them into human terms.

Behaviour rules:
- Prefer calling a skill over describing what to do. If a skill matches, call it.
- You may chain several skill calls in one turn to complete a request.
- Student names may appear as tokens like {student_1}. Keep those tokens verbatim in your reply; the system will restore the real name before speaking.
- If a request is ambiguous, ask ONE short clarifying question instead of guessing.
- Never invent data. If you need a fact, query it with a skill first.
- Refuse to do anything outside the lecturer's remit (you inherit their permissions — nothing more).
- For open-ended questions about course data, FIRST call describe_data_model to learn the available paths, THEN use firebase_list_children / firebase_read / firebase_write to navigate. Do not give up just because a dedicated skill does not exist.
- NEVER guess an ID (scopeId, assessmentId, uid, roomId). If you don't know it, list the parent collection first. For example: do NOT read "collaboration-groups/scopes/assessment-assess01" blind — list "collaboration-groups/scopes" and see what scope IDs actually exist.
- For anything about assessment groups or team leaders, use find_assessment_groups — it already handles ID variance. For anything needing a student's uid, use find_user_by_name or list_students.
- Before reporting "zero" or "none" to the lecturer, verify with a second probe (e.g. list the parent) so you are not misled by a wrong path.`;

const MAX_ITERATIONS = 6;

/**
 * Run one conversational turn.
 *
 * @param {{
 *   transcript: string,
 *   ctx: {role:string, uid:string},
 *   redactor: {scrub:(s:string)=>string, rehydrate:(s:string)=>string},
 *   history?: Array,
 *   onEvent?: (ev:{type:string, data?:any}) => void,
 * }} input
 * @returns {Promise<{reply:string, history:Array}>}
 */
export async function runTurn({ transcript, ctx, redactor, history = [], onEvent }) {
  const emit = (ev) => { try { onEvent?.(ev); } catch { /* noop */ } };

  const tools = getToolDeclarations(ctx);
  const scrubbed = redactor.scrub(transcript);

  const messages = [...history, { role: 'user', content: scrubbed }];
  emit({ type: 'user_said', data: transcript });

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const { text, toolCalls } = await _aiChatWithTools(messages, tools, {
      system: SYSTEM_PROMPT,
      maxTokens: 1024,
    });

    if (toolCalls && toolCalls.length) {
      // Record the model's request in the running history…
      messages.push({ role: 'assistant', toolCalls });
      emit({ type: 'tool_calls', data: toolCalls });

      // …run each tool and append the result as a 'tool' message.
      for (const call of toolCalls) {
        let result;
        try {
          result = await invokeSkill(call.name, call.args, ctx);
        } catch (err) {
          result = { error: String(err?.message || err) };
        }
        emit({ type: 'tool_result', data: { name: call.name, result } });
        messages.push({
          role: 'tool',
          name: call.name,
          content: _safeJsonish(result),
        });
      }
      continue; // loop for the model's next step
    }

    // No more tool calls — we have a final answer.
    const rehydrated = text ? redactor.rehydrate(text) : '';
    const reply = rehydrated || "Sorry, I didn't catch anything actionable there.";
    messages.push({ role: 'assistant', content: reply });
    emit({ type: 'final', data: reply });
    return { reply, history: messages };
  }

  const fallback = "I got stuck in a loop — could you rephrase that?";
  emit({ type: 'final', data: fallback });
  return { reply: fallback, history: messages };
}

/** Make any value safe to hand back to Gemini as a function result. */
function _safeJsonish(value) {
  if (value == null) return { ok: true };
  if (typeof value === 'string') return { result: value };
  if (typeof value === 'object') {
    try { JSON.stringify(value); return value; }
    catch { return { result: String(value) }; }
  }
  return { result: String(value) };
}

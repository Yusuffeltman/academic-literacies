# Comprehension Items — Lecturer Review & Sign-off

**Purpose:** The lesson-presentation A/B uses an end-of-unit comprehension check as its **primary outcome**. These items were drafted by mapping each question to a specific sentence in the unit's reading. They are **formative and ungraded**, but they must measure comprehension fairly before the trial runs. This document is for the unit lecturer to **review, edit, or reject** each item.

**Source of truth:** items live in [`src/lesson-experiment.js`](../src/lesson-experiment.js) (`COMPREHENSION_ITEMS`). The marked answer is the 0-based `answer` index; below it is shown as the ✓ option.

**Item-writing standards applied:** one unambiguous best answer; plausible distractors; answerable from the reading (not general knowledge); no negative phrasing; no clueing between items. Each item targets *recall or light inference of the reading*, deliberately distinct from the existing video-reflection quizzes (`q7a/q7b`, `q8a/q8b`).

---

## Unit 7 — "The Professional Fact-Checker's Toolkit" (lateral reading, SIFT)

**1. How fact-checkers evaluate a source**
- A) By reading it very carefully from beginning to end
- ✓ B) By looking at what independent others say about it (lateral reading)
- C) By studying the source's own "About Us" page
- D) By counting how many citations it provides
- *Provenance:* "They evaluate sources by looking at what the world says **about** those sources. This approach, called lateral reading…" · *Construct:* main idea / recall

**2. Why "Stop" is perhaps the most important step**
- A) It is simply the first letter of SIFT
- ✓ B) Misinformation is usually designed to trigger an emotional reaction first
- C) Stopping gives you time to read the whole article
- D) It stops you opening too many browser tabs
- *Provenance:* "Content designed to spread misinformation is almost always designed to trigger emotion first." · *Construct:* cause / inference

**3. Why an "About Us" page cannot establish credibility**
- A) About Us pages are usually too short to be useful
- ✓ B) The source writes its own About Us page, so it cannot independently verify itself
- C) About Us pages are often out of date
- D) Search engines rank them too low to trust
- *Provenance:* "An unreliable website can write an extremely convincing 'About Us' page. It cannot control what independent researchers, journalists, and fact-checkers write about it." · *Construct:* inference

**4. The time cost of lateral reading**
- A) It takes longer than reading the source but is more accurate
- ✓ B) About three minutes — faster and more informative than hours spent reading the source itself
- C) It requires reading the full article first
- D) It is only practical for journalists, not teachers
- *Provenance:* "It takes three minutes and will tell you more than three hours of reading the source itself." · *Construct:* detail / recall

---

## Unit 8 — "Trusting AI with Your Research" (hallucinated citations, create vs retrieve)

**1. Why the New York lawyer faced consequences**
- A) He refused to use AI in his legal work
- ✓ B) He submitted a brief citing court cases that ChatGPT had fabricated
- C) He copied another lawyer's brief word for word
- D) He missed an important filing deadline
- *Provenance:* "Schwartz had asked ChatGPT to help him find cases — and the AI had invented them… When the opposing lawyer and the judge tried to find the cases, they did not exist." · *Construct:* recall (example)

**2. Why a hallucinated citation is particularly dangerous**
- A) It is always poorly formatted and therefore obvious
- ✓ B) It is structurally designed to be indistinguishable from a real citation without verification
- C) It can delete your other references
- D) It only ever appears in legal documents
- *Provenance:* "Hallucinated citations are structurally designed to be indistinguishable from real ones without verification." · *Construct:* inference

**3. The "create vs retrieve" distinction**
- A) ChatGPT retrieves real papers; Elicit creates text
- ✓ B) ChatGPT generates text from patterns; Elicit and Scopus AI retrieve real papers from databases
- C) Both ChatGPT and Elicit retrieve from the same database
- D) Retrieval tools invent citations; generative tools verify them
- *Provenance:* "Chatbots like ChatGPT create text based on patterns… Tools like Elicit, ResearchRabbit, and Scopus AI retrieve real papers from real databases." · *Construct:* concept / recall

**4. The non-negotiable rule for chatbot use**
- A) Never use a chatbot for any academic purpose
- ✓ B) AI generates, you verify — every specific claim and citation, every time
- C) Only trust citations if the journal name sounds real
- D) Use chatbots only for final proofreading
- *Provenance:* "The rule is simple: AI generates, you verify. Every time, no exceptions." · *Construct:* main idea / recall

---

## Sign-off

| | Reviewed | Decision (approve / edit / reject) | Notes |
|---|---|---|---|
| U7 Q1 | ☑ | Approved | |
| U7 Q2 | ☑ | Approved | |
| U7 Q3 | ☑ | Approved | |
| U7 Q4 | ☑ | Approved | |
| U8 Q1 | ☑ | Approved | |
| U8 Q2 | ☑ | Approved | |
| U8 Q3 | ☑ | Approved | |
| U8 Q4 | ☑ | Approved | |

**Reviewer:** Yusuf Feltman   **Date:** 2026-06-27   **Overall:** ☑ Approved to run ☐ Approved with edits ☐ Hold

Edits should be made directly in `COMPREHENSION_ITEMS` in `src/lesson-experiment.js` (keep `answer` pointing at the correct option). Items are matched 1:1 between the two units to keep the measure comparable across arms — if you add/remove an item in one unit, mirror it in the other.

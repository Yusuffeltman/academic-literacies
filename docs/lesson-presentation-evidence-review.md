# Evidence Review: Presenting Lesson Content in LitApp

**Status:** Research / decision input
**Question:** How should LitApp present unit content (readings, explanations, multimedia, activities) to maximise learning — given a first-year, largely English-additional-language (EAL) education cohort working on the web and on Android?
**Why now:** The linear screen-by-screen prototype (parked in `app.js` via `PAGINATED_UNIT_IDS`) felt worse in practice. This review establishes *why*, grounded in instructional-design research, and proposes an evidence-based direction before we rebuild.

---

## TL;DR

The prototype's instinct — reduce on-screen clutter, focus attention — is sound and well-supported. Its **execution was not**: it fragmented *connected expository prose and the reading itself* into many discrete screens. The evidence is fairly clear that this is the one place segmentation backfires.

The resolution the literature points to:

> **Segment the lesson *architecture*, not the connected *text*.**
> Chunk at meaningful activity boundaries (orient → learn → practise → reflect) and pace transient multimedia. But keep each connected reading and each connected explanation as one continuous, well-signalled block — and let learners read long text off-screen (the PDF download we added is evidence-aligned).

Notably, LitApp's existing reading-task already embodies several of the right principles; the prototype regressed against them.

---

## 1. Why the cohort matters

Cognitive Load Theory (Sweller) distinguishes **intrinsic load** (inherent difficulty / element interactivity), **extraneous load** (imposed by presentation), and load available for **schema construction**. For first-year EAL students reading academic English, intrinsic load is already high: decoding academic vocabulary and syntax consumes working memory that a fluent L1 reader would not spend. That raises the stakes on cutting **extraneous** load — but, crucially, it also means we must not *add* new extraneous load through navigation and decision-making. This is the tension the prototype got wrong.

## 2. Theoretical frame

- **Cognitive Theory of Multimedia Learning (CTML)** — Mayer. Learning is active sense-making within a limited-capacity working memory; design should manage essential processing and minimise extraneous processing.
- **Cognitive Load Theory (CLT)** — Sweller, Paas, van Merriënboer. Same limited-capacity premise; the design lever is element interactivity and extraneous load.
- **Situation-model / construction–integration** — Kintsch. Deep comprehension means building a connected mental model of *what the text is about*, integrating across sentences and paragraphs. This integration depends on the connected text remaining available and navigable for re-reading.

These three converge on a single point for our decision: **focus is good; fragmentation of connected meaning is not.**

## 3. The segmenting principle — and its limits

**What it says:** people learn more deeply when a multimedia message is broken into learner-paced segments rather than presented as one continuous unit (Mayer & Chandler, 2001; Mayer & Pilegard, *Cambridge Handbook of Multimedia Learning*).

**How strong:** moderate, and pacing-dependent. In Mayer's syntheses the segmenting effect on transfer is about **d ≈ 0.45 when the learner controls pacing** and **d ≈ 0.35 when the system paces** the segments. A dedicated meta-analysis (Rey et al., 2019) confirms a positive but moderate effect.

**The critical boundary conditions:**
1. The evidence base is overwhelmingly about **transient multimedia** — narrated animations, video, procedural demonstrations — where information *disappears* and pacing lets the learner consolidate before the next bit. **Static expository text does not disappear**; a reader already self-paces by reading, so the core mechanism that makes segmenting help is largely absent for prose.
2. **Expertise reversal applies to segmentation too**: Spanjers and colleagues found the benefit of segmenting worked examples shrinks or reverses as learners gain expertise. Segmenting is a *novice* support — appropriate for our cohort *for complex multimedia*, but to be faded as competence grows.

**Implication:** segmenting is the right tool for the *video* and for *complex worked procedures* — not the lever for splitting a connected reading or a connected explanation into screens.

## 4. Connected text & coherence — where fragmentation hurts

Four converging lines of evidence:

- **Screen inferiority for expository text.** Delgado, Vargas, Ackerman & Salmerón (2018), *Educational Research Review* — meta-analysis of 54 studies, ~170k participants: reading comprehension is reliably **worse on screen than on paper (g ≈ −0.21)**, an effect that **holds for expository/informational texts but not narrative**, and **worsens under time pressure**. Academic-literacy readings are exactly the expository, deep-comprehension case where the penalty is largest.

- **Hypertext / navigation adds load.** DeStefano & LeFevre (2007), *Computers in Human Behavior* 23:1616–1641 — the decision-making and visual-processing demands of navigating fragmented/linked text **increase cognitive load and can impair comprehension**, moderated by working memory and prior knowledge. Splitting one argument across many "screens" with Next/Back is a mild hypertext structure — it imposes exactly this navigation cost.

- **Scrolling vs. paging & small screens.** The digital-reading literature finds readers reach **better *integrated* understanding when text is paged rather than continuously scrolled**, and that **scrolling long expository text on small screens is worse for comprehension** (mediated by individual differences). This matters doubly for the **Android** build.

- **Coherence requires the connected whole.** Building Kintsch's situation model depends on integrating across the text and **re-reading/backtracking**. Chopping a connected explanation into discrete screens removes the spatial-structural cues and easy backtracking that support integration.

**Implication:** keep connected readings and explanations *continuous*; for long readings, actively support off-screen/print reading (the PDF export) and good on-screen typography (measure, line height) rather than fragmentation.

## 5. Expertise reversal — design for novices, but fade it

Kalyuga, Ayres, Chandler & Sweller (2003), *Educational Psychologist* 38(1): instructional support that helps novices can become useless or harmful for more knowledgeable learners, because experienced learners must reconcile redundant external guidance with their own schemas (added load). Our students are novices *now*, so scaffolding (pre-training, segmented multimedia, worked examples, structured activities) is appropriate — **but the design should fade support as competence grows**, not hard-code maximal scaffolding for all.

## 6. What LitApp already does right

Mapping the existing reading-task against the evidence — it is more principled than the prototype that replaced it:

| Principle (evidence) | Already in the reading-task |
|---|---|
| **Pre-training** (Mayer) — teach key terms before the main material | Vocabulary step precedes the reading |
| **Segmenting at *meaningful* boundaries** | Vocab → Read → Questions → Survey → Write → Feedback are task boundaries, not mid-argument cuts |
| **Generative learning / retrieval practice** (Fiorella & Mayer; Roediger & Karpicke) | Comprehension questions + writing task force generation, not re-reading |
| **Coherence for the reading itself** | The reading is presented as one continuous text on its own step |
| **Off-screen deep reading** (Delgado) | PDF download (added) lets students read long text on paper |

The prototype's error was overriding the fourth and fifth of these by fragmenting the connected text.

## 7. Synthesis — evidence-based design principles for LitApp

1. **Segment the architecture, not the prose.** Chunk a unit at *meaningful activity boundaries* (orient, learn, watch, practise, reflect). Within a chunk, keep connected explanation and connected reading continuous.
2. **Preserve coherence of readings.** One continuous, well-typeset reading; generous measure (~60–70 characters) and line height; minimise scrolling friction on mobile; promote the **PDF/print** path for long expository texts.
3. **Reduce extraneous load by *signalling and coherence*, not by chopping.** Clear headings/structure cues (signalling principle) and removing decorative clutter (coherence principle) lower load *without* adding navigation cost.
4. **Reserve step-gating for activities and transient media.** Gate the *reading-task flow* and pace the *video* (both already done); do not gate connected prose.
5. **Pre-train vocabulary** before dense readings (already done) — high value for EAL load.
6. **Design for novices, plan to fade.** Keep scaffolds now; expose a path to reduce them as students progress (links to the adaptive engine's `skill_status`).
7. **Mind the small screen.** On Android especially, favour continuous readable text + PDF over scroll-heavy fragmentation of expository content.

## 8. Diagnosis: why the prototype underperformed

It applied a single segmentation pattern *indiscriminately to all content types*, including connected expository explanations and (within the host-mode flow) the reading workspace. Per §4 this is precisely the case where digital fragmentation underperforms: it added navigation/decision load (DeStefano & LeFevre), removed the spatial coherence and backtracking that support situation-model building (Kintsch; scrolling/paging evidence), and did so for expository text where the screen penalty is largest (Delgado). The *focus* goal was right; the *fragmentation of meaning* was the fault.

## 9. How to validate the next attempt

Effects here are small-to-moderate and **moderated by prior knowledge, working memory, text type, screen size, and time pressure** — so decide empirically, not by intuition (which is what burned the prototype):

- **Compare** the current continuous format vs. an "architecture-segmented, prose-continuous" redesign.
- **Measure** comprehension *and* transfer (not just recall), plus subjective load (Paas 9-point mental-effort scale), completion, and time-on-task.
- **Segment by sub-group** (EAL vs. L1; lower vs. higher prior `skill_status`) to check for expertise-reversal-style interactions.
- Prefer **design-based research / small A-B** on one or two units before any course-wide change.

---

## References

- Delgado, P., Vargas, C., Ackerman, R., & Salmerón, L. (2018). Don't throw away your printed books: A meta-analysis on the effects of reading media on reading comprehension. *Educational Research Review*, 25, 23–38.
- DeStefano, D., & LeFevre, J.-A. (2007). Cognitive load in hypertext reading: A review. *Computers in Human Behavior*, 23(3), 1616–1641.
- Fiorella, L., & Mayer, R. E. (2015). *Learning as a Generative Activity*. Cambridge University Press.
- Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The expertise reversal effect. *Educational Psychologist*, 38(1), 23–31.
- Kintsch, W. (1998). *Comprehension: A Paradigm for Cognition*. Cambridge University Press.
- Mayer, R. E. (2021). *Multimedia Learning* (3rd ed.). Cambridge University Press.
- Mayer, R. E., & Chandler, P. (2001). When learning is just a click away: Does simple user interaction foster deeper understanding of multimedia messages? *Journal of Educational Psychology*, 93(2), 390–397.
- Rey, G. D., et al. (2019). A meta-analysis of the segmenting effect. *Educational Psychology Review*, 31, 389–419.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science*, 17(3), 249–255.
- Spanjers, I. A. E., van Gog, T., & van Merriënboer, J. J. G. (2010). A theoretical analysis of how segmentation of dynamic visualizations optimizes students' learning. *Educational Psychology Review*, 22, 411–423.
- Sweller, J., van Merriënboer, J. J. G., & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. *Educational Psychology Review*, 31, 261–292.

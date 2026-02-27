// content/units/stubs.js — Units 10–20 placeholders

function stub(num, badge, title, phase, description, outcomes) {
  return {
    id: `u${num}`, badge, title, phase,
    html: () => `
      <h1>${badge}: ${title}</h1>
      <p class="lead">${description}</p>
      <div class="unit-outcomes">
        <div class="outcomes-label">This unit will cover:</div>
        <ul>${outcomes.map(o => `<li>${o}</li>`).join('')}</ul>
      </div>
      <div class="coming-soon-panel">
        <div class="coming-soon-icon">🚧</div>
        <h2>This Unit Is Being Built</h2>
        <p>Unit ${num} is in development and will be available shortly. Units 1–9 are fully available now.</p>
      </div>
    `,
  };
}

export const STUB_UNITS = [
  stub(10,'Unit 10','Strategic Scholarly Reading','Phase 3 — Academic Communication','Read like a scholar — strategically, actively, and analytically.',['Apply the three-pass reading method','Use SQ3R for active engagement','Write a 200-word analytical summary']),
  stub(11,'Unit 11','Note-Taking for Thinking','Phase 3 — Academic Communication','Notes that generate thinking, not just record it.',['Compare Cornell, Zettelkasten, and mind-mapping','Create atomic notes in your own words','Synthesise ideas across two sources']),
  stub(12,'Unit 12','Academic Writing: Argument & Structure','Phase 3 — Academic Communication','Build clear, well-supported academic arguments.',['Construct a PEEL paragraph','Distinguish descriptive from analytical writing','Write a full PEEL paragraph in your discipline']),
  stub(13,'Unit 13','Academic Voice, Hedging & Register','Phase 3 — Academic Communication','Develop your formal academic voice.',['Distinguish formal from informal register','Apply hedging language appropriately','Revise informal writing into academic prose']),
  stub(14,'Unit 14','Reading & Creating Visual Arguments','Phase 3 — Academic Communication','Read, evaluate, and create visual academic arguments.',['Extract the argument from a graph or table','Identify misleading visual techniques','Describe a visual argument in academic language']),
  stub(15,'Unit 15','Peer Review & Academic Feedback','Phase 3 — Academic Communication','Give and receive structured academic feedback.',['Apply a peer review rubric','Distinguish critique from criticism','Write a 250-word structured peer review']),
  stub(16,'Unit 16','Prompt Engineering for Academic Work','Phase 4 — AI as a Scholarly Tool','Master the art of the academic AI prompt.',['Apply the CREATE framework','Use chain-of-thought prompting','Write a reflective analysis of your prompting']),
  stub(17,'Unit 17','AI for Literature Mapping & Synthesis','Phase 4 — AI as a Scholarly Tool','Map a research field with AI — critically.',['Use ResearchRabbit to map a field','Identify landmark papers and key debates','Write a 300-word thematic synthesis']),
  stub(18,'Unit 18','Academic Integrity in the Age of AI','Phase 4 — AI as a Scholarly Tool','Navigate AI ethics with honesty and precision.',['Interpret your institution\'s AI policy','Distinguish acceptable use from misconduct','Write a Personal AI Ethics Policy']),
  stub(19,'Unit 19','The Literature Review: Synthesis in Practice','Phase 5 — The Future Scholar','Build a real literature review from scratch.',['Build a synthesis matrix','Write integrated thematic paragraphs','Submit a 400-word literature review section']),
  stub(20,'Unit 20','Your Academic Identity & Lifelong Learning','Phase 5 — The Future Scholar','Reflect, plan, and launch your scholarly life.',['Reflect on your growth as a reader and writer','Build your academic profile','Write your Academic Mission Statement']),
];

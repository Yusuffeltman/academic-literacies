import { useState } from "react";

const theories = [
  {
    id: "dweck",
    name: "Growth Mindset",
    theorist: "Carol Dweck",
    year: "2006",
    core: "Intelligence and ability are malleable through effort and strategy — not fixed traits.",
    application: "Reward the process (effort, strategy, planning) not the product. Praise 'how' students worked, not 'how smart' they are.",
    color: "#2D6A4F",
    accent: "#52B788",
  },
  {
    id: "deci",
    name: "Self-Determination Theory",
    theorist: "Deci & Ryan",
    year: "1985",
    core: "Intrinsic motivation flourishes when Autonomy, Competence, and Relatedness are met.",
    application: "Design rewards that build perceived competence at each tier level. Avoid token economies that undermine intrinsic drive (overjustification effect).",
    color: "#1D3557",
    accent: "#457B9D",
  },
  {
    id: "ames",
    name: "Goal Orientation Theory",
    theorist: "Carol Ames",
    year: "1992",
    core: "Mastery goals (improve vs. self) outperform performance goals (beat others) in sustained motivation and resilience.",
    application: "Structure all rewards around mastery/task goals. Never reward relative rank between tiers — only personal growth trajectories.",
    color: "#7B2D8B",
    accent: "#C77DFF",
  },
  {
    id: "vygotsky",
    name: "Zone of Proximal Development",
    theorist: "Lev Vygotsky",
    year: "1978",
    core: "Optimal challenge sits just beyond current ability — the stretch zone is where real learning happens.",
    application: "Each tier defines its own 'excellent'. A Tier 1 student working at their ZPD edge deserves equal recognition to a Tier 3 student doing the same.",
    color: "#7D4E2D",
    accent: "#D4895A",
  },
  {
    id: "tomlinson",
    name: "Differentiated Instruction",
    theorist: "Carol Ann Tomlinson",
    year: "1999",
    core: "Equity means providing what each student NEEDS — not the same thing for everyone.",
    application: "The reward system must be content-differentiated too. Tier-specific rubrics define 'excellence' locally, not comparatively.",
    color: "#1A535C",
    accent: "#4ECDC4",
  },
  {
    id: "martin",
    name: "Personal Best Framework",
    theorist: "Andrew Martin",
    year: "2006",
    core: "A 'Personal Best' goal orientation combines mastery with performance in a self-referenced way.",
    application: "Formally track and celebrate personal bests (PBs) — students compete against their own previous performance, not each other.",
    color: "#6B4226",
    accent: "#D4A04A",
  },
];

const rewardDimensions = [
  {
    id: "planning",
    icon: "🗺️",
    title: "Strategic Planning",
    subtitle: "How did they approach the task?",
    description: "Rewarding goal-setting, breaking tasks into steps, time management, and anticipating challenges — regardless of tier.",
    indicators: [
      "Set a written learning goal before starting",
      "Created a step-by-step work plan",
      "Identified potential challenges in advance",
      "Adjusted their plan when obstacles arose",
      "Used planning tools (checklists, timelines, mind maps)",
    ],
    tier1: "Plans 2–3 steps for a concrete task",
    tier2: "Plans multi-day work with checkpoints",
    tier3: "Plans extended projects with contingencies",
    theory: "Metacognition (Flavell, 1979) • Self-regulation (Zimmerman, 2002)",
    color: "#2D6A4F",
    accent: "#52B788",
    bg: "#F0FAF4",
  },
  {
    id: "progress",
    icon: "📈",
    title: "Personal Growth",
    subtitle: "How far have they come?",
    description: "Rewarding measurable improvement relative to the student's own baseline — not compared to peers or tiers.",
    indicators: [
      "Exceeded their own previous best",
      "Closed a skill gap they identified",
      "Demonstrated learning from a mistake",
      "Showed deeper understanding than last attempt",
      "Took on a task they previously avoided",
    ],
    tier1: "Improved accuracy on foundational skill",
    tier2: "Extended application of a previously partial skill",
    tier3: "Demonstrated original synthesis beyond prior level",
    theory: "Personal Best Goals (Martin, 2006) • Self-referenced Achievement",
    color: "#1D3557",
    accent: "#457B9D",
    bg: "#F0F4FA",
  },
  {
    id: "persistence",
    icon: "💪",
    title: "Persistence & Resilience",
    subtitle: "How did they handle difficulty?",
    description: "Rewarding students who stayed with a hard task, sought help productively, and recovered from setbacks.",
    indicators: [
      "Stayed on task through difficulty without giving up",
      "Sought help in a productive, specific way",
      "Tried at least two different strategies when stuck",
      "Returned to an unfinished challenge voluntarily",
      "Reflected on what went wrong and why",
    ],
    tier1: "Worked through frustration on a challenging step",
    tier2: "Persisted through multi-step problem-solving",
    tier3: "Self-directed recovery from a complex error",
    theory: "Growth Mindset (Dweck, 2006) • Grit (Duckworth, 2016)",
    color: "#7B2D8B",
    accent: "#C77DFF",
    bg: "#F8F0FA",
  },
  {
    id: "metacognition",
    icon: "🔍",
    title: "Metacognitive Awareness",
    subtitle: "Do they know what they know?",
    description: "Rewarding students who can accurately assess their own learning, identify gaps, and direct their next steps.",
    indicators: [
      "Accurately self-assessed their work against criteria",
      "Identified specifically what they still don't understand",
      "Set a meaningful next-step goal after feedback",
      "Reflected thoughtfully in a learning journal",
      "Recognized when a strategy was not working",
    ],
    tier1: "Can say what they understand and what they don't",
    tier2: "Uses a rubric to assess their own work accurately",
    tier3: "Identifies gaps and independently plans how to close them",
    theory: "Assessment AS Learning (Earl, 2003) • Metacognition (Hattie, 2009)",
    color: "#1A535C",
    accent: "#4ECDC4",
    bg: "#F0FAFA",
  },
  {
    id: "quality",
    icon: "⭐",
    title: "Quality of Work",
    subtitle: "Did they do their best work?",
    description: "Rewarding effort toward excellence within each tier's rubric — not comparing tiers. Tier 1 'excellent' is as celebrated as Tier 3 'excellent'.",
    indicators: [
      "Work reflects genuine effort and care",
      "Meets or exceeds tier-specific success criteria",
      "Evidence of revision and improvement",
      "Work is complete and presented thoughtfully",
      "Went beyond minimum requirements for their tier",
    ],
    tier1: "Work is complete, accurate, and shows care",
    tier2: "Work shows depth and independent application",
    tier3: "Work shows originality and critical integration",
    theory: "Differentiated Instruction (Tomlinson, 1999) • Mastery Learning (Bloom)",
    color: "#7D4E2D",
    accent: "#D4895A",
    bg: "#FAF4F0",
  },
  {
    id: "contribution",
    icon: "🤝",
    title: "Community Contribution",
    subtitle: "How did they support others?",
    description: "Rewarding students who contribute to classroom learning culture — asking good questions, helping peers within their tier, sharing strategies.",
    indicators: [
      "Asked a question that helped the whole group",
      "Explained their thinking to a peer",
      "Shared a useful strategy or resource",
      "Encouraged a struggling classmate",
      "Contributed a useful idea to group discussion",
    ],
    tier1: "Shared how they solved a step with a peer",
    tier2: "Guided a peer through their own thinking process",
    tier3: "Contributed an insight that elevated whole-group discussion",
    theory: "Relatedness (Deci & Ryan, 1985) • Cooperative Learning (Johnson & Johnson)",
    color: "#2D3561",
    accent: "#4361EE",
    bg: "#F0F1FA",
  },
];

const antiPatterns = [
  {
    avoid: "Public leaderboards ranking students",
    because: "Entrenches performance goals; demoralises Tier 1; rewards prior advantage",
    instead: "Private progress portfolios showing each student's own growth journey",
  },
  {
    avoid: "Rewarding only correct answers",
    because: "Punishes risk-taking; silences Tier 1 students; reinforces fixed mindset",
    instead: "Reward quality of reasoning and strategy, independent of the final answer",
  },
  {
    avoid: "Token economies with tangible prizes",
    because: "Undermines intrinsic motivation (overjustification effect, Deci 1971)",
    instead: "Recognition, autonomy rewards (choose your task), and meaningful feedback",
  },
  {
    avoid: "Celebrating Tier 3 achievements publicly as the 'standard'",
    because: "Signals to Tier 1 & 2 that their work is inherently inferior",
    instead: "Celebrate tier-specific exemplars equally and separately",
  },
  {
    avoid: "One-size reward rubric across all tiers",
    because: "Structurally advantages students who enter with more prior knowledge",
    instead: "Parallel rubrics with equivalent prestige at each tier level",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("framework");
  const [expandedDimension, setExpandedDimension] = useState(null);
  const [expandedTheory, setExpandedTheory] = useState(null);

  return (
    <div style={{
      fontFamily: "'Georgia', 'Times New Roman', serif",
      background: "#FAFAF7",
      minHeight: "100vh",
      color: "#1A1A1A",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)",
        padding: "48px 32px 40px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(69, 123, 157, 0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(82, 183, 136, 0.1) 0%, transparent 50%)",
        }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(82, 183, 136, 0.2)",
            border: "1px solid rgba(82, 183, 136, 0.4)",
            borderRadius: 4,
            padding: "4px 12px",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#52B788",
            marginBottom: 16,
          }}>Evidence-Based Framework</div>
          <h1 style={{
            fontSize: "clamp(26px, 4vw, 42px)",
            fontWeight: 400,
            color: "#FFFFFF",
            margin: "0 0 12px",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}>
            Equitable Rewards in<br />
            <span style={{ color: "#52B788", fontStyle: "italic" }}>Differentiated Instruction</span>
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 15,
            margin: 0,
            maxWidth: 560,
            lineHeight: 1.6,
          }}>
            A theory-grounded framework that rewards planning, growth, persistence, and metacognition — not tier level. Designed so every student can earn recognition on equal terms.
          </p>
        </div>
      </div>

      {/* Nav */}
      <div style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #E8E8E0",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 0 }}>
          {[
            { id: "framework", label: "Reward Dimensions" },
            { id: "theory", label: "Theoretical Foundations" },
            { id: "avoid", label: "What to Avoid" },
            { id: "implement", label: "Implementation Guide" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "14px 20px",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #2D6A4F" : "2px solid transparent",
                background: "transparent",
                color: activeTab === tab.id ? "#2D6A4F" : "#666",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                fontWeight: activeTab === tab.id ? 600 : 400,
                letterSpacing: "0.01em",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* === REWARD DIMENSIONS === */}
        {activeTab === "framework" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 400, margin: "0 0 8px", color: "#111" }}>
                Six Reward Dimensions
              </h2>
              <p style={{ color: "#555", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                Each dimension operates <strong>independently of tier</strong>. A Tier 1 student who plans strategically, persists through difficulty, and reflects honestly earns the same recognition as a Tier 3 student doing the same. Click any dimension to see tier-specific indicators.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {rewardDimensions.map(dim => (
                <div
                  key={dim.id}
                  onClick={() => setExpandedDimension(expandedDimension === dim.id ? null : dim.id)}
                  style={{
                    background: expandedDimension === dim.id ? dim.bg : "#FFFFFF",
                    border: `1px solid ${expandedDimension === dim.id ? dim.accent : "#E8E8E0"}`,
                    borderRadius: 10,
                    padding: 20,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    gridColumn: expandedDimension === dim.id ? "1 / -1" : "auto",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 28 }}>{dim.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: dim.color }}>{dim.title}</h3>
                        <span style={{ fontSize: 11, color: "#999", transition: "transform 0.2s", display: "inline-block", transform: expandedDimension === dim.id ? "rotate(180deg)" : "none" }}>▼</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2, fontStyle: "italic" }}>{dim.subtitle}</div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.55 }}>{dim.description}</p>

                  {expandedDimension === dim.id && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                        {/* Observable indicators */}
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{
                            fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                            color: dim.color, fontWeight: 700, marginBottom: 10
                          }}>Observable Indicators (all tiers)</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {dim.indicators.map((ind, i) => (
                              <div key={i} style={{
                                background: dim.bg,
                                border: `1px solid ${dim.accent}40`,
                                borderRadius: 6,
                                padding: "6px 10px",
                                fontSize: 12,
                                color: "#333",
                                display: "flex", alignItems: "center", gap: 6
                              }}>
                                <span style={{ color: dim.accent, fontSize: 10 }}>●</span>
                                {ind}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tier expectations */}
                        {[
                          { label: "Tier 1 — Foundation", desc: dim.tier1 },
                          { label: "Tier 2 — Application", desc: dim.tier2 },
                          { label: "Tier 3 — Extension", desc: dim.tier3 },
                        ].map((t, i) => (
                          <div key={i} style={{
                            background: "#FFFFFF",
                            border: `1px solid ${dim.accent}50`,
                            borderRadius: 8,
                            padding: 14,
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: dim.color, letterSpacing: "0.08em", marginBottom: 6 }}>{t.label}</div>
                            <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{t.desc}</div>
                          </div>
                        ))}
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{
                            background: `${dim.color}15`,
                            border: `1px dashed ${dim.accent}`,
                            borderRadius: 6,
                            padding: "8px 12px",
                            fontSize: 11,
                            color: dim.color,
                            fontStyle: "italic"
                          }}>
                            📚 Grounded in: {dim.theory}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* The equity principle */}
            <div style={{
              marginTop: 32,
              background: "linear-gradient(135deg, #1A1A2E, #16213E)",
              borderRadius: 12,
              padding: 28,
              color: "white",
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "#52B788", textTransform: "uppercase", marginBottom: 12 }}>Core Equity Principle</div>
              <p style={{ fontSize: 16, margin: "0 0 16px", lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
                <em>"A student in Tier 1 who sets a clear goal, executes a plan, persists through difficulty, and reflects honestly on their work has demonstrated the same cognitive and motivational virtues as a Tier 3 student doing exactly the same — and deserves equal recognition."</em>
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                The only structural difference is the complexity level of the task — not the quality of the effort, planning, or growth. Reward systems must honour this distinction explicitly.
              </p>
            </div>
          </div>
        )}

        {/* === THEORETICAL FOUNDATIONS === */}
        {activeTab === "theory" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 400, margin: "0 0 8px" }}>Theoretical Foundations</h2>
              <p style={{ color: "#555", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                Each theory below provides a specific evidential basis for one or more design decisions in the framework. Click to expand.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {theories.map(t => (
                <div
                  key={t.id}
                  style={{
                    background: expandedTheory === t.id ? "#FFFFFF" : "#FFFFFF",
                    border: `1px solid ${expandedTheory === t.id ? t.accent : "#E8E8E0"}`,
                    borderLeft: `4px solid ${t.accent}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    onClick={() => setExpandedTheory(expandedTheory === t.id ? null : t.id)}
                    style={{
                      padding: "16px 20px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: t.color, fontSize: 15 }}>{t.name}</span>
                      <span style={{ color: "#888", fontSize: 13, marginLeft: 10 }}>{t.theorist}, {t.year}</span>
                    </div>
                    <span style={{ color: "#999", fontSize: 11, transform: expandedTheory === t.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                  </div>
                  {expandedTheory === t.id && (
                    <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${t.accent}30` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.color, marginBottom: 8 }}>Core Claim</div>
                          <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.6 }}>{t.core}</p>
                        </div>
                        <div style={{ background: `${t.color}08`, borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.color, marginBottom: 8 }}>Design Application</div>
                          <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.6 }}>{t.application}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, background: "#FFFFFF", border: "1px solid #E8E8E0", borderRadius: 10, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#444", marginBottom: 16 }}>Key References</div>
              {[
                "Ames, C. (1992). Classrooms: Goals, structures, and student motivation. Journal of Educational Psychology, 84(3), 261–271.",
                "Deci, E. L., & Ryan, R. M. (1985). Intrinsic motivation and self-determination in human behavior. Springer.",
                "Dweck, C. S. (2006). Mindset: The new psychology of success. Random House.",
                "Earl, L. M. (2003). Assessment as learning: Using classroom assessment to maximize student learning. Corwin Press.",
                "Hattie, J. (2009). Visible learning: A synthesis of over 800 meta-analyses relating to achievement. Routledge.",
                "Martin, A. J. (2006). Personal bests (PBs): A proposed multidimensional model and empirical analysis. British Journal of Educational Psychology, 76(4), 803–825.",
                "Tomlinson, C. A. (1999). The differentiated classroom: Responding to the needs of all learners. ASCD.",
                "Vygotsky, L. S. (1978). Mind in society: The development of higher psychological processes. Harvard University Press.",
                "Zimmerman, B. J. (2002). Becoming a self-regulated learner: An overview. Theory Into Practice, 41(2), 64–70.",
              ].map((ref, i) => (
                <div key={i} style={{
                  padding: "8px 0",
                  borderBottom: i < 8 ? "1px solid #F0F0E8" : "none",
                  fontSize: 12,
                  color: "#444",
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}>
                  {ref}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === WHAT TO AVOID === */}
        {activeTab === "avoid" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 400, margin: "0 0 8px" }}>Common Pitfalls to Avoid</h2>
              <p style={{ color: "#555", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                These are well-documented practices that — despite good intentions — systematically disadvantage lower-tier students or undermine intrinsic motivation.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {antiPatterns.map((ap, i) => (
                <div key={i} style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E8E0",
                  borderRadius: 10,
                  overflow: "hidden",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    <div style={{ padding: 20, borderRight: "1px solid #F0F0E8" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#C0392B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                        ✗ Avoid
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 10 }}>{ap.avoid}</div>
                      <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, fontStyle: "italic" }}>Because: {ap.because}</div>
                    </div>
                    <div style={{ padding: 20, background: "#F5FBF7" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#2D6A4F", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                        ✓ Instead
                      </div>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.55 }}>{ap.instead}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 28,
              background: "#FFF8E1",
              border: "1px solid #F9A825",
              borderRadius: 10,
              padding: 22,
            }}>
              <div style={{ fontWeight: 700, color: "#E65100", fontSize: 14, marginBottom: 10 }}>⚠️ The Overjustification Effect (Deci, 1971)</div>
              <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.6 }}>
                Research consistently shows that introducing <strong>external tangible rewards</strong> (stickers, prizes, points toward prizes) for tasks students already find intrinsically interesting <em>reduces</em> their intrinsic motivation once rewards are withdrawn. Design your system to use <strong>informational feedback</strong>, <strong>autonomy rewards</strong> (choice of task, method, or timing), and <strong>social recognition</strong> — not transactional tokens.
              </p>
            </div>
          </div>
        )}

        {/* === IMPLEMENTATION GUIDE === */}
        {activeTab === "implement" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 400, margin: "0 0 8px" }}>Implementation Guide</h2>
              <p style={{ color: "#555", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                Practical steps for rolling out the framework in a real classroom, with structures for teachers and students.
              </p>
            </div>

            {/* Phases */}
            {[
              {
                phase: "Phase 1",
                title: "Establish Tier-Parallel Rubrics",
                timeframe: "Before unit begins",
                color: "#2D6A4F",
                steps: [
                  "Write three parallel success criteria documents — one per tier — using identical quality language ('clear goal', 'detailed plan', 'genuine effort', 'thoughtful reflection').",
                  "Ensure each tier's rubric has equal prestige. Tier 1 'excellence' should look and feel as honoured as Tier 3 'excellence'.",
                  "Share rubrics with students in advance. Discuss what 'excellent planning' looks like at their specific tier.",
                  "Display all three rubrics side by side to signal structural equity to the class.",
                ],
              },
              {
                phase: "Phase 2",
                title: "Pre-Task Goal Setting",
                timeframe: "Start of each task",
                color: "#1D3557",
                steps: [
                  "Every student completes a brief planning card: What is my goal? What steps will I take? What might be hard? How will I know I've succeeded?",
                  "Planning cards are a rewarded artefact — completing a thoughtful plan earns recognition regardless of tier.",
                  "Teacher reviews plans briefly (formative check) and provides one specific piece of feedback before work begins.",
                  "Students keep planning cards — they become the basis for end-of-task reflection.",
                ],
              },
              {
                phase: "Phase 3",
                title: "Ongoing Observation & Documentation",
                timeframe: "During task",
                color: "#7B2D8B",
                steps: [
                  "Use a simple observation grid tracking each student against the 6 reward dimensions — not just task completion.",
                  "Capture specific moments: 'Thabo tried two strategies before asking for help' — this is reward-worthy behaviour.",
                  "Brief check-ins (30 seconds per student) ask: 'How is your plan going? Did you need to change anything?'",
                  "Document persistence and strategy use explicitly — these will be referenced in recognition moments.",
                ],
              },
              {
                phase: "Phase 4",
                title: "Recognition Protocols",
                timeframe: "After task / weekly",
                color: "#1A535C",
                steps: [
                  "Weekly 'Dimension Spotlight': Recognise 1–2 students per dimension (not per tier). Explicitly name what they did and why it matters.",
                  "Private Personal Best conferences: 1:1 or small-group conversations celebrating each student's personal growth since baseline.",
                  "Whole-class share of planning strategies: Students share their planning process (not their answers), so Tier 1 strategies are as valued as Tier 3.",
                  "Written recognition notes: Brief, specific, private notes referencing observable behaviour — not generic praise.",
                ],
              },
              {
                phase: "Phase 5",
                title: "Reflection & Portfolio",
                timeframe: "End of task / term",
                color: "#7D4E2D",
                steps: [
                  "Each student completes a structured reflection comparing their final work to their initial plan.",
                  "Growth portfolios collect planning cards, mid-task reflections, and teacher observation notes.",
                  "Students identify their own 'Personal Best' across the 6 dimensions — not compared to others.",
                  "Portfolio reviews replace rank-based reporting. Focus: growth over time, quality of self-regulation, evidence of planning.",
                ],
              },
            ].map((phase, i) => (
              <div key={i} style={{
                background: "#FFFFFF",
                border: "1px solid #E8E8E0",
                borderLeft: `4px solid ${phase.color}`,
                borderRadius: 8,
                padding: 22,
                marginBottom: 14,
              }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{
                    background: phase.color,
                    color: "white",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap",
                  }}>{phase.phase}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{phase.title}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2, fontStyle: "italic" }}>{phase.timeframe}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {phase.steps.map((step, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{
                        width: 20, height: 20, minWidth: 20,
                        background: `${phase.color}15`,
                        border: `1px solid ${phase.color}40`,
                        borderRadius: 4,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: phase.color,
                      }}>{j + 1}</div>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.55, flex: 1 }}>{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Summary principle box */}
            <div style={{
              background: "linear-gradient(135deg, #1A1A2E, #16213E)",
              borderRadius: 12,
              padding: 28,
              color: "white",
              marginTop: 8,
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "#52B788", textTransform: "uppercase", marginBottom: 16 }}>The Guiding Principle</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {[
                  { label: "Reward the PROCESS", desc: "Planning, strategy, persistence — not just outcomes or tier level" },
                  { label: "Reward GROWTH", desc: "Personal improvement over baseline — not comparison to others" },
                  { label: "Reward REFLECTION", desc: "Metacognitive awareness and honest self-assessment at every level" },
                ].map((p, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, color: "#52B788", fontSize: 13, marginBottom: 8 }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

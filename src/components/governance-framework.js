const REWARD_DIMENSIONS = [
  {
    id: 'planning',
    icon: '🗺️',
    title: 'Strategic Planning',
    subtitle: 'Reward how students approach the task.',
    description: 'Recognise goal-setting, planning, time management, and thoughtful adjustment when challenges appear.',
    tierFocus: 'Tier focus: from planning a few concrete steps to managing extended projects with checkpoints and contingencies.',
    color: '#2D6A4F',
    accent: '#52B788',
    bg: '#F0FAF4',
  },
  {
    id: 'progress',
    icon: '📈',
    title: 'Personal Growth',
    subtitle: 'Measure progress against the student’s own baseline.',
    description: 'Celebrate improvement, recovered mistakes, and new risks taken rather than comparing students against each other.',
    tierFocus: 'Tier focus: improvement is valid at every level, from foundational accuracy to advanced synthesis.',
    color: '#1D3557',
    accent: '#457B9D',
    bg: '#F0F4FA',
  },
  {
    id: 'persistence',
    icon: '💪',
    title: 'Persistence and Resilience',
    subtitle: 'Reward productive struggle.',
    description: 'Notice when a student stays with difficulty, seeks help well, and returns after setbacks.',
    tierFocus: 'Tier focus: perseverance counts whether the challenge is a first-step hurdle or a complex higher-order task.',
    color: '#7B2D8B',
    accent: '#C77DFF',
    bg: '#F8F0FA',
  },
  {
    id: 'metacognition',
    icon: '🔍',
    title: 'Metacognitive Awareness',
    subtitle: 'Reward accurate self-awareness.',
    description: 'Value students who can identify what they understand, where the gaps are, and what they should do next.',
    tierFocus: 'Tier focus: self-assessment grows from naming confusion to independently planning how to close gaps.',
    color: '#1A535C',
    accent: '#4ECDC4',
    bg: '#F0FAFA',
  },
  {
    id: 'quality',
    icon: '⭐',
    title: 'Quality of Work',
    subtitle: 'Reward excellence within each tier.',
    description: 'Judge quality against the success criteria for that tier rather than treating one tier as the standard for all.',
    tierFocus: 'Tier focus: Tier 1 excellence is celebrated with the same seriousness as Tier 3 excellence.',
    color: '#7D4E2D',
    accent: '#D4895A',
    bg: '#FAF4F0',
  },
  {
    id: 'contribution',
    icon: '🤝',
    title: 'Community Contribution',
    subtitle: 'Reward how students strengthen the learning community.',
    description: 'Acknowledge useful questions, peer support, shared strategies, and constructive participation.',
    tierFocus: 'Tier focus: contribution can be visible in pair support, group explanation, or whole-class insight.',
    color: '#2D3561',
    accent: '#4361EE',
    bg: '#F0F1FA',
  },
];

const EQUITY_PRINCIPLES = [
  'Reward mastery, growth, and effortful strategy rather than rank.',
  'Treat each tier as locally excellent rather than comparing tiers against each other.',
  'Make improvement visible through personal bests, not leaderboards.',
  'Use recognition to build autonomy, competence, and belonging.',
];

const ANTI_PATTERNS = [
  {
    avoid: 'Public leaderboards that rank students',
    instead: 'Use private growth portfolios and personal-best tracking.',
  },
  {
    avoid: 'Rewarding only correct answers',
    instead: 'Reward reasoning, strategy, revision, and perseverance too.',
  },
  {
    avoid: 'One-size-fits-all reward rubrics',
    instead: 'Use parallel tier-sensitive criteria with equal prestige.',
  },
  {
    avoid: 'Publicly treating Tier 3 work as the only benchmark',
    instead: 'Show tier-specific exemplars and celebrate each appropriately.',
  },
];

export function renderGovernanceFramework() {
  const area = document.getElementById('content-area');
  if (!area) return;

  area.innerHTML = `
    <div style="padding:28px 24px 40px 24px;background:
      radial-gradient(circle at top right, rgba(82,183,136,.12), transparent 24%),
      radial-gradient(circle at bottom left, rgba(69,123,157,.12), transparent 26%),
      linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);min-height:100%;">
      <div style="max-width:1180px;margin:0 auto;display:grid;gap:18px;">
        <section style="background:linear-gradient(135deg,#10213a 0%,#15385b 54%,#1f5f7a 100%);color:white;border-radius:28px;padding:30px 30px 26px 30px;box-shadow:0 22px 44px rgba(15,23,42,.16);position:relative;overflow:hidden;">
          <div style="position:absolute;right:-36px;bottom:-36px;width:180px;height:180px;border-radius:999px;background:radial-gradient(circle,rgba(255,183,3,.2),rgba(255,183,3,0));"></div>
          <div style="position:relative;z-index:1;display:grid;gap:14px;">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8ecae6;font-family:var(--font-mono);">Governance Guide</div>
            <div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap;">
              <div style="max-width:760px;">
                <h1 style="margin:0 0 10px 0;font-size:34px;line-height:1.1;color:white;">Differentiated Rewards Framework</h1>
                <p style="margin:0;color:rgba(255,255,255,.84);font-size:15px;line-height:1.8;">This framework explains how recognition should work in the course: fair, growth-oriented, and sensitive to different starting points. Students are not rewarded for being ahead of others. They are recognised for planning, progress, persistence, reflection, quality, and contribution.</p>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn-prev" style="display:inline-flex;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.16);color:white;" onclick="window.renderStudentDashboard()">Back to dashboard</button>
                <button class="btn-primary" onclick="window.goToCourse()">Continue course</button>
              </div>
            </div>
          </div>
        </section>

        <section style="display:grid;grid-template-columns:1.15fr .85fr;gap:18px;">
          <div style="background:white;border:1px solid var(--border);border-radius:22px;padding:22px;box-shadow:0 16px 32px rgba(15,23,42,.06);">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-family:var(--font-mono);margin-bottom:10px;">Why it matters</div>
            <h2 style="margin:0 0 10px 0;color:var(--navy);font-size:26px;">Fair recognition should not punish different starting points.</h2>
            <p style="margin:0;color:var(--muted);font-size:14px;line-height:1.8;">The course uses differentiated rewards so that students are recognised for meaningful growth within their own learning context. That keeps academic support challenging, motivating, and equitable.</p>
          </div>
          <div style="background:#fffaf0;border:1px solid rgba(255,183,3,.28);border-radius:22px;padding:22px;box-shadow:0 16px 32px rgba(15,23,42,.05);">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#92400e;font-family:var(--font-mono);margin-bottom:10px;">Core principles</div>
            <div style="display:grid;gap:10px;">
              ${EQUITY_PRINCIPLES.map((item) => `
                <div style="padding:12px 14px;border-radius:14px;background:white;border:1px solid rgba(255,183,3,.18);color:#7c2d12;font-size:13px;line-height:1.7;">${_escapeHtml(item)}</div>
              `).join('')}
            </div>
          </div>
        </section>

        <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;">
          ${REWARD_DIMENSIONS.map((dimension) => `
            <article style="background:${dimension.bg};border:1px solid ${dimension.accent}33;border-radius:20px;padding:18px;box-shadow:0 10px 24px rgba(15,23,42,.05);">
              <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
                <div style="width:44px;height:44px;border-radius:14px;background:${dimension.accent};color:white;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${dimension.icon}</div>
                <div>
                  <div style="font-size:12px;color:${dimension.color};text-transform:uppercase;letter-spacing:.08em;font-family:var(--font-mono);margin-bottom:4px;">Reward dimension</div>
                  <h3 style="margin:0;color:${dimension.color};font-size:20px;line-height:1.2;">${_escapeHtml(dimension.title)}</h3>
                </div>
              </div>
              <p style="margin:0 0 8px 0;color:#10213a;font-size:14px;line-height:1.7;font-weight:700;">${_escapeHtml(dimension.subtitle)}</p>
              <p style="margin:0 0 10px 0;color:#475569;font-size:13px;line-height:1.75;">${_escapeHtml(dimension.description)}</p>
              <div style="padding:12px 14px;border-radius:14px;background:white;border:1px solid rgba(16,33,58,.08);font-size:12px;color:#334155;line-height:1.7;">
                ${_escapeHtml(dimension.tierFocus)}
              </div>
            </article>
          `).join('')}
        </section>

        <section style="background:white;border:1px solid var(--border);border-radius:22px;padding:22px;box-shadow:0 16px 32px rgba(15,23,42,.06);">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-family:var(--font-mono);margin-bottom:10px;">What to avoid</div>
          <h2 style="margin:0 0 14px 0;color:var(--navy);font-size:24px;">Common anti-patterns</h2>
          <div style="display:grid;gap:12px;">
            ${ANTI_PATTERNS.map((item) => `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;border:1px solid var(--border);border-radius:16px;background:#f8fafc;">
                <div>
                  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b91c1c;font-family:var(--font-mono);margin-bottom:6px;">Avoid</div>
                  <div style="font-size:14px;color:#10213a;line-height:1.7;">${_escapeHtml(item.avoid)}</div>
                </div>
                <div>
                  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#166534;font-family:var(--font-mono);margin-bottom:6px;">Do instead</div>
                  <div style="font-size:14px;color:#10213a;line-height:1.7;">${_escapeHtml(item.instead)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    </div>
  `;
}

function _escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

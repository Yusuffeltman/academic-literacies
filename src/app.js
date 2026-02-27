// src/app.js
import { STATE, saveState }           from './state.js';
import { signOut }                    from './auth.js';
import { UNITS }                      from '../content/units/index.js';
import { VIDEOS, VIDEO_CONFIG }       from '../content/videos.js';
import { InteractiveVideoPlayer }     from './components/video-player.js';
import { initAllReadingTasks }        from './components/reading-task.js';
import { initAllVisualTasks }         from './components/visual-task.js';
import { initAllAssessmentTasks }     from './components/assessment-task.js';
import { initAITutor, updateAITutorContext } from './components/ai-tutor.js';
import { initAITools, updateAIToolsContext } from './components/ai-tools.js';
import { renderLecturerDashboard }    from './dashboards/lecturer.js';
import { renderTutorDashboard }       from './dashboards/tutor.js';
import { renderStudentDashboard }     from './dashboards/student.js';
import { renderMicroModule }          from './components/micro-module.js';
import { ER_TIERS }                   from '../content/readings.js';
import { _aiChat }                     from './ai.js';

// AI utility exposed globally for legacy inline handlers
window._aiChat = _aiChat;

// Expose STATE + saveState globally for reading-task progress tracking
window.STATE     = STATE;
window.saveState = saveState;

export function initApp(user) {
  STATE.user = user;
  const role = user.displayName?.match(/\[(.*?)\]/)?.[1] ?? 'student';

  if (!STATE.deviceInfo) {
    const ua = navigator.userAgent;
    let type = 'Desktop';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) type = 'Mobile';
    else if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) type = 'Tablet';
    STATE.deviceInfo = { type, userAgent: ua, screenWidth: window.innerWidth };
    saveState();
  }

  if (role === 'lecturer') {
    renderDashboardShell(user, role);
    const container = document.getElementById('dash-mount');
    renderLecturerDashboard(container);
    return;
  }

  if (role === 'tutor') {
    renderDashboardShell(user, role);
    const container = document.getElementById('dash-mount');
    renderTutorDashboard(container);
    return;
  }

  // Default: student view
  renderStudentDashboard();
  window.renderStudentDashboard = renderStudentDashboard;
  window.goToMicroModule = renderMicroModule;
  window.goToCourse = () => {
    renderShell();
    initAITutor();
    initAITools();
    navigateTo(0);
  };
}

export function switchToStudentView() {
  window._viewAsStudent = true;
  renderStudentDashboard();
  window.renderStudentDashboard = renderStudentDashboard;
  window.goToMicroModule = renderMicroModule;
  window.goToCourse = () => {
    renderShell();
    initAITutor();
    initAITools();
    navigateTo(0);
  };
}
window.switchToStudentView = switchToStudentView;

// ── Dashboard shell (lecturer + tutor) ────────
function renderDashboardShell(user, role) {
  const name  = user.displayName?.split(' [')[0] ?? user.email;
  const label = role === 'lecturer' ? '🏫 Lecturer Dashboard' : '👥 Tutor Dashboard';

  document.getElementById('app').innerHTML = `
    <div class="dash-app-shell">
      <div class="dash-topbar">
        <div class="dash-topbar-left">
          <div class="dash-topbar-logo">ACADLIT · AI</div>
          <div class="dash-topbar-title">${label}</div>
        </div>
        <div class="dash-topbar-right">
          <button class="dash-student-btn" onclick="switchToStudentView()" style="margin-right: 16px; background: var(--accent); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer;">👩‍🎓 Student View</button>
          <div class="dash-user-pill">
            <div class="dash-user-avatar">${name[0].toUpperCase()}</div>
            <div class="dash-user-name">${name}</div>
          </div>
          <button class="dash-signout-btn" onclick="appSignOut()">Sign Out</button>
        </div>
      </div>
      <div id="dash-mount" class="dash-mount"></div>
    </div>`;

  window.appSignOut = signOut;
}

// ── Shell ─────────────────────────────────────
function renderShell() {
  const user = STATE.user;
  const name = user.displayName?.split(' [')[0] ?? user.email;
  const role = user.displayName?.match(/\[(.*?)\]/)?.[1] ?? 'student';

  document.getElementById('app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">ACADLIT · AI</div>
          <div class="sidebar-title">Academic Literacies</div>
          <div class="sidebar-sub">in the Age of AI</div>
        </div>

        <div class="prog-container">
          <div class="prog-label">
            <span>Course Progress</span>
            <span id="prog-pct">0%</span>
          </div>
          <div class="prog-bar-bg">
            <div class="prog-bar-fill" id="prog-fill"></div>
          </div>
        </div>

        <nav class="nav-list">
          ${UNITS.map((u, i) => {
            const isAssessment = u.isAssessment === true;
            const visited  = STATE.progress[u.id]?.visited;
            const complete = STATE.progress[u.id]?.readingComplete;
            
            // Unit Locking Logic
            let isLocked = false;
            let lockedReason = '';
            if (i > 0) {
              const prevUnit = UNITS[i - 1];
              const prevComplete = STATE.progress[prevUnit.id]?.readingComplete || STATE.progress[prevUnit.id]?.assessmentSubmitted;
              
              if (!prevComplete) {
                // Not a high achiever bypassing, so enforce sequential lock
                const isHighAchiever = (STATE.erProgress?.extraMarks || 0) >= 15;
                if (!isHighAchiever) {
                  isLocked = true;
                  lockedReason = `Complete ${prevUnit.badge} first.`;
                }
              }
            }

            if (isAssessment) {
              return `
                <div class="nav-item nav-assessment ${i === 0 ? 'active' : ''} ${isLocked ? 'locked' : ''}" id="nav-${i}" ${isLocked ? `onclick="alert('🔒 Locked: ${lockedReason}')"` : `onclick="navigateTo(${i})"`}>
                  <div class="nav-num assessment-num">${isLocked ? '🔒' : '📋'}</div>
                  <div class="nav-info">
                    <div class="nav-badge assessment-badge">${u.badge}</div>
                    <div class="nav-lbl">${u.title}</div>
                  </div>
                  ${STATE.progress[u.id]?.assessmentSubmitted ? '<div class="nav-tick">✓</div>' : ''}
                </div>`;
            }
            return `
              <div class="nav-item ${i === 0 ? 'active' : ''} ${isLocked ? 'locked' : ''}" id="nav-${i}" ${isLocked ? `onclick="alert('🔒 Locked: ${lockedReason}')"` : `onclick="navigateTo(${i})"`}>
                <div class="nav-num ${visited ? 'visited' : ''}">${isLocked ? '🔒' : (i + 1)}</div>
                <div class="nav-info">
                  <div class="nav-badge">${u.badge}</div>
                  <div class="nav-lbl">${u.title}</div>
                </div>
                ${complete ? '<div class="nav-tick">✓</div>' : ''}
              </div>`;
          }).join('')}

          <div class="nav-item" id="nav-er" onclick="navigateTo('er')">
            <div class="nav-num">📖</div>
            <div class="nav-info">
              <div class="nav-badge">Bonus</div>
              <div class="nav-lbl">Extensive Reading</div>
            </div>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="user-pill">
            <div class="user-avatar">${name[0].toUpperCase()}</div>
            <div class="user-info">
              <div class="user-name">${name}</div>
              <div class="user-role">${role}</div>
            </div>
          </div>
          <button class="btn-signout" onclick="appSignOut()">Sign Out</button>
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <button class="btn-menu" id="btn-menu" onclick="toggleSidebar()" title="Toggle Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <button class="btn-focus" id="btn-focus" onclick="toggleFocus()" title="Toggle Focus Mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v6h6M20 10V4h-6M4 10V4h6M20 14v6h-6"></path></svg>
          </button>
          <span class="unit-badge" id="tb-badge">Unit 1</span>
          <span class="unit-title-bar" id="tb-title">Loading…</span>
          <div class="topbar-controls">
            <div class="font-size-ctrl" title="Adjust text size">
              <button class="btn-font-sm" onclick="adjustFontSize(-1)" title="Smaller text">A</button>
              <button class="btn-font-lg" onclick="adjustFontSize(1)" title="Larger text">A</button>
            </div>
            <button class="btn-prev" id="btn-prev" onclick="prevUnit()" style="display:none;">← Prev</button>
            <button class="btn-next" id="btn-next" onclick="nextUnit()">Next →</button>
          </div>
        </div>
        <div class="content-window" id="content-window">
          <div class="content-area" id="content-area"></div>
          <button id="btn-back-to-top" class="btn-back-to-top" onclick="document.getElementById('content-window').scrollTo({top: 0, behavior: 'smooth'})" title="Back to Top">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
        </div>
      </main>
    </div>`;

  window.navigateTo = navigateTo;
  window.nextUnit   = () => navigateTo(Math.min(STATE.activeUnit + 1, UNITS.length - 1));
  window.prevUnit   = () => navigateTo(Math.max(STATE.activeUnit - 1, 0));
  window.appSignOut = signOut;
  window.toggleFocus = () => {
    document.querySelector('.shell').classList.toggle('focus-mode');
    const isFocus = document.querySelector('.shell').classList.contains('focus-mode');
    const icon = isFocus ? '<path d="M4 14h6v6M20 10h-6V4M4 10h6V4M20 14h-6v6"></path>' : '<path d="M4 14v6h6M20 10V4h-6M4 10V4h6M20 14v6h-6"></path>';
    document.querySelector('.btn-focus svg').innerHTML = icon;
  };
  
  window.toggleSidebar = () => {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
  };

  // Font size control — zoom steps for the entire shell
  const ZOOM_STEPS = [0.85, 1, 1.1, 1.2, 1.35];
  let _zoomIdx = window._zoomIdx ?? 1;
  const _applyZoom = () => {
    const shell = document.querySelector('.shell');
    if (shell) shell.style.zoom = ZOOM_STEPS[_zoomIdx];
  };
  _applyZoom();
  window.adjustFontSize = (dir) => {
    _zoomIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, _zoomIdx + dir));
    window._zoomIdx = _zoomIdx;
    _applyZoom();
  };

  document.getElementById('content-window').addEventListener('scroll', (e) => {
    const btn = document.getElementById('btn-back-to-top');
    if (e.target.scrollTop > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });
}

// ── Navigation ────────────────────────────────
export function navigateTo(index) {
  // Close mobile sidebar if open
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');

  const isER = index === 'er';

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  (isER
    ? document.getElementById('nav-er')
    : document.getElementById(`nav-${index}`)
  )?.classList.add('active');

  if (isER) {
    renderER();
    document.getElementById('tb-badge').textContent    = 'Bonus';
    document.getElementById('tb-title').textContent    = 'Extensive Reading';
    document.getElementById('btn-prev').style.display  = 'none';
    document.getElementById('btn-next').style.display  = 'none';
    updateAITutorContext(null);
    updateAIToolsContext(null);
    return;
  }

  STATE.activeUnit = index;
  const unit = UNITS[index];

  // Inject HTML with animation
  const area = document.getElementById('content-area');
  area.classList.remove('anim-slide-up');
  void area.offsetWidth;
  area.innerHTML = unit.html();
  area.classList.add('anim-slide-up');

  // Scroll to top
  document.getElementById('content-window').scrollTop = 0;

  // Topbar
  document.getElementById('btn-prev').style.display = index === 0 ? 'none' : '';
  document.getElementById('btn-next').style.display = index === UNITS.length - 1 ? 'none' : '';

  // Boot video players
  document.querySelectorAll('.ivp-container[data-video-key]').forEach(el => {
    const key = el.dataset.videoKey;
    if (VIDEOS[key] && VIDEO_CONFIG[key]) {
      new InteractiveVideoPlayer(el.id, key, VIDEOS[key], VIDEO_CONFIG[key]);
    }
  });

  // Boot interactive components
  initAllReadingTasks();
  initAllVisualTasks();
  initAllAssessmentTasks();

  // Topbar — show unit number only for actual units, not assessments
  const badgeText = unit.isAssessment ? unit.badge : unit.badge;
  document.getElementById('tb-badge').textContent = badgeText;
  document.getElementById('tb-title').textContent = unit.title;

  // Update AI Tutor + AI Tools context
  updateAITutorContext(unit);
  updateAIToolsContext(unit);

  // Progress tracking
  if (!STATE.progress[unit.id]) STATE.progress[unit.id] = {};
  STATE.progress[unit.id].visited = true;
  updateProgressBar();
  saveState();
}

// ── Progress Bar ──────────────────────────────
function updateProgressBar() {
  const completed = Object.values(STATE.progress).filter(p => p.readingComplete).length;
  const visited   = Object.values(STATE.progress).filter(p => p.visited).length;
  const pct       = Math.round((visited / UNITS.length) * 100);
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-pct').textContent  = pct + '%';

  // Refresh nav ticks
  UNITS.forEach((u, i) => {
    const tick = document.querySelector(`#nav-${i} .nav-tick`);
    if (STATE.progress[u.id]?.readingComplete) {
      if (!tick) {
        document.querySelector(`#nav-${i}`)?.insertAdjacentHTML('beforeend', '<div class="nav-tick">✓</div>');
      }
    }
  });
}

// ── Extensive Reading ─────────────────────────
function renderER() {
  const area = document.getElementById('content-area');
  const { extraMarks, completedReadings } = STATE.erProgress;

  area.innerHTML = `
    <h1>Extensive Reading Programme</h1>
    <p class="lead">Build your scholarly reading stamina through three progressive tiers. Each tier awards +5 Extra Marks upon successful completion of the comprehension quiz.</p>

    <div class="er-score-pill">
      <span>Extra Marks Earned</span>
      <strong>${extraMarks}</strong>
    </div>

    ${ER_TIERS.map((tier, i) => {
      const done = completedReadings.find(r => r.tier === tier.tier);
      return `
        <div class="er-tier ${done ? 'done' : ''}">
          <div class="er-tier-head">
            <div>
              <span class="er-tier-badge">Tier ${tier.tier}</span>
              <span class="er-tier-label">${tier.label}</span>
            </div>
            ${done ? `<span class="er-done-badge">✅ Completed — Score: ${done.score}/10</span>` : ''}
          </div>
          <p style="font-size:14px;color:var(--muted);margin-bottom:16px;">${tier.description}</p>
          <div class="er-articles">
            ${tier.articles.map(a => `
              <a class="er-article" href="${a.url}" target="_blank" rel="noopener">
                <div class="er-article-title">${a.title}</div>
                <div class="er-article-meta">${a.source} · ${a.readingTime}</div>
                <div class="er-article-summary">${a.summary}</div>
              </a>`).join('')}
          </div>
          ${!done ? `
            <div class="er-quiz">
              <label class="ex-lbl">Comprehension Response</label>
              <p style="font-size:14px;margin-bottom:10px;">${tier.quizPrompt}</p>
              <textarea id="er-ta-${i}" class="ex-ta" rows="6" placeholder="Write your response here…"></textarea>
              <button class="auth-submit" style="margin-top:12px;" onclick="submitERQuiz(${i})">
                Submit for AI Marking (+5 marks)
              </button>
            </div>` : ''}
        </div>`;
    }).join('')}`;

  window.submitERQuiz = (i) => submitERQuiz(i);
}

async function submitERQuiz(tierIdx) {
  const tier = ER_TIERS[tierIdx];
  const text = document.getElementById(`er-ta-${tierIdx}`)?.value ?? '';
  if (text.length < 80) { alert('Please write a fuller response before submitting.'); return; }

  const prompt = `You are marking a university student's comprehension response. 
Tier: ${tier.label}. Prompt: "${tier.quizPrompt}". Student: "${text}".
Respond ONLY with valid JSON: {"score":<0-10>,"feedback":"<2-3 sentences>","pass":<true if score>=6>}`;

  try {
    const raw    = await _aiChat(prompt, { maxTokens: 200 });
    const result = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (result.pass) {
      STATE.erProgress.extraMarks += 5;
      STATE.erProgress.completedReadings.push({ tier: tier.tier, timestamp: new Date().toISOString(), score: result.score });
      await saveState();
      alert(`✅ Passed! Score: ${result.score}/10.\n\n${result.feedback}\n\n+5 Extra Marks awarded!`);
    } else {
      alert(`Not quite. Score: ${result.score}/10.\n\n${result.feedback}\n\nPlease revise and resubmit.`);
    }
    renderER();
  } catch {
    STATE.erProgress.extraMarks += 5;
    STATE.erProgress.completedReadings.push({ tier: tier.tier, timestamp: new Date().toISOString(), score: 7 });
    await saveState();
    alert('Submitted! Extra marks granted.');
    renderER();
  }
}

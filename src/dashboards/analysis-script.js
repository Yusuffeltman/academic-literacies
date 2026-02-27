window._loadPhaseAnalysis = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  try {
    const { db } = await import('../firebase.js');
    const { ref, get } = await import('firebase/database');
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Running deep phase analysis across cohort...</div>';
    
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) {
      mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">No student data found for phase analysis.</div>';
      return;
    }

    const users = snap.val();
    
    let deviceData = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
    let gapCounters = {
      'Sentence Construction': 0,
      'Evidence/Examples': 0,
      'Academic Register': 0,
      'Engagement with Reading': 0
    };
    
    let totalStudents = 0;

    for (const [uid, user] of Object.entries(users)) {
      if (!user.state) continue;
      totalStudents++;
      const s = user.state;
      
      if (s.deviceInfo && s.deviceInfo.type) {
        deviceData[s.deviceInfo.type] = (deviceData[s.deviceInfo.type] || 0) + 1;
      } else {
        deviceData.Unknown++;
      }
      
      if (s.progress) {
        Object.values(s.progress).forEach(p => {
          if (p.feedback && p.feedback.priority) {
            const prio = p.feedback.priority.toLowerCase();
            if (prio.includes('sentence') || prio.includes('run-on') || prio.includes('grammar')) gapCounters['Sentence Construction']++;
            if (prio.includes('example') || prio.includes('evidence')) gapCounters['Evidence/Examples']++;
            if (prio.includes('informal') || prio.includes('register') || prio.includes('vocabulary')) gapCounters['Academic Register']++;
            if (prio.includes('text') || prio.includes('reading') || prio.includes('task')) gapCounters['Engagement with Reading']++;
          }
        });
      }
    }

    let topGap = 'None identified yet';
    let maxGap = 0;
    Object.entries(gapCounters).forEach(([gap, count]) => {
      if (count > maxGap) { maxGap = count; topGap = gap; }
    });
    
    const mobilePct = totalStudents > 0 ? Math.round(((deviceData.Mobile + deviceData.Tablet) / totalStudents) * 100) : 0;

    mount.innerHTML = `
      <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.5s ease;">
        <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:32px;margin-bottom:12px;">🔍 Phase Robust Analysis</h1>
        <p style="font-size:16px;color:var(--muted);margin-bottom:32px;">Deep cognitive and structural insights automatically extracted from student writing tasks and device metrics.</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
          <div style="background:white;padding:24px;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);">
            <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:16px;font-family:'DM Mono',monospace;">📱 Device Analytics</h2>
            <div style="display:flex;align-items:center;gap:20px;">
              <div style="font-size:48px;">${mobilePct > 50 ? '📱' : '💻'}</div>
              <div>
                <div style="font-size:28px;font-weight:700;color:var(--navy);line-height:1;">${mobilePct}% Mobile</div>
                <div style="font-size:13px;color:var(--muted);margin-top:6px;">Desktop: ${deviceData.Desktop} | Mobile/Tablet: ${deviceData.Mobile + deviceData.Tablet}</div>
              </div>
            </div>
            <div style="margin-top:16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;line-height:1.5;">
              <strong>Pedagogical Implication:</strong> ${mobilePct > 50 ? 'With a high mobile user base, ensure long readings are broken into smaller chunks and avoid complex dragging interactions in upcoming assessments.' : 'Students are primarily using desktops; you can safely assign more complex, multi-window research tasks.'}
            </div>
          </div>

          <div style="background:white;padding:24px;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);">
            <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:16px;font-family:'DM Mono',monospace;">🧠 Primary Cohort Knowledge Gap</h2>
            <div style="display:flex;align-items:center;gap:20px;">
              <div style="font-size:48px;">⚠️</div>
              <div>
                <div style="font-size:24px;font-weight:700;color:var(--red);line-height:1.2;">${topGap}</div>
                <div style="font-size:13px;color:var(--muted);margin-top:6px;">Identified in ${maxGap} writing submissions across the cohort.</div>
              </div>
            </div>
            <div style="margin-top:16px;padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:13px;color:#166534;line-height:1.5;">
              <strong>Recommended Intervention:</strong> ${
                topGap === 'Evidence/Examples' ? 'The next reading task should force students to highlight a specific quote before writing.' :
                topGap === 'Sentence Construction' ? 'Start the next contact session with a 10-minute sentence combining activity.' :
                topGap === 'Academic Register' ? 'Provide a formal vs informal translation exercise in the next tutorial.' :
                'Introduce a pre-reading quiz to force closer engagement with the text.'
              }
            </div>
          </div>
        </div>

        <h2 style="font-size:20px;color:var(--navy);margin-bottom:16px;font-family:'DM Sans',sans-serif;">Curriculum Adaptation Engine</h2>
        <div style="background:white;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);padding:24px;">
          <p style="font-size:14px;color:var(--navy);line-height:1.6;margin-bottom:16px;">Based on the recent phase analysis, the system recommends the following automated adaptations for the upcoming units to ensure autonomous learning:</p>
          
          <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:var(--navy);">
            <li><strong>For High-Performing Students (Levels 4-5):</strong> Automatically unlock a supplementary peer-reviewed text in the next unit instead of the Access Level text.</li>
            <li><strong>For Below-Standard Students (Levels 1-2):</strong> Inject a mandatory "Argument Outline" scaffolding step before they are permitted to draft their paragraph in the next unit.</li>
            <li><strong>For Mobile Users:</strong> Toggle Focus Mode by default to hide the sidebar and increase reading font sizes automatically to prevent eye strain.</li>
          </ul>
        </div>
      </div>
    `;

  } catch (err) {
    mount.innerHTML = `<div style="padding:40px;color:red;text-align:center;">Failed to run analysis: ${err.message}</div>`;
  }
};

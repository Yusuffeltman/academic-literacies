# Student Announcement — Lesson-Presentation Trial (Units 7 & 8)

**Status:** Draft, ready for launch day. **Do not post** until the comprehension items are signed off and the ethics/equity notice is approved (see [lesson-experiment-ethics-notice.md](lesson-experiment-ethics-notice.md) §8) and `EXPERIMENT_ENABLED` is set to `true`.

Plain-language, EAL-accessible copy. All versions say the same thing as the in-app notice: **voluntary, anonymous, does not affect marks, opt-out anytime.**

---

## 1. In-app dashboard announcement (drop-in)

Add to `DASHBOARD_CONTENT.announcements` in [`content/dashboard.js`](../content/dashboard.js):

```js
{
  id: 5,
  icon: '📋',
  title: 'Helping us improve Units 7 & 8',
  content: 'For Units 7 and 8 we are trying two ways of laying out the same lesson, to learn which helps students most. A short, anonymous quick-check at the end takes about two minutes. It is completely voluntary and does not affect your marks — and you can switch to the standard layout at any time. Thank you for helping us make the course better.',
}
```

Remove this entry (or drop `EXPERIMENT_ENABLED` back to `false`) once the trial window closes.

---

## 2. Moodle / email announcement

**Subject:** Units 7 & 8 — helping us improve how lessons are laid out (voluntary)

**Plain text:**

> Hi everyone,
>
> Over the next while, Units 7 and 8 will try **two different layouts** of the same lesson content. We want to learn which layout best supports your learning — so we can present the rest of the course in the way that helps you most.
>
> What this means for you:
> - You learn the unit exactly as normal. Nothing extra is required.
> - At the end of each of these two units there is a **short, anonymous quick-check** (a few comprehension questions and one question about effort) — about two minutes.
> - It is **completely voluntary**, it is **anonymous** for our analysis, and it **does not affect your marks** in any way.
> - You can choose the **standard layout** at any time — just tap "Use the standard layout" on the notice in the app.
>
> That's it. Thank you for helping us make the module better for you and future students.
>
> [Lecturer name] · [contact email]

**HTML (for Moodle's HTML editor):**

```html
<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;">
  <h2 style="margin:0 0 8px;">Units 7 &amp; 8 — helping us improve how lessons are laid out</h2>
  <p>Over the next while, Units 7 and 8 will try <strong>two different layouts</strong> of the same lesson content. We want to learn which layout best supports your learning.</p>
  <ul>
    <li>You learn the unit exactly as normal — nothing extra is required.</li>
    <li>At the end of each of these two units there is a <strong>short, anonymous quick-check</strong> (a few comprehension questions and one effort question) — about two minutes.</li>
    <li>It is <strong>completely voluntary</strong>, <strong>anonymous</strong> for analysis, and <strong>does not affect your marks</strong>.</li>
    <li>You can switch to the <strong>standard layout</strong> anytime by tapping “Use the standard layout” on the in-app notice.</li>
  </ul>
  <p>Thank you for helping us make the module better.</p>
  <p style="color:#64748b;font-size:13px;">[Lecturer name] · [contact email]</p>
</div>
```

---

## 3. Notes for the poster

- **Timing:** post on the same day `EXPERIMENT_ENABLED` is flipped to `true` and redeployed — not before (the in-app notice and quick-check won't appear until then).
- **Consistency:** the wording deliberately mirrors the in-app notice in [`src/components/experiment-notice.js`](../src/components/experiment-notice.js). If you change one, change both.
- **Contact:** fill in the lecturer name and a real contact address so students can ask questions or raise concerns (data-subject rights, ethics notice §4).
- **Close-out:** when the trial window ends, set `EXPERIMENT_ENABLED = false`, redeploy, and remove the dashboard announcement.

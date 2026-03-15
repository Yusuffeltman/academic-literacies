import { db, storage } from './firebase.js';
import { ref, get, push, set, runTransaction, update } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export async function getGalleryPosts() {
  try {
    const snap = await get(ref(db, 'gallery/posts'));
    if (!snap.exists()) return [];
    const raw = snap.val();
    return Object.entries(raw)
      .map(([id, data]) => ({ id, ...data }))
      .filter((p) => !p.removed)
      .sort((a, b) => {
        if (Boolean(b.pinned) !== Boolean(a.pinned)) return Boolean(b.pinned) - Boolean(a.pinned);
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  } catch {
    return [];
  }
}

export async function getPinnedGalleryPosts(limit = 5) {
  const posts = await getGalleryPosts();
  return posts.filter((p) => Boolean(p.pinned)).slice(0, Math.max(1, Number(limit) || 5));
}

export async function createGalleryPost(post) {
  try {
    const newRef = push(ref(db, 'gallery/posts'));
    const payload = {
      ...post,
      reactions: { heart: 0, spark: 0, clap: 0, up: 0, down: 0 },
      comments: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await set(newRef, payload);
    return newRef.key;
  } catch {
    return null;
  }
}

export async function addGalleryReaction(postId, reactionKey) {
  const safeKey = ['heart', 'spark', 'clap', 'up', 'down'].includes(reactionKey) ? reactionKey : 'heart';
  try {
    await runTransaction(ref(db, `gallery/posts/${postId}/reactions/${safeKey}`), (current) => (Number(current) || 0) + 1);
    await set(ref(db, `gallery/posts/${postId}/updatedAt`), new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export async function addGalleryComment(postId, comment) {
  try {
    const commentRef = push(ref(db, `gallery/posts/${postId}/comments`));
    await set(commentRef, {
      ...comment,
      createdAt: new Date().toISOString(),
    });
    await set(ref(db, `gallery/posts/${postId}/updatedAt`), new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export async function setGalleryPinned(postId, pinned) {
  try {
    await update(ref(db, `gallery/posts/${postId}`), {
      pinned: Boolean(pinned),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function hideGalleryPost(postId) {
  try {
    await update(ref(db, `gallery/posts/${postId}`), {
      removed: true,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function setGalleryStaffAssessment(postId, assessment) {
  try {
    await update(ref(db, `gallery/posts/${postId}`), {
      staffAssessment: {
        ...(assessment || {}),
      },
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function uploadGalleryAsset(file, uploaderUid = 'anonymous', opts = {}) {
  try {
    if (!file) return null;

    const limitBytes = Number(opts?.maxBytes) || 10 * 1024 * 1024; // 10 MB default
    if (limitBytes && Number(file.size) > limitBytes) {
      return null;
    }

    const onProgress = typeof opts?.onProgress === 'function' ? opts.onProgress : null;
    const safeName = String(file.name || 'upload').replace(/[^a-zA-Z0-9._-]+/g, '_');
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `gallery/assets/${uploaderUid}/${stamp}-${safeName}`;
    const sRef = storageRef(storage, path);

    if (onProgress) onProgress(1);

    const timeoutMs = Number(opts?.timeoutMs) || 60000;

    return await new Promise((resolve) => {
      const uploadTask = uploadBytesResumable(sRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          uploaderUid,
          originalName: file.name || safeName,
        },
      });

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        uploadTask.cancel();
        if (onProgress) onProgress('error', new Error('Upload timed out. Check your connection or file size.'));
        resolve(null);
      }, timeoutMs);

      uploadTask.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          if (onProgress) onProgress(pct);
        },
        (err) => {
          if (timedOut) return;
          clearTimeout(timer);
          const friendly = err?.message || err?.code || 'Upload failed';
          if (onProgress) onProgress('error', friendly);
          resolve(null);
        },
        async () => {
          if (timedOut) return;
          clearTimeout(timer);
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          resolve({
            name: file.name || safeName,
            type: file.type || 'application/octet-stream',
            size: Number(file.size) || 0,
            path,
            url,
            uploadedAt: new Date().toISOString(),
          });
        }
      );
    });
  } catch {
    return null;
  }
}

export async function seedGalleryWalkDemoPosts() {
  try {
    const existing = await getGalleryPosts();
    if (existing.some((p) => p.demoSeed === true)) return { seeded: 0, skipped: true };

    const now = new Date();
    const ts = (minOffset) => new Date(now.getTime() - minOffset * 60000).toISOString();

    const demoPosts = [
      {
        mode: 'individual',
        category: 'Mini-Lesson Output',
        title: 'SIFT Analysis: Viral Education Claim',
        content: 'I traced a claim about pass rates from a WhatsApp screenshot to its original source. The claim was misleading because the data point was real but taken out of context. My verdict: partially true but framed to provoke panic.',
        authorUid: 'demo-student-01',
        authorName: 'Anele M.',
        pinned: true,
        demoSeed: true,
        createdAt: ts(32),
        updatedAt: ts(12),
        reactions: { heart: 4, spark: 3, clap: 5 },
        comments: {
          c1: { authorName: 'Tutor', text: 'Strong tracing step. Great evidence discipline.', createdAt: ts(20) },
          c2: { authorName: 'Peer', text: 'Your verdict logic is very clear.', createdAt: ts(16) },
        },
        selfAssessment: {
          scores: { quality: '3', evidence: '4', communication: '3', collaboration: '2', reflection: '3' },
          reflection: 'Strength: evidence trail. Next: tighten opening sentence.',
        },
      },
      {
        mode: 'group',
        groupName: 'Team Critical Lens',
        category: 'Workflow Reflection',
        title: 'Gallery Walk Poster: How Our Group Verifies Claims',
        content: 'Our workflow uses Stop → Investigate → Verify → Explain. We split roles for source tracing, quality checks, and final synthesis. The poster maps decision points and escalation rules when evidence is weak.',
        authorUid: 'demo-group-01',
        authorName: 'Team Critical Lens',
        demoSeed: true,
        createdAt: ts(28),
        updatedAt: ts(8),
        reactions: { heart: 2, spark: 6, clap: 4 },
        comments: {
          c1: { authorName: 'Lecturer', text: 'Excellent division of roles. Add one real-case example.', createdAt: ts(14) },
        },
        selfAssessment: {
          scores: { quality: '4', evidence: '3', communication: '4', collaboration: '4', reflection: '3' },
          reflection: 'Strength: collaboration visibility. Next: include stronger source examples.',
        },
      },
      {
        mode: 'individual',
        category: 'Draft Paragraph',
        title: 'Revised Definition Paragraph: Critical Thinking',
        content: 'Critical thinking is a disciplined process of evaluating claims through evidence, logic, and source quality. In classroom practice, this means students justify interpretations rather than repeating information. In AI-saturated contexts, this protects against confident but unsupported claims.',
        authorUid: 'demo-student-02',
        authorName: 'Sipho K.',
        demoSeed: true,
        createdAt: ts(18),
        updatedAt: ts(6),
        reactions: { heart: 5, spark: 1, clap: 3 },
        comments: {},
        selfAssessment: {
          scores: { quality: '3', evidence: '3', communication: '4', collaboration: '2', reflection: '3' },
          reflection: 'Strength: concise definition. Next: add one concrete evidence citation.',
        },
      },
    ];

    for (const post of demoPosts) {
      await createGalleryPost(post);
    }
    return { seeded: demoPosts.length, skipped: false };
  } catch {
    return { seeded: 0, skipped: false };
  }
}

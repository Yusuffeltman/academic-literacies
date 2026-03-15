// src/components/toaster.js
// ─────────────────────────────────────────────
// Simple, premium toaster notification system.
// ─────────────────────────────────────────────

/**
 * Show a toast notification.
 * @param {string} msg - The message to display.
 * @param {string} type - 'success' | 'error' | 'info'
 */
export function showToast(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    const bgColor = type === 'success' ? 'rgba(22, 163, 74, 0.9)' : type === 'error' ? 'rgba(220, 38, 38, 0.9)' : 'rgba(30, 41, 59, 0.9)';

    toast.className = 'toast-notification anim-slide-in-right';
    toast.style.cssText = `
    pointer-events: auto;
    background: ${bgColor};
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateX(100px);
  `;

    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

// Global exposure for legacy scripts
window.showToast = showToast;

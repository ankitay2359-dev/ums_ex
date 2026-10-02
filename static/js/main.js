/**
 * Udhaar Management System - Main JavaScript Library
 * Vanilla JS utilities, mobile sidebar toggle, toast alerts & modal handlers.
 */

document.addEventListener('DOMContentLoaded', function() {
    // 1. Live Date Display in Header
    const liveDateEl = document.getElementById('liveDateDisplay');
    if (liveDateEl) {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        liveDateEl.textContent = new Date().toLocaleDateString('en-IN', options);
    }

    // 2. Mobile Sidebar Toggle
    const sidebar = document.getElementById('appSidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.add('open');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', function() {
            sidebar.classList.remove('open');
        });
    }

    // Auto-dismiss alert messages after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            alert.style.transition = 'opacity 0.5s ease';
            alert.style.opacity = '0';
            setTimeout(function() { alert.remove(); }, 500);
        }, 6000);
    });
});

// Toast notification generator
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fade-in`;
    alert.innerHTML = `
        <span class="alert-icon">${type === 'success' ? '✓' : type === 'danger' ? '⚠' : 'ℹ'}</span>
        <span class="alert-content">${message}</span>
        <button type="button" class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(alert);

    setTimeout(() => {
        alert.style.transition = 'opacity 0.4s ease';
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 400);
    }, 4500);
}

// Confirmation Modal Helper
let onConfirmCallback = null;

function showConfirmModal(title, message, confirmBtnText = 'Confirm', onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const bodyEl = document.getElementById('confirmModalBody');
    const actionBtn = document.getElementById('confirmModalActionBtn');

    if (!modal) return;

    titleEl.textContent = title;
    bodyEl.textContent = message;
    actionBtn.textContent = confirmBtnText;

    onConfirmCallback = onConfirm;
    actionBtn.onclick = function() {
        closeConfirmModal();
        if (typeof onConfirmCallback === 'function') {
            onConfirmCallback();
        }
    };

    modal.style.display = 'flex';
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
    onConfirmCallback = null;
}

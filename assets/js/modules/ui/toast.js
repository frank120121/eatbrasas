// assets/js/modules/ui/toast.js

import { CONFIG } from '../config.js';
import { getElement, setAttributes, escapeHtml } from '../utils.js';

export class ToastManager {
    constructor() {
        this.toastContainer = null;
        this.srAnnouncementElement = null; // This will now point to the general announcer
        this.activeToasts = new Set();
        this.init();
    }

    /**
     * Initialize the toast manager
     */
    init() {
        this.toastContainer = getElement('#toast-container');
        // CORRECTED: Point to the general screen reader announcement element
        this.srAnnouncementElement = getElement('#general-sr-announcement'); 
        
        if (!this.toastContainer) {
            console.warn('Toast container not found. Creating fallback container.');
            this.createFallbackContainer();
        }

        console.log('✅ Toast manager initialized');
    }

    /**
     * Creates a fallback toast container if none exists
     */
    createFallbackContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
        setAttributes(this.toastContainer, {
            'aria-live': 'polite',
            'aria-label': 'Notificaciones'
        });
        document.body.appendChild(this.toastContainer);
    }

    /**
     * Creates and shows a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - How long to show the toast (ms)
     * @returns {HTMLElement|null} - The created toast element
     */
    show(message, type = 'success', duration = CONFIG.ANIMATIONS.TOAST_DURATION) {
        if (!this.toastContainer) {
            console.warn('Toast container not available. Cannot display toast:', message);
            return null;
        }

        const toast = this.createToastElement(message, type);
        this.toastContainer.appendChild(toast);
        this.activeToasts.add(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-dismiss
        const timeoutId = setTimeout(() => {
            this.dismissToast(toast);
        }, duration);

        // Store timeoutId on the element to be cleared if needed
        toast.autoHideTimeout = timeoutId;

        return toast;
    }

    /**
     * Creates a toast element
     */
    createToastElement(message, type) {
        const toast = document.createElement('div');
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        toast.id = toastId;
        toast.className = `toast ${type}`;
        setAttributes(toast, {
            'role': 'alert',
            'aria-live': 'assertive', // Assertive is better for notifications
            'aria-atomic': 'true'
        });
        
        const icon = this.getIconForType(type);
        
        // Use innerHTML for structure but escape the message content
        toast.innerHTML = `
            <span class="toast-icon" aria-hidden="true" style="margin-right: 8px;">${icon}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Cerrar notificación" data-toast-id="${toastId}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.dismissToast(toast));
        }

        return toast;
    }

    /**
     * Gets the appropriate icon for toast type
     */
    getIconForType(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    /**
     * Dismisses a toast with animation
     */
    dismissToast(toast) {
        if (!toast || !this.activeToasts.has(toast)) return;

        toast.classList.remove('show');
        this.activeToasts.delete(toast);

        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) toast.remove();
        }, { once: true });
        
        // Fallback removal
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 500);
    }

    // --- Helper methods for different toast types ---
    success(message, duration) { return this.show(message, 'success', duration); }
    error(message, duration) { return this.show(message, 'error', duration); }
    warning(message, duration) { return this.show(message, 'warning', duration); }
    info(message, duration) { return this.show(message, 'info', duration); }

    dismissAll() {
        this.activeToasts.forEach(toast => this.dismissToast(toast));
    }

    // REMOVED: announceCartUpdate function is gone.

    /**
     * Announces general updates to screen readers
     * @param {string} message - Message to announce
     */
    announce(message) {
        // This now correctly uses the general-purpose element found during init
        if (this.srAnnouncementElement) {
            this.srAnnouncementElement.textContent = message;
        }
    }

    // --- Other utility methods ---
    getActiveToastCount() { return this.activeToasts.size; }

    hasActiveToastOfType(type) {
        return [...this.activeToasts].some(toast => toast.classList.contains(type));
    }
    
    destroy() {
        this.dismissAll();
    }
}

// Create a singleton instance for global use
export const toast = new ToastManager();

// Backward compatibility - global functions
if (typeof window !== 'undefined') {
    window.showToast = (message, type, duration) => toast.show(message, type, duration);
}
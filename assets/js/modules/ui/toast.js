// assets/js/modules/ui/toast.js

import { CONFIG } from '../config.js';
import { getElement, setAttributes, escapeHtml } from '../utils.js';

/**
 * ToastManager - Handles toast notifications and screen reader announcements
 */
export class ToastManager {
    constructor() {
        this.toastContainer = null;
        this.srAnnouncementElement = null;
        this.activeToasts = new Set();
        this.init();
    }

    /**
     * Initialize the toast manager
     */
    init() {
        this.toastContainer = getElement('#toast-container');
        this.srAnnouncementElement = getElement(CONFIG.SELECTORS.CART.SR_ANNOUNCEMENT);
        
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
        setTimeout(() => {
            this.dismissToast(toast);
        }, duration);

        return toast;
    }

    /**
     * Creates a toast element
     * @param {string} message - The message to display
     * @param {string} type - Toast type
     * @returns {HTMLElement} - The created toast element
     */
    createToastElement(message, type) {
        const toast = document.createElement('div');
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        toast.id = toastId;
        toast.className = `toast ${type}`;
        setAttributes(toast, {
            'role': 'alert',
            'aria-live': 'polite',
            'aria-atomic': 'true'
        });
        
        const icon = this.getIconForType(type);
        
        toast.innerHTML = `
            <span class="toast-icon" aria-hidden="true" style="margin-right: 8px;">${icon}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Cerrar notificación" data-toast-id="${toastId}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

        // Add click handler for close button
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.dismissToast(toast);
            });
        }

        return toast;
    }

    /**
     * Gets the appropriate icon for toast type
     * @param {string} type - Toast type
     * @returns {string} - Icon character or SVG
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
     * @param {HTMLElement} toast - Toast element to dismiss
     */
    dismissToast(toast) {
        if (!toast || !this.activeToasts.has(toast)) {
            return;
        }

        toast.classList.remove('show');
        this.activeToasts.delete(toast);

        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, { once: true });
        
        // Fallback removal in case transition doesn't fire
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 500);
    }

    /**
     * Shows a success toast
     * @param {string} message - Success message
     * @param {number} duration - Optional duration override
     * @returns {HTMLElement|null} - The created toast element
     */
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    /**
     * Shows an error toast
     * @param {string} message - Error message
     * @param {number} duration - Optional duration override
     * @returns {HTMLElement|null} - The created toast element
     */
    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    /**
     * Shows a warning toast
     * @param {string} message - Warning message
     * @param {number} duration - Optional duration override
     * @returns {HTMLElement|null} - The created toast element
     */
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Shows an info toast
     * @param {string} message - Info message
     * @param {number} duration - Optional duration override
     * @returns {HTMLElement|null} - The created toast element
     */
    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    /**
     * Dismisses all active toasts
     */
    dismissAll() {
        const toastsToRemove = [...this.activeToasts];
        toastsToRemove.forEach(toast => {
            this.dismissToast(toast);
        });
    }

    /**
     * Announces cart updates to screen readers
     * @param {number} totalItems - Total number of items in cart
     */
    announceCartUpdate(totalItems) {
        if (!this.srAnnouncementElement) {
            this.srAnnouncementElement = getElement(CONFIG.SELECTORS.CART.SR_ANNOUNCEMENT);
        }

        if (this.srAnnouncementElement) {
            this.srAnnouncementElement.textContent = `Carrito actualizado: ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}`;
        }
    }

    /**
     * Announces general updates to screen readers
     * @param {string} message - Message to announce
     */
    announce(message) {
        if (!this.srAnnouncementElement) {
            this.srAnnouncementElement = getElement(CONFIG.SELECTORS.CART.SR_ANNOUNCEMENT);
        }

        if (this.srAnnouncementElement) {
            this.srAnnouncementElement.textContent = message;
        }
    }

    /**
     * Gets the count of active toasts
     * @returns {number} - Number of active toasts
     */
    getActiveToastCount() {
        return this.activeToasts.size;
    }

    /**
     * Checks if a specific toast type is currently active
     * @param {string} type - Toast type to check
     * @returns {boolean} - True if a toast of this type is active
     */
    hasActiveToastOfType(type) {
        return [...this.activeToasts].some(toast => toast.classList.contains(type));
    }

    /**
     * Creates a persistent toast that doesn't auto-dismiss
     * @param {string} message - The message to display
     * @param {string} type - Toast type
     * @returns {HTMLElement|null} - The created toast element
     */
    showPersistent(message, type = 'info') {
        const toast = this.show(message, type, 0); // 0 duration means no auto-dismiss
        
        if (toast) {
            // Clear any existing auto-dismiss timeout
            clearTimeout(toast.autoHideTimeout);
            toast.classList.add('persistent');
        }
        
        return toast;
    }

    /**
     * Shows a toast with a custom action button
     * @param {string} message - The message to display
     * @param {string} actionText - Text for the action button
     * @param {Function} actionCallback - Callback for the action button
     * @param {string} type - Toast type
     * @param {number} duration - Duration in ms
     * @returns {HTMLElement|null} - The created toast element
     */
    showWithAction(message, actionText, actionCallback, type = 'info', duration = CONFIG.ANIMATIONS.TOAST_DURATION * 2) {
        const toast = this.createToastElement(message, type);
        
        // Add action button
        const actionButton = document.createElement('button');
        actionButton.className = 'toast-action ml-2 px-2 py-1 text-xs bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors';
        actionButton.textContent = actionText;
        actionButton.addEventListener('click', () => {
            actionCallback();
            this.dismissToast(toast);
        });
        
        toast.appendChild(actionButton);
        
        this.toastContainer.appendChild(toast);
        this.activeToasts.add(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-dismiss after longer duration
        setTimeout(() => {
            this.dismissToast(toast);
        }, duration);

        return toast;
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.dismissAll();
        this.activeToasts.clear();
        
        if (this.toastContainer && this.toastContainer.id === 'toast-container') {
            // Only remove if we created it as a fallback
            const isOurContainer = this.toastContainer.querySelector('.toast') === null;
            if (isOurContainer) {
                this.toastContainer.remove();
            }
        }
        
        this.toastContainer = null;
        this.srAnnouncementElement = null;
    }
}

// Create a singleton instance for global use
export const toast = new ToastManager();

// Backward compatibility - global functions
if (typeof window !== 'undefined') {
    window.showToast = (message, type, duration) => toast.show(message, type, duration);
}
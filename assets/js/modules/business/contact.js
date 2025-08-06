// assets/js/modules/business/contact.js

import { CONFIG, CONTACT_INFO } from '../config.js';
import { getElements, attachEventListeners, getWhatsAppUrl } from '../utils.js';

/**
 * ContactManager - Handles contact functionality, address copying, and communication
 */
export class ContactManager {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.isInitialized = false;
        this.copyAttempts = new Map(); // Track copy attempts for rate limiting
    }

    /**
     * Initialize contact functionality
     */
    init() {
        try {
            this.initContactElements();
            this.initCopyAddressButtons();
            this.initPhoneAndEmailLinks();
            this.initWhatsAppLinks();
            
            this.isInitialized = true;
            console.log('✅ Contact functionality initialized');
            
        } catch (error) {
            console.error('❌ Error initializing contact functions:', error);
            if (this.showToast) {
                this.showToast('Error al inicializar funciones de contacto', 'error');
            }
        }
    }

    /**
     * Initialize copy address button functionality
     */
    initCopyAddressButtons() {
        const copyButtons = attachEventListeners('button[onclick="copyAddress()"]', 'click', (event) => {
            event.preventDefault();
            this.copyAddress(event);
        });

        if (copyButtons > 0) {
            console.log(`✅ Initialized ${copyButtons} copy address buttons`);
        }
    }

    /**
     * Initialize phone and email link updates
     */
    initPhoneAndEmailLinks() {
        const phoneLinks = getElements('a[href^="tel:"]');
        phoneLinks.forEach(link => {
            link.href = `tel:${CONTACT_INFO.phone}`;
            if (!link.textContent.trim()) {
                link.textContent = CONTACT_INFO.phoneDisplay;
            }
        });
        
        const emailLinks = getElements('a[href^="mailto:"]');
        emailLinks.forEach(link => {
            link.href = `mailto:${CONTACT_INFO.email}`;
            if (!link.textContent.trim()) {
                link.textContent = CONTACT_INFO.email;
            }
        });

        if (phoneLinks.length > 0 || emailLinks.length > 0) {
            console.log(`✅ Updated ${phoneLinks.length} phone links and ${emailLinks.length} email links`);
        }
    }

    /**
     * Initialize WhatsApp links with proper messages
     */
    initWhatsAppLinks() {
        const whatsappLinks = getElements('a[href*="wa.me"], a[href*="whatsapp.com"]');
        
        if (whatsappLinks.length > 0) {
            whatsappLinks.forEach(link => {
                // Set the link directly from the config file
                link.href = CONTACT_INFO.whatsappUrl;
                
                // Optional: add tracking
                link.addEventListener('click', () => {
                    console.log('WhatsApp link clicked');
                    // You can add analytics tracking here if you want
                });
            });
            console.log(`✅ Updated ${whatsappLinks.length} WhatsApp links to the primary business URL.`);
        }
    }

    /**
     * Generic copy text functionality with rate limiting
     */
    copyTextToClipboard(text, successCallback, errorCallback, identifier = 'default') {
        const now = Date.now();
        const lastAttempt = this.copyAttempts.get(identifier) || 0;
        
        if (now - lastAttempt < 1000) { // 1 second cooldown
            if (this.showToast) this.showToast('Por favor espera antes de copiar de nuevo', 'warning', 2000);
            return;
        }
        
        this.copyAttempts.set(identifier, now);

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(successCallback)
                .catch(() => this.fallbackCopyText(text, successCallback, errorCallback));
        } else {
            this.fallbackCopyText(text, successCallback, errorCallback);
        }
    }

    /**
     * Fallback method for copying text
     */
    fallbackCopyText(text, successCallback, errorCallback) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.setAttribute('readonly', '');
        
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) successCallback();
            else errorCallback();
        } catch (err) {
            errorCallback();
        } finally {
            textArea.remove();
        }
    }

    /**
     * Copies the business address to clipboard
     */
    copyAddress(event) {
        this.copyTextToClipboard(
            CONFIG.BUSINESS.ADDRESS,
            () => this.showCopySuccess(event),
            () => this.showToast('No se pudo copiar la dirección', 'error'),
            'address'
        );
    }

    /**
     * Shows visual feedback when content is successfully copied
     */
    showCopySuccess(event, message = '¡Copiado!') {
        const button = event ? event.target.closest('button') : null;
        
        if (button) {
            const originalContent = button.innerHTML;
            button.innerHTML = `
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>${message}</span>`;
            button.classList.add('text-green-600');
            button.disabled = true;
            
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.classList.remove('text-green-600');
                button.disabled = false;
            }, 2000);
        }
        this.showToast('¡Dirección copiada al portapapeles!', 'success');
    }

    /**
     * Track WhatsApp interactions for analytics
     */
    trackWhatsAppClick(message) {
        console.log('WhatsApp interaction:', { message: message.substring(0, 50) + '...' });
        // Add analytics tracking here if needed
    }

    /**
     * Initialize contact element updates
     */
    initContactElements() {
        getElements('[data-contact="address"]').forEach(el => el.textContent = CONTACT_INFO.address.full);
        getElements('[data-contact="phone"]').forEach(el => el.textContent = CONTACT_INFO.phoneDisplay);
        getElements('[data-contact="email"]').forEach(el => el.textContent = CONTACT_INFO.email);
    }

    destroy() {
        this.copyAttempts.clear();
        this.isInitialized = false;
        console.log('Contact manager destroyed');
    }
}

// Create a singleton instance
export const contactManager = new ContactManager();
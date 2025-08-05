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
        // Add copy address button listeners
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
        // Update all phone links
        const phoneLinks = getElements('a[href^="tel:"]');
        phoneLinks.forEach(link => {
            link.href = `tel:${CONTACT_INFO.phone}`;
            if (!link.textContent.trim() || link.textContent.includes('placeholder')) {
                link.textContent = CONTACT_INFO.phoneDisplay;
            }
        });
        
        // Update all email links  
        const emailLinks = getElements('a[href^="mailto:"]');
        emailLinks.forEach(link => {
            link.href = `mailto:${CONTACT_INFO.email}`;
            if (!link.textContent.trim() || link.textContent.includes('placeholder')) {
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
        const whatsappLinks = getElements('a[href*="wa.me"], a[href*="whatsapp"]');
        
        whatsappLinks.forEach(link => {
            // Extract existing message if any
            let message = '';
            try {
                const currentUrl = new URL(link.href);
                message = currentUrl.searchParams.get('text') || '';
            } catch (e) {
                // If URL parsing fails, use default message
                message = '';
            }

            // Set default message if none exists
            if (!message) {
                message = '¡Hola! Me interesa hacer un pedido en Smokehouse.';
            }

            link.href = getWhatsAppUrl(message);
            
            // Add click tracking
            link.addEventListener('click', () => {
                this.trackWhatsAppClick(message);
            });
        });

        if (whatsappLinks.length > 0) {
            console.log(`✅ Updated ${whatsappLinks.length} WhatsApp links`);
        }
    }

    /**
     * Generic copy text functionality with rate limiting
     * @param {string} text - Text to copy
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     * @param {string} identifier - Unique identifier for rate limiting
     */
    copyTextToClipboard(text, successCallback, errorCallback, identifier = 'default') {
        // Rate limiting: prevent rapid successive copies
        const now = Date.now();
        const lastAttempt = this.copyAttempts.get(identifier) || 0;
        
        if (now - lastAttempt < 1000) { // 1 second cooldown
            if (this.showToast) {
                this.showToast('Por favor espera antes de copiar de nuevo', 'warning', 2000);
            }
            return;
        }
        
        this.copyAttempts.set(identifier, now);

        if (navigator.clipboard && window.isSecureContext) {
            // Use modern clipboard API
            navigator.clipboard.writeText(text)
                .then(successCallback)
                .catch(() => {
                    this.fallbackCopyText(text, successCallback, errorCallback);
                });
        } else {
            // Fallback for older browsers
            this.fallbackCopyText(text, successCallback, errorCallback);
        }
    }

    /**
     * Fallback method for copying text in older browsers
     * @param {string} text - Text to copy
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    fallbackCopyText(text, successCallback, errorCallback) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.setAttribute('readonly', '');
        textArea.setAttribute('aria-hidden', 'true');
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful && successCallback) {
                successCallback();
            } else if (errorCallback) {
                errorCallback();
            }
        } catch (err) {
            console.error('Copy failed:', err);
            if (errorCallback) {
                errorCallback();
            }
        } finally {
            textArea.remove();
        }
    }

    /**
     * Copies the business address to clipboard with fallback support
     * @param {Event} event - Click event
     */
    copyAddress(event) {
        const address = CONFIG.BUSINESS.ADDRESS;
        
        this.copyTextToClipboard(
            address,
            () => this.showCopySuccess(event),
            () => {
                if (this.showToast) {
                    this.showToast('No se pudo copiar la dirección', 'error');
                }
            },
            'address'
        );
    }

    /**
     * Copies phone number to clipboard
     * @param {Event} event - Optional click event
     */
    copyPhone(event = null) {
        this.copyTextToClipboard(
            CONTACT_INFO.phone,
            () => {
                if (this.showToast) {
                    this.showToast('¡Teléfono copiado al portapapeles!', 'success');
                }
                this.showCopySuccess(event, '¡Copiado!');
            },
            () => {
                if (this.showToast) {
                    this.showToast('No se pudo copiar el teléfono', 'error');
                }
            },
            'phone'
        );
    }

    /**
     * Copies email to clipboard
     * @param {Event} event - Optional click event
     */
    copyEmail(event = null) {
        this.copyTextToClipboard(
            CONTACT_INFO.email,
            () => {
                if (this.showToast) {
                    this.showToast('¡Email copiado al portapapeles!', 'success');
                }
                this.showCopySuccess(event, '¡Copiado!');
            },
            () => {
                if (this.showToast) {
                    this.showToast('No se pudo copiar el email', 'error');
                }
            },
            'email'
        );
    }

    /**
     * Shows visual feedback when content is successfully copied
     * @param {Event} event - Click event
     * @param {string} message - Success message to show
     */
    showCopySuccess(event, message = '¡Copiado!') {
        const button = event ? event.target.closest('button') : null;
        
        if (button) {
            const originalContent = button.innerHTML;
            
            button.innerHTML = `
                <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>${message}</span>
            `;
            
            button.classList.add('text-green-600');
            button.disabled = true;
            
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.classList.remove('text-green-600');
                button.disabled = false;
            }, 2000);
        }

        if (this.showToast) {
            this.showToast('¡Dirección copiada al portapapeles!', 'success');
        }
    }

    /**
     * Generates WhatsApp URL with cart information
     * @param {Array} cartItems - Optional cart items to include
     * @returns {string} - WhatsApp URL
     */
    generateWhatsAppOrderUrl(cartItems = []) {
        let message = '¡Hola! Me gustaría hacer un pedido:\n\n';
        
        if (cartItems && cartItems.length > 0) {
            cartItems.forEach(item => {
                message += `${item.quantity}x ${item.title} - $${(item.price * item.quantity).toFixed(0)}\n`;
            });
            
            const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            message += `\nTotal: $${total.toFixed(0)}\n\n`;
        }
        
        message += 'Por favor confirma disponibilidad y tiempo de entrega. ¡Gracias!';
        
        return getWhatsAppUrl(message);
    }

    /**
     * Opens WhatsApp with order information
     * @param {Array} cartItems - Cart items to include in message
     */
    openWhatsAppOrder(cartItems = []) {
        const url = this.generateWhatsAppOrderUrl(cartItems);
        window.open(url, '_blank');
        
        // Track the interaction
        this.trackWhatsAppClick('order', cartItems.length);
    }

    /**
     * Track WhatsApp interactions for analytics
     * @param {string} message - Message type or content
     * @param {number} itemCount - Number of cart items (if applicable)
     */
    trackWhatsAppClick(message, itemCount = 0) {
        console.log('WhatsApp interaction:', { 
            message: message.substring(0, 50) + '...', 
            itemCount,
            timestamp: new Date().toISOString() 
        });
        
        // Add analytics tracking here if needed
        // Example: gtag('event', 'whatsapp_click', { message_type: 'order', items: itemCount });
    }

    /**
     * Initialize contact element updates
     */
    initContactElements() {
        // Update any elements with placeholder contact info
        const addressElements = getElements('[data-contact="address"]');
        addressElements.forEach(el => {
            el.textContent = CONTACT_INFO.address.full;
        });

        const phoneElements = getElements('[data-contact="phone"]');
        phoneElements.forEach(el => {
            el.textContent = CONTACT_INFO.phoneDisplay;
        });

        const emailElements = getElements('[data-contact="email"]');
        emailElements.forEach(el => {
            el.textContent = CONTACT_INFO.email;
        });

        if (addressElements.length + phoneElements.length + emailElements.length > 0) {
            console.log('✅ Updated contact information elements');
        }
    }

    /**
     * Get formatted contact information
     * @returns {Object} - Formatted contact info
     */
    getFormattedContactInfo() {
        return {
            address: {
                full: CONTACT_INFO.address.full,
                street: CONTACT_INFO.address.street,
                city: CONTACT_INFO.address.city,
                postalCode: CONTACT_INFO.address.postalCode
            },
            phone: {
                raw: CONTACT_INFO.phone,
                display: CONTACT_INFO.phoneDisplay,
                link: `tel:${CONTACT_INFO.phone}`
            },
            email: {
                address: CONTACT_INFO.email,
                link: `mailto:${CONTACT_INFO.email}`
            },
            whatsapp: {
                base: CONTACT_INFO.whatsappBase,
                orderUrl: (items) => this.generateWhatsAppOrderUrl(items)
            },
            maps: {
                url: CONTACT_INFO.googleMapsUrl
            }
        };
    }

    /**
     * Open address in maps application
     */
    openInMaps() {
        window.open(CONTACT_INFO.googleMapsUrl, '_blank');
        
        if (this.showToast) {
            this.showToast('Abriendo en Google Maps...', 'info', 2000);
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.copyAttempts.clear();
        this.isInitialized = false;
        console.log('Contact manager destroyed');
    }
}

// Create a singleton instance
export const contactManager = new ContactManager();
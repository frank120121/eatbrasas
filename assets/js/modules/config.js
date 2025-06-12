// assets/js/modules/config.js

/**
 * Configuration constants for Brasas El Gordo website
 */
export const CONFIG = {
    CART: {
        STORAGE_KEY: 'brasasElGordoCart',
        MAX_QUANTITY: 99
    },
    ANIMATIONS: {
        TOAST_DURATION: 3000,
        BUTTON_FEEDBACK_DURATION: 1200,
        CART_ANIMATION_DURATION: 300
    },
    SCROLL: {
        THRESHOLD: 50,
        DEBOUNCE_DELAY: 10
    },
    BUSINESS: {
        OPEN_TIME: 10.75, // 10:45 AM
        CLOSE_TIME: 22,   // 10:00 PM
        ADDRESS: 'Av. Álvaro Obregón 2437, Sonora, 84094 Heroica Nogales, Son'
    },
    SELECTORS: {
        CART: {
            DESKTOP_COUNT: '#cart-item-count',
            MOBILE_COUNT: '#mobile-cart-item-count',
            OVERLAY: '#cart-overlay',
            DRAWER: '#cart-drawer',
            BTN: '#cart-btn',
            MOBILE_BTN: '#mobile-cart-btn',
            CLOSE_BTN: '#close-cart-btn',
            ITEMS_CONTAINER: '#cart-items-container',
            EMPTY_MESSAGE: '#empty-cart-message',
            FOOTER: '#cart-footer',
            HEADER_COUNT: '#cart-header-count',
            TOTAL: '#cart-total',
            SR_ANNOUNCEMENT: '#cart-sr-announcement'
        },
        BUSINESS: {
            STATUS_CONTAINER: '#business-status',
            STATUS_INDICATOR: '#status-indicator',
            STATUS_TEXT: '#status-text'
        }
    }
};

export const CONTACT_INFO = {
    phone: '+526311234567',
    phoneDisplay: '+52 631 123 4567',
    email: 'info@brasaselgordo.com',
    whatsappBase: 'https://wa.me/526311234567',
    address: {
        full: 'Av. Álvaro Obregón 2437, Sonora, 84094 Heroica Nogales, Son',
        street: 'Av. Álvaro Obregón 2437',
        city: 'Heroica Nogales, Sonora',
        postalCode: '84094'
    },
    googleMapsUrl: 'https://maps.google.com/?q=Av.+Alvaro+Obregon+2437,+Sonora,+84094+Heroica+Nogales,+Son'
};
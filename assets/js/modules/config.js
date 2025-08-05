// assets/js/modules/config.js

/**
 * Configuration constants for Brasas Smokehouse website
 */
export const CONFIG = {
    CART: {
        STORAGE_KEY: 'brasasSmokehouseCart',
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
        OPEN_TIME: 6.00, // 6:00 AM
        CLOSE_TIME: 23,   // 11:00 PM
        ADDRESS: 'Prolongación Álvaro Obregón 4257, Villa Sonora, 84093 Heroica Nogales, Son'
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
    phone: '+526311093226',
    phoneDisplay: '+52 631 109 3226',
    email: 'info@eatbrasas.com',
    whatsappBase: 'https://wa.me/526311093226',
    address: {
        full: 'Prolongación Álvaro Obregón 4257, Villa Sonora, 84093 Heroica Nogales, Son',
        street: 'Prolongación Álvaro Obregón 4257',
        city: 'Villa Sonora, Heroica Nogales, Sonora',
        postalCode: '84093'
    },
    googleMapsUrl: 'https://maps.app.goo.gl/tumFtTnoojhrDaqt7'
};
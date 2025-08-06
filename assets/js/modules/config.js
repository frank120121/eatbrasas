// assets/js/modules/config.js

/**
 * Configuration constants for Brasas Smokehouse website
 */
export const CONFIG = {
    ANIMATIONS: {
        TOAST_DURATION: 3000,
        BUTTON_FEEDBACK_DURATION: 1200
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
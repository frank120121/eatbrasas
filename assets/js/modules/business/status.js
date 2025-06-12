// assets/js/modules/business/status.js

import { CONFIG } from '../config.js';
import { getElement } from '../utils.js';

/**
 * BusinessStatus - Handles business hours and status display
 */
export class BusinessStatus {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.statusUpdateInterval = null;
        this.isInitialized = false;
    }

    /**
     * Initialize business status functionality
     */
    init() {
        try {
            // Initialize business status display
            this.updateBusinessStatus();
            
            // Update status every minute
            this.statusUpdateInterval = setInterval(() => {
                this.updateBusinessStatus();
            }, 60000);

            this.isInitialized = true;
            console.log('✅ Business status functionality initialized');
            
        } catch (error) {
            console.error('❌ Error initializing business status:', error);
            if (this.showToast) {
                this.showToast('Error al inicializar estado del negocio', 'error');
            }
        }
    }

    /**
     * Updates the business status indicator based on current time
     */
    updateBusinessStatus() {
        const isOpen = this.isBusinessOpen();
        this.updateBusinessStatusDisplay(isOpen);
        
        // Log status change for debugging
        console.log(`Business status updated: ${isOpen ? 'OPEN' : 'CLOSED'}`);
    }

    /**
     * Checks if the business is currently open
     * @returns {boolean} - True if business is open
     */
    isBusinessOpen() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour + (currentMinute / 60);
        
        return currentTime >= CONFIG.BUSINESS.OPEN_TIME && currentTime < CONFIG.BUSINESS.CLOSE_TIME;
    }

    /**
     * Gets the current business hours as a formatted string
     * @returns {string} - Formatted business hours
     */
    getBusinessHours() {
        const openHour = Math.floor(CONFIG.BUSINESS.OPEN_TIME);
        const openMinute = Math.round((CONFIG.BUSINESS.OPEN_TIME - openHour) * 60);
        const closeHour = Math.floor(CONFIG.BUSINESS.CLOSE_TIME);
        const closeMinute = Math.round((CONFIG.BUSINESS.CLOSE_TIME - closeHour) * 60);
        
        const formatTime = (hour, minute) => {
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            const displayMinute = minute.toString().padStart(2, '0');
            return `${displayHour}:${displayMinute} ${period}`;
        };
        
        return `${formatTime(openHour, openMinute)} - ${formatTime(closeHour, closeMinute)}`;
    }

    /**
     * Gets the next opening time
     * @returns {Date} - Next opening time
     */
    getNextOpeningTime() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour + (currentMinute / 60);
        
        const nextOpen = new Date();
        if (currentTime >= CONFIG.BUSINESS.CLOSE_TIME) {
            nextOpen.setDate(nextOpen.getDate() + 1);
        }
        nextOpen.setHours(Math.floor(CONFIG.BUSINESS.OPEN_TIME), 
                         Math.round((CONFIG.BUSINESS.OPEN_TIME - Math.floor(CONFIG.BUSINESS.OPEN_TIME)) * 60), 
                         0, 0);
        
        return nextOpen;
    }

    /**
     * Calculates hours until business opens
     * @returns {number} - Hours until opening
     */
    getHoursUntilOpen() {
        if (this.isBusinessOpen()) {
            return 0;
        }
        
        const now = new Date();
        const nextOpen = this.getNextOpeningTime();
        return Math.ceil((nextOpen - now) / (1000 * 60 * 60));
    }

    /**
     * Calculates hours until business closes (if currently open)
     * @returns {number} - Hours until closing, 0 if closed
     */
    getHoursUntilClose() {
        if (!this.isBusinessOpen()) {
            return 0;
        }
        
        const now = new Date();
        const todayClose = new Date();
        todayClose.setHours(Math.floor(CONFIG.BUSINESS.CLOSE_TIME), 
                           Math.round((CONFIG.BUSINESS.CLOSE_TIME - Math.floor(CONFIG.BUSINESS.CLOSE_TIME)) * 60), 
                           0, 0);
        
        return Math.ceil((todayClose - now) / (1000 * 60 * 60));
    }

    /**
     * Generate closed message with time until opening
     * @returns {string} - Formatted closed message
     */
    getClosedMessage() {
        const hoursUntilOpen = this.getHoursUntilOpen();
        
        if (hoursUntilOpen <= 12) {
            return `Cerrado - Abre en ${hoursUntilOpen}h`;
        } else {
            const nextOpen = this.getNextOpeningTime();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            if (nextOpen >= tomorrow) {
                return 'Cerrado - Abre mañana a las 10:45 AM';
            } else {
                return 'Cerrado - Abre hoy a las 10:45 AM';
            }
        }
    }

    /**
     * Generate open message with time until closing
     * @returns {string} - Formatted open message
     */
    getOpenMessage() {
        const hoursUntilClose = this.getHoursUntilClose();
        
        if (hoursUntilClose <= 1) {
            return 'Abierto ahora - Cierra pronto';
        } else if (hoursUntilClose <= 3) {
            return `Abierto ahora - Cierra en ${hoursUntilClose}h`;
        } else {
            return 'Abierto ahora';
        }
    }

    /**
     * Generic business status updater
     * @param {boolean} isOpen - Whether business is open
     */
    updateBusinessStatusDisplay(isOpen) {
        const container = getElement(CONFIG.SELECTORS.BUSINESS.STATUS_CONTAINER);
        const indicator = getElement(CONFIG.SELECTORS.BUSINESS.STATUS_INDICATOR);
        const text = getElement(CONFIG.SELECTORS.BUSINESS.STATUS_TEXT);

        if (!container || !indicator || !text) {
            console.warn('Business status elements not found');
            return;
        }

        const styles = isOpen ? {
            container: 'mt-4 flex items-center space-x-3 bg-green-50 px-4 py-3 rounded-xl',
            indicator: 'w-3 h-3 bg-green-500 rounded-full animate-pulse',
            text: 'text-green-700 font-semibold text-sm',
            textContent: this.getOpenMessage()
        } : {
            container: 'mt-4 flex items-center space-x-3 bg-red-50 px-4 py-3 rounded-xl',
            indicator: 'w-3 h-3 bg-red-500 rounded-full',
            text: 'text-red-700 font-semibold text-sm',
            textContent: this.getClosedMessage()
        };

        container.className = styles.container;
        indicator.className = styles.indicator;
        text.className = styles.text;
        text.textContent = styles.textContent;

        // Add accessibility attributes
        container.setAttribute('aria-label', `Estado del negocio: ${isOpen ? 'Abierto' : 'Cerrado'}`);
        indicator.setAttribute('aria-hidden', 'true');
    }

    /**
     * Forces a business status check and update
     * Can be called by user interaction or external events
     */
    checkBusinessStatus() {
        this.updateBusinessStatus();
        
        if (this.showToast) {
            const isOpen = this.isBusinessOpen();
            const message = isOpen ? this.getOpenMessage() : this.getClosedMessage();
            const type = isOpen ? 'success' : 'info';
            this.showToast(`Estado actual: ${message}`, type, 4000);
        }
    }

    /**
     * Gets detailed business status information
     * @returns {Object} - Detailed status object
     */
    getDetailedStatus() {
        const isOpen = this.isBusinessOpen();
        return {
            isOpen,
            message: isOpen ? this.getOpenMessage() : this.getClosedMessage(),
            businessHours: this.getBusinessHours(),
            hoursUntilOpen: this.getHoursUntilOpen(),
            hoursUntilClose: this.getHoursUntilClose(),
            nextOpeningTime: this.getNextOpeningTime(),
            lastUpdated: new Date()
        };
    }

    /**
     * Sets up a one-time notification for when business opens/closes
     * @param {string} type - 'open' or 'close'
     */
    scheduleStatusNotification(type = 'open') {
        if (!this.showToast) return;

        const now = new Date();
        let targetTime;

        if (type === 'open') {
            if (this.isBusinessOpen()) {
                this.showToast('El negocio ya está abierto', 'info');
                return;
            }
            targetTime = this.getNextOpeningTime();
        } else {
            if (!this.isBusinessOpen()) {
                this.showToast('El negocio ya está cerrado', 'info');
                return;
            }
            targetTime = new Date();
            targetTime.setHours(Math.floor(CONFIG.BUSINESS.CLOSE_TIME), 
                               Math.round((CONFIG.BUSINESS.CLOSE_TIME - Math.floor(CONFIG.BUSINESS.CLOSE_TIME)) * 60), 
                               0, 0);
        }

        const timeUntil = targetTime - now;
        
        if (timeUntil > 0 && timeUntil < 24 * 60 * 60 * 1000) { // Within 24 hours
            setTimeout(() => {
                if (this.showToast) {
                    const message = type === 'open' ? '¡El negocio está ahora abierto!' : 'El negocio está ahora cerrado';
                    const toastType = type === 'open' ? 'success' : 'info';
                    this.showToast(message, toastType, 6000);
                }
            }, timeUntil);

            const hours = Math.ceil(timeUntil / (1000 * 60 * 60));
            this.showToast(
                `Notificación programada para cuando ${type === 'open' ? 'abra' : 'cierre'} (en ~${hours}h)`, 
                'info', 
                3000
            );
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
        this.isInitialized = false;
        console.log('Business status module destroyed');
    }
}

// Create a singleton instance
export const businessStatus = new BusinessStatus();
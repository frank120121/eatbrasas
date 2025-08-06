// assets/js/modules/ui/header.js

import { CONFIG } from '../config.js';
import { 
    getElement, 
    getElements, 
    toggleClasses, 
    setAttributes, 
    throttle,
    attachEventListeners 
} from '../utils.js';

/**
 * HeaderManager - Handles header scroll effects, mobile menu, and smooth scrolling
 */
export class HeaderManager {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.header = null;
        this.lastScrollY = 0;
        this.autoHideTimeout = null; // ADDED: To manage the auto-hide timer
        this.mobileMenu = null;
        this.mobileMenuToggles = [];
        this.isInitialized = false;
        this.isMobileMenuOpen = false;
        this.scrollHandler = null;
        this.resizeHandler = null;
    }

    /**
     * Initialize header functionality
     */
    init() {
        try {
            this.initElements();
            this.initScrollEffects();
            this.initMobileMenu();
            this.initSmoothScrolling();
            this.initResizeHandler();
            
            this.isInitialized = true;
            console.log('✅ Header functionality initialized');
            
        } catch (error) {
            console.error('❌ Error initializing header:', error);
            if (this.showToast) {
                this.showToast('Error al inicializar el header', 'error');
            }
        }
    }

    /**
     * Initialize header elements
     */
    initElements() {
        this.header = getElement('header');
        this.mobileMenu = getElement('.mobile-menu');
        this.mobileMenuToggles = [...getElements('.mobile-menu-toggle')];

        if (!this.header) {
            throw new Error('Header element not found');
        }

        console.log(`Found header and ${this.mobileMenuToggles.length} mobile menu toggles`);
    }

    /**
     * Initialize header scroll effects
     */
    initScrollEffects() {
        if (!this.header) return;
        this.lastScrollY = window.scrollY;
        this.scrollHandler = throttle(() => this.updateHeaderScrollState(), 100);
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        this.updateHeaderScrollState();
    }
    
    // --- HELPER METHODS FOR VISIBILITY ---
    showHeader() {
        if (this.header.classList.contains('invisible')) {
            this.header.classList.add('opacity-100', 'visible');
            this.header.classList.remove('opacity-0', 'invisible');
        }
    }

    hideHeader() {
        if (this.header.classList.contains('visible')) {
            this.header.classList.add('opacity-0', 'invisible');
            this.header.classList.remove('opacity-100', 'visible');
        }
    }

    /**
     * Update header state with auto-hide timer.
     */
    updateHeaderScrollState() {
        if (!this.header) return;

        const currentScrollY = window.scrollY;
        const headerHeight = this.header.offsetHeight;

        // Clear any existing auto-hide timer every time the user scrolls
        clearTimeout(this.autoHideTimeout);

        if (currentScrollY <= 10) {
            this.hideHeader();
        }
        // Show header on SCROLL UP
        else if (currentScrollY < this.lastScrollY) {
            this.showHeader();
            // Set a timer to hide the header again after a delay
            this.autoHideTimeout = setTimeout(() => {
                this.hideHeader();
            }, 3000); // Hide after 3 seconds of inactivity. Change this value to adjust the delay.
        }
        // Hide header on SCROLL DOWN
        else if (currentScrollY > this.lastScrollY && currentScrollY > headerHeight) {
            this.hideHeader();
        }

        this.lastScrollY = Math.max(0, currentScrollY);
    }

    // --- All other methods remain the same ---

    initMobileMenu() {
        if (!this.mobileMenu || this.mobileMenuToggles.length === 0) return;
        this.mobileMenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });
            setAttributes(toggle, {
                'aria-expanded': 'false',
                'aria-controls': this.mobileMenu.id || 'mobile-menu',
                'aria-label': 'Abrir menú de navegación'
            });
        });
        this.initMobileMenuLinks();
        this.initMobileMenuKeyboard();
        this.initClickOutsideHandler();
    }

    initMobileMenuLinks() {
        if (!this.mobileMenu) return;
        const menuLinks = this.mobileMenu.querySelectorAll('a[href^="#"]');
        menuLinks.forEach(link => link.addEventListener('click', () => this.closeMobileMenu()));
    }

    initMobileMenuKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileMenuOpen) this.closeMobileMenu();
        });
    }

    initClickOutsideHandler() {
        document.addEventListener('click', (e) => {
            if (this.isMobileMenuOpen && this.mobileMenu && 
                !this.mobileMenu.contains(e.target) &&
                !this.mobileMenuToggles.some(toggle => toggle.contains(e.target))) {
                this.closeMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen ? this.closeMobileMenu() : this.openMobileMenu();
    }

    openMobileMenu() {
        if (!this.mobileMenu || this.isMobileMenuOpen) return;
        this.isMobileMenuOpen = true;
        this.mobileMenu.classList.add('show');
        document.body.style.overflow = 'hidden';
        this.mobileMenuToggles.forEach(toggle => setAttributes(toggle, {'aria-expanded': 'true'}));
    }

    closeMobileMenu() {
        if (!this.mobileMenu || !this.isMobileMenuOpen) return;
        this.isMobileMenuOpen = false;
        this.mobileMenu.classList.remove('show');
        document.body.style.overflow = '';
        this.mobileMenuToggles.forEach(toggle => setAttributes(toggle, {'aria-expanded': 'false'}));
        if (this.mobileMenuToggles[0]) this.mobileMenuToggles[0].focus();
    }

    initSmoothScrolling() {
        attachEventListeners('a[href^="#"]', 'click', (e) => this.handleSmoothScroll(e));
    }

    handleSmoothScroll(e) {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href');
        const targetElement = getElement(targetId);
        if (targetElement) this.smoothScrollToTarget(targetElement);
    }

    smoothScrollToTarget(targetElement, offset = 80) {
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }

    initResizeHandler() {
        this.resizeHandler = throttle(() => this.handleResize(), 250);
        window.addEventListener('resize', this.resizeHandler);
    }

    handleResize() {
        if (window.innerWidth >= 1024 && this.isMobileMenuOpen) this.closeMobileMenu();
    }
    
    destroy() {
        if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
        clearTimeout(this.autoHideTimeout);
    }
}

// Create a singleton instance
export const headerManager = new HeaderManager();
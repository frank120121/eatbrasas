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
 * HeaderManager
 */
export class HeaderManager {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.header = null;
        this.lastScrollY = 0;
        this.mobileMenu = null;
        this.mobileMenuToggles = [];
        this.isInitialized = false;
        this.isMobileMenuOpen = false;
        this.scrollHandler = null;
        this.resizeHandler = null;
        
        this.hideTimeout = null;
        this.autoHideDelay = 2000; 
        this.isHeaderVisible = true;
        this.scrollDirection = null;
        this.scrollThreshold = 10; 
        this.isScrolling = false;
        this.scrollEndTimeout = null;
    }

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

    initElements() {
        this.header = getElement('header');
        this.mobileMenu = getElement('.mobile-menu');
        this.mobileMenuToggles = [...getElements('.mobile-menu-toggle')];

        if (!this.header) {
            throw new Error('Header element not found');
        }

        this.header.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
        this.header.classList.add('sticky-header');

        const isAtTop = window.scrollY <= 50;
        
        if (isAtTop) {
            this.header.style.transform = 'translateY(-100%)';
            this.header.style.opacity = '0';
            this.isHeaderVisible = false;
            console.log('Header initialized - hidden (at top)');
        } else {
            this.header.style.transform = 'translateY(0)';
            this.header.style.opacity = '1';
            this.isHeaderVisible = true;
            console.log('Header initialized - visible (scrolled)');
        }

        console.log(`Found header and ${this.mobileMenuToggles.length} mobile menu toggles`);
    }

    initScrollEffects() {
        if (!this.header) return;

        this.lastScrollY = window.scrollY;

        this.scrollHandler = throttle(() => {
            this.updateHeaderScrollState();
        }, 16);

        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        
        this.updateHeaderScrollState();
    }

    updateHeaderScrollState() {
        if (!this.header) return;

        const currentScrollY = window.scrollY;
        const headerHeight = this.header.offsetHeight;
        const scrollDifference = currentScrollY - this.lastScrollY;

        this.clearHideTimeout();
        this.isScrolling = true;

        if (this.scrollEndTimeout) {
            clearTimeout(this.scrollEndTimeout);
        }

        this.scrollEndTimeout = setTimeout(() => {
            this.isScrolling = false;
            this.handleScrollEnd();
        }, 150);

        if (Math.abs(scrollDifference) > this.scrollThreshold) {
            this.scrollDirection = scrollDifference > 0 ? 'down' : 'up';
        }

        if (currentScrollY <= 50) {
            this.hideHeader();
        }
        else if (currentScrollY <= headerHeight * 1.5) {
            this.showHeader();
        }
        else if (this.scrollDirection === 'up') {
            this.showHeader();
        }
        else if (this.scrollDirection === 'down' && currentScrollY > headerHeight * 2) {
            this.hideHeader();
        }

        this.lastScrollY = Math.max(0, currentScrollY);
    }

    handleScrollEnd() {
        if (this.isHeaderVisible && 
            window.scrollY > this.header.offsetHeight * 1.5 && 
            !this.isMobileMenuOpen) {
            this.setHideTimeout();
        }
    }

    showHeader() {
        if (!this.header) return;

        if (!this.isHeaderVisible) {
            this.isHeaderVisible = true;
            this.header.style.transform = 'translateY(0)';
            this.header.style.opacity = '1';
            console.log('Header shown');
        }
    }

    hideHeader() {
        if (!this.header) return;

        if (this.isMobileMenuOpen) return;

        if (this.isHeaderVisible) {
            this.isHeaderVisible = false;
            this.header.style.transform = 'translateY(-100%)';
            this.header.style.opacity = '0';
            console.log('Header hidden');
        }
    }

    setHideTimeout() {
        this.clearHideTimeout();
        
        this.hideTimeout = setTimeout(() => {
            if (window.scrollY > this.header?.offsetHeight * 1.5 && 
                !this.isScrolling && 
                !this.isMobileMenuOpen) {
                this.hideHeader();
            }
        }, this.autoHideDelay);
    }

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    initMobileMenu() {
        if (!this.mobileMenu || this.mobileMenuToggles.length === 0) {
            console.warn('Mobile menu elements not found - skipping mobile menu initialization');
            return;
        }

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

        console.log('✅ Mobile menu functionality initialized');
    }

    initMobileMenuLinks() {
        if (!this.mobileMenu) return;

        const menuLinks = this.mobileMenu.querySelectorAll('a[href^="#"]');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.closeMobileMenu();
            });
        });

        console.log(`Initialized ${menuLinks.length} mobile menu links`);
    }

    initMobileMenuKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
        });

        if (this.mobileMenu) {
            this.mobileMenu.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && this.isMobileMenuOpen) {
                    this.handleTabNavigation(e);
                }
            });
        }
    }

    handleTabNavigation(e) {
        const focusableElements = this.mobileMenu.querySelectorAll(
            'a[href], button, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    initClickOutsideHandler() {
        document.addEventListener('click', (e) => {
            if (this.isMobileMenuOpen && 
                this.mobileMenu && 
                !this.mobileMenu.contains(e.target) &&
                !this.mobileMenuToggles.some(toggle => toggle.contains(e.target))) {
                this.closeMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        if (!this.mobileMenu || this.isMobileMenuOpen) return;

        // Always show header when mobile menu opens
        this.showHeader();
        this.clearHideTimeout();

        this.isMobileMenuOpen = true;
        toggleClasses(this.mobileMenu, ['show'], []);
        document.body.style.overflow = 'hidden';

        this.mobileMenuToggles.forEach(toggle => {
            setAttributes(toggle, {
                'aria-expanded': 'true',
                'aria-label': 'Cerrar menú de navegación'
            });
        });

        const firstMenuItem = this.mobileMenu.querySelector('a, button');
        if (firstMenuItem) {
            setTimeout(() => firstMenuItem.focus(), 100);
        }

        console.log('Mobile menu opened');
    }

    closeMobileMenu() {
        if (!this.mobileMenu || !this.isMobileMenuOpen) return;

        this.isMobileMenuOpen = false;
        toggleClasses(this.mobileMenu, [], ['show']);
        document.body.style.overflow = '';

        this.mobileMenuToggles.forEach(toggle => {
            setAttributes(toggle, {
                'aria-expanded': 'false',
                'aria-label': 'Abrir menú de navegación'
            });
        });

        if (this.mobileMenuToggles[0]) {
            this.mobileMenuToggles[0].focus();
        }

        if (window.scrollY > (this.header?.offsetHeight || 0) * 1.5) {
            this.setHideTimeout();
        }

        console.log('Mobile menu closed');
    }

    initSmoothScrolling() {
        const smoothScrollLinks = attachEventListeners('a[href^="#"]', 'click', (e) => {
            this.handleSmoothScroll(e);
        });

        console.log(`✅ Initialized smooth scrolling for ${smoothScrollLinks} anchor links`);
    }

    handleSmoothScroll(e) {
        e.preventDefault();
        
        const targetId = e.target.getAttribute('href');
        const targetElement = getElement(targetId);
        
        if (targetElement) {
            this.smoothScrollToTarget(targetElement);
        } else {
            console.warn('Scroll target not found:', targetId);
            if (this.showToast) {
                this.showToast('Sección no encontrada', 'warning', 2000);
            }
        }
    }

    smoothScrollToTarget(targetElement, offset = 80) {
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });

        const targetId = targetElement.id;
        if (targetId && history.replaceState) {
            history.replaceState(null, null, `#${targetId}`);
        }
    }

    initResizeHandler() {
        this.resizeHandler = throttle(() => {
            this.handleResize();
        }, 250);

        window.addEventListener('resize', this.resizeHandler);
    }

    handleResize() {
        const isDesktop = window.innerWidth >= 768;
        
        if (isDesktop && this.isMobileMenuOpen) {
            this.closeMobileMenu();
        }

        if (isDesktop) {
            document.body.style.overflow = '';
        }

        console.log(`Window resized: ${window.innerWidth}px (${isDesktop ? 'desktop' : 'mobile'})`);
    }

    getHeaderState() {
        return {
            isVisible: this.isHeaderVisible,
            isMobileMenuOpen: this.isMobileMenuOpen,
            scrollPosition: window.scrollY,
            scrollDirection: this.scrollDirection,
            windowWidth: window.innerWidth,
            isInitialized: this.isInitialized,
            hasHideTimeout: !!this.hideTimeout,
            isScrolling: this.isScrolling
        };
    }

    scrollToSection(sectionId, offset = 80) {
        const targetElement = getElement(`#${sectionId}`);
        if (targetElement) {
            this.smoothScrollToTarget(targetElement, offset);
            return true;
        }
        return false;
    }

    updateHeader() {
        this.updateHeaderScrollState();
    }

    onScroll(callback) {
        if (typeof callback === 'function') {
            const wrappedCallback = throttle(callback, 16);
            window.addEventListener('scroll', wrappedCallback, { passive: true });
            return () => window.removeEventListener('scroll', wrappedCallback);
        }
    }

    getMobileMenuState() {
        return {
            isOpen: this.isMobileMenuOpen,
            toggleCount: this.mobileMenuToggles.length,
            hasMenu: !!this.mobileMenu
        };
    }

    setAutoHideDelay(delay) {
        this.autoHideDelay = delay;
    }

    forceShowHeader() {
        this.clearHideTimeout();
        this.showHeader();
    }

    forceHideHeader() {
        this.clearHideTimeout();
        this.hideHeader();
    }

    // Debug method
    getStats() {
        return {
            isVisible: this.isHeaderVisible,
            scrollY: window.scrollY,
            lastScrollY: this.lastScrollY,
            scrollDirection: this.scrollDirection,
            isScrolling: this.isScrolling,
            hasHideTimeout: !!this.hideTimeout,
            mobileMenuOpen: this.isMobileMenuOpen
        };
    }

    destroy() {
        this.clearHideTimeout();
        
        if (this.scrollEndTimeout) {
            clearTimeout(this.scrollEndTimeout);
        }
        
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
        }
        
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        this.closeMobileMenu();
        document.body.style.overflow = '';

        this.header = null;
        this.mobileMenu = null;
        this.mobileMenuToggles = [];
        this.isInitialized = false;

        console.log('Header manager destroyed');
    }
}

export const headerManager = new HeaderManager();
// assets/js/modules/ui/animations.js

import { getElement, getElements } from '../utils.js';

export class AnimationManager {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.isInitialized = false;
        this.reducedMotion = false;
        this.isLowEndDevice = false;
        this.visibilityObserver = null;
        this.elementsToReveal = new Set();
        this.fallbackTimeout = null;
    }

    async init() {
        // Initialize immediately to prevent any hiding
        this.performInit();
    }

    performInit() {
        try {
            this.detectDeviceCapabilities();
            this.checkMotionPreferences();
            
            // ALWAYS ensure content is visible first
            this.ensureContentVisibility();
            
            if (this.isLowEndDevice || this.reducedMotion) {
                this.initAccessibleMode();
            } else {
                this.initProgressiveEnhancement();
            }
            
            this.initEssentials();
            this.setupFallbacks();
            this.isInitialized = true;
            
            console.log(`✅ Animation manager initialized (${this.getMode()} mode)`);
            
        } catch (error) {
            console.error('❌ Animation init error:', error);
            // Always fallback to showing content
            this.initAccessibleMode();
        }
    }

    ensureContentVisibility() {
        // CRITICAL: Ensure all content is visible immediately
        const allElements = getElements('section, .product-card, .category-preview-card, #menu, #location, #contacto');
        
        allElements.forEach(el => {
            // Remove any hiding
            el.style.display = '';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.classList.remove('hidden', 'invisible');
        });

        // Handle fade-in elements safely
        const fadeElements = getElements('.fade-in');
        fadeElements.forEach(el => {
            // Only animate if explicitly marked AND animations are enabled
            if (!el.classList.contains('animate-on-scroll')) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                el.style.visibility = 'visible';
            }
        });

        console.log(`✅ Ensured visibility for ${allElements.length} elements`);
    }

    detectDeviceCapabilities() {
        // Conservative device detection
        const indicators = {
            lowMemory: navigator.deviceMemory && navigator.deviceMemory < 3,
            lowCPU: navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
            slowConnection: navigator.connection && 
                          (navigator.connection.effectiveType === '2g' || 
                           navigator.connection.effectiveType === 'slow-2g' ||
                           navigator.connection.downlink < 2),
            oldBrowser: !window.IntersectionObserver || !window.requestAnimationFrame
        };

        this.isLowEndDevice = Object.values(indicators).some(Boolean);
    }

    checkMotionPreferences() {
        try {
            this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            this.reducedMotion = false;
        }
    }

    initAccessibleMode() {
        // Show everything immediately, no animations
        const animatedElements = getElements('.fade-in, [data-animate]');
        animatedElements.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.visibility = 'visible';
            el.classList.add('visible');
            el.classList.remove('animate-on-scroll');
        });

        this.handleVideos();
        console.log('♿ Accessible mode - all content immediately visible');
    }

    initProgressiveEnhancement() {
        // Safe progressive enhancement
        this.markElementsForAnimation();
        this.initSafeScrollAnimations();
        this.initBasicInteractions();
    }

    markElementsForAnimation() {
        // Only mark specific elements for animation, not all .fade-in
        const candidateElements = getElements('.fade-in');
        
        candidateElements.forEach((el, index) => {
            // Only animate elements that are not critical and are below the fold
            const rect = el.getBoundingClientRect();
            const isAboveFold = rect.top < window.innerHeight;
            const isCritical = el.closest('#menu, #location, #contacto, .product-card');
            
            if (!isAboveFold && !isCritical && index > 2) {
                // Safe to animate this element
                el.classList.add('animate-on-scroll');
                this.elementsToReveal.add(el);
            } else {
                // Keep visible immediately
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                el.classList.add('visible');
            }
        });

        console.log(`Marked ${this.elementsToReveal.size} elements for animation, ${candidateElements.length - this.elementsToReveal.size} immediately visible`);
    }

    initSafeScrollAnimations() {
        if (this.elementsToReveal.size === 0) return;

        if (!window.IntersectionObserver) {
            // No IntersectionObserver support - show everything
            this.showAllElements();
            return;
        }

        this.visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.elementsToReveal.has(entry.target)) {
                    this.revealElement(entry.target);
                    this.elementsToReveal.delete(entry.target);
                    this.visibilityObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '100px' // Start animation early
        });

        this.elementsToReveal.forEach(el => {
            this.visibilityObserver.observe(el);
        });

        console.log(`👁️ Scroll animations enabled for ${this.elementsToReveal.size} elements`);
    }

    revealElement(element) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.classList.add('visible');
    }

    showAllElements() {
        this.elementsToReveal.forEach(el => this.revealElement(el));
        this.elementsToReveal.clear();
    }

    initBasicInteractions() {
        // Lightweight button feedback
        this.initButtonFeedback();
        this.initVideoHandling();
    }

    initButtonFeedback() {
        // Simple touch feedback
        document.addEventListener('touchstart', (e) => {
            const button = e.target.closest('button, .btn, [role="button"]');
            if (button && !button.disabled) {
                button.style.transform = 'scale(0.98)';
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const button = e.target.closest('button, .btn, [role="button"]');
            if (button) {
                button.style.transform = '';
            }
        }, { passive: true });
    }

    initVideoHandling() {
        const videos = getElements('video[autoplay]');
        videos.forEach(video => {
            video.muted = true;
            video.playsInline = true;
            video.setAttribute('aria-hidden', 'true');
            
            video.play().catch(() => {
                this.handleVideoFallback(video);
            });
        });
    }

    handleVideoFallback(video) {
        video.style.display = 'none';
        const parent = video.parentElement;
        if (parent && !parent.querySelector('.video-fallback')) {
            const fallback = document.createElement('div');
            fallback.className = 'video-fallback';
            fallback.style.cssText = `
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, #ad2118, #ea580c);
                z-index: -1;
            `;
            parent.appendChild(fallback);
        }
    }

    handleVideos() {
        const videos = getElements('video');
        videos.forEach(video => {
            if (this.isLowEndDevice) {
                video.pause();
                this.handleVideoFallback(video);
            }
        });
    }

    setupFallbacks() {
        // Fallback: If something goes wrong, show everything after 3 seconds
        this.fallbackTimeout = setTimeout(() => {
            if (this.elementsToReveal.size > 0) {
                console.warn('⚠️ Animation fallback triggered - showing remaining elements');
                this.showAllElements();
            }
        }, 3000);

        // Fallback: Show everything when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.elementsToReveal.size > 0) {
                this.showAllElements();
            }
        });
    }

    initEssentials() {
        this.updateCurrentYear();
        this.initVisibilityOptimization();
    }

    updateCurrentYear() {
        const yearElements = getElements('#current-year, .current-year');
        const currentYear = new Date().getFullYear();
        yearElements.forEach(el => el.textContent = currentYear);
    }

    initVisibilityOptimization() {
        document.addEventListener('visibilitychange', () => {
            const videos = getElements('video');
            if (document.hidden) {
                videos.forEach(video => {
                    if (!video.paused) {
                        video.pause();
                        video.dataset.wasPaused = 'false';
                    }
                });
            } else if (!this.isLowEndDevice) {
                videos.forEach(video => {
                    if (video.dataset.wasPaused === 'false') {
                        video.play().catch(() => this.handleVideoFallback(video));
                    }
                });
            }
        });
    }

    // Public API
    forceShowAll() {
        this.showAllElements();
        this.ensureContentVisibility();
        console.log('🔧 Force showed all content');
    }

    getMode() {
        if (this.isLowEndDevice || this.reducedMotion) return 'accessible';
        return 'enhanced';
    }

    getStats() {
        return {
            isInitialized: this.isInitialized,
            mode: this.getMode(),
            pendingElements: this.elementsToReveal.size,
            isLowEndDevice: this.isLowEndDevice,
            reducedMotion: this.reducedMotion
        };
    }

    destroy() {
        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
            this.visibilityObserver = null;
        }
        
        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }
        
        this.elementsToReveal.clear();
        this.isInitialized = false;
        
        console.log('Animation manager destroyed');
    }
}

export const animationManager = new AnimationManager();
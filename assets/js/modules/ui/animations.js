// assets/js/modules/ui/animations.js
// Lightweight Animation Manager - Optimized for low-end mobile devices

import { getElement, getElements } from '../utils.js';

/**
 * Lightweight AnimationManager - Mobile-first, low-resource approach
 */
export class AnimationManager {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.isInitialized = false;
        this.reducedMotion = false;
        this.isLowEndDevice = false;
        this.visibilityObserver = null;
        this.elementsToReveal = new Set();
    }

    /**
     * Initialize animation system with device detection
     */
    async init() {
        // Defer initialization to avoid blocking main thread
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => this.performInit(), { timeout: 500 });
        } else {
            setTimeout(() => this.performInit(), 100);
        }
    }

    /**
     * Actual initialization
     */
    performInit() {
        try {
            this.detectDeviceCapabilities();
            this.checkMotionPreferences();
            
            if (this.isLowEndDevice || this.reducedMotion) {
                this.initStaticMode();
            } else {
                this.initLightAnimations();
            }
            
            this.initEssentials();
            this.isInitialized = true;
            
            console.log(`✅ Animations initialized (${this.isLowEndDevice ? 'static' : 'light'} mode)`);
            
        } catch (error) {
            console.error('❌ Animation init error:', error);
            // Fallback to static mode on error
            this.initStaticMode();
        }
    }

    /**
     * Detect device capabilities
     */
    detectDeviceCapabilities() {
        // Check for low-end device indicators
        const indicators = {
            lowMemory: navigator.deviceMemory && navigator.deviceMemory < 4,
            lowConcurrency: navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
            slowConnection: navigator.connection && 
                          (navigator.connection.effectiveType === 'slow-2g' || 
                           navigator.connection.effectiveType === '2g'),
            lowEndCPU: window.performance && 
                      window.performance.now() > 50 // Basic timing check
        };

        this.isLowEndDevice = Object.values(indicators).some(Boolean);
        
        if (this.isLowEndDevice) {
            console.log('📱 Low-end device detected - using minimal animations');
        }
    }

    /**
     * Check user motion preferences
     */
    checkMotionPreferences() {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            this.reducedMotion = true;
            console.log('♿ Reduced motion preference detected');
        }
    }

    /**
     * Initialize static mode (no animations)
     */
    initStaticMode() {
        // Immediately show all elements that would normally animate
        const elementsToShow = getElements('.fade-in, [data-animate]');
        elementsToShow.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.classList.add('no-animation');
        });

        // Handle videos - show static fallbacks
        this.handleVideosStatic();
        
        console.log('🔇 Static mode initialized');
    }

    /**
     * Initialize lightweight animations
     */
    initLightAnimations() {
        // Very simple fade-in on scroll
        this.initSimpleFadeIn();
        
        // Basic video handling
        this.initBasicVideos();
        
        // Simple button feedback
        this.initButtonFeedback();
    }

    /**
     * Simple fade-in using single Intersection Observer
     */
    initSimpleFadeIn() {
        const elements = getElements('.fade-in');
        if (elements.length === 0) return;

        // Add all elements to reveal set
        elements.forEach(el => {
            this.elementsToReveal.add(el);
            // Set initial state ONLY if not already visible
            if (!el.classList.contains('visible')) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            }
        });

        // Single observer for all elements
        this.visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.elementsToReveal.has(entry.target)) {
                    // Simple fade-in
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    entry.target.classList.add('visible');
                    
                    // Remove from observation
                    this.elementsToReveal.delete(entry.target);
                    this.visibilityObserver.unobserve(entry.target);
                    
                    console.log('Faded in:', entry.target.tagName, entry.target.alt || entry.target.className);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        // Observe all elements
        elements.forEach(el => this.visibilityObserver.observe(el));
        
        console.log(`👁️ Simple fade-in for ${elements.length} elements`);
    }

    /**
     * Basic video handling
     */
    initBasicVideos() {
        const videos = getElements('video[autoplay]');
        
        videos.forEach(video => {
            // Set basic attributes
            video.muted = true;
            video.playsInline = true;
            video.setAttribute('aria-hidden', 'true');
            
            // Try to play, fallback on error
            video.play().catch(() => {
                this.showVideoFallback(video);
            });
            
            // Pause when not visible (battery saving)
            video.addEventListener('error', () => this.showVideoFallback(video));
        });

        if (videos.length > 0) {
            console.log(`🎥 Basic video setup for ${videos.length} videos`);
        }
    }

    /**
     * Simple video fallback
     */
    showVideoFallback(video) {
        video.style.display = 'none';
        const parent = video.parentElement;
        
        if (!parent.querySelector('.video-fallback')) {
            const fallback = document.createElement('div');
            fallback.className = 'video-fallback';
            fallback.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                z-index: -1;
            `;
            parent.appendChild(fallback);
        }
    }

    /**
     * Lightweight button feedback
     */
    initButtonFeedback() {
        // Use event delegation for all buttons
        document.addEventListener('touchstart', (e) => {
            const button = e.target.closest('button, .btn, [role="button"]');
            if (button && !button.disabled) {
                button.style.transform = 'scale(0.95)';
                button.style.opacity = '0.8';
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const button = e.target.closest('button, .btn, [role="button"]');
            if (button) {
                button.style.transform = '';
                button.style.opacity = '';
            }
        }, { passive: true });

        // Handle touch cancel
        document.addEventListener('touchcancel', (e) => {
            const button = e.target.closest('button, .btn, [role="button"]');
            if (button) {
                button.style.transform = '';
                button.style.opacity = '';
            }
        }, { passive: true });
    }

    /**
     * Handle videos in static mode
     */
    handleVideosStatic() {
        const videos = getElements('video');
        videos.forEach(video => {
            video.pause();
            this.showVideoFallback(video);
        });
    }

    /**
     * Initialize essential non-animation features
     */
    initEssentials() {
        // Update current year (always needed)
        this.updateCurrentYear();
        
        // Handle visibility changes for battery optimization
        this.initVisibilityOptimization();
    }

    /**
     * Update footer year
     */
    updateCurrentYear() {
        const yearElements = getElements('#current-year, .current-year');
        const currentYear = new Date().getFullYear();
        
        yearElements.forEach(el => {
            el.textContent = currentYear;
        });

        if (yearElements.length > 0) {
            console.log(`📅 Updated ${yearElements.length} year elements to ${currentYear}`);
        }
    }

    /**
     * Optimize for battery when page is hidden
     */
    initVisibilityOptimization() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause all videos
                getElements('video').forEach(video => {
                    if (!video.paused) {
                        video.pause();
                        video.dataset.wasPaused = 'false';
                    }
                });
            } else {
                // Resume videos that were playing (if not low-end device)
                if (!this.isLowEndDevice && !this.reducedMotion) {
                    getElements('video').forEach(video => {
                        if (video.dataset.wasPaused === 'false') {
                            video.play().catch(() => {
                                this.showVideoFallback(video);
                            });
                        }
                    });
                }
            }
        });
    }

    /**
     * Simple element reveal (for dynamic content)
     */
    revealElement(element, immediate = false) {
        if (!element) return;

        if (immediate || this.isLowEndDevice || this.reducedMotion) {
            element.style.opacity = '1';
            element.style.transform = 'none';
        } else {
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '1';
        }
    }

    /**
     * Manual trigger for specific animations
     */
    animate(element, type = 'fadeIn') {
        if (!element || this.isLowEndDevice || this.reducedMotion) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            switch (type) {
                case 'fadeIn':
                    element.style.transition = 'opacity 0.3s ease';
                    element.style.opacity = '1';
                    break;
                case 'slideUp':
                    element.style.transition = 'transform 0.3s ease';
                    element.style.transform = 'translateY(0)';
                    break;
                default:
                    element.style.opacity = '1';
            }
            
            setTimeout(resolve, 300);
        });
    }

    /**
     * Get simple stats
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            isLowEndDevice: this.isLowEndDevice,
            reducedMotion: this.reducedMotion,
            elementsToReveal: this.elementsToReveal.size,
            mode: this.isLowEndDevice || this.reducedMotion ? 'static' : 'light'
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
            this.visibilityObserver = null;
        }
        
        this.elementsToReveal.clear();
        this.isInitialized = false;
        
        console.log('Animation manager destroyed');
    }
}

// Export singleton
export const animationManager = new AnimationManager();
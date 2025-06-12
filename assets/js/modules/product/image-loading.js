// assets/js/modules/product/image-loading.js
// Lightweight Image Loader - Optimized for mobile and low-end devices

import { getElements } from '../utils.js';

/**
 * Lightweight ImageLoader for mobile PWA
 */
export class ImageLoader {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.images = [];
        this.observer = null;
        this.isInitialized = false;
        this.loadedCount = 0;
        this.isLowEndDevice = false;
        this.retryMap = new WeakMap(); // Lightweight retry tracking
    }

    /**
     * Initialize with device detection
     */
    async init() {
        // Defer initialization to avoid blocking critical rendering
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => this.performInit(), { timeout: 1000 });
        } else {
            setTimeout(() => this.performInit(), 300);
        }
    }

    /**
     * Actual initialization
     */
    performInit() {
        try {
            this.detectDeviceCapabilities();
            this.findImages();
            
            if (this.images.length === 0) {
                console.log('No lazy images found');
                return;
            }

            if (this.isLowEndDevice) {
                this.initImmediateLoading();
            } else {
                this.initLazyLoading();
            }
            
            this.isInitialized = true;
            console.log(`✅ Image loader ready (${this.isLowEndDevice ? 'immediate' : 'lazy'} mode) - ${this.images.length} images`);
            
        } catch (error) {
            console.error('❌ Image loader error:', error);
            this.initFallback();
        }
    }

    /**
     * Detect device capabilities for Mexican market
     */
    detectDeviceCapabilities() {
        const indicators = {
            lowMemory: navigator.deviceMemory && navigator.deviceMemory < 4,
            lowCPU: navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
            slowConnection: navigator.connection && 
                          (navigator.connection.effectiveType === '2g' || 
                           navigator.connection.effectiveType === 'slow-2g' ||
                           navigator.connection.downlink < 2), // <2 Mbps
            oldAndroid: /Android [1-6]\./i.test(navigator.userAgent)
        };

        this.isLowEndDevice = Object.values(indicators).some(Boolean);
        
        if (this.isLowEndDevice) {
            console.log('📱 Low-end device - using immediate image loading');
        }
    }

    /**
     * Find images efficiently
     */
    findImages() {
        // Find images with data-src (true lazy loading) and loading="lazy"
        this.images = [...getElements('img[data-src], img[loading="lazy"]')];
        
        // Quick setup for each image
        this.images.forEach(img => {
            // For data-src images, ensure no src is set initially
            if (img.dataset.src && !img.src) {
                // Remove any existing src to prevent immediate loading
                img.removeAttribute('src');
            }
            
            // Ensure proper loading attribute
            if (!img.loading) {
                img.loading = 'lazy';
            }
            
            // Add loading state
            img.classList.add('image-pending');
            
            // Set placeholder styles to prevent layout shift
            if (!img.style.minHeight) {
                img.style.minHeight = '200px';
                img.style.background = '#f3f4f6';
            }
        });
    }

    /**
     * Immediate loading for low-end devices
     */
    initImmediateLoading() {
        // Load first few images immediately, others with small delays
        this.images.forEach((img, index) => {
            if (index < 3) {
                // Load first 3 immediately
                this.loadImage(img);
            } else {
                // Stagger the rest to avoid overwhelming the device
                setTimeout(() => this.loadImage(img), index * 100);
            }
        });
        
        console.log('⚡ Immediate loading mode activated');
    }

    /**
     * Lazy loading for capable devices
     */
    initLazyLoading() {
        if (!('IntersectionObserver' in window)) {
            this.initImmediateLoading();
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '100px', // Simple rootMargin
            threshold: 0.1
        });

        // Observe all images
        this.images.forEach(img => this.observer.observe(img));
        
        // Preload first few images for better UX
        this.preloadCritical();
        
        console.log('👁️ Lazy loading mode activated');
    }

    /**
     * Preload critical images
     */
    preloadCritical() {
        const criticalCount = this.isLowEndDevice ? 2 : 4;
        const criticalImages = this.images.slice(0, criticalCount);
        
        criticalImages.forEach(img => {
            this.observer.unobserve(img);
            this.loadImage(img);
        });
    }

    /**
     * Load single image with simple error handling
     */
    loadImage(img) {
        // Skip if already processed
        if (img.classList.contains('image-loaded') || img.classList.contains('image-error')) {
            return;
        }

        // Set loading state
        img.classList.remove('image-pending');
        img.classList.add('image-loading');

        // Success handler
        const handleLoad = () => {
            img.classList.remove('image-loading');
            img.classList.add('image-loaded');
            img.style.background = ''; // Remove placeholder background
            this.loadedCount++;
            cleanup();
        };

        // Error handler with simple retry
        const handleError = () => {
            const retries = this.retryMap.get(img) || 0;
            
            if (retries < 1) { // Only 1 retry for mobile
                this.retryMap.set(img, retries + 1);
                setTimeout(() => {
                    // Re-trigger load with original source
                    const originalSrc = img.dataset.src || img.src;
                    if (originalSrc) {
                        img.src = originalSrc;
                    }
                }, 1000);
            } else {
                // Final failure
                img.classList.remove('image-loading');
                img.classList.add('image-error');
                this.setFallback(img);
                cleanup();
            }
        };

        // Cleanup listeners
        const cleanup = () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
        };

        // Add listeners
        img.addEventListener('load', handleLoad, { once: true });
        img.addEventListener('error', handleError, { once: true });

        // CRITICAL: Set src from data-src to trigger loading
        if (img.dataset.src && !img.src) {
            img.src = img.dataset.src;
        } else if (!img.src) {
            // If no data-src and no src, this image can't be loaded
            console.warn('Image has no source:', img);
            handleError();
            return;
        }

        // Handle already loaded images (cache hits)
        if (img.complete && img.naturalWidth > 0) {
            handleLoad();
        }
    }

    /**
     * Simple fallback for failed images
     */
    setFallback(img) {
        // Create simple gray placeholder
        const width = img.getAttribute('width') || '300';
        const height = img.getAttribute('height') || '200';
        
        img.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"%3E%3Crect width="100%" height="100%" fill="%23f3f4f6"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EImagen no disponible%3C/text%3E%3C/svg%3E`;
    }

    /**
     * Fallback initialization
     */
    initFallback() {
        console.warn('🚨 Image loader fallback mode');
        
        // Just ensure all images are marked as loaded
        this.images.forEach(img => {
            if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }
            img.classList.add('image-loaded');
        });
    }

    /**
     * Force load all remaining images (emergency)
     */
    forceLoadAll() {
        this.images.forEach(img => {
            if (!img.classList.contains('image-loaded') && !img.classList.contains('image-error')) {
                this.loadImage(img);
            }
        });
        console.log('🚀 Force loading all images');
    }

    /**
     * Get simple stats
     */
    getStats() {
        const pending = this.images.filter(img => 
            img.classList.contains('image-pending') || img.classList.contains('image-loading')
        ).length;
        
        const errors = this.images.filter(img => 
            img.classList.contains('image-error')
        ).length;

        return {
            total: this.images.length,
            loaded: this.loadedCount,
            errors: errors,
            pending: pending,
            isLowEndDevice: this.isLowEndDevice,
            mode: this.isLowEndDevice ? 'immediate' : 'lazy'
        };
    }

    /**
     * Refresh after content changes
     */
    refresh() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.loadedCount = 0;
        this.retryMap = new WeakMap();
        
        // Re-initialize
        this.performInit();
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        this.images = [];
        this.retryMap = new WeakMap();
        this.isInitialized = false;
        
        console.log('Image loader destroyed');
    }
}

// Export singleton
export const imageLoader = new ImageLoader();
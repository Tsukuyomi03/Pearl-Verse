/**
 * Global Toast Notification System using SweetAlert2
 * Beautiful, consistent toast notifications positioned at top right
 * with auto-close functionality - FORCED COLORS VERSION
 */

class ToastNotification {
    constructor() {
        this.defaultDuration = 4000;
        this.init();
    }

    /**
     * Initialize the toast system
     */
    init() {
        // SweetAlert2 handles everything for us
        console.log('Toast system initialized with SweetAlert2 - Forced Colors Version');
    }

    /**
     * Show a toast notification using SweetAlert2
     * @param {string} message - The message to display
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {object} options - Additional options
     */
    show(message, type = 'info', options = {}) {
        // Check if SweetAlert2 is available
        if (typeof Swal === 'undefined') {
            console.error('SweetAlert2 is not loaded');
            alert(message); // Fallback
            return;
        }

        // Filter options to only include valid SweetAlert2 parameters
        const validOptions = {};
        const allowedOptions = ['timer', 'timerProgressBar', 'showConfirmButton', 'showCloseButton', 'position', 'background', 'color', 'width', 'padding', 'grow'];
        allowedOptions.forEach(key => {
            if (options[key] !== undefined) {
                validOptions[key] = options[key];
            }
        });
        
        const config = {
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: options.duration || this.defaultDuration,
            timerProgressBar: true,
            icon: false, // Remove the icon completely
            title: message,
            showCloseButton: false,
            didOpen: (toast) => {
                console.log('Toast opened, type:', type);
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
                
                // Force color function
                const forceColors = () => {
                    console.log('🎨 Forcing colors for type:', type, 'on toast:', toast);
                    console.log('Toast classList:', toast.classList.toString());
                    
                    if (type === 'success') {
                        console.log('✅ Applying SUCCESS colors (GREEN)');
                        toast.style.setProperty('background', '#22c55e', 'important');
                        toast.style.setProperty('background-color', '#22c55e', 'important');
                        toast.style.setProperty('background-image', 'linear-gradient(135deg, #22c55e, #16a34a)', 'important');
                        toast.style.setProperty('color', '#ffffff', 'important');
                        toast.style.setProperty('border', '1px solid #22c55e', 'important');
                        toast.style.setProperty('border-left', '4px solid #16a34a', 'important');
                        toast.style.setProperty('box-shadow', '0 8px 32px rgba(34, 197, 94, 0.4)', 'important');
                    } else if (type === 'error') {
                        console.log('❌ Applying ERROR colors (RED)');
                        
                        // Remove any existing background classes or styles that might interfere
                        toast.style.removeProperty('background');
                        toast.style.removeProperty('background-color');
                        toast.style.removeProperty('background-image');
                        
                        // Force red background with multiple methods
                        toast.style.setProperty('background', '#ef4444', 'important');
                        toast.style.setProperty('background-color', '#ef4444', 'important');
                        toast.style.setProperty('background-image', 'linear-gradient(135deg, #ef4444, #dc2626)', 'important');
                        toast.style.setProperty('color', '#ffffff', 'important');
                        toast.style.setProperty('border', '2px solid #ef4444', 'important');
                        toast.style.setProperty('border-left', '4px solid #dc2626', 'important');
                        toast.style.setProperty('box-shadow', '0 8px 32px rgba(239, 68, 68, 0.4)', 'important');
                        
                        console.log('🔴 Error toast background set to:', window.getComputedStyle(toast).backgroundColor);
                    } else if (type === 'info') {
                        console.log('ℹ️ Applying INFO colors (BLUE)');
                        toast.style.setProperty('background', '#3b82f6', 'important');
                        toast.style.setProperty('background-color', '#3b82f6', 'important');
                        toast.style.setProperty('background-image', 'linear-gradient(135deg, #3b82f6, #2563eb)', 'important');
                        toast.style.setProperty('color', '#ffffff', 'important');
                        toast.style.setProperty('border', '1px solid #3b82f6', 'important');
                        toast.style.setProperty('border-left', '4px solid #2563eb', 'important');
                        toast.style.setProperty('box-shadow', '0 8px 32px rgba(59, 130, 246, 0.4)', 'important');
                    } else if (type === 'warning') {
                        console.log('⚠️ Applying WARNING colors (ORANGE)');
                        toast.style.setProperty('background', '#f59e0b', 'important');
                        toast.style.setProperty('background-color', '#f59e0b', 'important');
                        toast.style.setProperty('background-image', 'linear-gradient(135deg, #f59e0b, #d97706)', 'important');
                        toast.style.setProperty('color', '#ffffff', 'important');
                        toast.style.setProperty('border', '1px solid #f59e0b', 'important');
                        toast.style.setProperty('border-left', '4px solid #d97706', 'important');
                        toast.style.setProperty('box-shadow', '0 8px 32px rgba(245, 158, 11, 0.4)', 'important');
                    }
                    
                    // Force title text color
                    const titleElement = toast.querySelector('.swal2-title');
                    if (titleElement && (type === 'success' || type === 'error')) {
                        titleElement.style.setProperty('color', '#ffffff', 'important');
                        titleElement.style.setProperty('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.3)', 'important');
                    }
                    
                    // Force icon colors
                    const iconElement = toast.querySelector('.swal2-icon');
                    if (iconElement && (type === 'success' || type === 'error')) {
                        iconElement.style.setProperty('color', '#ffffff', 'important');
                        iconElement.style.setProperty('border-color', '#ffffff', 'important');
                        
                        // Target specific icon elements
                        const iconLines = iconElement.querySelectorAll('.swal2-success-line-tip, .swal2-success-line-long, .swal2-success-ring, .swal2-x-mark-line-left, .swal2-x-mark-line-right');
                        iconLines.forEach(line => {
                            line.style.setProperty('background-color', '#ffffff', 'important');
                            line.style.setProperty('border-color', '#ffffff', 'important');
                        });
                    }
                };
                
                // Apply colors immediately
                forceColors();
                
                // Apply again after small delay to override any SweetAlert2 styling
                setTimeout(forceColors, 10);
                setTimeout(forceColors, 50);
                setTimeout(forceColors, 100);
                setTimeout(forceColors, 200);
            },
            customClass: {
                container: 'swal2-top-end',
                popup: 'swal-toast-popup',
                title: 'swal-toast-title',
                icon: 'swal-toast-icon'
            },
            background: this.getBackgroundColor(type),
            color: type === 'success' || type === 'error' ? '#ffffff' : '#e2e8f0',
            width: 'auto',
            padding: '1rem 1.25rem',
            grow: false,
            ...options
        };

        return Swal.fire(config);
    }

    /**
     * Show success toast
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show error toast
     */
    error(message, options = {}) {
        return this.show(message, 'error', { duration: 6000, ...options });
    }

    /**
     * Show warning toast
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', { duration: 5000, ...options });
    }

    /**
     * Show info toast
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Get SweetAlert2 icon for toast type
     */
    getSwalIcon(type) {
        const icons = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        return icons[type] || 'info';
    }

    /**
     * Get background color for toast type
     */
    getBackgroundColor(type) {
        const colors = {
            success: 'linear-gradient(135deg, #22c55e, #16a34a)', // Green gradient
            error: 'linear-gradient(135deg, #ef4444, #dc2626)', // Red gradient
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)', // Orange gradient
            info: 'linear-gradient(135deg, #3b82f6, #2563eb)' // Blue gradient
        };
        return colors[type] || colors.info;
    }

    /**
     * Clear all toast notifications (closes all SweetAlert2 toasts)
     */
    clearAll() {
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
    }

    /**
     * Update position - SweetAlert2 handles positioning automatically
     */
    updatePosition() {
        // SweetAlert2 handles positioning automatically
        console.log('Toast position updated (handled by SweetAlert2)');
    }
}

// Create global instance
window.Toast = new ToastNotification();

// Utility functions for easier access
window.showToast = (message, type, options) => window.Toast.show(message, type, options);
window.showSuccessToast = (message, options) => window.Toast.success(message, options);
window.showErrorToast = (message, options) => window.Toast.error(message, options);
window.showWarningToast = (message, options) => window.Toast.warning(message, options);
window.showInfoToast = (message, options) => window.Toast.info(message, options);

// Update position on window resize
window.addEventListener('resize', () => {
    if (window.Toast) {
        window.Toast.updatePosition();
    }
});

// Update position on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.Toast) {
        window.Toast.updatePosition();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastNotification;
}

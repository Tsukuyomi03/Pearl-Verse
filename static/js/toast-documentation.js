/**
 * Pearl Verse Global Toast Notification System - Documentation & Examples
 * 
 * This file contains comprehensive documentation and usage examples
 * for the global toast notification system.
 * 
 * The toast system is designed to appear above all other UI elements,
 * including the modular topnav, modals, and dropdowns.
 */

// ============================================================================
// BASIC USAGE EXAMPLES
// ============================================================================

/**
 * Basic Toast Methods
 * These are the simplest ways to show toast notifications
 */

// Show a success toast
function exampleSuccess() {
    window.showSuccessToast("Profile updated successfully!");
    // OR
    window.Toast.success("Profile updated successfully!");
}

// Show an error toast
function exampleError() {
    window.showErrorToast("Failed to save changes. Please try again.");
    // OR
    window.Toast.error("Failed to save changes. Please try again.");
}

// Show a warning toast
function exampleWarning() {
    window.showWarningToast("Your session will expire in 5 minutes.");
    // OR
    window.Toast.warning("Your session will expire in 5 minutes.");
}

// Show an info toast
function exampleInfo() {
    window.showInfoToast("New features are now available!");
    // OR
    window.Toast.info("New features are now available!");
}

// ============================================================================
// ADVANCED USAGE EXAMPLES
// ============================================================================

/**
 * Custom Duration Examples
 * Control how long the toast stays visible
 */

// Short toast (2 seconds)
function shortToast() {
    window.Toast.success("Quick message!", { duration: 2000 });
}

// Long toast (10 seconds)
function longToast() {
    window.Toast.info("This message will stay longer", { duration: 10000 });
}

// Persistent toast (won't auto-hide)
function persistentToast() {
    window.Toast.warning("Manual action required", { 
        persistent: true,
        closable: true 
    });
}

/**
 * Non-closable Toast Example
 * Toast without close button (auto-hides only)
 */
function nonClosableToast() {
    window.Toast.info("Processing your request...", { 
        closable: false,
        duration: 5000 
    });
}

/**
 * Custom Icons
 * Override the default icons for different toast types
 */
function customIconToast() {
    window.Toast.success("Payment successful!", { 
        icon: "fas fa-credit-card" 
    });
    
    window.Toast.info("Check your email", { 
        icon: "fas fa-envelope" 
    });
    
    window.Toast.warning("Storage almost full", { 
        icon: "fas fa-hdd" 
    });
}

// ============================================================================
// REAL-WORLD USAGE EXAMPLES
// ============================================================================

/**
 * Form Validation Example
 * Show appropriate toasts based on form submission results
 */
async function handleFormSubmission(formData) {
    try {
        // Show loading toast
        const loadingToast = window.Toast.info("Saving changes...", { 
            persistent: true,
            closable: false 
        });
        
        const response = await fetch('/api/save-profile', {
            method: 'POST',
            body: formData
        });
        
        // Hide loading toast
        window.Toast.hide(loadingToast);
        
        if (response.ok) {
            window.Toast.success("Profile saved successfully!", { 
                duration: 4000 
            });
        } else {
            const error = await response.json();
            window.Toast.error(`Failed to save: ${error.message}`, { 
                duration: 6000 
            });
        }
    } catch (error) {
        window.Toast.error("Network error. Please check your connection.", { 
            duration: 7000 
        });
    }
}

/**
 * File Upload Progress Example
 * Show progress and result toasts for file operations
 */
function handleFileUpload(file) {
    // Start upload
    const uploadToast = window.Toast.info("Uploading file...", { 
        persistent: true,
        closable: false 
    });
    
    // Simulate upload progress (in real app, use actual progress)
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        uploadToast.querySelector('.toast-message').textContent = `Uploading file... ${progress}%`;
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            window.Toast.hide(uploadToast);
            
            // Show completion toast
            window.Toast.success("File uploaded successfully!", { 
                icon: "fas fa-cloud-upload-alt" 
            });
        }
    }, 500);
}

/**
 * E-commerce Examples
 * Common patterns for shopping and purchasing
 */

// Add to cart
function addToCart(productName) {
    window.Toast.success(`${productName} added to cart!`, {
        icon: "fas fa-shopping-cart",
        duration: 3000
    });
}

// Purchase confirmation
function purchaseComplete(orderNumber) {
    window.Toast.success(`Order #${orderNumber} confirmed! Check your email for details.`, {
        icon: "fas fa-receipt",
        duration: 8000
    });
}

// Out of stock
function outOfStock(productName) {
    window.Toast.warning(`${productName} is currently out of stock.`, {
        icon: "fas fa-exclamation-triangle",
        duration: 5000
    });
}

/**
 * Social Features Examples
 * Toasts for social interactions
 */

// Friend request sent
function friendRequestSent(userName) {
    window.Toast.info(`Friend request sent to ${userName}`, {
        icon: "fas fa-user-plus",
        duration: 4000
    });
}

// Message notification
function newMessage(senderName, messageCount) {
    const message = messageCount === 1 
        ? `New message from ${senderName}` 
        : `${messageCount} new messages from ${senderName}`;
    
    window.Toast.info(message, {
        icon: "fas fa-comment",
        duration: 5000
    });
}

/**
 * Gaming/Pearl Verse Specific Examples
 * Examples specific to the Pearl Verse platform
 */

// Pearl collection
function pearlCollected(pearlName, rarity) {
    const rarityColors = {
        common: 'fas fa-circle',
        rare: 'fas fa-gem',
        epic: 'fas fa-star',
        legendary: 'fas fa-crown'
    };
    
    window.Toast.success(`You found a ${rarity} ${pearlName}!`, {
        icon: rarityColors[rarity.toLowerCase()],
        duration: 6000
    });
}

// Level up notification
function levelUp(newLevel) {
    window.Toast.success(`Level Up! You've reached level ${newLevel}!`, {
        icon: "fas fa-trophy",
        duration: 7000
    });
}

// Daily reward claimed
function dailyRewardClaimed(reward) {
    window.Toast.success(`Daily reward claimed: ${reward} Pearls!`, {
        icon: "fas fa-gift",
        duration: 5000
    });
}

// Trade completed
function tradeCompleted(traderName, itemGiven, itemReceived) {
    window.Toast.success(`Trade with ${traderName} completed! Gave: ${itemGiven}, Received: ${itemReceived}`, {
        icon: "fas fa-handshake",
        duration: 8000
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear All Toasts
 * Useful for page transitions or when showing critical alerts
 */
function clearAllToasts() {
    window.Toast.clearAll();
}

/**
 * Toast Queue Management
 * The system automatically manages a queue of toasts (max 5 by default)
 * Older toasts are automatically removed when the limit is reached
 */

function demonstrateToastQueue() {
    // This will show multiple toasts in sequence
    for (let i = 1; i <= 7; i++) {
        setTimeout(() => {
            window.Toast.info(`Toast message ${i}`, { duration: 8000 });
        }, i * 500);
    }
    // Only the last 5 toasts will be visible due to queue management
}

// ============================================================================
// INTEGRATION EXAMPLES
// ============================================================================

/**
 * Integration with Forms
 * Common pattern for form validation feedback
 */

// Form validation helper
function validateAndSubmitForm(formElement) {
    const formData = new FormData(formElement);
    
    // Client-side validation
    const email = formData.get('email');
    if (!email || !email.includes('@')) {
        window.Toast.error("Please enter a valid email address.");
        return false;
    }
    
    const password = formData.get('password');
    if (!password || password.length < 8) {
        window.Toast.error("Password must be at least 8 characters long.");
        return false;
    }
    
    // If validation passes
    window.Toast.success("Validation passed! Submitting form...");
    
    // Submit form (example)
    submitForm(formData);
}

/**
 * Integration with API Calls
 * Standard pattern for API response handling
 */

async function makeApiCall(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            if (result.message) {
                window.Toast.success(result.message);
            }
            return result;
        } else {
            window.Toast.error(result.error || 'An error occurred');
            throw new Error(result.error);
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            window.Toast.error("Network error. Please check your internet connection.");
        } else {
            window.Toast.error("An unexpected error occurred. Please try again.");
        }
        throw error;
    }
}

/**
 * Integration with Local Storage
 * Show toasts when saving/loading user preferences
 */

function saveUserPreferences(preferences) {
    try {
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
        window.Toast.success("Preferences saved successfully!", { 
            duration: 3000 
        });
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            window.Toast.error("Not enough storage space to save preferences.");
        } else {
            window.Toast.error("Failed to save preferences.");
        }
    }
}

function loadUserPreferences() {
    try {
        const preferences = localStorage.getItem('userPreferences');
        if (preferences) {
            window.Toast.info("Preferences loaded successfully!", { 
                duration: 2000 
            });
            return JSON.parse(preferences);
        }
    } catch (error) {
        window.Toast.warning("Failed to load saved preferences. Using defaults.");
        return null;
    }
}

// ============================================================================
// ACCESSIBILITY NOTES
// ============================================================================

/**
 * The toast system includes several accessibility features:
 * 
 * 1. ARIA attributes (role="alert", aria-live="polite")
 * 2. Keyboard navigation support
 * 3. Focus management for screen readers
 * 4. High contrast mode support
 * 5. Reduced motion support for users with motion sensitivity
 * 
 * Best Practices:
 * - Keep messages concise and clear
 * - Use appropriate toast types (success, error, warning, info)
 * - Don't rely solely on color to convey information
 * - Provide sufficient duration for users to read messages
 * - Use persistent toasts for critical messages that require action
 */

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/**
 * Common Issues and Solutions:
 * 
 * 1. Toasts not appearing:
 *    - Check if toast.js is loaded
 *    - Verify that window.Toast is available
 *    - Check browser console for JavaScript errors
 * 
 * 2. Toasts appearing behind other elements:
 *    - The z-index is set to 10000, which should be above most elements
 *    - Check if other elements have higher z-index values
 * 
 * 3. Styling issues:
 *    - Ensure toast.css is loaded after other CSS files
 *    - Check for CSS conflicts with existing styles
 * 
 * 4. Mobile display issues:
 *    - The system includes responsive breakpoints
 *    - Test on actual devices, not just browser dev tools
 * 
 * 5. Performance issues with many toasts:
 *    - The system limits to 5 concurrent toasts
 *    - Use clearAll() before showing new toasts if needed
 */

// ============================================================================
// EXPORT FOR MODULE SYSTEMS (if needed)
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exampleSuccess,
        exampleError,
        exampleWarning,
        exampleInfo,
        handleFormSubmission,
        makeApiCall,
        pearlCollected,
        levelUp,
        addToCart,
        clearAllToasts
    };
}

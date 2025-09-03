/**
 * Pearl Avatar Shop - JavaScript
 * Modern avatar customization similar to Steam/Discord profiles
 */

/**
 * Format numbers with appropriate suffixes for currency display
 * @param {number|string} num - The number to format
 * @returns {string} - Formatted number with appropriate suffix
 */
function formatNumber(num) {
    // Handle invalid, null, or undefined values
    if (num === null || num === undefined || isNaN(num)) {
        return "0";
    }

    // Convert to number if it's a string
    const numValue = typeof num === "string" ? parseFloat(num) : num;

    // Check again after conversion
    if (isNaN(numValue)) {
        return "0";
    }

    // Handle negative numbers
    const absValue = Math.abs(numValue);
    const isNegative = numValue < 0;
    const prefix = isNegative ? "-" : "";

    // Format with proper suffixes: K (100K+), M (1M+), B (1B+), T (1T+), Q (1Q+), Qi (1Qi+), Sx (1Sx+)
    if (absValue >= 1000000000000000000000) {
        // Sextillions (1,000,000,000,000,000,000,000+)
        return prefix + (absValue / 1000000000000000000000).toFixed(1) + "Sx";
    }
    if (absValue >= 1000000000000000000) {
        // Quintillions (1,000,000,000,000,000,000+)
        return prefix + (absValue / 1000000000000000000).toFixed(1) + "Qi";
    }
    if (absValue >= 1000000000000000) {
        // Quadrillions (1,000,000,000,000,000+)
        return prefix + (absValue / 1000000000000000).toFixed(1) + "Q";
    }
    if (absValue >= 1000000000000) {
        // Trillions (1,000,000,000,000+)
        return prefix + (absValue / 1000000000000).toFixed(1) + "T";
    }
    if (absValue >= 1000000000) {
        // Billions (1,000,000,000+)
        return prefix + (absValue / 1000000000).toFixed(1) + "B";
    }
    if (absValue >= 1000000) {
        // Millions (1,000,000+)
        return prefix + (absValue / 1000000).toFixed(1) + "M";
    }
    if (absValue >= 100000) {
        // Hundreds of thousands (100,000+) - use K suffix
        return prefix + (absValue / 1000).toFixed(1) + "K";
    }

    // Less than 100,000 - show as is with comma separators
    return numValue.toLocaleString();
}

/**
 * Calculate cumulative EXP needed to reach a specific level
 * @param {number} level - The target level
 * @returns {number} - Cumulative EXP needed
 */
function calculateExpForLevel(level) {
    if (level <= 1) {
        return 0;
    }
    
    // Calculate cumulative EXP thresholds
    // Level 1: 0 EXP (starting point)
    // Level 2: 1000 EXP total needed
    // Level 3: 2500 EXP total needed (1000 + 1500)
    // Level 4: 4500 EXP total needed (1000 + 1500 + 2000)
    let totalExp = 0;
    for (let i = 1; i < level; i++) {
        totalExp += 1000 + (i - 1) * 500; // Level 1->2 needs 1000, 2->3 needs 1500, etc.
    }
    return totalExp;
}

/**
 * Calculate EXP needed to reach the next level
 * @param {number} currentLevel - Current user level
 * @param {number} currentExp - Current total EXP
 * @returns {number} - EXP needed for next level
 */
function calculateExpToNextLevel(currentLevel, currentExp) {
    const expForCurrentLevel = calculateExpForLevel(currentLevel);
    const expForNextLevel = calculateExpForLevel(currentLevel + 1);
    
    const expNeeded = expForNextLevel - currentExp;
    return Math.max(0, expNeeded);
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Avatar Shop
    initAvatarShop();
    
    // Set active navigation state
    setActiveNavigation();
});

/**
 * Set active navigation state in modular nav components
 */
function setActiveNavigation() {
    // Set active state in side navigation
    const sideNavItems = document.querySelectorAll('.nav-item');
    sideNavItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-nav') === 'avatar-shop') {
            item.classList.add('active');
        }
    });
    
    // Set active state in bottom navigation
    const botNavItems = document.querySelectorAll('.botnav-item');
    botNavItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-nav') === 'avatar-shop') {
            item.classList.add('active');
        }
    });
}

/**
 * Initialize the Avatar Shop with all required functionality
 */
function initAvatarShop() {
    // Load user data including balance, owned items, etc.
    loadUserData();
    
    // Initialize category tabs
    initCategoryTabs();
    
    // Initialize avatar preview and customization
    initAvatarPreview();
    
    // Initialize shop items filtering and pagination
    initItemsFiltering();
    
    // Initialize purchase functionality
    initPurchaseSystem();
    
    // Load recent purchases
    loadRecentPurchases();
    
    // Initialize background selection
    initBackgroundSelection();
    
    // Initialize item detail modal
    initItemDetailModal();
}

/**
 * Load user data including balance, owned items, etc.
 */
function loadUserData() {
    // Fetch real user data from the API
    fetch('/api/current-user', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.user) {
            // Update UI with real user data from database
            const userPearls = data.user.pearl || 0;
            document.getElementById('user-pearls').textContent = formatNumber(userPearls);
            
            // Update level and EXP displays if they exist
            const userLevel = data.user.level || 1;
            const userExp = data.user.exp || 0;
            
            const levelElement = document.getElementById('user-level');
            if (levelElement) {
                levelElement.textContent = userLevel;
            }
            
            const expElement = document.getElementById('user-exp');
            if (expElement) {
                // Calculate EXP needed to level up
                const expToNextLevel = calculateExpToNextLevel(userLevel, userExp);
                expElement.textContent = formatNumber(expToNextLevel);
            }
            
            // For owned items, we'll calculate based on user's actual inventory
            // For now, showing a placeholder count until we implement item ownership
            const ownedItems = 0; // This should be fetched from user's inventory when implemented
            
            // Only update owned-items if the element exists
            const ownedItemsElement = document.getElementById('owned-items');
            if (ownedItemsElement) {
                ownedItemsElement.textContent = ownedItems;
            }
            
            // Store user data globally for other functions to use
            window.currentUserData = data.user;
            
        } else {
            // Handle case where user is not logged in or API call failed
            console.error('Failed to load user data:', data.message || 'Unknown error');
            
            // Set default values for non-logged-in users
            document.getElementById('user-pearls').textContent = '0';
            
            // Only update owned-items if the element exists
            const ownedItemsElement = document.getElementById('owned-items');
            if (ownedItemsElement) {
                ownedItemsElement.textContent = '0';
            }
            
            // Optionally redirect to login if user is not authenticated
            if (data.message === 'Not logged in') {
                // You might want to redirect to login page here
                console.warn('User not logged in - avatar shop may have limited functionality');
            }
        }
        
        // Load avatar preview based on user's saved configuration
        loadUserAvatar();
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
        
        // Set default values on error
        document.getElementById('user-pearls').textContent = '0';
        
        // Only update owned-items if the element exists
        const ownedItemsElement = document.getElementById('owned-items');
        if (ownedItemsElement) {
            ownedItemsElement.textContent = '0';
        }
        
        // Still load the avatar preview
        loadUserAvatar();
    });
}

/**
 * Initialize category tabs functionality
 */
function initCategoryTabs() {
    const tabButtons = document.querySelectorAll('.category-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get the category to display
            const category = this.getAttribute('data-category');
            
            // Load items for that category
            loadCategoryItems(category);
        });
    });
    
    // Load default category (banner) to match HTML structure
    loadCategoryItems('banner');
}

/**
 * Load category items for the shop
 * @param {string} category - The category to load items for
 * @param {number} page - The page number to load (defaults to 1)
 */
function loadCategoryItems(category, page = 1) {
    const itemsGrid = document.getElementById('items-grid');
    
    // Show loading state
    itemsGrid.innerHTML = `
        <div class="loading-items">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading ${category} items...</p>
        </div>
    `;
    
    // Get filter values
    const ownedFilter = document.getElementById('owned-filter').value;
    const searchTerm = document.getElementById('item-search').value.toLowerCase();
    
    // Build query parameters
    const params = new URLSearchParams({
        category: category,
        page: page,
        per_page: 12
    });
    
    if (ownedFilter !== 'all') {
        params.append('owned', ownedFilter);
    }
    
    if (searchTerm) {
        params.append('search', searchTerm);
    }
    
    // Fetch real avatar shop items from the API
    fetch(`/api/avatar-shop/items?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        // Clear loading state
        itemsGrid.innerHTML = '';
        
        if (!data.success) {
            itemsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle empty-state-icon"></i>
                    <h3 class="empty-state-title">Error Loading Items</h3>
                    <p class="empty-state-description">${data.message || 'Failed to load items'}</p>
                </div>
            `;
            return;
        }
        
            const items = data.items || [];
            
            // Check if items were found
            if (items.length === 0) {
                itemsGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search empty-state-icon"></i>
                        <h3 class="empty-state-title">No items found</h3>
                        <p class="empty-state-description">Try adjusting your filters or search terms</p>
                    </div>
                `;
                return;
            }
            
            // Sort items by ownership status: equipped first, then owned, then unowned
            items.sort((a, b) => {
                // Equipped items first (selected = true and owned = true)
                if (a.selected && a.owned && !(b.selected && b.owned)) return -1;
                if (!(a.selected && a.owned) && b.selected && b.owned) return 1;
                
                // Then owned but not equipped items
                if (a.owned && !a.selected && !(b.owned)) return -1;
                if (!(a.owned) && b.owned && !b.selected) return 1;
                
                // Unowned items last
                return 0;
            });
        
        // Add items to grid with animation delay for staggered appearance
        items.forEach((item, index) => {
            const itemCard = document.createElement('div');
            itemCard.className = `avatar-item-card ${item.selected ? 'selected' : ''}`;
            itemCard.dataset.itemId = item.id;
            itemCard.dataset.category = item.category; // Fix: use 'category' instead of 'itemCategory'
            itemCard.style.animationDelay = `${index * 0.05}s`;
            
            // Create owned indicator if applicable
            const ownedIndicator = item.owned ? '<div class="owned-indicator"><i class="fas fa-check"></i></div>' : '';
            
            // Create preview indicator
            const previewIndicator = `<div class="preview-indicator"><i class="fas fa-eye"></i></div>`;
            
            // Create item card HTML with real data
            // The API should return full URLs, but handle both cases
            let imageUrl;
            if (item.image.startsWith('/static/')) {
                imageUrl = item.image;
            } else if (item.image.startsWith('images/')) {
                imageUrl = `/static/${item.image}`;
            } else {
                // Fallback for any other format
                imageUrl = item.image.startsWith('http') ? item.image : `/static/images/avatar-placeholder.png`;
            }
            
            // Debug log to see what paths we're getting
            console.log('Item:', item.name, 'Original image path:', item.image, 'Final URL:', imageUrl);
            
            // Create buy/equip button based on ownership
            let actionButton = '';
            if (item.owned) {
                if (item.selected) {
                    actionButton = `
                        <button class="item-action-btn equipped-btn" data-item-id="${item.id}" data-action="unequip">
                            <i class="fas fa-check"></i> Equipped
                        </button>
                    `;
                } else {
                    actionButton = `
                        <button class="item-action-btn equip-btn" data-item-id="${item.id}" data-action="equip">
                            <i class="fas fa-plus"></i> Equip
                        </button>
                    `;
                }
            } else {
                actionButton = `
                    <button class="item-action-btn buy-btn" data-item-id="${item.id}" data-action="buy" data-price="${item.price}">
                        <i class="fas fa-shopping-cart"></i> Buy
                    </button>
                `;
            }
            
            itemCard.innerHTML = `
                ${ownedIndicator}
                <div class="avatar-item-image">
                    <img src="${imageUrl}" alt="${item.name}" onerror="this.src='/static/images/avatar-placeholder.png'">
                </div>
                <div class="avatar-item-info">
                    <h4 class="avatar-item-name">${item.name}</h4>
                    <p class="avatar-item-category">${item.category}</p>
                    <div class="avatar-item-price ${item.price === 0 ? 'free' : item.price > 1000 ? 'premium' : ''}">
                        <i class="fas fa-gem"></i>
                        <span>${item.price === 0 ? 'Free' : formatNumber(item.price)}</span>
                    </div>
                    ${actionButton}
                </div>
                ${previewIndicator}
            `;
            
            // Add click event to preview item in avatar card (but prevent bubbling for buttons)
            itemCard.addEventListener('click', (e) => {
                // Don't trigger preview if a button was clicked
                if (!e.target.closest('.item-action-btn')) {
                    previewItemInAvatar(item);
                }
            });
            
            // Add to grid
            itemsGrid.appendChild(itemCard);
        });
        
        // Add event listeners for the action buttons after all items are added
        const actionButtons = itemsGrid.querySelectorAll('.item-action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the card click event
                
                const itemId = button.getAttribute('data-item-id');
                const action = button.getAttribute('data-action');
                const price = button.getAttribute('data-price');
                
                // Find the item data from the loaded items
                const item = items.find(i => i.id == itemId);
                if (!item) {
                    console.error('Item not found:', itemId);
                    return;
                }
                
                // Handle different actions
                if (action === 'buy') {
                    showPurchaseConfirmation(item);
                } else if (action === 'equip') {
                    toggleEquipItem(item);
                } else if (action === 'unequip') {
                    toggleEquipItem(item);
                }
            });
        });
        
        // Update pagination info from API response
        const pagination = data.pagination || {};
        document.getElementById('current-page').textContent = pagination.page || '1';
        document.getElementById('total-pages').textContent = pagination.pages || '1';
        
        // Enable/disable pagination buttons
        document.getElementById('prev-page').disabled = !pagination.has_prev;
        document.getElementById('next-page').disabled = !pagination.has_next;
        
    })
    .catch(error => {
        console.error('Error loading avatar shop items:', error);
        
        // Show error state
        itemsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle empty-state-icon"></i>
                <h3 class="empty-state-title">Error Loading Items</h3>
                <p class="empty-state-description">Please try again later</p>
            </div>
        `;
    });
}

/**
 * Load category items for pagination (optimized - only updates items grid)
 * @param {string} category - The category to load items for
 * @param {number} page - The page number to load
 */
function loadCategoryItemsGrid(category, page) {
    // Get filter values using jQuery for consistency
    const ownedFilter = $('#owned-filter').val();
    const searchTerm = $('#item-search').val().toLowerCase();
    
    // Build query parameters
    const params = new URLSearchParams({
        category: category,
        page: page,
        per_page: 12
    });
    
    if (ownedFilter !== 'all') {
        params.append('owned', ownedFilter);
    }
    
    if (searchTerm) {
        params.append('search', searchTerm);
    }
    
    // Use jQuery AJAX for better control and error handling
    $.ajax({
        url: `/api/avatar-shop/items?${params.toString()}`,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            // Clear loading state using jQuery
            $('#items-grid').empty();
            
            if (!data.success) {
                $('#items-grid').html(`
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle empty-state-icon"></i>
                        <h3 class="empty-state-title">Error Loading Items</h3>
                        <p class="empty-state-description">${data.message || 'Failed to load items'}</p>
                    </div>
                `);
                return;
            }
            
            const items = data.items || [];
            
            // Check if items were found
            if (items.length === 0) {
                $('#items-grid').html(`
                    <div class="empty-state">
                        <i class="fas fa-search empty-state-icon"></i>
                        <h3 class="empty-state-title">No items found</h3>
                        <p class="empty-state-description">Try adjusting your filters or search terms</p>
                    </div>
                `);
                return;
            }
            
            // Sort items by ownership status: equipped first, then owned, then unowned
            items.sort((a, b) => {
                // Equipped items first (selected = true and owned = true)
                if (a.selected && a.owned && !(b.selected && b.owned)) return -1;
                if (!(a.selected && a.owned) && b.selected && b.owned) return 1;
                
                // Then owned but not equipped items
                if (a.owned && !a.selected && !(b.owned)) return -1;
                if (!(a.owned) && b.owned && !b.selected) return 1;
                
                // Unowned items last
                return 0;
            });
            
            // Create items with jQuery for better performance
            items.forEach((item, index) => {
                const ownedIndicator = item.owned ? '<div class="owned-indicator"><i class="fas fa-check"></i></div>' : '';
                const previewIndicator = `<div class="preview-indicator"><i class="fas fa-eye"></i></div>`;
                
                // Handle image URL
                let imageUrl;
                if (item.image.startsWith('/static/')) {
                    imageUrl = item.image;
                } else if (item.image.startsWith('images/')) {
                    imageUrl = `/static/${item.image}`;
                } else {
                    imageUrl = item.image.startsWith('http') ? item.image : `/static/images/avatar-placeholder.png`;
                }
                
                // Create buy/equip button based on ownership
                let actionButton = '';
                if (item.owned) {
                    if (item.selected) {
                        actionButton = `
                            <button class="item-action-btn equipped-btn" data-item-id="${item.id}" data-action="unequip">
                                <i class="fas fa-check"></i> Equipped
                            </button>
                        `;
                    } else {
                        actionButton = `
                            <button class="item-action-btn equip-btn" data-item-id="${item.id}" data-action="equip">
                                <i class="fas fa-plus"></i> Equip
                            </button>
                        `;
                    }
                } else {
                    actionButton = `
                        <button class="item-action-btn buy-btn" data-item-id="${item.id}" data-action="buy" data-price="${item.price}">
                            <i class="fas fa-shopping-cart"></i> Buy
                        </button>
                    `;
                }
                
                // Create jQuery element
                const $itemCard = $(`
                    <div class="avatar-item-card ${item.selected ? 'selected' : ''}" 
                         data-item-id="${item.id}" 
                         data-category="${item.category}"
                         style="animation-delay: ${index * 0.05}s">
                        ${ownedIndicator}
                        <div class="avatar-item-image">
                            <img src="${imageUrl}" alt="${item.name}" onerror="this.src='/static/images/avatar-placeholder.png'">
                        </div>
                        <div class="avatar-item-info">
                            <h4 class="avatar-item-name">${item.name}</h4>
                            <p class="avatar-item-category">${item.category}</p>
                            <div class="avatar-item-price ${item.price === 0 ? 'free' : item.price > 1000 ? 'premium' : ''}">
                                <i class="fas fa-gem"></i>
                                <span>${item.price === 0 ? 'Free' : formatNumber(item.price)}</span>
                            </div>
                            ${actionButton}
                        </div>
                        ${previewIndicator}
                    </div>
                `);
                
                // Add click event using jQuery (but prevent bubbling for buttons)
                $itemCard.on('click', (e) => {
                    // Don't trigger preview if a button was clicked
                    if (!$(e.target).closest('.item-action-btn').length) {
                        previewItemInAvatar(item);
                    }
                });
                
                // Append to grid using jQuery
                $('#items-grid').append($itemCard);
            });
            
            // Add event listeners for the action buttons
            $('#items-grid').off('click', '.item-action-btn').on('click', '.item-action-btn', function(e) {
                e.stopPropagation(); // Prevent triggering the card click event
                
                const $button = $(this);
                const itemId = $button.data('item-id');
                const action = $button.data('action');
                const price = $button.data('price');
                
                // Find the item data from the loaded items
                const item = items.find(i => i.id == itemId);
                if (!item) {
                    console.error('Item not found:', itemId);
                    return;
                }
                
                // Handle different actions
                if (action === 'buy') {
                    showPurchaseConfirmation(item);
                } else if (action === 'equip') {
                    toggleEquipItem(item);
                } else if (action === 'unequip') {
                    toggleEquipItem(item);
                }
            });
            
            // Update pagination info using jQuery
            const pagination = data.pagination || {};
            $('#total-pages').text(pagination.pages || '1');
            
            // Enable/disable pagination buttons using jQuery
            $('#prev-page').prop('disabled', !pagination.has_prev);
            $('#next-page').prop('disabled', !pagination.has_next);
        },
        error: function(xhr, status, error) {
            console.error('Error loading avatar shop items:', error);
            
            // Show error state using jQuery
            $('#items-grid').html(`
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle empty-state-icon"></i>
                    <h3 class="empty-state-title">Error Loading Items</h3>
                    <p class="empty-state-description">Please try again later</p>
                </div>
            `);
        }
    });
}


/**
 * Initialize avatar preview and customization
 */
function initAvatarPreview() {
    // Initialize the avatar display canvas
    const avatarDisplay = document.getElementById('avatar-display');
    
    // Add event listeners for preview controls
    const saveButton = document.getElementById('save-avatar');
    
    if (saveButton) {
        saveButton.addEventListener('click', saveAvatar);
    }
    
    // Add event listener for reset button
    const resetButton = document.getElementById('reset-avatar');
    
    if (resetButton) {
        resetButton.addEventListener('click', resetAvatar);
    }
}

/**
 * Load user's saved avatar configuration from database
 */
function loadUserAvatar() {
    // Fetch user's current avatar configuration from the API using jQuery AJAX
    $.ajax({
        url: '/api/avatar-shop/user-configuration',
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            if (data.success && data.configuration) {
                // Update avatar preview with equipped items
                updateAvatarPreview(data.configuration);
                
                // Store configuration globally for other functions
                window.currentAvatarConfig = data.configuration;
            } else {
                console.error('Failed to load avatar configuration:', data.message || 'Unknown error');
                // Clear avatar display on error
                clearAvatarPreview();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading avatar configuration:', error);
            // Clear avatar display on error
            clearAvatarPreview();
        }
    });
}


/**
 * Clear the avatar preview
 */
function clearAvatarPreview() {
    // Clear banner preview
    const bannerDisplay = document.querySelector('.banner-display');
    if (bannerDisplay) {
        bannerDisplay.innerHTML = `
            <div class="banner-placeholder">
                <i class="fas fa-image"></i>
                <span>Select a banner</span>
            </div>
        `;
    }
    
    // Clear avatar preview
    const avatarDisplay = document.querySelector('.avatar-display');
    if (avatarDisplay) {
        avatarDisplay.innerHTML = `
            <div class="avatar-placeholder">
                <i class="fas fa-user"></i>
                <span>Select an avatar</span>
            </div>
        `;
    }
}


/**
 * Save the current avatar configuration
 */
function saveAvatar() {
    // Show loading state
    const saveButton = document.getElementById('save-avatar');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveButton.disabled = true;
    
    // Simulate API call to save avatar configuration
    setTimeout(() => {
        // In a real application, you would send the configuration to your backend
        
        // Show success message using SweetAlert2
        Swal.fire({
            title: 'Avatar Saved!',
            text: 'Your custom avatar has been updated.',
            icon: 'success',
            background: '#2d3748',
            color: '#e2e8f0',
            confirmButtonColor: '#4299e1'
        });
        
        // Reset button
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        
        // Update dashboard avatar (in a real application, this would happen automatically)
        updateDashboardAvatar();
    }, 1500);
}

/**
 * Initialize shop items filtering and pagination
 */
function initItemsFiltering() {
    // Add event listeners for filter controls
    const ownedFilter = document.getElementById('owned-filter');
    const searchInput = document.getElementById('item-search');
    
    // Add change event listeners to filters
    ownedFilter.addEventListener('change', () => {
        const activeCategory = document.querySelector('.category-tab.active').getAttribute('data-category');
        loadCategoryItems(activeCategory);
    });
    
    // Add input event for search with debounce
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const activeCategory = document.querySelector('.category-tab.active').getAttribute('data-category');
            loadCategoryItems(activeCategory);
        }, 300);
    });
    
    // Add event listeners for pagination
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    prevPageBtn.addEventListener('click', () => {
        // Handle previous page logic
        const currentPage = parseInt($('#current-page').text());
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            
            // Show loading state for items grid only
            $('#items-grid').html(`
                <div class="loading-items">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading page ${newPage}...</p>
                </div>
            `);
            
            // Update page number
            $('#current-page').text(newPage);
            
            // Load items for new page without full reload
            const activeCategory = $('.category-tab.active').attr('data-category');
            loadCategoryItemsGrid(activeCategory, newPage);
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        // Handle next page logic
        const currentPage = parseInt($('#current-page').text());
        const totalPages = parseInt($('#total-pages').text());
        if (currentPage < totalPages) {
            const newPage = currentPage + 1;
            
            // Show loading state for items grid only
            $('#items-grid').html(`
                <div class="loading-items">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading page ${newPage}...</p>
                </div>
            `);
            
            // Update page number
            $('#current-page').text(newPage);
            
            // Load items for new page without full reload
            const activeCategory = $('.category-tab.active').attr('data-category');
            loadCategoryItemsGrid(activeCategory, newPage);
        }
    });
}

/**
 * Initialize background selection for avatar preview
 */
function initBackgroundSelection() {
    const bgOptions = document.querySelectorAll('.bg-option');
    
    bgOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            bgOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Get background type
            const bgType = this.getAttribute('data-bg');
            
            // Update avatar preview background
            updateAvatarBackground(bgType);
        });
    });
}

/**
 * Update avatar preview background
 * @param {string} bgType - The background type to apply
 */
function updateAvatarBackground(bgType) {
    const avatarPreview = document.querySelector('.avatar-preview-container');
    
    // Remove all background classes
    avatarPreview.classList.remove('bg-default', 'bg-gradient1', 'bg-gradient2', 'bg-space', 'bg-nature');
    
    // Add the selected background class
    avatarPreview.classList.add(`bg-${bgType}`);
}

/**
 * Initialize purchase system for avatar items
 */
function initPurchaseSystem() {
    // This would integrate with your payment/pearl system
    // For now, we'll create a mock purchase flow
    
    // Purchase confirmation button in modal
    const confirmPurchaseBtn = document.getElementById('confirmPurchase');
    
    if (confirmPurchaseBtn) {
        confirmPurchaseBtn.addEventListener('click', confirmPurchase);
    }
}

/**
 * Confirm purchase of an item using jQuery with improved error handling
 */
function confirmPurchase() {
    // Get the item being purchased from the modal using jQuery
    const $modal = $('#purchaseModal');
    const itemId = $modal.attr('data-item-id');
    
    if (!itemId) {
        console.error('No item ID found in modal');
        return;
    }
    
    // Show loading state using jQuery
    const $confirmBtn = $('#confirmPurchase');
    const originalText = $confirmBtn.html();
    $confirmBtn.html('<i class="fas fa-spinner fa-spin"></i> Processing...');
    $confirmBtn.prop('disabled', true);
    
    // Get current user data and purchase price
    const currentPearls = window.currentUserData ? window.currentUserData.pearl : parseInt($('#user-pearls').text().replace(/,/g, '')) || 0;
    const purchasePrice = parseInt($modal.attr('data-item-price')) || 0;
    
    console.log('Purchase attempt:', {
        itemId: itemId,
        currentPearls: currentPearls,
        purchasePrice: purchasePrice,
        userData: window.currentUserData
    });
    
    // Check if user has sufficient balance
    if (currentPearls < purchasePrice) {
        $confirmBtn.html(originalText);
        $confirmBtn.prop('disabled', false);
        
        Swal.fire({
            title: 'Insufficient Pearls',
            text: 'You do not have enough pearls to purchase this item.',
            icon: 'error',
            background: '#2d3748',
            color: '#e2e8f0',
            confirmButtonColor: '#4299e1'
        });
        return;
    }
    
    // Send purchase request using jQuery AJAX for better error handling
    $.ajax({
        url: '/api/avatar-shop/purchase',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            item_id: itemId
        }),
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            console.log('Sending purchase request for item ID:', itemId);
        },
        success: function(data, textStatus, xhr) {
            console.log('Purchase response data:', data);
            console.log('Response status:', xhr.status);
            
            // Reset button state
            $confirmBtn.html(originalText);
            $confirmBtn.prop('disabled', false);
            
            if (data.success) {
                // Update all UI elements dynamically using jQuery
                updateUserStatsAfterPurchase(data);
                
                // Close the modal using Bootstrap's API
                const modal = document.getElementById('purchaseModal');
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
                
                // Auto-equip the purchased item
                autoEquipPurchasedItem(data).then((equipResult) => {
                    try {
                        // Show success message with level up info and auto-equip status
                        let successMessage = data.message || `You purchased the item for ${purchasePrice.toLocaleString()} pearls.`;
                        
                        // Add auto-equip success message
                        if (equipResult.equipped) {
                            successMessage += `\n\n✨ ${equipResult.item.name} has been automatically equipped!`;
                        } else if (equipResult.reason) {
                            successMessage += `\n\n⚠️ Item purchased but auto-equip failed: ${equipResult.reason}`;
                        }
                        
                        // Check for level up and add celebration message
                        if (data.level_up_info && data.level_up_info.leveled_up) {
                            successMessage += `\n\n🎉 LEVEL UP! You are now level ${data.level_up_info.new_level}!`;
                        }
                        
                        Swal.fire({
                            title: equipResult.equipped ? 'Purchase & Equip Successful!' : 'Purchase Successful!',
                            text: successMessage,
                            icon: 'success',
                            background: '#2d3748',
                            color: '#e2e8f0',
                            confirmButtonColor: '#4299e1',
                            timer: equipResult.equipped ? 3000 : 2500, // Longer display for auto-equip
                            showConfirmButton: true
                        });
                        
                        // Update avatar preview to show newly equipped item immediately
                        if (equipResult.equipped) {
                            setTimeout(() => {
                                loadUserAvatar(); // Reload avatar configuration
                            }, 500);
                        }
                        
                        // Refresh the current category to show the newly owned and equipped item
                        const activeCategory = $('.category-tab.active').attr('data-category');
                        if (activeCategory) {
                            setTimeout(() => {
                                loadCategoryItems(activeCategory);
                            }, equipResult.equipped ? 800 : 300);
                        }
                        
                        // Add item to recent purchases
                        addToRecentPurchases(itemId);
                    } catch (uiError) {
                        console.error('Error in success UI handling:', uiError);
                        // Still show basic success message if UI update fails
                        Swal.fire({
                            title: 'Purchase Successful!',
                            text: 'Your item was purchased successfully.',
                            icon: 'success',
                            background: '#2d3748',
                            color: '#e2e8f0',
                            confirmButtonColor: '#4299e1'
                        });
                    }
                }).catch((error) => {
                    console.error('Auto-equip error:', error);
                    
                    // Still show purchase success even if auto-equip failed
                    let successMessage = data.message || `You purchased the item for ${purchasePrice.toLocaleString()} pearls.`;
                    successMessage += `\n\n⚠️ Item purchased successfully but could not be auto-equipped. You can manually equip it from your inventory.`;
                    
                    // Check for level up and add celebration message
                    if (data.level_up_info && data.level_up_info.leveled_up) {
                        successMessage += `\n\n🎉 LEVEL UP! You are now level ${data.level_up_info.new_level}!`;
                    }
                    
                    Swal.fire({
                        title: 'Purchase Successful!',
                        text: successMessage,
                        icon: 'success',
                        background: '#2d3748',
                        color: '#e2e8f0',
                        confirmButtonColor: '#4299e1'
                    });
                    
                    // Refresh the current category to show the newly owned item
                    const activeCategory = $('.category-tab.active').attr('data-category');
                    if (activeCategory) {
                        loadCategoryItems(activeCategory);
                    }
                    
                    // Add item to recent purchases
                    addToRecentPurchases(itemId);
                });
                
            } else {
                // Show error message from server
                Swal.fire({
                    title: 'Purchase Failed',
                    text: data.message || 'An error occurred while purchasing the item.',
                    icon: 'error',
                    background: '#2d3748',
                    color: '#e2e8f0',
                    confirmButtonColor: '#4299e1'
                });
            }
        },
        error: function(xhr, textStatus, errorThrown) {
            console.error('Purchase AJAX error:', {
                status: xhr.status,
                statusText: xhr.statusText,
                textStatus: textStatus,
                errorThrown: errorThrown,
                responseText: xhr.responseText
            });
            
            // Reset button state
            $confirmBtn.html(originalText);
            $confirmBtn.prop('disabled', false);
            
            // Determine error type and message
            let errorTitle = 'Purchase Failed';
            let errorText = 'A network error occurred. Please try again.';
            let showLoginButton = false;
            
            // Parse error response if available
            try {
                const errorData = JSON.parse(xhr.responseText);
                if (errorData.message) {
                    errorText = errorData.message;
                }
            } catch (e) {
                // If response is not JSON, use status-based messages
                if (xhr.status === 401) {
                    errorTitle = 'Session Expired';
                    errorText = 'Your session has expired. Please log in again to continue.';
                    showLoginButton = true;
                } else if (xhr.status === 403) {
                    errorTitle = 'Access Denied';
                    errorText = 'You do not have permission to purchase this item.';
                } else if (xhr.status === 404) {
                    errorTitle = 'Item Not Found';
                    errorText = 'The item you are trying to purchase is no longer available.';
                } else if (xhr.status === 500) {
                    errorTitle = 'Server Error';
                    errorText = 'A server error occurred. Please try again later.';
                } else if (xhr.status === 0) {
                    errorTitle = 'Connection Error';
                    errorText = 'Unable to connect to the server. Please check your internet connection.';
                }
            }
            
            // Show error message with potential login option
            const swalConfig = {
                title: errorTitle,
                text: errorText,
                icon: 'error',
                background: '#2d3748',
                color: '#e2e8f0',
                confirmButtonColor: '#4299e1'
            };
            
            if (showLoginButton) {
                swalConfig.showCancelButton = true;
                swalConfig.confirmButtonText = 'Go to Login';
                swalConfig.cancelButtonText = 'Cancel';
                swalConfig.cancelButtonColor = '#6b7280';
            }
            
            Swal.fire(swalConfig).then((result) => {
                if (result.isConfirmed && showLoginButton) {
                    // Redirect to login page
                    window.location.href = '/login';
                }
            });
        }
    });
};

/**
 * Automatically equip a newly purchased item
 * @param {Object} purchaseData - The purchase response data containing item info
 * @returns {Promise} - Promise that resolves when auto-equip is complete
 */
function autoEquipPurchasedItem(purchaseData) {
    return new Promise((resolve, reject) => {
        // Extract item data from purchase response
        const itemData = purchaseData.item || purchaseData.purchased_item;
        
        if (!itemData || !itemData.id) {
            console.warn('No item data found in purchase response for auto-equip');
            resolve({ equipped: false, reason: 'No item data' });
            return;
        }
        
        console.log('Auto-equipping purchased item:', itemData);
        
        // Send equip request to API
        $.ajax({
            url: '/api/avatar-shop/equip',
            method: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({
                item_id: itemData.id,
                action: 'equip'
            }),
            success: function(equipData) {
                console.log('Auto-equip API response:', equipData);
                
                if (equipData.success) {
                    // Update the item's selected state
                    itemData.selected = true;
                    itemData.owned = true;
                    
                    // Resolve with success
                    resolve({ 
                        equipped: true, 
                        item: itemData,
                        message: equipData.message || `${itemData.name} has been equipped automatically.`
                    });
                } else {
                    console.warn('Auto-equip failed - API returned failure:', equipData.message);
                    resolve({ 
                        equipped: false, 
                        reason: equipData.message || 'Equip API returned failure'
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('Auto-equip network error:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    error: error,
                    responseText: xhr.responseText
                });
                
                // Always resolve, never reject, to prevent the .catch() block
                resolve({ 
                    equipped: false, 
                    reason: `Network error during auto-equip: ${error}`
                });
            }
        });
    });
}

/**
 * Update user stats after successful purchase using jQuery
 * @param {Object} data - The purchase response data
 */
function updateUserStatsAfterPurchase(data) {
    console.log('Updating user stats after purchase:', data);
    
    // Safely extract values with fallbacks
    const newBalance = data.new_balance || 0;
    const newExp = data.new_exp || 0;
    const levelInfo = data.level_up_info || {};
    const newLevel = levelInfo.new_level || 1;
    const leveledUp = levelInfo.leveled_up || false;
    
    // Update pearl balance using jQuery
    $('#user-pearls').text(newBalance.toLocaleString());
    console.log('Updated pearl balance to:', newBalance);
    
    // Update level display using jQuery (both IDs for cross-page compatibility)
    const $levelElement = $('#user-level');
    const $levelElementAlt = $('#level'); // Dashboard compatibility
    
    if ($levelElement.length) {
        $levelElement.text(newLevel);
        console.log('Updated user-level to:', newLevel);
    }
    
    if ($levelElementAlt.length) {
        $levelElementAlt.text(newLevel);
        console.log('Updated level to:', newLevel);
    }
    
    // Update EXP display using jQuery - show EXP needed to level up
    const $expElement = $('#user-exp');
    if ($expElement.length) {
        // Calculate EXP needed to level up
        const expToNextLevel = calculateExpToNextLevel(newLevel, newExp);
        $expElement.text(formatNumber(expToNextLevel));
        console.log('Updated user-exp to show EXP needed for next level:', expToNextLevel);
    }
    
    // Update global user data safely
    if (window.currentUserData) {
        window.currentUserData.pearl = newBalance;
        window.currentUserData.exp = newExp;
        window.currentUserData.level = newLevel;
        console.log('Updated global user data:', window.currentUserData);
    } else {
        // Create global user data if it doesn't exist
        window.currentUserData = {
            pearl: newBalance,
            exp: newExp,
            level: newLevel
        };
        console.log('Created global user data:', window.currentUserData);
    }
    
    // Update owned items count (only if element exists)
    const $ownedItemsElement = $('#owned-items');
    if ($ownedItemsElement.length) {
        const currentOwned = parseInt($ownedItemsElement.text()) || 0;
        $ownedItemsElement.text(currentOwned + 1);
        console.log('Updated owned items count to:', currentOwned + 1);
    }
    
    // Add level up visual effect if user leveled up
    if (leveledUp) {
        showLevelUpEffect(newLevel);
    }
}

/**
 * Show visual level up effect
 * @param {number} newLevel - The new level achieved
 */
function showLevelUpEffect(newLevel) {
    // Create a temporary level up notification
    const $levelUpNotification = $(`
        <div class="level-up-notification" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            color: #1a1a2e;
            padding: 20px;
            border-radius: 15px;
            font-weight: bold;
            font-size: 1.1rem;
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
            z-index: 9999;
            animation: levelUpSlideIn 0.5s ease-out;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-star" style="font-size: 1.5rem;"></i>
                <div>
                    <div>🎉 LEVEL UP!</div>
                    <div style="font-size: 0.9rem;">You are now level ${newLevel}!</div>
                </div>
            </div>
        </div>
    `);
    
    // Add CSS animation keyframes if not already added
    if (!document.querySelector('#level-up-animations')) {
        $('head').append(`
            <style id="level-up-animations">
                @keyframes levelUpSlideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes levelUpSlideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            </style>
        `);
    }
    
    // Add to body
    $('body').append($levelUpNotification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        $levelUpNotification.css({
            'animation': 'levelUpSlideOut 0.5s ease-in forwards'
        });
        
        setTimeout(() => {
            $levelUpNotification.remove();
        }, 500);
    }, 4000);
}

/**
 * Add an item to recent purchases
 * @param {string} itemId - The ID of the purchased item
 */
function addToRecentPurchases(itemId) {
    const recentPurchases = document.getElementById('recent-purchases');
    
    // In a real application, you would get item details from your backend
    // For now, we'll create a mock purchase
    
    // Create a mock item based on the ID
    const mockItem = {
        id: itemId,
        name: 'Purchased Item',
        image: '/static/images/avatars/item-placeholder.png',
        timestamp: new Date().toISOString()
    };
    
    // Create a new purchase element
    const purchaseElement = document.createElement('div');
    purchaseElement.className = 'recent-purchase-item';
    purchaseElement.innerHTML = `
        <img src="${mockItem.image}" alt="${mockItem.name}" class="recent-purchase-icon">
        <div class="recent-purchase-info">
            <div class="recent-purchase-name">${mockItem.name}</div>
            <div class="recent-purchase-date">Just now</div>
        </div>
    `;
    
    // Add to the top of the list
    if (recentPurchases.firstChild) {
        recentPurchases.insertBefore(purchaseElement, recentPurchases.firstChild);
    } else {
        recentPurchases.appendChild(purchaseElement);
    }
    
    // Remove any excess items to keep the list at a reasonable size
    const purchases = recentPurchases.querySelectorAll('.recent-purchase-item');
    if (purchases.length > 5) {
        for (let i = 5; i < purchases.length; i++) {
            purchases[i].remove();
        }
    }
}

/**
 * Load featured items for the shop
 */
function loadFeaturedItems() {
    const featuredCarousel = document.getElementById('featured-carousel');
    
    if (!featuredCarousel) return;
    
    // Fetch real featured items from the API
    fetch('/api/avatar-shop/featured-items', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        // Clear loading state
        featuredCarousel.innerHTML = '';
        
        if (!data.success) {
            // If API fails, don't show anything or show error
            console.error('Failed to load featured items:', data.message);
            return;
        }
        
        const featuredItems = data.items || [];
        
        // Add featured items
        featuredItems.forEach(item => {
            const discountedPrice = item.discounted_price || item.price;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'featured-item';
            itemElement.dataset.itemId = item.id;
            
            // Convert relative image path to full static URL
            const imageUrl = item.image.startsWith('/static/') ? item.image : `/static/${item.image}`;
            
            itemElement.innerHTML = `
                <div class="featured-item-image">
                    <img src="${imageUrl}" alt="${item.name}" onerror="this.src='/static/images/avatar-placeholder.png'">
                </div>
                <div class="featured-item-info">
                    <h4 class="featured-item-name">${item.name}</h4>
                    ${item.discount_percentage ? `
                        <div class="featured-item-discount">
                            <span class="original-price">${item.price.toLocaleString()} P</span>
                            <span class="discount-badge">-${item.discount_percentage}%</span>
                        </div>
                    ` : ''}
                    <div class="featured-item-price">
                        <i class="fas fa-gem"></i>
                        <span>${discountedPrice.toLocaleString()}</span>
                    </div>
                </div>
                <div class="featured-item-rarity rarity-${(item.rarity || 'common').toLowerCase()}">${item.rarity || 'Common'}</div>
            `;
            
            // Add click event to preview item in avatar card
            itemElement.addEventListener('click', () => {
                // Create a full item object from the featured item
                const fullItem = {
                    id: item.id,
                    name: item.name,
                    category: item.category || 'Featured',
                    rarity: item.rarity || 'Common',
                    price: discountedPrice,
                    originalPrice: item.price,
                    discount: item.discount_percentage,
                    image: item.image,
                    description: item.description || 'A limited-time featured item available at a special discount.',
                    owned: item.owned || false
                };
                
                previewItemInAvatar(fullItem);
            });
            
            featuredCarousel.appendChild(itemElement);
        });
    })
    .catch(error => {
        console.error('Error loading featured items:', error);
        featuredCarousel.innerHTML = '';
    });
}

/**
 * Load recent purchases for the shop
 */
function loadRecentPurchases() {
    const recentPurchases = document.getElementById('recent-purchases');
    
    if (!recentPurchases) return;
    
    // Simulate API call to get recent purchases
    setTimeout(() => {
        // Mock recent purchases
        const purchases = [
            {
                id: 'purchase-1',
                name: 'Digital Headset',
                image: '/static/images/avatars/accessory-2.png',
                timestamp: '10 minutes ago'
            },
            {
                id: 'purchase-2',
                name: 'Cosmic Flow Hair',
                image: '/static/images/avatars/hair-3.png',
                timestamp: '2 hours ago'
            },
            {
                id: 'purchase-3',
                name: 'Subtle Glow',
                image: '/static/images/avatars/effect-1.png',
                timestamp: 'Yesterday'
            }
        ];
        
        // Clear any existing content
        recentPurchases.innerHTML = '';
        
        // Check if any purchases exist
        if (purchases.length === 0) {
            recentPurchases.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag empty-state-icon"></i>
                    <h3 class="empty-state-title">No recent purchases</h3>
                    <p class="empty-state-description">Items you purchase will appear here</p>
                </div>
            `;
            return;
        }
        
        // Add purchases to the list
        purchases.forEach(purchase => {
            const purchaseElement = document.createElement('div');
            purchaseElement.className = 'recent-purchase-item';
            purchaseElement.innerHTML = `
                <img src="${purchase.image}" alt="${purchase.name}" class="recent-purchase-icon">
                <div class="recent-purchase-info">
                    <div class="recent-purchase-name">${purchase.name}</div>
                    <div class="recent-purchase-date">${purchase.timestamp}</div>
                </div>
            `;
            
            recentPurchases.appendChild(purchaseElement);
        });
    }, 1200);
}

/**
 * Initialize the countdown timer for featured items
 */
function initFeaturedTimer() {
    const timerElement = document.getElementById('featured-timer');
    
    if (!timerElement) return;
    
    // Set a target time 24 hours from now
    const now = new Date();
    const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    let timerInterval;
    
    // Update the timer every second
    function updateTimer() {
        const now = new Date();
        const diff = target - now;
        
        // If the countdown is over, refresh the featured items
        if (diff <= 0) {
            loadFeaturedItems();
            // Reset target to 24 hours from now
            target.setTime(now.getTime() + 24 * 60 * 60 * 1000);
            // Continue the timer without recursion
            return;
        }
        
        // Calculate hours, minutes, seconds
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Format the time
        const formattedTime = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update the timer display
        timerElement.textContent = formattedTime;
    }
    
    // Start the timer with setInterval instead of recursive setTimeout
    updateTimer(); // Initial call
    timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Initialize the item detail modal
 */
function initItemDetailModal() {
    // Nothing to initialize here, modal functionality is handled by Bootstrap
    // This function is a placeholder for any custom modal initialization
}

/**
 * Show item details in the modal
 * @param {Object} item - The item to display details for
 */
function showItemDetails(item) {
    // Get modal elements
    const modal = document.getElementById('itemDetailModal');
    const modalTitle = document.getElementById('itemDetailTitle');
    const modalBody = document.getElementById('itemDetailBody');
    const equipButton = document.getElementById('equipItem');
    const buyButton = document.getElementById('buyItem');
    
    // Set modal title
    modalTitle.textContent = item.name;
    
    // Create discount HTML if applicable
    let discountHtml = '';
    if (item.discount) {
        discountHtml = `
            <div class="item-discount">
                <span class="original-price">${item.originalPrice.toLocaleString()} P</span>
                <span class="discount-badge">-${item.discount}%</span>
            </div>
        `;
    }
    
    // Handle both API data and legacy data structures
    const rawImageUrl = item.image_url || item.image || '/static/images/avatar-placeholder.png';
    const imageUrl = rawImageUrl.startsWith('/static/') ? rawImageUrl : `/static/${rawImageUrl}`;
    const rarityName = item.rarity_name || item.rarity || 'Common';
    const categoryName = item.category_name || item.category || 'Unknown';
    
    // Populate modal body with item details
    modalBody.innerHTML = `
        <div class="item-detail-content">
            <div class="item-image-container">
                <img src="${imageUrl}" alt="${item.name}" class="item-detail-image">
                <div class="item-rarity rarity-${rarityName.toLowerCase()}">${rarityName}</div>
            </div>
            <div class="item-info-container">
                <div class="item-description">${item.description || 'No description available.'}</div>
                <div class="item-stats">
                    <div class="item-stat">
                        <span class="stat-label">Category</span>
                        <span class="stat-value">${categoryName}</span>
                    </div>
                    <div class="item-stat">
                        <span class="stat-label">Rarity</span>
                        <span class="stat-value rarity-${rarityName.toLowerCase()}">${rarityName}</span>
                    </div>
                    <div class="item-stat">
                        <span class="stat-label">Price</span>
                        <div class="price-container">
                            ${discountHtml}
                            <span class="stat-value price-value">
                                <i class="fas fa-gem"></i> ${item.price.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Update button states based on ownership
    if (item.owned) {
        buyButton.style.display = 'none';
        equipButton.style.display = 'block';
        
        // Update equip button based on selection state
        if (item.selected) {
            equipButton.textContent = 'Unequip Item';
            equipButton.classList.add('equipped');
        } else {
            equipButton.textContent = 'Equip Item';
            equipButton.classList.remove('equipped');
        }
    } else {
        buyButton.style.display = 'block';
        equipButton.style.display = 'none';
        buyButton.textContent = `Buy Item (${item.price.toLocaleString()} P)`;
    }
    
    // Add event listeners
    equipButton.onclick = () => toggleEquipItem(item);
    buyButton.onclick = () => showPurchaseConfirmation(item);
    
    // Store item reference in the modal
    modal.setAttribute('data-item-id', item.id);
    
    // Show the modal using Bootstrap's API
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

/**
 * Toggle equip/unequip of an item using jQuery
 * @param {Object} item - The item to equip or unequip
 */
function toggleEquipItem(item) {
    // Determine the action based on current selection state
    const action = item.selected ? 'unequip' : 'equip';
    
    // Show loading state using jQuery
    const $equipButton = $('#equipItem');
    const $actionButtons = $(`.item-action-btn[data-item-id="${item.id}"]`);
    
    if ($equipButton.length) {
        const originalText = $equipButton.html();
        $equipButton.html('<i class="fas fa-spinner fa-spin"></i> Updating...');
        $equipButton.prop('disabled', true);
        $equipButton.data('original-text', originalText);
    }
    
    // Update action buttons in the grid with loading state
    $actionButtons.each(function() {
        const $btn = $(this);
        const originalText = $btn.html();
        $btn.data('original-text', originalText);
        $btn.html('<i class="fas fa-spinner fa-spin"></i>');
        $btn.prop('disabled', true);
    });
    
    // Send equip/unequip request to API using jQuery AJAX
    $.ajax({
        url: '/api/avatar-shop/equip',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            item_id: item.id,
            action: action
        }),
        success: function(data) {
            console.log('Equip API response:', data);
            
            if (data.success) {
                // Toggle the item's selected state
                item.selected = !item.selected;
                
                // Close the modal if it exists using jQuery
                const $modal = $('#itemDetailModal');
                if ($modal.length) {
                    $modal.modal('hide');
                }
                
                // Show success message with shorter duration for better UX
                Swal.fire({
                    title: item.selected ? 'Item Equipped!' : 'Item Unequipped',
                    text: data.message || (item.selected ? 
                        `You are now wearing the ${item.name}.` : 
                        `You are no longer wearing the ${item.name}.`),
                    icon: 'success',
                    background: '#2d3748',
                    color: '#e2e8f0',
                    confirmButtonColor: '#4299e1',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                // Dynamically refresh everything using jQuery
                refreshPreviewCard(item);
                refreshItemGrid(item);
                
                // Update user's avatar configuration in preview after a short delay
                setTimeout(() => {
                    loadUserAvatar();
                }, 200);
                
                // Refresh the current category to reflect changes
                const activeCategory = $('.category-tab.active').attr('data-category');
                if (activeCategory) {
                    setTimeout(() => {
                        loadCategoryItems(activeCategory);
                    }, 300);
                }
                
            } else {
                // Show error message
                Swal.fire({
                    title: 'Error',
                    text: data.message || 'Failed to update item equipment status',
                    icon: 'error',
                    background: '#2d3748',
                    color: '#e2e8f0',
                    confirmButtonColor: '#4299e1'
                });
            }
        },
        error: function(xhr, status, error) {
            console.error('Error toggling item equipment:', error);
            
            // Show error message
            Swal.fire({
                title: 'Network Error',
                text: 'Failed to update item. Please try again.',
                icon: 'error',
                background: '#2d3748',
                color: '#e2e8f0',
                confirmButtonColor: '#4299e1'
            });
        },
        complete: function() {
            // Reset button states using jQuery
            if ($equipButton.length) {
                const originalText = $equipButton.data('original-text') || (action === 'equip' ? 'Equip Item' : 'Unequip Item');
                $equipButton.html(originalText);
                $equipButton.prop('disabled', false);
            }
            
            // Reset action buttons in the grid
            $actionButtons.each(function() {
                const $btn = $(this);
                const originalText = $btn.data('original-text');
                if (originalText) {
                    $btn.html(originalText);
                }
                $btn.prop('disabled', false);
            });
        }
    });
}

/**
 * Preview an item in the avatar preview card
 * @param {Object} item - The item to preview
 */
function previewItemInAvatar(item) {
    // Determine which preview section to update based on item category
    const category = (item.category || '').toLowerCase();
    let targetContainer, targetDisplay, layerClass;
    
    switch (category) {
        case 'banner':
            targetContainer = document.querySelector('.banner-preview-container');
            targetDisplay = document.querySelector('.banner-display');
            layerClass = 'banner-layer';
            break;
        case 'avatar':
        case 'face':
        case 'hair':
        case 'clothing':
            targetContainer = document.querySelector('.avatar-preview-container');
            targetDisplay = document.querySelector('.avatar-display');
            layerClass = 'avatar-layer';
            break;
        case 'decoration':
        case 'accessory':
        case 'effect':
            targetContainer = document.querySelector('.avatar-preview-container');
            targetDisplay = document.querySelector('.avatar-display');
            layerClass = 'decoration-layer';
            break;
        default:
            console.warn('Unknown category:', category);
            targetContainer = document.querySelector('.avatar-preview-container');
            targetDisplay = document.querySelector('.avatar-display');
            layerClass = 'avatar-layer';
    }
    
    // Check if target elements exist
    if (!targetContainer || !targetDisplay) {
        console.warn('Preview container elements not found');
        return;
    }
    
    // Handle image URL formatting
    let imageUrl;
    if (item.image.startsWith('/static/')) {
        imageUrl = item.image;
    } else if (item.image.startsWith('images/')) {
        imageUrl = `/static/${item.image}`;
    } else {
        imageUrl = item.image.startsWith('http') ? item.image : `/static/images/avatar-placeholder.png`;
    }
    
    // For banner items, replace the entire display
    if (category === 'banner') {
        // Clear placeholder and add banner image
        targetDisplay.innerHTML = `
            <div class="${layerClass}">
                <img src="${imageUrl}" alt="${item.name}" style="opacity: 0; transition: opacity 0.3s ease-in-out;">
            </div>
        `;
        
        // Also apply banner as background to avatar preview container (like Dashboard)
        const avatarPreviewContainer = document.querySelector('.avatar-preview-container');
        if (avatarPreviewContainer) {
            avatarPreviewContainer.style.backgroundImage = `url('${imageUrl}')`;
            avatarPreviewContainer.style.backgroundSize = 'cover';
            avatarPreviewContainer.style.backgroundPosition = 'center';
            avatarPreviewContainer.style.backgroundRepeat = 'no-repeat';
            avatarPreviewContainer.classList.add('has-custom-banner');
        }
        
        // Fade in the banner
        const bannerImg = targetDisplay.querySelector('img');
        bannerImg.onerror = function() {
            this.src = '/static/images/avatar-placeholder.png';
            console.warn('Failed to load banner image:', imageUrl);
            
            // Also clear the background if image fails to load
            if (avatarPreviewContainer) {
                avatarPreviewContainer.style.backgroundImage = '';
                avatarPreviewContainer.classList.remove('has-custom-banner');
            }
        };
        
        setTimeout(() => {
            bannerImg.style.opacity = '1';
        }, 50);
    } else {
        // For avatar and decoration items, find or create the layer container
        let layerContainer = targetDisplay.querySelector('.avatar-layer-container');
        if (!layerContainer) {
            layerContainer = document.createElement('div');
            layerContainer.className = 'avatar-layer-container';
            targetDisplay.innerHTML = ''; // Clear placeholder
            targetDisplay.appendChild(layerContainer);
            targetDisplay.classList.add('has-content'); // Add class to hide placeholder
        }
        
        // Find or create the specific layer
        let targetLayer = layerContainer.querySelector(`.${layerClass}`);
        if (!targetLayer) {
            targetLayer = document.createElement('div');
            targetLayer.className = layerClass;
            layerContainer.appendChild(targetLayer);
        }
        
        // Create preview image element
        const previewImg = document.createElement('img');
        previewImg.src = imageUrl;
        previewImg.alt = item.name;
        previewImg.style.opacity = '0';
        previewImg.style.transition = 'opacity 0.3s ease-in-out';
        
        // Add error handling
        previewImg.onerror = function() {
            this.src = '/static/images/avatar-placeholder.png';
            console.warn('Failed to load item image:', imageUrl);
        };
        
        // Clear the target layer and add the preview item
        targetLayer.innerHTML = '';
        targetLayer.appendChild(previewImg);
        
        // Fade in the preview
        setTimeout(() => {
            previewImg.style.opacity = '1';
        }, 50);
    }
    
    // Add visual feedback to show the item is being previewed
    highlightPreviewedItem(item.id);
    
    console.log('Previewing item:', item.name, 'Category:', category, 'Image:', imageUrl);
}

/**
 * Update the preview card item info section
 * @param {Object} item - The item being previewed
 */
function updatePreviewItemInfo(item) {
    // Find or create an item info section in the preview card
    let infoSection = document.querySelector('.preview-item-info');
    
    if (!infoSection) {
        // Create info section if it doesn't exist
        infoSection = document.createElement('div');
        infoSection.className = 'preview-item-info';
        
        // Find the avatar preview container and append info section
        const previewContainer = document.querySelector('.avatar-preview-container');
        if (previewContainer) {
            previewContainer.appendChild(infoSection);
        }
    }
    
    // Create purchase/equip button based on ownership
    let actionButton = '';
    if (item.owned) {
        actionButton = `
            <button class="btn btn-success preview-equip-btn" data-item-id="${item.id}">
                <i class="fas fa-check"></i> Equip Item
            </button>
        `;
    } else {
        actionButton = `
            <button class="btn btn-primary preview-buy-btn" data-item-id="${item.id}">
                <i class="fas fa-gem"></i> Buy (${item.price.toLocaleString()} P)
            </button>
        `;
    }
    
    // Update info section content
    infoSection.innerHTML = `
        <div class="preview-item-details">
            <h4 class="preview-item-name">${item.name}</h4>
            <p class="preview-item-category">${item.category}</p>
            <div class="preview-item-rarity rarity-${(item.rarity || 'common').toLowerCase()}">
                ${item.rarity || 'Common'}
            </div>
            <div class="preview-actions">
                ${actionButton}
                <button class="btn btn-secondary preview-close-btn">
                    <i class="fas fa-times"></i> Clear Preview
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners for the action buttons
    const equipBtn = infoSection.querySelector('.preview-equip-btn');
    const buyBtn = infoSection.querySelector('.preview-buy-btn');
    const closeBtn = infoSection.querySelector('.preview-close-btn');
    
    if (equipBtn) {
        equipBtn.addEventListener('click', () => toggleEquipItem(item));
    }
    
    if (buyBtn) {
        buyBtn.addEventListener('click', () => showPurchaseConfirmation(item));
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => clearItemPreview());
    }
}

/**
 * Highlight the item being previewed in the grid
 * @param {string} itemId - The ID of the item being previewed
 */
function highlightPreviewedItem(itemId) {
    // Remove previous preview highlights
    const previousPreviewed = document.querySelectorAll('.avatar-item-card.previewing');
    previousPreviewed.forEach(card => card.classList.remove('previewing'));
    
    // Add preview highlight to the current item
    const currentItem = document.querySelector(`[data-item-id="${itemId}"]`);
    if (currentItem) {
        currentItem.classList.add('previewing');
    }
}

/**
 * Clear the item preview and return to user's saved configuration
 */
function clearItemPreview() {
    // Remove preview highlight from all items
    const previewedItems = document.querySelectorAll('.avatar-item-card.previewing');
    previewedItems.forEach(card => card.classList.remove('previewing'));
    
    // Remove the preview item info section
    const infoSection = document.querySelector('.preview-item-info');
    if (infoSection) {
        infoSection.remove();
    }
    
    // Reload the user's saved avatar configuration
    loadUserAvatar();
}

/**
 * Update avatar preview with the equipped/unequipped item
 * @param {Object} itemOrConfiguration - The item that was equipped/unequipped or full configuration
 */
function updateAvatarPreview(itemOrConfiguration) {
    console.log('updateAvatarPreview called with:', itemOrConfiguration);
    
    // Handle two different cases: item equipment or full configuration
    if (itemOrConfiguration && itemOrConfiguration.equipped_items) {
        // This is the new API format from /api/avatar-shop/user-configuration
        const configuration = itemOrConfiguration;
        
        // Get the display containers
        const bannerDisplay = document.querySelector('.banner-display');
        const avatarDisplay = document.querySelector('.avatar-display');
        
        // Check if display elements exist before manipulating them
        if (!bannerDisplay || !avatarDisplay) {
            console.warn('Avatar display elements not found');
            return;
        }
        
        // Load banner if configured
        if (configuration.equipped_items.banner) {
            const bannerItem = configuration.equipped_items.banner;
            const imageUrl = bannerItem.image_url || '/static/images/avatar-placeholder.png';
            
            // Display banner in the preview container (traditional method)
            bannerDisplay.innerHTML = `
                <div class="banner-layer">
                    <img src="${imageUrl}" alt="${bannerItem.name}" 
                         onerror="this.src='/static/images/avatar-placeholder.png'">
                </div>
            `;
            
            // Also apply banner as background to avatar preview container (like Dashboard)
            const avatarPreviewContainer = document.querySelector('.avatar-preview-container');
            if (avatarPreviewContainer) {
                avatarPreviewContainer.style.backgroundImage = `url('${imageUrl}')`;
                avatarPreviewContainer.style.backgroundSize = 'cover';
                avatarPreviewContainer.style.backgroundPosition = 'center';
                avatarPreviewContainer.style.backgroundRepeat = 'no-repeat';
                avatarPreviewContainer.classList.add('has-custom-banner');
            }
        } else {
            // Show banner placeholder if no banner is configured
            bannerDisplay.innerHTML = `
                <div class="banner-placeholder">
                    <i class="fas fa-image"></i>
                    <span>Select a banner</span>
                </div>
            `;
            
            // Clear banner background from avatar preview container
            const avatarPreviewContainer = document.querySelector('.avatar-preview-container');
            if (avatarPreviewContainer) {
                avatarPreviewContainer.style.backgroundImage = '';
                avatarPreviewContainer.classList.remove('has-custom-banner');
            }
        }
        
        // Load avatar if configured
        if (configuration.equipped_items.avatar) {
            const avatarItem = configuration.equipped_items.avatar;
            const imageUrl = avatarItem.image_url || '/static/images/avatar-placeholder.png';
            
            avatarDisplay.innerHTML = `
                <div class="avatar-layer-container">
                    <div class="avatar-layer">
                        <img src="${imageUrl}" alt="${avatarItem.name}" 
                             onerror="this.src='/static/images/avatar-placeholder.png'">
                    </div>
                </div>
            `;
        } else {
            // Show avatar placeholder if no avatar is configured
            avatarDisplay.innerHTML = `
                <div class="avatar-placeholder">
                    <i class="fas fa-user"></i>
                    <span>Select an avatar</span>
                </div>
            `;
        }
        
        // Load decoration if configured (overlay on avatar display)
        if (configuration.equipped_items.decoration) {
            let layerContainer = avatarDisplay.querySelector('.avatar-layer-container');
            if (!layerContainer) {
                layerContainer = document.createElement('div');
                layerContainer.className = 'avatar-layer-container';
                avatarDisplay.innerHTML = '';
                avatarDisplay.appendChild(layerContainer);
            }
            
            const decorationItem = configuration.equipped_items.decoration;
            const imageUrl = decorationItem.image_url || '/static/images/avatar-placeholder.png';
            
            // Add or update decoration layer
            let decorationLayer = layerContainer.querySelector('.decoration-layer');
            if (!decorationLayer) {
                decorationLayer = document.createElement('div');
                decorationLayer.className = 'decoration-layer';
                layerContainer.appendChild(decorationLayer);
            }
            
            decorationLayer.innerHTML = `
                <img src="${imageUrl}" alt="${decorationItem.name}" 
                     style="border-radius: 50%;" 
                     onerror="this.src='/static/images/avatar-placeholder.png'">
            `;
        }
    } else if (itemOrConfiguration && itemOrConfiguration.banner_item) {
        // This is the old configuration object format (for backward compatibility)
        const configuration = itemOrConfiguration;
        
        // Get the display containers
        const bannerDisplay = document.querySelector('.banner-display');
        const avatarDisplay = document.querySelector('.avatar-display');
        
        // Check if display elements exist before manipulating them
        if (!bannerDisplay || !avatarDisplay) {
            console.warn('Avatar display elements not found');
            return;
        }
        
        // Load banner if configured
        if (configuration.banner_item && configuration.banner_item.image) {
            const imageUrl = configuration.banner_item.image.startsWith('/static/') ? 
                configuration.banner_item.image : `/static/${configuration.banner_item.image}`;
            
            bannerDisplay.innerHTML = `
                <div class="banner-layer">
                    <img src="${imageUrl}" alt="${configuration.banner_item.name}" 
                         onerror="this.src='/static/images/avatar-placeholder.png'">
                </div>
            `;
            
            // Also apply banner as background to avatar preview container (like Dashboard)
            const avatarPreviewContainer = document.querySelector('.avatar-preview-container');
            if (avatarPreviewContainer) {
                avatarPreviewContainer.style.backgroundImage = `url('${imageUrl}')`;
                avatarPreviewContainer.style.backgroundSize = 'cover';
                avatarPreviewContainer.style.backgroundPosition = 'center';
                avatarPreviewContainer.style.backgroundRepeat = 'no-repeat';
                avatarPreviewContainer.classList.add('has-custom-banner');
            }
        } else {
            // Show banner placeholder if no banner is configured
            bannerDisplay.innerHTML = `
                <div class="banner-placeholder">
                    <i class="fas fa-image"></i>
                    <span>Select a banner</span>
                </div>
            `;
            
            // Clear banner background from avatar preview container
            const avatarPreviewContainer = document.querySelector('.avatar-preview-container');
            if (avatarPreviewContainer) {
                avatarPreviewContainer.style.backgroundImage = '';
                avatarPreviewContainer.classList.remove('has-custom-banner');
            }
        }
        
        // Load avatar if configured
        if (configuration.avatar_item && configuration.avatar_item.image) {
            const imageUrl = configuration.avatar_item.image.startsWith('/static/') ? 
                configuration.avatar_item.image : `/static/${configuration.avatar_item.image}`;
            
            avatarDisplay.innerHTML = `
                <div class="avatar-layer-container">
                    <div class="avatar-layer">
                        <img src="${imageUrl}" alt="${configuration.avatar_item.name}" 
                             onerror="this.src='/static/images/avatar-placeholder.png'">
                    </div>
                </div>
            `;
        } else {
            // Show avatar placeholder if no avatar is configured
            avatarDisplay.innerHTML = `
                <div class="avatar-placeholder">
                    <i class="fas fa-user"></i>
                    <span>Select an avatar</span>
                </div>
            `;
        }
        
        // Load decoration if configured (overlay on avatar display)
        if (configuration.decoration_item && configuration.decoration_item.image) {
            let layerContainer = avatarDisplay.querySelector('.avatar-layer-container');
            if (!layerContainer) {
                layerContainer = document.createElement('div');
                layerContainer.className = 'avatar-layer-container';
                avatarDisplay.innerHTML = '';
                avatarDisplay.appendChild(layerContainer);
            }
            
            const imageUrl = configuration.decoration_item.image.startsWith('/static/') ? 
                configuration.decoration_item.image : `/static/${configuration.decoration_item.image}`;
            
            // Add or update decoration layer
            let decorationLayer = layerContainer.querySelector('.decoration-layer');
            if (!decorationLayer) {
                decorationLayer = document.createElement('div');
                decorationLayer.className = 'decoration-layer';
                layerContainer.appendChild(decorationLayer);
            }
            
            decorationLayer.innerHTML = `
                <img src="${imageUrl}" alt="${configuration.decoration_item.name}" 
                     style="border-radius: 50%;" 
                     onerror="this.src='/static/images/avatar-placeholder.png'">
            `;
        }
    } else if (itemOrConfiguration && itemOrConfiguration.category) {
        // This is a single item being equipped/unequipped
        const item = itemOrConfiguration;
        const category = (item.category || '').toLowerCase();
        
        if (category === 'banner') {
            const bannerDisplay = document.querySelector('.banner-display');
            if (bannerDisplay) {
                if (item.selected) {
                    const imageUrl = item.image.startsWith('/static/') ? item.image : `/static/${item.image}`;
                    bannerDisplay.innerHTML = `
                        <div class="banner-layer">
                            <img src="${imageUrl}" alt="${item.name}" 
                                 onerror="this.src='/static/images/avatar-placeholder.png'">
                        </div>
                    `;
                } else {
                    // Show placeholder for unequipped banner
                    bannerDisplay.innerHTML = `
                        <div class="banner-placeholder">
                            <i class="fas fa-image"></i>
                            <span>Select a banner</span>
                        </div>
                    `;
                }
            }
        } else {
            // Handle avatar and decoration items
            const avatarDisplay = document.querySelector('.avatar-display');
            if (avatarDisplay) {
                let layerContainer = avatarDisplay.querySelector('.avatar-layer-container');
                if (!layerContainer) {
                    layerContainer = document.createElement('div');
                    layerContainer.className = 'avatar-layer-container';
                    avatarDisplay.innerHTML = '';
                    avatarDisplay.appendChild(layerContainer);
                }
                
                // Determine layer class based on category
                const layerClass = category === 'decoration' || category === 'accessory' || category === 'effect' ? 
                    'decoration-layer' : 'avatar-layer';
                
                let targetLayer = layerContainer.querySelector(`.${layerClass}`);
                if (!targetLayer) {
                    targetLayer = document.createElement('div');
                    targetLayer.className = layerClass;
                    layerContainer.appendChild(targetLayer);
                }
                
                if (item.selected) {
                    const imageUrl = item.image.startsWith('/static/') ? item.image : `/static/${item.image}`;
                    const isDecoration = category === 'decoration' || category === 'accessory' || category === 'effect';
                    
                    targetLayer.innerHTML = `
                        <img src="${imageUrl}" alt="${item.name}" 
                             ${isDecoration ? 'style="border-radius: 50%;"' : ''}
                             onerror="this.src='/static/images/avatar-placeholder.png'">
                    `;
                } else {
                    // For unequipped items, remove the layer content
                    targetLayer.innerHTML = '';
                }
            }
        }
    }
}

/**
 * Show purchase confirmation modal
 * @param {Object} item - The item to purchase
 */
function showPurchaseConfirmation(item) {
    // Get modal elements
    const modal = document.getElementById('purchaseModal');
    const modalBody = document.getElementById('purchaseModalBody');
    const confirmPurchaseBtn = document.getElementById('confirmPurchase');
    
    // Get user's pearl balance from global data or fallback to UI display
    const userPearls = window.currentUserData ? window.currentUserData.pearl : parseInt(document.getElementById('user-pearls').textContent.replace(/,/g, ''));
    
    // Check if user has enough pearls
    const hasEnoughPearls = userPearls >= item.price;
    const balanceAfterPurchase = userPearls - item.price;
    
    // Create discount HTML if applicable
    let discountHtml = '';
    if (item.discount && item.originalPrice) {
        discountHtml = `
            <div class="purchase-discount">
                <span class="original-price">${item.originalPrice.toLocaleString()} P</span>
                <span class="discount-badge">-${item.discount}%</span>
            </div>
        `;
    }
    
    // Handle both API data and legacy data structures
    const rawImageUrl = item.image_url || item.image || '/static/images/avatar-placeholder.png';
    const imageUrl = rawImageUrl.startsWith('/static/') ? rawImageUrl : `/static/${rawImageUrl}`;
    const rarityName = item.rarity_name || item.rarity || 'Common';
    const categoryName = item.category_name || item.category || 'Unknown';
    const itemDescription = item.description || 'A stylish item for your avatar that will make you stand out in the Pearl Verse.';
    
    // Determine if the item is free
    const isFree = item.price === 0;
    
    // Populate modal body with enhanced purchase details
    modalBody.innerHTML = `
        <div class="purchase-confirmation">
            <!-- Item Preview Section -->
            <div class="purchase-item-preview">
                <img src="${imageUrl}" alt="${item.name}" class="purchase-image" 
                     onerror="this.src='/static/images/avatar-placeholder.png'">
                <div class="purchase-item-rarity rarity-${rarityName.toLowerCase()}">${rarityName}</div>
            </div>
            
            <!-- Purchase Details Section -->
            <div class="purchase-details">
                <h4 class="purchase-item-name">${item.name}</h4>
                <p class="purchase-item-category">${categoryName}</p>
                
                <!-- Item Description -->
                <div class="purchase-item-description">
                    ${itemDescription}
                </div>
                
                <!-- Price Section -->
                <div class="purchase-price-section">
                    <div class="purchase-price-header">
                        <i class="fas fa-tag"></i>
                        Item Price
                    </div>
                        <div class="purchase-price-container">
                            ${discountHtml}
                            <div class="purchase-price ${isFree ? 'free' : ''}">
                                <i class="fas fa-${isFree ? 'gift' : 'gem'}"></i>
                                <span>${isFree ? 'FREE' : formatNumber(item.price)}</span>
                            </div>
                        </div>
                </div>
                
                <!-- Balance and Transaction Summary -->
                ${!isFree ? `
                    <div class="purchase-balance-section">
                        <div class="purchase-balance-header">
                            <i class="fas fa-wallet"></i>
                            Your Balance
                        </div>
                        <div class="purchase-balance">
                            <div class="balance-item">
                                <span class="balance-label">Current Balance:</span>
                                <span class="balance-value">
                                    <i class="fas fa-gem"></i>
                                    ${formatNumber(userPearls)}
                                </span>
                            </div>
                            <div class="balance-item">
                                <span class="balance-label">Item Cost:</span>
                                <span class="balance-value">
                                    <i class="fas fa-minus"></i>
                                    ${formatNumber(item.price)}
                                </span>
                            </div>
                            <div class="balance-item">
                                <span class="balance-label">Balance After:</span>
                                <span class="balance-value ${hasEnoughPearls ? 'sufficient' : 'insufficient'}">
                                    <i class="fas fa-gem"></i>
                                    ${formatNumber(balanceAfterPurchase)}
                                </span>
                            </div>
                        </div>
                        
                        ${!hasEnoughPearls ? `
                            <div class="balance-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                You need ${formatNumber(item.price - userPearls)} more pearls to purchase this item.
                            </div>
                        ` : `
                            <div class="balance-after">
                                ✨ You'll have ${formatNumber(balanceAfterPurchase)} pearls remaining after this purchase
                            </div>
                        `}
                    </div>
                    
                    <!-- Transaction Summary -->
                    <div class="transaction-summary">
                        <div class="transaction-summary-header">
                            <i class="fas fa-receipt"></i>
                            Transaction Summary
                        </div>
                        <div class="transaction-item">
                            <span class="transaction-label">${item.name}</span>
                            <span class="transaction-value">
                                <i class="fas fa-gem"></i>
                                ${formatNumber(item.price)}
                            </span>
                        </div>
                        ${item.discount ? `
                            <div class="transaction-item">
                                <span class="transaction-label">Discount (${item.discount}%)</span>
                                <span class="transaction-value" style="color: var(--success);">
                                    <i class="fas fa-minus"></i>
                                    ${formatNumber(item.originalPrice - item.price)}
                                </span>
                            </div>
                        ` : ''}
                        <div class="transaction-item">
                            <span class="transaction-label">Total Cost:</span>
                            <span class="transaction-value total">
                                <i class="fas fa-gem"></i>
                                ${formatNumber(item.price)}
                            </span>
                        </div>
                    </div>
                ` : `
                    <div class="purchase-price-section">
                        <div class="purchase-price-header">
                            <i class="fas fa-gift"></i>
                            Special Offer
                        </div>
                        <div class="balance-after" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.1)); border-color: rgba(16, 185, 129, 0.3); color: var(--success);">
                            🎉 This item is completely FREE! No pearls required.
                        </div>
                    </div>
                `}
                
                <!-- Insufficient balance options -->
                ${!hasEnoughPearls && !isFree ? `
                    <div class="insufficient-balance-options">
                        <h5 style="color: var(--text-primary); margin-bottom: var(--spacing-md); font-size: var(--font-size-base);">Need more pearls?</h5>
                        <button class="topup-option">
                            <i class="fas fa-plus-circle"></i> Top Up Pearls
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Update the purchase button text and state
    const purchaseBtnText = confirmPurchaseBtn.querySelector('.purchase-btn-text');
    if (isFree) {
        purchaseBtnText.textContent = 'Claim Free Item';
        confirmPurchaseBtn.disabled = false;
        confirmPurchaseBtn.querySelector('i').className = 'fas fa-gift';
    } else if (hasEnoughPearls) {
        purchaseBtnText.textContent = `Purchase for ${item.price.toLocaleString()} Pearls`;
        confirmPurchaseBtn.disabled = false;
        confirmPurchaseBtn.querySelector('i').className = 'fas fa-gem';
    } else {
        purchaseBtnText.textContent = 'Insufficient Pearls';
        confirmPurchaseBtn.disabled = true;
        confirmPurchaseBtn.querySelector('i').className = 'fas fa-exclamation-triangle';
    }
    
    // Add event listener for top up button if present
    const topupButton = modalBody.querySelector('.topup-option');
    if (topupButton) {
        topupButton.addEventListener('click', () => {
            // Close purchase modal
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            bootstrapModal.hide();
            
            // Show top up modal or redirect to top up page
            Swal.fire({
                title: 'Top Up Pearls',
                text: 'This feature will redirect you to the pearl store where you can purchase more pearls.',
                icon: 'info',
                background: '#1e1e3f',
                color: '#ffffff',
                confirmButtonColor: '#06b6d4',
                confirmButtonText: 'Go to Pearl Store',
                showCancelButton: true,
                cancelButtonColor: '#6b7280'
            }).then((result) => {
                if (result.isConfirmed) {
                    // In a real app, redirect to pearl store
                    console.log('Redirecting to pearl store...');
                }
            });
        });
    }
    
    // Store item reference in the modal
    modal.setAttribute('data-item-id', item.id);
    modal.setAttribute('data-item-price', item.price);
    
    // Show the modal using Bootstrap's API
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

/**
 * Update dashboard avatar display based on avatar shop selections
 */
function updateDashboardAvatar() {
    // In a real application, this function would update the avatar display on the dashboard
    // This is a placeholder for that functionality
    console.log('Dashboard avatar has been updated');
}

/**
 * Reset avatar to default configuration
 */
function resetAvatar() {
    // Show loading state
    const resetButton = document.getElementById('reset-avatar');
    const originalText = resetButton.innerHTML;
    resetButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    resetButton.disabled = true;
    
    // Simulate API call to reset avatar
    setTimeout(() => {
        // In a real application, you would reset to the user's default configuration
        
        // For demo, reload the default avatar layers
        const avatarDisplay = document.getElementById('avatar-display');
        avatarDisplay.innerHTML = `
            <div class="avatar-character">
                <div class="avatar-layer avatar-base">
                    <img src="/static/images/avatars/base-avatar.png" alt="Avatar Base">
                </div>
                <div class="avatar-layer avatar-face">
                    <img src="/static/images/avatars/face-1.png" alt="Avatar Face">
                </div>
                <div class="avatar-layer avatar-hair">
                    <img src="/static/images/avatars/hair-1.png" alt="Avatar Hair">
                </div>
                <div class="avatar-layer avatar-clothing">
                    <img src="/static/images/avatars/clothing-1.png" alt="Avatar Clothing">
                </div>
                <div class="avatar-layer avatar-accessory">
                    <img src="/static/images/avatars/accessory-1.png" alt="Avatar Accessory">
                </div>
                <div class="avatar-layer avatar-effect">
                    <img src="/static/images/avatars/effect-1.png" alt="Avatar Effect">
                </div>
            </div>
        `;
        
        
        // Show success message
        Swal.fire({
            title: 'Avatar Reset!',
            text: 'Your avatar has been reset to default configuration.',
            icon: 'info',
            background: '#2d3748',
            color: '#e2e8f0',
            confirmButtonColor: '#4299e1'
        });
        
        // Reset button
        resetButton.innerHTML = originalText;
        resetButton.disabled = false;
        
    }, 1200);
}


/**
 * Dynamically refresh the preview card when items are equipped/unequipped
 * @param {Object} item - The item that was equipped/unequipped
 */
function refreshPreviewCard(item) {
    console.log('refreshPreviewCard called with item:', item);
    
    const category = (item.category || '').toLowerCase();
    
    // Add loading animation to the preview card
    const $previewContainer = category === 'banner' ? $('.banner-preview-container') : $('.avatar-preview-container');
    
    $previewContainer.addClass('updating');
    
    // Update the preview display with smooth transition
    setTimeout(() => {
        updateAvatarPreview(item);
        
        // Remove updating class after animation
        setTimeout(() => {
            $previewContainer.removeClass('updating');
        }, 300);
    }, 200);
    
    // Update the local configuration to match new API format
    if (window.currentAvatarConfig) {
        // Ensure we have the equipped_items structure
        if (!window.currentAvatarConfig.equipped_items) {
            window.currentAvatarConfig.equipped_items = {
                banner: null,
                avatar: null,
                decoration: null
            };
        }
        
        // Update the configuration based on the item change
        if (item.selected) {
            // Item was equipped
            const equippedItemData = {
                id: item.id,
                name: item.name,
                image_url: item.image || item.image_url,
                category: item.category
            };
            
            switch (category) {
                case 'banner':
                    window.currentAvatarConfig.equipped_items.banner = equippedItemData;
                    break;
                case 'avatar':
                case 'face':
                case 'hair':
                case 'clothing':
                    window.currentAvatarConfig.equipped_items.avatar = equippedItemData;
                    break;
                case 'decoration':
                case 'accessory':
                case 'effect':
                    window.currentAvatarConfig.equipped_items.decoration = equippedItemData;
                    break;
            }
        } else {
            // Item was unequipped
            switch (category) {
                case 'banner':
                    window.currentAvatarConfig.equipped_items.banner = null;
                    break;
                case 'avatar':
                case 'face':
                case 'hair':
                case 'clothing':
                    window.currentAvatarConfig.equipped_items.avatar = null;
                    break;
                case 'decoration':
                case 'accessory':
                case 'effect':
                    window.currentAvatarConfig.equipped_items.decoration = null;
                    break;
            }
        }
        
        console.log('Updated currentAvatarConfig after equipment change:', window.currentAvatarConfig);
    }
}

/**
 * Dynamically refresh the item grid to show updated equipment status
 * @param {Object} item - The item that was equipped/unequipped
 */
function refreshItemGrid(item) {
    // Find the item card in the grid using jQuery
    const $itemCard = $(`.avatar-item-card[data-item-id="${item.id}"]`);
    
    if ($itemCard.length) {
        // Update the selection class
        if (item.selected) {
            $itemCard.addClass('selected');
        } else {
            $itemCard.removeClass('selected');
        }
        
        // Update the action button
        const $actionButton = $itemCard.find('.item-action-btn');
        if ($actionButton.length) {
            if (item.selected) {
                $actionButton
                    .removeClass('equip-btn')
                    .addClass('equipped-btn')
                    .attr('data-action', 'unequip')
                    .html('<i class="fas fa-check"></i> Equipped');
            } else {
                $actionButton
                    .removeClass('equipped-btn')
                    .addClass('equip-btn')
                    .attr('data-action', 'equip')
                    .html('<i class="fas fa-plus"></i> Equip');
            }
        }
        
        // Add a brief highlight animation
        $itemCard.addClass('item-updated');
        setTimeout(() => {
            $itemCard.removeClass('item-updated');
        }, 1000);
    }
}

/**
 * Refresh all equipped items across all categories using jQuery
 */
function refreshAllEquippedItems() {
    // Update all item cards in the grid to reflect current equipment status
    $('.avatar-item-card').each(function() {
        const $card = $(this);
        const itemId = $card.data('item-id');
        
        // Check if this item is currently equipped
        const isEquipped = isItemCurrentlyEquipped(itemId);
        
        if (isEquipped) {
            $card.addClass('selected');
            const $actionBtn = $card.find('.item-action-btn');
            if ($actionBtn.hasClass('equip-btn')) {
                $actionBtn
                    .removeClass('equip-btn')
                    .addClass('equipped-btn')
                    .attr('data-action', 'unequip')
                    .html('<i class="fas fa-check"></i> Equipped');
            }
        } else {
            $card.removeClass('selected');
            const $actionBtn = $card.find('.item-action-btn');
            if ($actionBtn.hasClass('equipped-btn')) {
                $actionBtn
                    .removeClass('equipped-btn')
                    .addClass('equip-btn')
                    .attr('data-action', 'equip')
                    .html('<i class="fas fa-plus"></i> Equip');
            }
        }
    });
}

/**
 * Check if an item is currently equipped
 * @param {string} itemId - The ID of the item to check
 * @returns {boolean} - True if the item is equipped, false otherwise
 */
function isItemCurrentlyEquipped(itemId) {
    if (!window.currentAvatarConfig) return false;
    
    const config = window.currentAvatarConfig;
    console.log('Checking if item', itemId, 'is equipped in config:', config);
    
    // Handle new API format
    if (config.equipped_items) {
        const isEquipped = (
            (config.equipped_items.banner && config.equipped_items.banner.id == itemId) ||
            (config.equipped_items.avatar && config.equipped_items.avatar.id == itemId) ||
            (config.equipped_items.decoration && config.equipped_items.decoration.id == itemId)
        );
        console.log('Item', itemId, 'equipped status (new format):', isEquipped);
        return isEquipped;
    }
    
    // Handle old format (backward compatibility)
    const isEquipped = (
        (config.banner_item && config.banner_item.id == itemId) ||
        (config.avatar_item && config.avatar_item.id == itemId) ||
        (config.decoration_item && config.decoration_item.id == itemId)
    );
    console.log('Item', itemId, 'equipped status (old format):', isEquipped);
    return isEquipped;
}

/**
 * Initialize real-time preview updates using jQuery
 */
function initRealTimePreviewUpdates() {
    // Set up observers for preview changes using jQuery
    $(document).ready(function() {
        // Watch for changes in the avatar configuration
        let configCheckInterval = setInterval(function() {
            if (window.currentAvatarConfig) {
                refreshAllEquippedItems();
            }
        }, 2000); // Check every 2 seconds
        
        // Store interval ID for cleanup
        window.configCheckInterval = configCheckInterval;
    });
}

/**
 * Add smooth transition animations for equipment changes using jQuery
 */
function addEquipmentTransitionAnimations() {
    // Add CSS for smooth transitions if not already added
    if (!$('#equipment-animations').length) {
        $('head').append(`
            <style id="equipment-animations">
                .avatar-item-card {
                    transition: all 0.3s ease;
                }
                
                .avatar-item-card.item-updated {
                    transform: scale(1.02);
                    box-shadow: 0 8px 25px rgba(66, 153, 225, 0.3);
                    border-color: rgba(66, 153, 225, 0.5);
                }
                
                .preview-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }
                
                .preview-loading i {
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                    color: var(--primary);
                }
                
                .banner-preview-container.updating,
                .avatar-preview-container.updating {
                    opacity: 0.7;
                    transform: scale(0.98);
                    transition: all 0.3s ease;
                }
                
                .equipped-items-info {
                    background: rgba(66, 153, 225, 0.05);
                    border: 1px solid rgba(66, 153, 225, 0.2);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-top: 1rem;
                    animation: slideIn 0.5s ease-out;
                }
                
                .equipped-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem;
                    margin-bottom: 0.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    animation: fadeInUp 0.4s ease-out;
                }
                
                .equipped-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateX(4px);
                }
                
                .equipped-item-image {
                    width: 40px;
                    height: 40px;
                    border-radius: 6px;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                
                .equipped-item-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .equipped-item-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .equipped-item-name {
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .equipped-item-category {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .equipped-item-unequip {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #ef4444;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                
                .equipped-item-unequip:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.5);
                    transform: scale(1.1);
                }
                
                .no-equipped-items {
                    text-align: center;
                    padding: 1rem;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }
                
                .no-equipped-items i {
                    margin-right: 0.5rem;
                    opacity: 0.7;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        `);
    }
}

/**
 * Initialize all jQuery enhancements on page load
 */
$(document).ready(function() {
    // Initialize real-time preview updates
    initRealTimePreviewUpdates();
    
    // Add equipment transition animations
    addEquipmentTransitionAnimations();
    
    // Fix modal scrollbar issues
    initModalScrollbarFix();
    
    // Enhanced category tab switching with jQuery
    $('.category-tab').on('click', function() {
        const $this = $(this);
        const category = $this.data('category');
        
        // Remove active class from all tabs with animation
        $('.category-tab').removeClass('active');
        
        // Add active class to clicked tab
        $this.addClass('active');
        
        // Add loading animation to items grid
        $('#items-grid').addClass('loading');
        
        // Load items for the category
        loadCategoryItems(category);
        
        // Remove loading class after items load
        setTimeout(() => {
            $('#items-grid').removeClass('loading');
        }, 500);
    });
    
    // Enhanced search functionality with jQuery
    $('#item-search').on('input', function() {
        const $this = $(this);
        const searchValue = $this.val();
        
        // Add visual feedback for active search
        if (searchValue.length > 0) {
            $this.addClass('has-content');
        } else {
            $this.removeClass('has-content');
        }
    });
    
    // Enhanced filter functionality with jQuery
    $('#owned-filter').on('change', function() {
        const $this = $(this);
        const filterValue = $this.val();
        
        // Add visual feedback for active filter
        if (filterValue !== 'all') {
            $this.addClass('filtered');
        } else {
            $this.removeClass('filtered');
        }
    });
});

/**
 * Initialize modal scrollbar fix to prevent body overflow
 */
function initModalScrollbarFix() {
    // Listen for modal show events
    $(document).on('show.bs.modal', '.modal', function() {
        console.log('Modal opening - preventing body scroll');
        $('body').addClass('modal-open');
    });
    
    // Listen for modal hide events
    $(document).on('hide.bs.modal', '.modal', function() {
        console.log('Modal closing - restoring body scroll');
        $('body').removeClass('modal-open');
    });
    
    // Also handle modal hidden events (final cleanup)
    $(document).on('hidden.bs.modal', '.modal', function() {
        console.log('Modal fully closed - ensuring body scroll is restored');
        $('body').removeClass('modal-open');
    });
    
    // Handle escape key and backdrop clicks
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $('.modal.show').length > 0) {
            console.log('Modal closed via escape key - restoring body scroll');
            $('body').removeClass('modal-open');
        }
    });
    
    // Backup: Remove modal-open class if no modals are visible
    setInterval(function() {
        if ($('.modal.show').length === 0 && $('body').hasClass('modal-open')) {
            console.log('No modals visible but body has modal-open class - fixing');
            $('body').removeClass('modal-open');
        }
    }, 1000);
    
    console.log('Modal scrollbar fix initialized');
}

/**
 * Enhanced avatar save function with jQuery animations
 */
function saveAvatarEnhanced() {
    const $saveButton = $('#save-avatar');
    const originalText = $saveButton.html();
    
    // Show enhanced loading state
    $saveButton.html('<i class="fas fa-spinner fa-spin"></i> Saving Avatar...');
    $saveButton.prop('disabled', true);
    
    // Add saving animation to preview areas
    $('.banner-preview-container, .avatar-preview-container').addClass('saving');
    
    // Send save request using jQuery AJAX
    $.ajax({
        url: '/api/avatar-shop/save-configuration',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            configuration: window.currentAvatarConfig || {}
        }),
        success: function(data) {
            if (data.success) {
                // Show success message with enhanced styling
                Swal.fire({
                    title: '✨ Avatar Saved!',
                    text: 'Your custom avatar has been updated successfully.',
                    icon: 'success',
                    background: '#2d3748',
                    color: '#e2e8f0',
                    confirmButtonColor: '#4299e1',
                    timer: 2500,
                    showConfirmButton: false
                });
                
                // Add success animation to preview areas
                $('.banner-preview-container, .avatar-preview-container')
                    .removeClass('saving')
                    .addClass('saved');
                
                setTimeout(() => {
                    $('.banner-preview-container, .avatar-preview-container').removeClass('saved');
                }, 1000);
                
            } else {
                Swal.fire({
                    title: 'Save Failed',
                    text: data.message || 'Failed to save avatar configuration.',
                    icon: 'error',
                    background: '#2d3748',
                    color: '#e2e8f0',
                    confirmButtonColor: '#4299e1'
                });
            }
        },
        error: function(xhr, status, error) {
            console.error('Error saving avatar:', error);
            Swal.fire({
                title: 'Network Error',
                text: 'Failed to save avatar. Please try again.',
                icon: 'error',
                background: '#2d3748',
                color: '#e2e8f0',
                confirmButtonColor: '#4299e1'
            });
        },
        complete: function() {
            // Reset button state
            $saveButton.html(originalText);
            $saveButton.prop('disabled', false);
            
            // Remove saving animation
            $('.banner-preview-container, .avatar-preview-container').removeClass('saving');
        }
    });
}


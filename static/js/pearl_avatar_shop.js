/**
 * Pearl Avatar Shop - Modern JavaScript Implementation
 * Features: Auto-scaling grid, preview system, API integration
 */

// Configuration and State Management
const AvatarShop = {
    // State variables
    currentPage: 1,
    itemsPerPage: 12,
    currentCategory: 'banner',
    searchQuery: '',
    ownershipFilter: 'all', // all, owned, unowned
    filteredItems: [], // Stores client-side filtered items
    allItemsLoaded: false, // Track if we've loaded all items for client-side filtering
    shopItems: [],
    userItems: [],
    allItemsCache: new Map(), // Cache for all items across categories
    userConfiguration: {
        banner: null,
        avatar: null,
        decoration: null
    },
    
    // User data
    userData: {
        pearls: 0,
        level: 1,
        ownedCount: 0
    },
    
    // API endpoints
    endpoints: {
        items: '/api/avatar-shop/items',
        purchase: '/api/avatar-shop/purchase',
        equip: '/api/avatar-shop/equip',
        configuration: '/api/avatar-shop/configuration',
        stats: '/api/avatar-shop/stats'
    },
    
    // Initialize the avatar shop
    init() {
        console.log('🎭 Initializing Pearl Avatar Shop...');
        this.setupEventListeners();
        this.loadUserData();
        this.loadShopItems();
        this.loadUserConfiguration();
        this.setupSearch();
        this.setupFilters();
        console.log('✨ Avatar Shop initialized successfully!');
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Category filter buttons with preview preservation
        $('input[name="category"]').on('change', (e) => {
            this.currentCategory = e.target.value;
            this.currentPage = 1;
            
            // Re-load user configuration to ensure preview persists
            this.loadUserConfiguration().then(() => {
                this.filterAndDisplayItems();
            });
        });
        
        
        // Reset configuration button
        $('#resetConfiguration').on('click', () => {
            this.resetConfiguration();
        });
        
        // Purchase confirmation modal
        $('#confirmPurchase').on('click', () => {
            this.confirmPurchase();
        });
        
        // Ownership filter dropdown
        $('#ownershipFilter').on('change', (e) => {
            this.ownershipFilter = e.target.value;
            this.currentPage = 1;
            this.allItemsLoaded = false; // Reset to reload items for new filter
            this.filterAndDisplayItems();
        });
        
        // Pagination will be set up dynamically
        $(document).on('click', '.page-link[data-page]', (e) => {
            e.preventDefault();
            const page = parseInt($(e.target).data('page'));
            if (page && page !== this.currentPage) {
                this.currentPage = page;
                
                // For client-side filtering, just redisplay with new page
                if (this.ownershipFilter !== 'all' && this.filteredItems.length > 0) {
                    this.displayItems(this.shopItems);
                } else {
                    this.filterAndDisplayItems();
                }
            }
        });
        
        // Item interactions will be set up dynamically
        $(document).on('click', '.item-btn[data-action]', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Stop event from bubbling to item card
            console.log('🔵 Button clicked!', e.target);
            const $button = $(e.target).closest('.item-btn');
            const action = $button.data('action');
            const itemId = $button.closest('.item-card').data('item-id');
            console.log('🔵 Action:', action, 'Item ID:', itemId);
            this.handleItemAction(action, itemId);
        });
        
        // Item card click for preview (except when clicking action buttons)
        $(document).on('click', '.item-card[data-action]', (e) => {
            e.preventDefault();
            const action = $(e.target).closest('.item-card').data('action');
            const itemId = $(e.target).closest('.item-card').data('item-id');
            this.handleItemAction(action, itemId);
        });
    },
    
    // Setup search functionality with debouncing
    setupSearch() {
        let searchTimeout;
        $('#searchItems').on('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value.trim().toLowerCase();
                this.currentPage = 1;
                this.filterAndDisplayItems();
            }, 300);
        });
    },
    
    // Setup filter animations and interactions
    setupFilters() {
        // Animate category tabs
        $('.category-tabs .btn').hover(function() {
            $(this).addClass('shadow-sm');
        }, function() {
            $(this).removeClass('shadow-sm');
        });
    },
    
    // Load user data from API
    async loadUserData() {
        try {
            const [userResponse, statsResponse] = await Promise.all([
                $.get('/api/current-user'),
                $.get(this.endpoints.stats)
            ]);
            
            if (userResponse.success) {
                this.userData = {
                    pearls: userResponse.user.pearl || 0,
                    level: userResponse.user.level || 1,
                    ownedCount: 0 // Will be updated from stats
                };
                
                this.updateUserStats();
            }
            
            if (statsResponse && statsResponse.success) {
                this.updateCollectionStats(statsResponse.stats);
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.showToast('error', 'Failed to load user data');
        }
    },
    
    // Load shop items from API
    async loadShopItems() {
        this.showLoading(true);
        try {
            // For client-side filtering, we need to load ALL items
            if (this.ownershipFilter !== 'all' && !this.allItemsLoaded) {
                await this.loadAllItemsForFiltering();
                return;
            }
            
            // Build query parameters for server-side filtering
            const params = new URLSearchParams();
            if (this.currentCategory !== 'all') {
                params.append('category', this.currentCategory);
            }
            if (this.searchQuery) {
                params.append('search', this.searchQuery);
            }
            // Only use server-side pagination for 'all' filter
            if (this.ownershipFilter === 'all') {
                params.append('page', this.currentPage);
                params.append('per_page', this.itemsPerPage);
            } else {
                // Load many items for client-side filtering
                params.append('page', 1);
                params.append('per_page', 1000); // Load many items
            }
            
            const url = `${this.endpoints.items}?${params.toString()}`;
            const response = await $.get(url);
            
            if (response.success) {
                this.shopItems = response.items || [];
                
                // Cache all items for preview system
                this.shopItems.forEach(item => {
                    this.allItemsCache.set(item.id, item);
                });
                
                // Extract user items from the ownership data
                this.userItems = response.items ? 
                    response.items.filter(item => item.owned).map(item => item.id) : [];
                
                this.displayItems(this.shopItems);
                
                // Update pagination based on filter type
                if (this.ownershipFilter === 'all' && response.pagination) {
                    // Use server pagination for 'all' filter
                    this.updatePagination(
                        response.pagination.page,
                        response.pagination.pages,
                        response.pagination.total
                    );
                } else if (this.ownershipFilter !== 'all') {
                    // Use client-side pagination for filtered results
                    this.updateClientSidePagination();
                }
            } else {
                this.showEmptyState('Failed to load shop items');
            }
        } catch (error) {
            console.error('Failed to load shop items:', error);
            this.showEmptyState('Error loading shop items');
            this.showToast('error', 'Failed to load shop items');
        } finally {
            this.showLoading(false);
        }
    },
    
    // Load all items for client-side filtering
    async loadAllItemsForFiltering() {
        try {
            const params = new URLSearchParams();
            if (this.currentCategory !== 'all') {
                params.append('category', this.currentCategory);
            }
            if (this.searchQuery) {
                params.append('search', this.searchQuery);
            }
            params.append('page', 1);
            params.append('per_page', 1000); // Load many items
            
            const url = `${this.endpoints.items}?${params.toString()}`;
            const response = await $.get(url);
            
            if (response.success) {
                this.shopItems = response.items || [];
                this.allItemsLoaded = true;
                
                // Cache all items
                this.shopItems.forEach(item => {
                    this.allItemsCache.set(item.id, item);
                });
                
                // Extract user items
                this.userItems = response.items ? 
                    response.items.filter(item => item.owned).map(item => item.id) : [];
                
                this.displayItems(this.shopItems);
                this.updateClientSidePagination();
            }
        } catch (error) {
            console.error('Failed to load all items:', error);
            this.showEmptyState('Error loading items');
        } finally {
            this.showLoading(false);
        }
    },
    
    // Load user's current avatar configuration
    async loadUserConfiguration() {
        try {
            const response = await $.get(this.endpoints.configuration);
            if (response.success && response.configuration && response.configuration.equipped_items) {
                // Convert API format to expected format
                const equippedItems = response.configuration.equipped_items;
                this.userConfiguration = {
                    banner: equippedItems.banner ? equippedItems.banner.id : null,
                    avatar: equippedItems.avatar ? equippedItems.avatar.id : null,
                    decoration: equippedItems.decoration ? equippedItems.decoration.id : null
                };
                
                // Cache the full item details for preview
                if (equippedItems.banner) {
                    this.allItemsCache.set(equippedItems.banner.id, {
                        id: equippedItems.banner.id,
                        name: equippedItems.banner.name,
                        image_url: equippedItems.banner.image_url,
                        category: equippedItems.banner.category
                    });
                }
                if (equippedItems.avatar) {
                    this.allItemsCache.set(equippedItems.avatar.id, {
                        id: equippedItems.avatar.id,
                        name: equippedItems.avatar.name,
                        image_url: equippedItems.avatar.image_url,
                        category: equippedItems.avatar.category
                    });
                }
                if (equippedItems.decoration) {
                    this.allItemsCache.set(equippedItems.decoration.id, {
                        id: equippedItems.decoration.id,
                        name: equippedItems.decoration.name,
                        image_url: equippedItems.decoration.image_url,
                        category: equippedItems.decoration.category
                    });
                }
                
                console.log('User configuration loaded:', this.userConfiguration);
                this.updatePreview();
            } else {
                console.log('No configuration found, using defaults');
                this.userConfiguration = {
                    banner: null,
                    avatar: null,
                    decoration: null
                };
                this.updatePreview();
            }
        } catch (error) {
            console.error('Failed to load user configuration:', error);
            // Set defaults on error
            this.userConfiguration = {
                banner: null,
                avatar: null,
                decoration: null
            };
            this.updatePreview();
        }
    },
    
    // Filter and display items based on current filters
    filterAndDisplayItems() {
        // Use server-side filtering by calling loadShopItems
        this.loadShopItems();
    },
    
    // Display items in the grid
    async displayItems(items) {
        const $itemsGrid = $('#itemsGrid');
        $itemsGrid.empty();
        
        let finalItems = items;
        
        // Only include equipped items if we're not filtering by ownership
        // or if we're specifically showing owned items
        if (this.ownershipFilter === 'all' || this.ownershipFilter === 'owned') {
            // Ensure equipped items are included even if not in current page/filter
            const itemsWithEquipped = await this.ensureEquippedItemsIncluded(items);
            finalItems = itemsWithEquipped;
        }
        
        // Apply client-side filtering
        if (this.ownershipFilter === 'owned') {
            finalItems = finalItems.filter(item => this.userItems.includes(item.id) || this.isItemEquipped(item));
        } else if (this.ownershipFilter === 'unowned') {
            finalItems = finalItems.filter(item => !this.userItems.includes(item.id) && !this.isItemEquipped(item));
        }
        
        // Store filtered items for pagination
        this.filteredItems = finalItems;
        
        // Sort items by priority: equipped > owned > unowned (only if showing all or owned)
        let sortedItems;
        if (this.ownershipFilter === 'unowned') {
            // For unowned items, just sort alphabetically
            sortedItems = finalItems.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            sortedItems = this.sortItemsByPriority(finalItems);
        }
        
        // Apply client-side pagination for filtered results
        let displayItems = sortedItems;
        if (this.ownershipFilter !== 'all') {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            displayItems = sortedItems.slice(startIndex, endIndex);
        }
        
        if (displayItems.length === 0 && sortedItems.length > 0) {
            // No items on this page, go to page 1
            this.currentPage = 1;
            const startIndex = 0;
            const endIndex = this.itemsPerPage;
            displayItems = sortedItems.slice(startIndex, endIndex);
        }
        
        if (displayItems.length === 0) {
            this.showEmptyState(this.getEmptyStateMessage());
            return;
        }
        
        displayItems.forEach(item => {
            const $itemCard = this.createItemCard(item);
            $itemsGrid.append($itemCard);
        });
        
        // Hide empty state if visible
        $('#emptyState').hide();
        
        // Load images after cards are created
        this.loadImages();
        
        // Animate items in
        $('.item-card').addClass('fade-in');
    },
    
    // Create an item card element
    createItemCard(item) {
        const isOwned = this.userItems.includes(item.id);
        const isEquipped = this.isItemEquipped(item);
        
        // Determine primary action button
        let actionButton = '';
        if (!isOwned) {
            actionButton = `
                <button class="item-btn btn-purchase" data-action="purchase">
                    <i class="fas fa-shopping-cart me-1"></i>
                    Buy
                </button>
            `;
        } else if (isEquipped) {
            actionButton = `
                <button class="item-btn btn-unequip" data-action="unequip">
                    <i class="fas fa-times me-1"></i>
                    Unequip
                </button>
            `;
        } else {
            actionButton = `
                <button class="item-btn btn-equip" data-action="equip">
                    <i class="fas fa-magic me-1"></i>
                    Equip
                </button>
            `;
        }
        
        // TEMPORARY FIX: Use normal src for now until lazy loading is debugged
        return $(`
            <div class="item-card ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}" 
                 data-item-id="${item.id}" data-action="preview">
                <div class="item-image">
                    <img src="${item.image_url || '/static/images/placeholder-item.png'}" 
                         alt="${item.name}" loading="lazy"
                         onerror="this.src='/static/images/placeholder-item.png'">
                </div>
                <div class="item-info">
                    <h6 class="item-name">${item.name}</h6>
                    <div class="item-price">
                        <span>${item.price}</span>
                        <i class="fas fa-gem"></i>
                    </div>
                    <div class="item-actions">
                        ${actionButton}
                    </div>
                </div>
            </div>
        `);
    },
    
    // Check if item is currently equipped
    isItemEquipped(item) {
        const category = item.category.toLowerCase();
        const isEquipped = this.userConfiguration[category] === item.id;
        
        // Debug logging for banner items
        if (category === 'banner') {
            console.log(`isItemEquipped check for ${item.name}:`);
            console.log(`  - Item ID: ${item.id} (type: ${typeof item.id})`);
            console.log(`  - Category: ${category}`);
            console.log(`  - Configured ${category} ID: ${this.userConfiguration[category]} (type: ${typeof this.userConfiguration[category]})`);
            console.log(`  - Is equipped: ${isEquipped}`);
        }
        
        return isEquipped;
    },
    
    // Ensure equipped items are included in the items list
    async ensureEquippedItemsIncluded(items) {
        const equippedItems = [];
        const currentItemIds = new Set(items.map(item => item.id));
        
        // Only check equipped items for the current category (not 'all')
        if (this.currentCategory !== 'all') {
            const categoryItemId = this.userConfiguration[this.currentCategory];
            
            if (categoryItemId && !currentItemIds.has(categoryItemId)) {
                console.log(`Equipped ${this.currentCategory} item (ID: ${categoryItemId}) not in current page, fetching...`);
                
                // Try to get from cache first
                if (this.allItemsCache.has(categoryItemId)) {
                    const cachedItem = this.allItemsCache.get(categoryItemId);
                    if (cachedItem.category.toLowerCase() === this.currentCategory) {
                        // Ensure equipped item is marked as owned
                        cachedItem.owned = true;
                        equippedItems.push(cachedItem);
                        // Also add to userItems if not already there
                        if (!this.userItems.includes(categoryItemId)) {
                            this.userItems.push(categoryItemId);
                        }
                        console.log(`Added equipped ${this.currentCategory} from cache: ${cachedItem.name}`);
                    }
                } else {
                    // Fetch from API if not in cache
                    try {
                        const response = await $.get(`${this.endpoints.items}?item_id=${categoryItemId}`);
                        if (response.success && response.items && response.items.length > 0) {
                            const fetchedItem = response.items[0];
                            if (fetchedItem.category.toLowerCase() === this.currentCategory) {
                                // Ensure equipped item is marked as owned
                                fetchedItem.owned = true;
                                this.allItemsCache.set(categoryItemId, fetchedItem);
                                equippedItems.push(fetchedItem);
                                // Also add to userItems if not already there
                                if (!this.userItems.includes(categoryItemId)) {
                                    this.userItems.push(categoryItemId);
                                }
                                console.log(`Added equipped ${this.currentCategory} from API: ${fetchedItem.name}`);
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to fetch equipped ${this.currentCategory} item:`, error);
                    }
                }
            }
        }
        
        // Return combined items with equipped items at the beginning
        return [...equippedItems, ...items];
    },
    
    // Sort items by priority: equipped > owned > unowned
    sortItemsByPriority(items) {
        console.log('Sorting items, user configuration:', this.userConfiguration);
        
        return items.sort((a, b) => {
            const aEquipped = this.isItemEquipped(a);
            const bEquipped = this.isItemEquipped(b);
            const aOwned = this.userItems.includes(a.id);
            const bOwned = this.userItems.includes(b.id);
            
            // Debug logging
            if (a.category.toLowerCase() === 'banner' || b.category.toLowerCase() === 'banner') {
                console.log(`Item ${a.name} (${a.category}, ID: ${a.id}): equipped=${aEquipped}, owned=${aOwned}`);
                console.log(`Item ${b.name} (${b.category}, ID: ${b.id}): equipped=${bEquipped}, owned=${bOwned}`);
            }
            
            // Priority levels: equipped = 3, owned = 2, unowned = 1
            const aPriority = aEquipped ? 3 : (aOwned ? 2 : 1);
            const bPriority = bEquipped ? 3 : (bOwned ? 2 : 1);
            
            // Sort by priority (higher priority first)
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            // If same priority, sort by name alphabetically
            return a.name.localeCompare(b.name);
        });
    },
    
    // Handle item actions (purchase, equip, unequip, preview)
    async handleItemAction(action, itemId) {
        // First check if the item is in shopItems, if not try to find it in the cache
        let item = this.shopItems.find(i => i.id === itemId);
        if (!item && this.allItemsCache.has(itemId)) {
            item = this.allItemsCache.get(itemId);
        }
        if (!item) return;
        
        switch (action) {
            case 'purchase':
                this.showPurchaseModal(item);
                break;
            case 'equip':
                await this.equipItem(item);
                break;
            case 'unequip':
                await this.unequipItem(item);
                break;
            case 'preview':
                this.previewItem(item);
                break;
        }
    },
    
    // Show purchase confirmation modal
    showPurchaseModal(item) {
        $('#modalItemImage').attr('data-src', item.image_url || '/static/images/placeholder-item.png');
        this.loadImages(); // Load the modal image
        $('#modalItemName').text(item.name);
        $('#modalItemCategory').text(item.category);
        
        // Format prices using the formatter
        const formattedPrice = window.formatPearlBalance ? window.formatPearlBalance(item.price) : item.price.toLocaleString();
        const formattedCurrentBalance = window.formatPearlBalance ? window.formatPearlBalance(this.userData.pearls) : this.userData.pearls.toLocaleString();
        const formattedNewBalance = window.formatPearlBalance ? window.formatPearlBalance(this.userData.pearls - item.price) : (this.userData.pearls - item.price).toLocaleString();
        
        $('#modalItemPrice').text(formattedPrice);
        $('#modalCurrentBalance').html(`${formattedCurrentBalance} <i class="fas fa-gem"></i>`);
        $('#modalNewBalance').html(`${formattedNewBalance} <i class="fas fa-gem"></i>`);
        
        // Store item ID for purchase confirmation
        $('#confirmPurchase').data('item-id', item.id);
        
        // Show modal
        $('#purchaseModal').modal('show');
    },
    
    // Confirm purchase
    async confirmPurchase() {
        const itemId = $('#confirmPurchase').data('item-id');
        const item = this.shopItems.find(i => i.id === itemId);
        
        if (!item) return;
        
        // Check if user has enough pearls
        if (this.userData.pearls < item.price) {
            this.showToast('error', 'Insufficient pearls!');
            return;
        }
        
        try {
            // Disable button and show loading
            const $confirmBtn = $('#confirmPurchase');
            $confirmBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Processing...');
            
            const response = await $.post(this.endpoints.purchase, {
                item_id: itemId
            });
            
            if (response.success) {
                // Update user data
                this.userData.pearls = response.new_balance;
                this.userItems.push(itemId);
                
                // Update UI
                this.updateUserStats();
                this.filterAndDisplayItems();
                
                // Hide modal and show success
                $('#purchaseModal').modal('hide');
                this.showToast('success', `Successfully purchased ${item.name}!`);
            } else {
                this.showToast('error', response.message || 'Purchase failed');
            }
        } catch (error) {
            console.error('Purchase failed:', error);
            this.showToast('error', 'Purchase failed. Please try again.');
        } finally {
            // Reset button
            $('#confirmPurchase').prop('disabled', false).html('<i class="fas fa-shopping-cart me-2"></i>Purchase Item');
        }
    },
    
    // Equip an item
    async equipItem(item) {
        console.log(`🎯 Attempting to equip item:`, {
            id: item.id,
            name: item.name,
            category: item.category
        });
        
        try {
            // Show loading state
            const $itemCard = $(`.item-card[data-item-id="${item.id}"]`);
            const $button = $itemCard.find('.item-btn');
            const originalHtml = $button.html();
            $button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
            
            const requestData = {
                item_id: item.id,
                action: 'equip'
            };
            console.log('📤 Sending equip request:', requestData);
            
            const response = await $.ajax({
                url: this.endpoints.equip,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(requestData),
                dataType: 'json'
            });
            
            console.log('📥 Equip response:', response);
            
            if (response.success) {
                console.log('✅ Item equipped successfully');
                
                // Update configuration
                this.userConfiguration[item.category.toLowerCase()] = item.id;
                console.log('Updated user configuration:', this.userConfiguration);
                
                // Update UI
                await this.updatePreview();
                this.filterAndDisplayItems();
                
                this.showToast('success', `${item.name} equipped successfully!`);
            } else {
                console.error('❌ Equip failed:', response.message);
                this.showToast('error', response.message || 'Failed to equip item');
                // Reset button
                $button.prop('disabled', false).html(originalHtml);
            }
        } catch (error) {
            console.error('💥 Equip error:', error);
            console.error('Error details:', {
                status: error.status,
                statusText: error.statusText,
                responseText: error.responseText
            });
            this.showToast('error', 'Failed to equip item. Please try again.');
            // Reset button
            const $itemCard = $(`.item-card[data-item-id="${item.id}"]`);
            const $button = $itemCard.find('.item-btn');
            $button.prop('disabled', false).html('<i class="fas fa-magic me-1"></i>Equip');
        }
    },
    
    // Unequip an item
    async unequipItem(item) {
        console.log(`🎯 Attempting to unequip item:`, {
            id: item.id,
            name: item.name,
            category: item.category
        });
        
        try {
            // Show loading state
            const $itemCard = $(`.item-card[data-item-id="${item.id}"]`);
            const $button = $itemCard.find('.item-btn');
            const originalHtml = $button.html();
            $button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
            
            const requestData = {
                item_id: item.id, // Send item ID for unequip
                action: 'unequip'
            };
            console.log('📤 Sending unequip request:', requestData);
            
            const response = await $.ajax({
                url: this.endpoints.equip,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(requestData),
                dataType: 'json'
            });
            
            console.log('📥 Unequip response:', response);
            
            if (response.success) {
                console.log('✅ Item unequipped successfully');
                
                // Update configuration to remove the item
                this.userConfiguration[item.category.toLowerCase()] = null;
                console.log('Updated user configuration:', this.userConfiguration);
                
                // Update UI
                await this.updatePreview();
                this.filterAndDisplayItems();
                
                this.showToast('success', `${item.name} unequipped successfully!`);
            } else {
                console.error('❌ Unequip failed:', response.message);
                this.showToast('error', response.message || 'Failed to unequip item');
                // Reset button
                $button.prop('disabled', false).html(originalHtml);
            }
        } catch (error) {
            console.error('💥 Unequip error:', error);
            console.error('Error details:', {
                status: error.status,
                statusText: error.statusText,
                responseText: error.responseText
            });
            this.showToast('error', 'Failed to unequip item. Please try again.');
            // Reset button
            const $itemCard = $(`.item-card[data-item-id="${item.id}"]`);
            const $button = $itemCard.find('.item-btn');
            $button.prop('disabled', false).html('<i class="fas fa-times me-1"></i>Unequip');
        }
    },
    
    // Preview an item (temporarily apply to preview)
    previewItem(item) {
        const category = item.category.toLowerCase();
        
        // Temporarily update preview
        const originalItem = this.userConfiguration[category];
        this.userConfiguration[category] = item.id;
        this.updatePreview();
        
        // Show preview notification
        this.showToast('info', `Previewing ${item.name}. Click equip to make it permanent.`);
        
        // Reset preview after 5 seconds
        setTimeout(() => {
            this.userConfiguration[category] = originalItem;
            this.updatePreview();
        }, 5000);
    },
    
    // Update preview section
    async updatePreview() {
        // Helper function to get item details by ID from cache, current shopItems, or API
        const getItemDetails = async (itemId) => {
            if (!itemId) return null;
            
            // First try to find in current shopItems
            let item = this.shopItems.find(item => item.id === itemId);
            if (item) return item;
            
            // Then try cache from other categories
            if (this.allItemsCache.has(itemId)) {
                return this.allItemsCache.get(itemId);
            }
            
            // If not found anywhere, fetch from API and cache it
            try {
                const response = await $.get(`${this.endpoints.items}?item_id=${itemId}`);
                if (response.success && response.items && response.items.length > 0) {
                    const fetchedItem = response.items[0];
                    // Cache the fetched item for future use
                    this.allItemsCache.set(itemId, fetchedItem);
                    return fetchedItem;
                }
            } catch (error) {
                console.error('Failed to fetch item details:', error);
            }
            return null;
        };
        
        // Update banner
        const bannerId = this.userConfiguration.banner;
        if (bannerId) {
            const bannerItem = await getItemDetails(bannerId);
            if (bannerItem) {
                $('#previewBanner').html(`<img data-src="${bannerItem.image_url}" alt="Banner" class="lazy-image">`);
                this.loadImages(); // Load the banner image
            } else {
                $('#previewBanner').html(`
                    <div class="preview-placeholder">
                        <i class="fas fa-image fs-2 text-muted mb-2"></i>
                        <span class="small text-muted">Loading banner...</span>
                    </div>
                `);
            }
        } else {
            $('#previewBanner').html(`
                <div class="preview-placeholder">
                    <i class="fas fa-image fs-2 text-muted mb-2"></i>
                    <span class="small text-muted">No banner selected</span>
                </div>
            `);
        }
        
        // Update avatar
        const avatarId = this.userConfiguration.avatar;
        if (avatarId) {
            const avatarItem = await getItemDetails(avatarId);
            if (avatarItem) {
                $('#previewAvatar').attr('data-src', avatarItem.image_url).addClass('lazy-image').show();
                $('#previewAvatar').siblings('.preview-placeholder').hide();
                this.loadImages(); // Load the avatar image
            } else {
                $('#previewAvatar').hide();
                $('#previewAvatar').siblings('.preview-placeholder').show();
            }
        } else {
            $('#previewAvatar').attr('data-src', '/static/images/default-avatar.png').addClass('lazy-image').show();
            $('#previewAvatar').siblings('.preview-placeholder').hide();
            this.loadImages(); // Load the default avatar
        }
        
        // Update decoration
        const decorationId = this.userConfiguration.decoration;
        if (decorationId) {
            const decorationItem = await getItemDetails(decorationId);
            if (decorationItem) {
                $('#previewDecoration').html(`
                    <img data-src="${decorationItem.image_url}" alt="Decoration" class="lazy-image"
                         style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;">
                `);
                this.loadImages(); // Load the decoration image
            } else {
                $('#previewDecoration').html(`
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #6b7280; font-size: 0.75rem;">
                        Loading...
                    </div>
                `);
            }
        } else {
            $('#previewDecoration').empty();
        }
    },
    
    // Reset configuration to defaults
    async resetConfiguration() {
        try {
            const response = await $.post(this.endpoints.configuration, {
                reset: true
            });
            
            if (response.success) {
                this.userConfiguration = {
                    banner: null,
                    avatar: null,
                    decoration: null
                };
                
                this.updatePreview();
                this.filterAndDisplayItems();
                
                this.showToast('success', 'Configuration reset to defaults!');
            } else {
                this.showToast('error', response.message || 'Failed to reset configuration');
            }
        } catch (error) {
            console.error('Failed to reset configuration:', error);
            this.showToast('error', 'Failed to reset configuration');
        }
    },
    
    // Update user stats display
    updateUserStats() {
        console.log('updateUserStats called with pearls:', this.userData.pearls);
        console.log('window.formatPearlBalance available:', typeof window.formatPearlBalance);
        
        // Use the formatter function from HTML if available
        if (window.formatPearlBalance) {
            console.log('Using formatPearlBalance');
            $('#userPearls').text(window.formatPearlBalance(this.userData.pearls));
        } else {
            console.log('Using toLocaleString fallback');
            $('#userPearls').text(this.userData.pearls.toLocaleString());
        }
        $('#userLevel').text(this.userData.level);
    },
    
    // Update collection stats
    updateCollectionStats(stats) {
        if (!stats) return;
        
        $('#totalBanners').text(stats.banners || 0);
        $('#totalAvatars').text(stats.avatars || 0);
        $('#totalDecorations').text(stats.decorations || 0);
        $('#totalSpent').text((stats.totalSpent || 0).toLocaleString());
        
        // Update progress bar
        const progress = stats.collectionProgress || 0;
        $('#collectionProgress').text(`${progress}%`);
        $('#collectionProgressBar').css('width', `${progress}%`);
    },
    
    // Update pagination (server-side)
    updatePagination(currentPage, totalPages, totalItems) {
        if (totalPages <= 1) {
            $('#paginationNav').hide();
            return;
        }
        
        const $paginationList = $('#paginationList');
        $paginationList.empty();
        
        // Previous button
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        $paginationList.append(`
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `);
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            $paginationList.append(`
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }
        
        // Next button
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        $paginationList.append(`
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `);
        
        $('#paginationNav').show();
    },
    
    // Update pagination for client-side filtered results
    updateClientSidePagination() {
        const totalItems = this.filteredItems.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            $('#paginationNav').hide();
            return;
        }
        
        const $paginationList = $('#paginationList');
        $paginationList.empty();
        
        // Previous button
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        $paginationList.append(`
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `);
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            $paginationList.append(`
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }
        
        // Next button
        const nextDisabled = this.currentPage === totalPages ? 'disabled' : '';
        $paginationList.append(`
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `);
        
        $('#paginationNav').show();
        
        console.log(`Client-side pagination: ${totalItems} items, ${totalPages} pages, current: ${this.currentPage}`);
    },
    
    // Show loading state
    showLoading(show) {
        if (show) {
            $('#loadingPlaceholder').show();
            $('#emptyState').hide();
        } else {
            $('#loadingPlaceholder').hide();
        }
    },
    
    // Show empty state
    showEmptyState(message) {
        $('#itemsGrid').empty();
        $('#emptyState').show();
        $('#emptyState p').text(message);
        $('#loadingPlaceholder').hide();
    },
    
    // Load images with data-src (lazy loading implementation)
    loadImages() {
        console.log('🖼️ Loading lazy images...');
        
        $('.lazy-image[data-src]').each(function() {
            const $img = $(this);
            const dataSrc = $img.attr('data-src');
            const currentSrc = $img.attr('src');
            
            // Skip if already loaded with the correct image
            if (currentSrc === dataSrc) {
                console.log('🟢 Image already loaded:', dataSrc);
                $img.removeClass('loading').addClass('loaded');
                return;
            }
            
            // Load if it's a placeholder or different image
            if (!currentSrc || currentSrc.includes('data:image/svg+xml') || currentSrc.includes('placeholder') || currentSrc !== dataSrc) {
                console.log('🔄 Loading image:', dataSrc);
                
                if (dataSrc) {
                    // Create a new image to preload
                    const tempImg = new Image();
                    
                    tempImg.onload = function() {
                        console.log('✅ Image loaded successfully:', dataSrc);
                        // Image loaded successfully, update the src
                        $img.attr('src', dataSrc);
                        $img.removeClass('loading').addClass('loaded');
                    };
                    
                    tempImg.onerror = function() {
                        console.log('❌ Image failed to load:', dataSrc);
                        // Error loading image, use placeholder
                        $img.attr('src', '/static/images/placeholder-item.png');
                        $img.removeClass('loading').addClass('error');
                    };
                    
                    // Add loading class and start loading
                    $img.addClass('loading');
                    tempImg.src = dataSrc;
                } else {
                    console.log('⚠️ No data-src found for image');
                }
            }
        });
    },
    
    // Get appropriate empty state message based on current filters
    getEmptyStateMessage() {
        if (this.ownershipFilter === 'owned') {
            return `No owned ${this.currentCategory} items found. Purchase some items to see them here!`;
        } else if (this.ownershipFilter === 'unowned') {
            return `No ${this.currentCategory} items available for purchase. You may already own all items in this category!`;
        } else if (this.searchQuery) {
            return `No ${this.currentCategory} items match "${this.searchQuery}". Try a different search term.`;
        } else {
            return `No ${this.currentCategory} items found. Check back later for new items!`;
        }
    },
    
    // Show toast notification
    showToast(type, message, title = '') {
        // Use global toast function if available
        if (window.showToast) {
            window.showToast(type, message, title);
        } else {
            // Fallback to console or basic alert
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
};

// Initialize when document is ready
$(document).ready(function() {
    AvatarShop.init();
});

// Export for global access
window.AvatarShop = AvatarShop;

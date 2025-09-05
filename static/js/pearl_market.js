/**
 * Simple Pearl Market JavaScript
 * Just load items from database and display them
 */

$(document).ready(function() {
    console.log('Loading marketplace items from database...');
    
    // Initialize marketplace functionality
    initializeEventListeners();
    
    // Load unique card names for category filter
    loadUniqueCardNames();
    
    // Load marketplace items
    loadMarketplaceItems();
    
    // Test toast system availability after DOM is ready
    // Wait longer to ensure toast system is fully loaded
    setTimeout(() => {
        console.log('Testing toast system availability...');
        console.log('window.Toast:', window.Toast);
        console.log('window.Toast methods:', window.Toast ? Object.keys(window.Toast) : 'N/A');
        
        if (window.Toast && typeof window.Toast.success === 'function') {
            console.log('✅ Toast system is available and ready');
            // Uncomment the line below to test toast visibility
            // window.Toast.info('Pearl Market loaded successfully!', { duration: 2000 });
        } else {
            console.error('❌ Toast system not available or not properly initialized!');
            console.log('Debugging info:');
            console.log('- window.Toast exists:', !!window.Toast);
            console.log('- window.Toast.success exists:', window.Toast ? typeof window.Toast.success : 'N/A');
        }
    }, 2000);
});

// Global variables
let currentPage = 1;
let isLoading = false;
let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
let currentFilters = {
    search: '',
    category: 'all',
    rarity: 'all',
    priceMin: null,
    priceMax: null,
    sort: 'newest',
    favorites_only: false
};

/**
 * Initialize Market Functionality
 */
function initializeMarket() {
    // Load initial products from API
    loadMarketplaceItems();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Update cart display
    updateCartDisplay();
    
    console.log('Pearl Market initialized with API integration');
}

/**
 * Suppress search results dropdown on marketplace page
 */
function suppressSearchResultsDropdown() {
    // Simple dropdown suppression - let CSS handle the styling
    const searchResultsElements = document.querySelectorAll('#searchResults, .search-results');
    searchResultsElements.forEach(element => {
        if (element) {
            element.style.display = 'none';
        }
    });
    
    console.log('Search results dropdown suppressed on marketplace page');
}

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Completely suppress search results dropdown on marketplace
    suppressSearchResultsDropdown();
    
    // Integrate with global search from top navigation
    // Wait for topNav to be ready, then override its search functionality
    setTimeout(() => {
        if (window.topNav && window.topNav.performSearch) {
            // Store reference to original search method
            const originalPerformSearch = window.topNav.performSearch.bind(window.topNav);
            
            // Override the global search to work with marketplace
            window.topNav.performSearch = function(query) {
                // If we're on the marketplace page, handle search here
                if (window.location.pathname.includes('market') || window.location.pathname.includes('marketplace')) {
                    console.log('Marketplace search:', query);
                    currentFilters.search = query;
                    resetAndLoadItems();
                    // Force hide search results dropdown
                    this.hideSearchResults();
                    suppressSearchResultsDropdown();
                } else {
                    // Otherwise use original functionality
                    originalPerformSearch(query);
                }
            }.bind(window.topNav);
            
            // Override multiple search-related methods to prevent conflicts
            const originalDisplaySearchResults = window.topNav.displaySearchResults.bind(window.topNav);
            window.topNav.displaySearchResults = function(query) {
                // Don't show search results dropdown on marketplace page
                if (window.location.pathname.includes('market') || window.location.pathname.includes('marketplace')) {
                    suppressSearchResultsDropdown();
                    return; // Do nothing - let marketplace handle its own results
                } else {
                    originalDisplaySearchResults(query);
                }
            }.bind(window.topNav);
            
            const originalShowSearchResults = window.topNav.showSearchResults.bind(window.topNav);
            window.topNav.showSearchResults = function() {
                // Don't show search results dropdown on marketplace page
                if (window.location.pathname.includes('market') || window.location.pathname.includes('marketplace')) {
                    suppressSearchResultsDropdown();
                    return; // Do nothing
                } else {
                    originalShowSearchResults();
                }
            }.bind(window.topNav);
            
            const originalShowSearchLoading = window.topNav.showSearchLoading.bind(window.topNav);
            window.topNav.showSearchLoading = function() {
                // Don't show search loading on marketplace page
                if (window.location.pathname.includes('market') || window.location.pathname.includes('marketplace')) {
                    suppressSearchResultsDropdown();
                    return; // Do nothing
                } else {
                    originalShowSearchLoading();
                }
            }.bind(window.topNav);
            
            const originalShowSearchHints = window.topNav.showSearchHints.bind(window.topNav);
            window.topNav.showSearchHints = function() {
                // Don't show search hints on marketplace page
                if (window.location.pathname.includes('market') || window.location.pathname.includes('marketplace')) {
                    suppressSearchResultsDropdown();
                    return; // Do nothing
                } else {
                    originalShowSearchHints();
                }
            }.bind(window.topNav);
            
            console.log('Marketplace search integration initialized with complete suppression');
        }
        
        // Force suppress every 500ms as a safeguard
        setInterval(suppressSearchResultsDropdown, 500);
    }, 100);

    // Filter dropdowns
    $('#categoryFilter').on('change', function() {
        currentFilters.category = $(this).val();
        resetAndLoadItems();
    });

    $('#rarityFilter').on('change', function() {
        currentFilters.rarity = $(this).val();
        resetAndLoadItems();
    });

    $('#sortFilter').on('change', function() {
        currentFilters.sort = $(this).val();
        resetAndLoadItems();
    });

    // Price range inputs
    $('#priceMin').on('change', function() {
        currentFilters.priceMin = $(this).val() || null;
        resetAndLoadItems();
    });

    $('#priceMax').on('change', function() {
        currentFilters.priceMax = $(this).val() || null;
        resetAndLoadItems();
    });

    // Favorites toggle
    $('#favoritesToggle').on('change', function() {
        currentFilters.favorites_only = $(this).is(':checked');
        console.log('Favorites filter:', currentFilters.favorites_only ? 'enabled' : 'disabled');
        resetAndLoadItems();
    });

    // Load more products
    $('#loadMoreBtn').on('click', function() {
        loadMoreProducts();
    });

    // Cart functionality
    $('.cart-toggle-btn, #floatingCart').on('click', function() {
        toggleCart();
    });

    $('#closeCartBtn, #cartOverlay').on('click', function() {
        closeCart();
    });

    // Product actions (delegated events)
    $(document).on('click', '.btn-buy', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = $(this).closest('.product-card').data('product-id');
        const productData = $(this).closest('.product-card').data('product');
        // Show quick view or direct purchase modal
        showQuickView(productData);
    });

    // Favorite button click handler
    $(document).on('click', '.favorite-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = $(this).data('product-id');
        const isFavorited = $(this).hasClass('favorited');
        toggleFavorite(productId, !isFavorited, $(this));
    });

    $(document).on('click', '.product-card', function(e) {
        // Don't trigger card click when clicking favorite button or buy button
        if ($(e.target).closest('.favorite-btn, .btn-buy').length > 0) {
            return;
        }
        
        const productData = $(this).data('product');
        const cardName = productData.name || productData.title || 'Unknown';
        const cardSeries = productData.series || 'Unknown';
        
        console.log('Navigating to card set:', cardName, cardSeries);
        
        // Redirect to pearl card set page with both card_name and card_series as parameters
        window.location.href = `/pearl_card_set?card_name=${encodeURIComponent(cardName)}&card_series=${encodeURIComponent(cardSeries)}`;
    });

    // Checkout functionality
    $('.checkout-btn').on('click', function() {
        proceedToCheckout();
    });
}

/**
 * Reset to first page and load items
 */
function resetAndLoadItems() {
    currentPage = 1;
    loadMarketplaceItems();
}

/**
 * Load marketplace items from API
 */
function loadMarketplaceItems() {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingState();
    
    // Build API URL with filters
    const params = new URLSearchParams();
    params.append('page', currentPage);
    params.append('per_page', 12);
    
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.category !== 'all') params.append('category', currentFilters.category);
    if (currentFilters.rarity !== 'all') params.append('rarity', currentFilters.rarity);
    if (currentFilters.priceMin) params.append('price_min', currentFilters.priceMin);
    if (currentFilters.priceMax) params.append('price_max', currentFilters.priceMax);
    if (currentFilters.sort) params.append('sort', currentFilters.sort);
    if (currentFilters.favorites_only) params.append('favorites_only', 'true');
    
    const apiUrl = `/api/marketplace?${params.toString()}`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            hideLoadingState();
            
            if (data.success) {
                if (currentPage === 1) {
                    // Clear grid for new search/filter
                    $('#productsGrid').empty();
                }
                
                if (data.items && data.items.length > 0) {
                    renderProducts(data.items);
                    updatePagination(data.pagination);
                    updateFilterStats(data.stats);
                    console.log(`Loaded ${data.items.length} marketplace items`);
                } else {
                    showEmptyState();
                }
            } else {
                showError(data.message || 'Failed to load marketplace items');
            }
        })
        .catch(error => {
            hideLoadingState();
            console.error('Error loading marketplace items:', error);
            
            // Check if it's an authentication error (401)
            if (error.message.includes('401')) {
                showAuthenticationError();
            } else {
                showError('Unable to connect to marketplace. Please check your connection and try again.');
            }
        })
        .finally(() => {
            isLoading = false;
        });
}

/**
 * Load more products (pagination)
 */
function loadMoreProducts() {
    currentPage++;
    loadMarketplaceItems();
}

/**
 * Render products to grid
 */
function renderProducts(products) {
    const grid = $('#productsGrid');
    
    products.forEach((product, index) => {
        setTimeout(() => {
            const productCard = createProductCard(product);
            grid.append(productCard);
        }, index * 50); // Staggered animation
    });
}

/**
 * Create product card HTML from API data
 */
function createProductCard(product) {
    const heartIcon = product.is_favorite ? 'fas fa-heart' : 'far fa-heart';
    const heartClass = product.is_favorite ? 'favorite-btn favorited' : 'favorite-btn';
    
    // Create image element - use actual image if available, otherwise show placeholder
    const imageElement = product.image_url ? 
        `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
        `<div class="product-placeholder">
            <i class="${product.category_icon || 'fas fa-cube'}"></i>
        </div>`;
    
    const cardElement = $(`
        <div class="product-card fade-in" data-product-id="${product.id}">
            <div class="product-image">
                ${imageElement}
                <div class="series-tag">
                    <span>${product.series || 'Unknown'}</span>
                </div>
                <button class="${heartClass}" data-product-id="${product.id}" title="Add to favorites">
                    <i class="${heartIcon}"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description || 'No description available'}</p>
                
                <div class="product-price">
                    <span class="current-price"><i class="fas fa-gem me-1"></i>${product.price}</span>
                    ${product.original_price && product.original_price > product.price ? 
                        `<span class="original-price"><i class="fas fa-gem me-1"></i>${product.original_price}</span>` : ''}
                </div>
                
                <div class="product-actions">
                    <button class="btn-buy form-control" data-product-id="${product.id}">
                        <i class="fas fa-bolt me-1"></i>
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `);
    
    // Store product data in the element for later use
    cardElement.data('product', product);
    
    return cardElement;
}

/**
 * Update pagination controls
 */
function updatePagination(pagination) {
    const loadMoreBtn = $('#loadMoreBtn');
    
    // Handle cases where pagination data might be missing
    if (pagination && pagination.has_next) {
        loadMoreBtn.show();
        loadMoreBtn.text(`Load More (${pagination.total - (pagination.page * pagination.per_page)} remaining)`);
    } else {
        loadMoreBtn.hide();
    }
    
    // Update results count only if pagination data is available
    if (pagination && pagination.total !== undefined) {
        const resultsText = `Showing ${Math.min(pagination.page * pagination.per_page, pagination.total)} of ${pagination.total} items`;
        $('.results-count').text(resultsText);
    }
}

/**
 * Update filter statistics in sidebar
 */
function updateFilterStats(stats) {
    if (!stats) return;
    
    // Update category counts
    const categoryList = $('#categoryStats');
    categoryList.empty();
    if (stats.categories) {
        stats.categories.forEach(cat => {
            categoryList.append(`
                <li class="filter-stat-item" data-category="${cat.category}">
                    <span class="filter-name">${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</span>
                    <span class="filter-count">${cat.count}</span>
                </li>
            `);
        });
    }
    
    // Update rarity counts
    const rarityList = $('#rarityStats');
    rarityList.empty();
    if (stats.rarities) {
        stats.rarities.forEach(rarity => {
            rarityList.append(`
                <li class="filter-stat-item" data-rarity="${rarity.rarity}">
                    <span class="filter-name">${rarity.rarity.charAt(0).toUpperCase() + rarity.rarity.slice(1)}</span>
                    <span class="filter-count">${rarity.count}</span>
                </li>
            `);
        });
    }
    
    // Update total items
    $('.total-items-count').text(`${stats.total_items} total items`);
    
    // Update price range
    if (stats.price_range) {
        $('.price-range-info').html(`Price range: <i class="fas fa-gem me-1"></i>${stats.price_range.min} - <i class="fas fa-gem me-1"></i>${stats.price_range.max}`);
    }
}

/**
 * Add product to cart
 */
function addToCart(productId, productData) {
    const existingItem = cartItems.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({
            id: productId,
            title: productData.title,
            price: productData.price,
            rarity: productData.rarity,
            rarity_color: productData.rarity_color,
            quantity: 1
        });
    }
    
    // Save to localStorage
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    
    // Update cart display
    updateCartDisplay();
    
    // Show success notification using global toast system
    if (window.Toast && window.Toast.success) {
        window.Toast.success(`${productData.title} added to cart!`, {
            icon: 'fas fa-shopping-cart',
            duration: 2500
        });
    } else {
        console.log(`SUCCESS: ${productData.title} added to cart!`);
        alert(`✅ ${productData.title} added to cart!`);
    }
    
    // Pulse animation for cart button
    $('#floatingCart').addClass('pulse');
    setTimeout(() => {
        $('#floatingCart').removeClass('pulse');
    }, 600);
}

/**
 * Show quick view modal
 */
function showQuickView(product) {
    Swal.fire({
        title: product.title,
        html: `
            <div class="text-start">
                <div class="mb-3 text-center">
                    <i class="${product.category_icon || 'fas fa-cube'} fa-3x" style="color: ${product.rarity_color}"></i>
                </div>
                <p><strong>Description:</strong> ${product.description}</p>
                <p><strong>Category:</strong> <span class="badge" style="background-color: #6c757d">${product.category}</span></p>
                <p><strong>Rarity:</strong> <span class="badge" style="background-color: ${product.rarity_color}">${product.rarity}</span></p>
                <p><strong>Listed:</strong> ${product.time_ago}</p>
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <span class="fs-4 fw-bold" style="color: ${product.rarity_color}">
                        <i class="fas fa-gem me-1"></i>${product.price}
                    </span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-gem me-2"></i>Purchase Now',
        cancelButtonText: 'Close',
        confirmButtonColor: product.rarity_color,
        width: '500px'
    }).then((result) => {
        if (result.isConfirmed) {
            // Process direct purchase
            processDirectPurchase(product);
        }
    });
}

/**
 * Process direct purchase of a single product
 */
function processDirectPurchase(product) {
    Swal.fire({
        title: 'Processing Purchase...',
        html: `
            <div class="text-center">
                <div class="spinner-border text-warning mb-3" role="status"></div>
                <p>Processing your purchase of <i class="fas fa-gem me-1"></i>${product.price}</p>
            </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false
    });
    
    setTimeout(() => {
        // Show success
        Swal.fire({
            icon: 'success',
            title: 'Purchase Successful!',
            html: `
                <p>Thank you for your purchase!</p>
                <p><strong>${product.name || product.title}</strong></p>
                <p>Total: <strong><i class="fas fa-gem text-warning me-1"></i>${product.price}</strong></p>
                <p>Item has been added to your collection!</p>
            `,
            confirmButtonText: 'View Collection',
            confirmButtonColor: '#f39c12'
        });
    }, 2000);
}

/**
 * Show product details
 */
function showProductDetails(product) {
    showQuickView(product); // For now, use the same modal
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Update cart count
    $('#cartCount').text(cartCount);
    $('#cartTotal').text(cartTotal);
    
    // Update cart items
    const cartItemsContainer = $('#cartItems');
    cartItemsContainer.empty();
    
    if (cartItems.length === 0) {
        cartItemsContainer.html(`
            <div class="empty-cart text-center py-5">
                <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <p class="text-muted">Your cart is empty</p>
                <small class="text-muted">Add some items to get started!</small>
            </div>
        `);
    } else {
        cartItems.forEach(item => {
            const cartItemHtml = `
                <div class="cart-item" data-item-id="${item.id}">
                    <div class="cart-item-image">
                        <i class="fas fa-gem" style="color: ${item.rarity_color}"></i>
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.title}</div>
                        <div class="cart-item-price"><i class="fas fa-gem me-1"></i>${item.price}</div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn" data-action="decrease" data-item-id="${item.id}">-</button>
                            <input type="number" class="qty-input" value="${item.quantity}" min="1" readonly>
                            <button class="qty-btn" data-action="increase" data-item-id="${item.id}">+</button>
                            <button class="btn btn-sm btn-outline-danger ms-2" data-action="remove" data-item-id="${item.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            cartItemsContainer.append(cartItemHtml);
        });
    }
    
    // Show/hide floating cart based on items
    if (cartCount > 0) {
        $('#floatingCart').show();
    } else {
        $('#floatingCart').hide();
    }
}

/**
 * Cart item controls
 */
$(document).on('click', '.cart-item .qty-btn', function(e) {
    e.stopPropagation();
    const action = $(this).data('action');
    const itemId = parseInt($(this).data('item-id'));
    const item = cartItems.find(item => item.id === itemId);
    
    if (!item) return;
    
    switch(action) {
        case 'increase':
            if (item.quantity < 10) {
                item.quantity++;
            }
            break;
        case 'decrease':
            if (item.quantity > 1) {
                item.quantity--;
            }
            break;
        case 'remove':
            cartItems = cartItems.filter(cartItem => cartItem.id !== itemId);
            break;
    }
    
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    updateCartDisplay();
});

/**
 * Toggle cart sidebar
 */
function toggleCart() {
    $('#cartSidebar').toggleClass('open');
    $('#cartOverlay').toggleClass('active');
    
    if ($('#cartSidebar').hasClass('open')) {
        $('body').addClass('cart-open');
    } else {
        $('body').removeClass('cart-open');
    }
}

/**
 * Close cart sidebar
 */
function closeCart() {
    $('#cartSidebar').removeClass('open');
    $('#cartOverlay').removeClass('active');
    $('body').removeClass('cart-open');
}

/**
 * Checkout process
 */
function proceedToCheckout() {
    if (cartItems.length === 0) {
        // Show warning using global toast system
        if (window.Toast && window.Toast.warning) {
            window.Toast.warning('Please add some items to your cart before checkout', {
                icon: 'fas fa-shopping-cart',
                duration: 4000
            });
        } else {
            console.log('WARNING: Cart is empty');
            alert('⚠️ Please add some items to your cart before checkout');
        }
        return;
    }
    
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    Swal.fire({
        title: 'Checkout',
        html: `
            <div class="checkout-summary">
                <h5>Order Summary</h5>
                ${cartItems.map(item => `
                    <div class="d-flex justify-content-between mb-2">
                        <span>${item.title} (×${item.quantity})</span>
                        <span><i class="fas fa-gem me-1"></i>${item.price * item.quantity}</span>
                    </div>
                `).join('')}
                <hr>
                <div class="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span class="text-warning">
                        <i class="fas fa-gem me-1"></i>${total}
                    </span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-gem me-2"></i>Purchase Now',
        cancelButtonText: 'Continue Shopping',
        confirmButtonColor: '#f39c12',
        width: '400px'
    }).then((result) => {
        if (result.isConfirmed) {
            processOrderPayment(total);
        }
    });
}

/**
 * Process order payment
 */
function processOrderPayment(total) {
    Swal.fire({
        title: 'Processing Purchase...',
        html: `
            <div class="text-center">
                <div class="spinner-border text-warning mb-3" role="status"></div>
                <p>Processing your purchase of <i class="fas fa-gem me-1"></i>${total}</p>
            </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false
    });
    
    setTimeout(() => {
        // Clear cart
        cartItems = [];
        localStorage.removeItem('cartItems');
        updateCartDisplay();
        closeCart();
        
        // Show success
        Swal.fire({
            icon: 'success',
            title: 'Purchase Successful!',
            html: `
                <p>Thank you for your purchase!</p>
                <p>Total: <strong><i class="fas fa-gem text-warning me-1"></i>${total}</strong></p>
                <p>Items have been added to your collection!</p>
            `,
            confirmButtonText: 'View Collection',
            confirmButtonColor: '#f39c12'
        });
    }, 2000);
}

/**
 * Show loading state
 */
function showLoadingState() {
    const grid = $('#productsGrid');
    if (currentPage === 1) {
        grid.html(`
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary me-3" role="status"></div>
                <span class="fs-5 text-muted">Loading marketplace items...</span>
            </div>
        `);
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading will be replaced by actual products
}

/**
 * Show error message
 */
function showError(message) {
    $('#productsGrid').html(`
        <div class="col-12 text-center py-5">
            <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
            <h4 class="text-muted">Error Loading Items</h4>
            <p class="text-muted">${message}</p>
            <button class="btn btn-primary" onclick="resetAndLoadItems()">
                <i class="fas fa-refresh me-1"></i>Try Again
            </button>
        </div>
    `);
}

/**
 * Show authentication error
 */
function showAuthenticationError() {
    $('#productsGrid').html(`
        <div class="col-12 text-center py-5">
            <i class="fas fa-lock fa-3x text-info mb-3"></i>
            <h4 class="text-muted">Authentication Required</h4>
            <p class="text-muted">Please log in to view marketplace items</p>
            <button class="btn btn-primary" onclick="window.location.href='/login'">
                <i class="fas fa-sign-in-alt me-1"></i>Log In
            </button>
            <button class="btn btn-outline-secondary ms-2" onclick="resetAndLoadItems()">
                <i class="fas fa-refresh me-1"></i>Try Again
            </button>
        </div>
    `);
}

/**
 * Show empty state when no items found
 */
function showEmptyState() {
    $('#productsGrid').html(`
        <div class="col-12 text-center py-5">
            <i class="fas fa-search fa-3x text-muted mb-3"></i>
            <h4 class="text-muted">No Items Found</h4>
            <p class="text-muted">No marketplace items match your current filters.</p>
            <div class="mt-3">
                <button class="btn btn-outline-primary me-2" onclick="clearAllFilters()">
                    <i class="fas fa-times me-1"></i>Clear Filters
                </button>
                <button class="btn btn-primary" onclick="resetAndLoadItems()">
                    <i class="fas fa-refresh me-1"></i>Refresh
                </button>
            </div>
        </div>
    `);
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    // Reset filters
    currentFilters = {
        search: '',
        category: 'all',
        rarity: 'all',
        priceMin: null,
        priceMax: null,
        sort: 'newest'
    };
    
    // Reset form inputs
    $('#searchInput').val('');
    $('#categoryFilter').val('');
    $('#rarityFilter').val('');
    $('#sortFilter').val('newest');
    
    // Reload items
    resetAndLoadItems();
}

/**
 * Check if toast system is ready
 * @returns {boolean} True if toast system is available and ready to use
 */
function isToastSystemReady() {
    return window.Toast && 
           typeof window.Toast.success === 'function' && 
           typeof window.Toast.info === 'function' && 
           typeof window.Toast.error === 'function' && 
           typeof window.Toast.warning === 'function';
}

/**
 * Wait for toast system to be ready with timeout
 * @param {function} callback - Function to call when toast is ready
 * @param {number} timeout - Maximum time to wait in milliseconds
 */
function waitForToastSystem(callback, timeout = 5000) {
    const startTime = Date.now();
    const checkInterval = 100;
    
    const checkToastReady = () => {
        if (isToastSystemReady()) {
            console.log('✅ Toast system ready!');
            callback(true);
        } else if (Date.now() - startTime > timeout) {
            console.error('❌ Toast system timeout - falling back to alerts');
            callback(false);
        } else {
            setTimeout(checkToastReady, checkInterval);
        }
    };
    
    checkToastReady();
}

/**
 * Show toast or fallback alert
 * @param {string} type - Toast type (success, info, error, warning)
 * @param {string} message - Message to display
 * @param {object} options - Toast options
 * @param {string} fallbackEmoji - Emoji for fallback alert
 */
function showToastOrFallback(type, message, options = {}, fallbackEmoji = '📢') {
    if (isToastSystemReady()) {
        window.Toast[type](message, options);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(`${fallbackEmoji} ${message}`);
    }
}

/**
 * Toggle favorite status for an item
 */
function toggleFavorite(itemId, addToFavorites, buttonElement) {
    const method = addToFavorites ? 'POST' : 'DELETE';
    const apiUrl = '/api/marketplace/favorites';
    
    // Disable button during request
    buttonElement.prop('disabled', true);
    
    fetch(apiUrl, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            item_id: itemId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        buttonElement.prop('disabled', false);
        
        if (data.success) {
            // Update button appearance
            const heartIcon = buttonElement.find('i');
            if (addToFavorites) {
                // Added to favorites
                heartIcon.removeClass('far fa-heart').addClass('fas fa-heart');
                buttonElement.addClass('favorited');
                buttonElement.attr('title', 'Remove from favorites');
                
                // Get product name for personalized toast
                const productCard = buttonElement.closest('.product-card');
                const productData = productCard.data('product');
                const itemName = productData ? productData.name : 'Item';
                
                // Show success toast using global toast system
                showToastOrFallback('success', `${itemName} added to favorites!`, {
                    icon: 'fas fa-heart',
                    duration: 3000
                }, '❤️');
            } else {
                // Removed from favorites
                heartIcon.removeClass('fas fa-heart').addClass('far fa-heart');
                buttonElement.removeClass('favorited');
                buttonElement.attr('title', 'Add to favorites');
                
                // Get product name for personalized toast
                const productCard = buttonElement.closest('.product-card');
                const productData = productCard.data('product');
                const itemName = productData ? productData.name : 'Item';
                
                // Show info toast using global toast system
                showToastOrFallback('info', `${itemName} removed from favorites`, {
                    icon: 'fas fa-heart-broken',
                    duration: 2500
                }, '💔');
            }
            
            // Update product data to reflect new favorite status
            const productCard = buttonElement.closest('.product-card');
            const productData = productCard.data('product');
            if (productData) {
                productData.is_favorite = addToFavorites;
                productCard.data('product', productData);
            }
        } else {
            // Show error message using global toast system
            window.Toast.error(data.message || 'Failed to update favorites', {
                icon: 'fas fa-exclamation-triangle',
                duration: 4000
            });
        }
    })
    .catch(error => {
        buttonElement.prop('disabled', false);
        console.error('Error toggling favorite:', error);
        
        // Handle authentication errors
        if (error.message.includes('401')) {
            // Show login required toast
            window.Toast.warning('Please log in to add items to your favorites', {
                icon: 'fas fa-sign-in-alt',
                duration: 5000,
                persistent: false
            });
            
            // Optionally redirect to login after a delay
            setTimeout(() => {
                if (confirm('Would you like to go to the login page now?')) {
                    window.location.href = '/login';
                }
            }, 2000);
        } else {
            // Show connection error toast
            window.Toast.error('Unable to update favorites. Please check your connection and try again.', {
                icon: 'fas fa-wifi',
                duration: 5000
            });
        }
    });
}

/**
 * Load unique card names for category filter
 */
function loadUniqueCardNames() {
    fetch('/api/marketplace/unique-card-names')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.card_names) {
                populateCategoryFilter(data.card_names);
                console.log(`Loaded ${data.card_names.length} unique card names for category filter`);
            } else {
                console.error('Failed to load unique card names:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading unique card names:', error);
            // Don't show error to user for this - just log it and continue with empty categories
        });
}

/**
 * Populate category filter dropdown with unique card names
 */
function populateCategoryFilter(cardNames) {
    const categoryFilter = $('#categoryFilter');
    
    // Clear existing options (keep only the "All Categories" option)
    categoryFilter.find('option').not(':first').remove();
    
    // Add card names as options
    cardNames.forEach(cardName => {
        const option = $('<option></option>')
            .attr('value', cardName)
            .text(cardName);
        categoryFilter.append(option);
    });
    
    console.log(`Populated category filter with ${cardNames.length} card names`);
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for global access
window.PearlMarket = {
    addToCart,
    showQuickView,
    toggleCart,
    updateCartDisplay,
    loadMarketplaceItems
};

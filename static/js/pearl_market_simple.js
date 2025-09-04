/**
 * Simple Pearl Market JavaScript
 * Just load items from database and display them
 */

$(document).ready(function() {
    console.log('Loading marketplace items from database...');
    loadMarketplaceItems();
});

/**
 * Load marketplace items from API
 */
function loadMarketplaceItems() {
    console.log('Fetching from /api/marketplace...');
    
    // Show loading message
    $('#productsGrid').html(`
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary me-3" role="status"></div>
            <span class="fs-5 text-muted">Loading marketplace items from database...</span>
        </div>
    `);
    
    // Fetch from the simple API
    fetch('/api/marketplace')
        .then(response => {
            console.log('API Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API Response data:', data);
            
            if (data.success && data.items) {
                displayItems(data.items);
                console.log(`Successfully loaded ${data.items.length} items`);
            } else {
                showError(data.message || 'No items found in database');
            }
        })
        .catch(error => {
            console.error('Error loading marketplace items:', error);
            showError(`Failed to load items: ${error.message}`);
        });
}

/**
 * Display items in the grid
 */
function displayItems(items) {
    const grid = $('#productsGrid');
    grid.empty();
    
    if (items.length === 0) {
        grid.html(`
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No Items Found</h4>
                <p class="text-muted">No marketplace items in database.</p>
            </div>
        `);
        return;
    }
    
    items.forEach(item => {
        const itemCard = createItemCard(item);
        grid.append(itemCard);
    });
}

/**
 * Create item card HTML
 */
function createItemCard(item) {
    const rarityColors = {
        'common': '#9ca3af',
        'rare': '#3b82f6',
        'epic': '#8b5cf6',
        'legendary': '#f59e0b',
        'mythic': '#ef4444'
    };
    
    const categoryIcons = {
        'card': 'fas fa-id-card',
        'collectible': 'fas fa-gem',
        'avatar': 'fas fa-user-circle',
        'banner': 'fas fa-flag',
        'decoration': 'fas fa-star'
    };
    
    // Special icons for specific items based on name
    const specialIcons = {
        'Shadow Dragon': 'fas fa-dragon',
        'Crystal Sword': 'fas fa-sword',
        'Forest Guardian': 'fas fa-tree',
        'Fire Phoenix': 'fas fa-fire-alt',
        'Magic Wand': 'fas fa-magic',
        'Ice Shield': 'fas fa-shield-alt',
        'Lightning Bolt': 'fas fa-bolt',
        'Mystic Gem': 'fas fa-gem',
        'Naruto': 'fas fa-ninja'
    };
    
    const rarityColor = rarityColors[item.rarity] || '#9ca3af';
    const itemIcon = specialIcons[item.name] || categoryIcons[item.category] || 'fas fa-cube';
    
    // Use image URL from API or fallback to default
    const imageHtml = item.image_url ? 
        `<img src="${item.image_url}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" 
             onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
        '';
    
    const fallbackHtml = `<div class="product-placeholder" ${item.image_url ? 'style="display: none;"' : ''}>
                              <i class="${itemIcon}" style="color: ${rarityColor}; font-size: 3rem;"></i>
                          </div>`;
    
    return $(`
        <div class="product-card" data-item-id="${item.id}">
            <div class="product-image">
                ${imageHtml}
                ${fallbackHtml}
            </div>
            <div class="product-info">
                <h3 class="product-title">${item.name}</h3>
                <p class="product-description">${item.description || 'No description available'}</p>
                <div class="product-price">
                    <span class="current-price">${item.price} pearls</span>
                </div>
                <div class="product-actions">
                    <button class="btn-cart" onclick="addToCart(${item.id}, '${item.name}', ${item.price})">
                        <i class="fas fa-shopping-cart me-1"></i>
                        Add to Cart
                    </button>
                    <button class="btn-buy" onclick="buyNow(${item.id}, '${item.name}', ${item.price})">
                        <i class="fas fa-bolt me-1"></i>
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `);
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
            <button class="btn btn-primary" onclick="loadMarketplaceItems()">
                <i class="fas fa-refresh me-1"></i>Try Again
            </button>
        </div>
    `);
}

/**
 * Add to cart functionality (placeholder)
 */
function addToCart(itemId, itemName, price) {
    alert(`Added "${itemName}" to cart for ${price} pearls`);
}

/**
 * Buy now functionality (placeholder)
 */
function buyNow(itemId, itemName, price) {
    alert(`Buying "${itemName}" for ${price} pearls`);
}

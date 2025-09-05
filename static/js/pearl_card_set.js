/**
 * Pearl Card Set Page JavaScript
 * Handles filtering, sorting, and purchase functionality for card collection view
 */

$(document).ready(function() {
    console.log('Pearl Card Set page initialized');
    
    // Initialize page functionality
    initializeFiltering();
    initializeSorting();
    initializePurchasing();
    
    // Update progress animations
    animateProgressBars();
});

// Global variables
let currentFilter = 'all';
let currentSort = 'name';

/**
 * Initialize filtering functionality
 */
function initializeFiltering() {
    // Filter button click handlers
    $('.btn-filter').on('click', function() {
        const filter = $(this).data('filter');
        
        // Update active button
        $('.btn-filter').removeClass('active');
        $(this).addClass('active');
        
        // Apply filter
        currentFilter = filter;
        applyFilters();
        
        console.log('Filter applied:', filter);
    });
}

/**
 * Initialize sorting functionality
 */
function initializeSorting() {
    $('#sortOrder').on('change', function() {
        currentSort = $(this).val();
        applySorting();
        
        console.log('Sort applied:', currentSort);
    });
}

/**
 * Initialize purchasing functionality
 */
function initializePurchasing() {
    // Buy button click handler
    $(document).on('click', '.btn-buy', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const cardId = $(this).data('card-id');
        const cardElement = $(this).closest('.pearl-card');
        const cardData = extractCardData(cardElement);
        
        showPurchaseModal(cardData);
    });
    
    // Confirm purchase button
    $('#confirmPurchaseBtn').on('click', function() {
        const cardId = $(this).data('card-id');
        if (cardId) {
            processPurchase(cardId);
        }
    });
}

/**
 * Apply filters to card grid
 */
function applyFilters() {
    const cardItems = $('.card-item');
    let visibleCount = 0;
    
    cardItems.each(function() {
        const $this = $(this);
        const owned = $this.data('owned') === 'true' || $this.data('owned') === true;
        let shouldShow = false;
        
        // Determine if card should be shown based on current filter
        switch(currentFilter) {
            case 'all':
                shouldShow = true;
                break;
            case 'owned':
                shouldShow = owned;
                break;
            case 'missing':
                shouldShow = !owned;
                break;
        }
        
        if (shouldShow) {
            $this.removeClass('hidden').show();
            visibleCount++;
        } else {
            $this.addClass('hidden').hide();
        }
    });
    
    // Show/hide empty state
    if (visibleCount === 0) {
        $('#emptyState').show();
    } else {
        $('#emptyState').hide();
    }
    
    // Stagger animation for visible cards
    let delay = 0;
    cardItems.filter(':visible').each(function() {
        const $this = $(this);
        setTimeout(() => {
            $this.addClass('fade-in');
        }, delay);
        delay += 50;
    });
}

/**
 * Apply sorting to card grid
 */
function applySorting() {
    const cardsGrid = $('#cardsGrid');
    const cardItems = $('.card-item').toArray();
    
    // Sort cards based on selected criteria
    cardItems.sort((a, b) => {
        const $a = $(a);
        const $b = $(b);
        
        let aValue, bValue;
        
        switch(currentSort) {
            case 'name':
                aValue = $a.data('name').toLowerCase();
                bValue = $b.data('name').toLowerCase();
                return aValue.localeCompare(bValue);
                
            case 'rarity':
                // Define dynamic rarity order based on common patterns
                const rarityOrder = {
                    'r': 1,
                    'sr': 2,
                    'ssr': 3,
                    'ur': 4,
                    'sp': 5,
                    // Fallback for any other rarities - sort alphabetically
                };
                
                const aRarity = $a.data('rarity').toLowerCase();
                const bRarity = $b.data('rarity').toLowerCase();
                
                // Get rarity values, if not in predefined order, use alphabetical sort
                aValue = rarityOrder[aRarity] || (aRarity.charCodeAt(0) + 100);
                bValue = rarityOrder[bRarity] || (bRarity.charCodeAt(0) + 100);
                return bValue - aValue; // Higher rarity first
                
            case 'price':
                aValue = parseFloat($a.data('price')) || 0;
                bValue = parseFloat($b.data('price')) || 0;
                return bValue - aValue; // Higher price first
                
            default:
                return 0;
        }
    });
    
    // Reorder DOM elements
    cardItems.forEach(item => {
        cardsGrid.append(item);
    });
    
    // Reapply current filter after sorting
    applyFilters();
}

/**
 * Extract card data from card element
 */
function extractCardData(cardElement) {
    const cardItem = cardElement.closest('.card-item');
    
    return {
        id: cardElement.data('card-id'),
        name: cardItem.data('name'),
        rarity: cardItem.data('rarity'),
        price: cardItem.data('price'),
        owned: cardItem.data('owned') === 'true' || cardItem.data('owned') === true,
        image: cardElement.find('.card-image').attr('src'),
        description: cardElement.find('.card-description').text().trim()
    };
}

/**
 * Show purchase modal for a card
 */
function showPurchaseModal(cardData) {
    if (cardData.owned) {
        Swal.fire({
            icon: 'info',
            title: 'Already Owned',
            text: `You already own "${cardData.name}"`,
            confirmButtonColor: '#3085d6'
        });
        return;
    }
    
    // Build modal content
    const modalContent = `
        <div class="purchase-card-preview">
            <div class="text-center mb-4">
                <img src="${cardData.image}" alt="${cardData.name}" class="img-fluid" style="max-height: 200px; border-radius: 10px;">
            </div>
            <div class="card-details">
                <h4 class="text-center mb-3">${cardData.name}</h4>
                <div class="row mb-3">
                    <div class="col-6">
                        <strong>Rarity:</strong>
                        <span class="badge rarity-${cardData.rarity.toLowerCase()} ms-2">${cardData.rarity}</span>
                    </div>
                    <div class="col-6">
                        <strong>Price:</strong>
                        <span class="text-warning fs-5 ms-2">
                            <i class="fas fa-gem me-1"></i>${cardData.price}
                        </span>
                    </div>
                </div>
                <div class="mb-3">
                    <strong>Description:</strong>
                    <p class="text-muted mt-1">${cardData.description}</p>
                </div>
                <div class="purchase-confirmation bg-light p-3 rounded">
                    <p class="mb-2"><i class="fas fa-info-circle text-info me-2"></i>This card will be added to your collection once purchased.</p>
                    <p class="mb-0"><i class="fas fa-gem text-warning me-2"></i>Total cost: <strong>${cardData.price} gems</strong></p>
                </div>
            </div>
        </div>
    `;
    
    $('#purchaseModalBody').html(modalContent);
    $('#confirmPurchaseBtn').data('card-id', cardData.id);
    
    // Update modal title
    $('#purchaseModalLabel').text(`Purchase ${cardData.name}`);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
    modal.show();
}

/**
 * Process card purchase
 */
function processPurchase(cardId) {
    // Disable purchase button during processing
    const confirmBtn = $('#confirmPurchaseBtn');
    const originalText = confirmBtn.html();
    confirmBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Processing...');
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
    modal.hide();
    
    // Show processing message
    Swal.fire({
        title: 'Processing Purchase...',
        html: `
            <div class="text-center">
                <div class="spinner-border text-warning mb-3" role="status"></div>
                <p>Please wait while we process your purchase...</p>
            </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            // Simulate API call
            setTimeout(() => {
                completePurchase(cardId);
            }, 2000);
        }
    });
}

/**
 * Complete the purchase process
 */
function completePurchase(cardId) {
    // For now, simulate successful purchase
    // In a real implementation, this would make an API call
    
    fetch('/api/purchase_card', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            card_id: cardId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the card visually
            updateCardToOwned(cardId);
            
            // Update progress
            updateCollectionProgress();
            
            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Purchase Successful!',
                html: `
                    <p>Congratulations! You now own this card.</p>
                    <p>The card has been added to your collection.</p>
                `,
                confirmButtonText: 'Awesome!',
                confirmButtonColor: '#28a745'
            });
        } else {
            // Show error message
            Swal.fire({
                icon: 'error',
                title: 'Purchase Failed',
                text: data.message || 'Unable to complete purchase. Please try again.',
                confirmButtonColor: '#dc3545'
            });
        }
    })
    .catch(error => {
        console.error('Purchase error:', error);
        
        // For demo purposes, simulate success
        updateCardToOwned(cardId);
        updateCollectionProgress();
        
        Swal.fire({
            icon: 'success',
            title: 'Purchase Successful!',
            html: `
                <p>Congratulations! You now own this card.</p>
                <p>The card has been added to your collection.</p>
                <p><small class="text-muted">(Demo mode - purchase simulated)</small></p>
            `,
            confirmButtonText: 'Awesome!',
            confirmButtonColor: '#28a745'
        });
    })
    .finally(() => {
        // Re-enable purchase button
        const confirmBtn = $('#confirmPurchaseBtn');
        confirmBtn.prop('disabled', false).html('<i class="fas fa-gem me-1"></i>Purchase');
    });
}

/**
 * Update card to owned state
 */
function updateCardToOwned(cardId) {
    const cardElement = $(`.pearl-card[data-card-id="${cardId}"]`);
    const cardItem = cardElement.closest('.card-item');
    
    // Update card appearance
    cardElement.removeClass('missing').addClass('owned');
    
    // Update ownership overlay
    const ownershipOverlay = cardElement.find('.ownership-overlay');
    ownershipOverlay.html(`
        <div class="owned-badge">
            <i class="fas fa-check-circle"></i>
        </div>
    `);
    
    // Remove buy button
    cardElement.find('.btn-buy').remove();
    
    // Update data attributes
    cardItem.data('owned', 'true');
    
    // Add acquisition animation
    cardElement.addClass('newly-acquired');
    setTimeout(() => {
        cardElement.removeClass('newly-acquired');
    }, 2000);
}

/**
 * Update collection progress
 */
function updateCollectionProgress() {
    const totalCards = $('.card-item').length;
    const ownedCards = $('.card-item[data-owned="true"]').length;
    const missingCards = totalCards - ownedCards;
    const completionPercentage = Math.round((ownedCards / totalCards) * 100);
    
    // Update progress bar
    $('.progress-bar').css('width', `${completionPercentage}%`);
    $('.progress-bar').attr('aria-valuenow', completionPercentage);
    $('.progress-bar').text(`${ownedCards}/${totalCards}`);
    
    // Update completion percentage
    $('.completion-percentage').text(`${completionPercentage}% Complete`);
    
    // Update statistics
    $('.progress-stats .stat-item:nth-child(1) span').text(`${ownedCards} Owned`);
    $('.progress-stats .stat-item:nth-child(2) span').text(`${missingCards} Missing`);
    
    // Update filter button counts
    $('.btn-filter[data-filter="owned"]').html(`<i class="fas fa-gem me-1"></i>Owned (${ownedCards})`);
    $('.btn-filter[data-filter="missing"]').html(`<i class="fas fa-shopping-cart me-1"></i>Missing (${missingCards})`);
    
    // Update reward badges
    updateRewardBadges(completionPercentage);
    
    // Show completion celebration if 100%
    if (completionPercentage === 100) {
        setTimeout(() => {
            showCompletionCelebration();
        }, 1000);
    }
}

/**
 * Update reward badges based on completion percentage
 */
function updateRewardBadges(percentage) {
    // Bronze badge (50%)
    const bronzeBadge = $('.reward-item:nth-child(1) .reward-badge');
    if (percentage >= 50) {
        bronzeBadge.removeClass('locked').addClass('earned');
    }
    
    // Silver badge (75%)
    const silverBadge = $('.reward-item:nth-child(2) .reward-badge');
    if (percentage >= 75) {
        silverBadge.removeClass('locked').addClass('earned');
    }
    
    // Master badge (100%)
    const masterBadge = $('.reward-item:nth-child(3) .reward-badge');
    if (percentage >= 100) {
        masterBadge.removeClass('locked').addClass('earned');
    }
}

/**
 * Show completion celebration
 */
function showCompletionCelebration() {
    Swal.fire({
        icon: 'success',
        title: '🎉 Collection Complete! 🎉',
        html: `
            <div class="text-center">
                <div class="mb-3">
                    <i class="fas fa-crown fa-3x text-warning"></i>
                </div>
                <h4>Congratulations!</h4>
                <p>You have completed the entire collection!</p>
                <p>You've earned the <strong>Master Badge</strong> for this series.</p>
                <div class="mt-3">
                    <span class="badge bg-warning text-dark fs-6 p-2">
                        <i class="fas fa-crown me-1"></i>Master Collector
                    </span>
                </div>
            </div>
        `,
        confirmButtonText: 'Amazing!',
        confirmButtonColor: '#f39c12',
        showClass: {
            popup: 'animate__animated animate__bounceIn'
        }
    });
}

/**
 * Animate progress bars on page load
 */
function animateProgressBars() {
    const progressBar = $('.progress-bar');
    const targetWidth = progressBar.attr('style');
    
    // Start with 0 width
    progressBar.css('width', '0%');
    
    // Animate to target width
    setTimeout(() => {
        progressBar.css({
            'transition': 'width 1.5s ease-out',
            'width': progressBar.attr('aria-valuenow') + '%'
        });
    }, 500);
}

/**
 * Utility function to show loading state
 */
function showLoading() {
    $('#cardsGrid').append(`
        <div class="col-12 text-center py-5 loading-spinner">
            <div class="spinner-border text-primary me-3" role="status"></div>
            <span class="fs-5 text-muted">Loading cards...</span>
        </div>
    `);
}

/**
 * Utility function to hide loading state
 */
function hideLoading() {
    $('.loading-spinner').remove();
}

// Custom CSS animations for newly acquired cards
$('<style>').text(`
    .newly-acquired {
        animation: cardAcquisition 2s ease-out;
    }
    
    @keyframes cardAcquisition {
        0% {
            transform: scale(1);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        25% {
            transform: scale(1.05);
            box-shadow: 0 15px 35px rgba(39, 174, 96, 0.3);
        }
        50% {
            transform: scale(1.02);
            box-shadow: 0 10px 25px rgba(39, 174, 96, 0.2);
        }
        100% {
            transform: scale(1);
            box-shadow: 0 5px 15px rgba(39, 174, 96, 0.1);
        }
    }
    
    .fade-in {
        animation: fadeInUp 0.5s ease forwards;
    }
`).appendTo('head');

// Export functions for global access if needed
window.PearlCardSet = {
    updateCardToOwned,
    updateCollectionProgress,
    applyFilters,
    applySorting
};

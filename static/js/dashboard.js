/* =====================================================
   PEARL VERSE - DASHBOARD JAVASCRIPT
   ===================================================== */

// Global variables
let currentUser = null;
let currentEditingLinkId = null;

// Initialize dashboard when DOM is ready
$(document).ready(function () {
  initDashboard();
  setupEventListeners();
  loadInitialData();
  
  // Force a refresh of posts on page load to apply new compact styling
  setTimeout(() => {
    if (allLoadedPosts.length > 0) {
      console.log('Refreshing posts to apply compact styling...');
      refreshPostsFeed();
    }
  }, 1000);
});

// Global variables for post creation
let selectedFeeling = null;
let selectedLocation = null;

/* =====================================================
   DASHBOARD INITIALIZATION
   ===================================================== */

function initDashboard() {

  // Set default tab
  switchTab("feed");

  // Initialize tooltips
  $('[data-bs-toggle="tooltip"]').tooltip();

  // Initialize popovers
  $('[data-bs-toggle="popover"]').popover();
}

function setupEventListeners() {
  $("#copyReferralBtn").on("click", copyReferralCode);

  $("#claimDailyReward").on("click", claimDailyReward);

  $(document).on("click", function (event) {
    if (!$(event.target).closest(".user-menu").length) {
      $("#userDropdown").removeClass("show");
    }
  });

  // Mobile sidebar toggle
  $("#sidebarOverlay").on("click", toggleSidebar);
}

function loadInitialData() {
  console.log('Loading initial data...');
  // Load user profile first, then load other data that depends on user
  loadUserProfile().then(() => {
    console.log('User profile loaded, loading wallet stats and daily claim status...');
    loadWalletStats();
    loadDailyClaimStatus();
    
    // Initialize post modal functionality
    initPostModal();
    
    // Ensure social links are loaded after user data is available
    setTimeout(() => {
      if (window.refreshSocialLinks) {
        window.refreshSocialLinks();
      }
    }, 500);
  }).catch(error => {
    console.error('Error in loadInitialData:', error);
  });
}

/* =====================================================
   TAB SWITCHING
   ===================================================== */

window.switchTab = function(tabName) {
  // Remove active class from main nav tabs only
  $(".nav-link").removeClass("active");
  
  // For sidebar and bottom nav, only remove active if we're switching to a different main section
  // Keep dashboard active in sidebar for feed/wallet/profile tabs since they're all under dashboard
  $(".sidebar-nav-link").removeClass("active");
  $(".bottom-nav-item").removeClass("active");

  // Hide all content
  $("#feedContent, #walletContent, #profileContent").hide();

  // Show selected content
  $(`#${tabName}Content`).show();

  // Add active class to selected tab
  $(`#${tabName}Tab`).addClass("active");
  
  // For sidebar and bottom nav, always keep dashboard active since all these tabs are under dashboard
  $("#sidebarFeedTab").addClass("active");
  $("#bottomFeedTab").addClass("active");

  // Load specific data for tab
  switch (tabName) {
    case "feed":
      // Refresh social links when switching to feed tab
      if (window.refreshSocialLinks) {
        window.refreshSocialLinks();
      }
      // Load posts if not already loaded
      if (allLoadedPosts.length === 0) {
        loadPosts(true);
      }
      break;
    case "wallet":
      loadWalletStats();
      loadTransactionHistory();
      break;
    case "profile":
      loadProfileStats();
      break;
  }
}

/* =====================================================
   USER PROFILE FUNCTIONS
   ===================================================== */

function loadUserProfile() {
  console.log('Loading user profile...');
  // Fetch user data from the API
  return fetch('/api/current-user')
    .then(response => {
      console.log('Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('User data received:', data);
      if (data.success) {
        currentUser = data.user;
        console.log('Current user set:', currentUser);
        updateUserDisplay(data.user);
        return data.user;
      } else {
        console.error('Failed to load user profile:', data.message);
        // Redirect to login if not authenticated
        if (data.message === 'Not logged in') {
          window.location.href = '/login';
        }
        throw new Error(data.message);
      }
    })
    .catch(error => {
      console.error('Error loading user profile:', error);
      throw error;
    });
}

function updateUserDisplay(user) {
  console.log('Updating user display with:', user);
  currentUser = user;

  // Update sidebar
  $("#sidebarUserName").text(`${user.first_name} ${user.last_name}`);
  $("#sidebarPearlCount").text(user.pearl || 0);

  // Update top nav
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`;
  $("#topNavAvatar").text(initials);
  $("#sidebarAvatar").text(initials);

  // Update profile header
  $("#profileName").text(`${user.first_name} ${user.last_name}`);
  $("#profileAvatar").text(initials);
  
  // Update topnav profile username and email
  $("#topnavProfileUsername").text(`@${user.username}`);
  $("#topnavProfileEmail").text(user.email);

  // Update profile info
  $("#firstNameDisplay").text(user.first_name);
  $("#lastNameDisplay").text(user.last_name);
  $("#emailDisplay").text(user.email);
  $("#referralCode").text(user.referral_code);
  $("#locationDisplay").text(user.location || '-');
  $("#websiteDisplay").text(user.website || '-');
  $("#memberSinceDisplay").text(user.created_at ? new Date(user.created_at).toLocaleDateString() : '-');
  
  // Update bio if available
  if (user.bio) {
    $("#profileBioEdit").val(user.bio);
    $("#profileBio").text(user.bio);
    updateBioCharacterCount();
  } else {
    // Set default bio if no bio exists
    $("#profileBio").text('Pearl Verse Explorer');
  }

  // Update wallet stats
  $("#pearlBalance").text(user.pearl || 0);
  
  // Initialize social links manager with user data
  if (window.socialLinksManager && window.initSocialLinksWithUser) {
    window.initSocialLinksWithUser(user);
  }
  
  // Update topnav profile with username
  if (window.modularTopnav && window.modularTopnav.updateUserProfile) {
    window.modularTopnav.updateUserProfile(user);
  }
  
  console.log('User display updated successfully');
}
/* =====================================================
   WALLET FUNCTIONS
   ===================================================== */

function loadWalletStats() {
  // Use the current user data if available, otherwise fetch from API
  if (currentUser) {
    updateWalletDisplay({
      current_balance: currentUser.pearl || 0,
      pearls_earned: currentUser.pearl || 0, // This would need to be calculated from transactions
      pearls_spent: 0, // This would need to be calculated from transactions
      referral_count: 0 // This would need to be calculated from referrals
    });
  } else {
    // Fallback to API call if user data not loaded yet
    fetch("/api/wallet/stats", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          updateWalletDisplay(data);
        }
      })
      .catch(() => {});
  }
}

function updateWalletDisplay(walletData) {
  $("#pearlBalance").text(walletData.current_balance || 0);
  $("#pearlsEarned").text(walletData.pearls_earned || 0);
  $("#pearlsSpent").text(walletData.pearls_spent || 0);
  $("#referrals").text(walletData.referral_count || 0);
}

function loadDailyClaimStatus() {
  fetch("/api/daily-claim/status", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        updateDailyClaimDisplay(data);
      }
    })
    .catch(() => {});
}

function updateDailyClaimDisplay(claimData) {
  $("#currentStreak").text(claimData.current_streak || 1);
  $("#nextRewardAmount").text(claimData.next_reward || 500);

  // Update progress bar
  const progress = (claimData.current_streak / 7) * 100;
  $("#streakProgressBar").css("width", `${progress}%`);
  $("#progressText").text(claimData.current_streak || 1);

  // Update claim button - enable if any day is claimable
  const claimBtn = $("#claimDailyReward");
  const hasClaimable = Array.isArray(claimData.claim_status)
    ? claimData.claim_status.some((d) => d && d.can_claim)
    : false;

  if (hasClaimable) {
    claimBtn
      .prop("disabled", false)
      .html('<i class="fas fa-gift me-2"></i>Claim Today\'s Reward');
  } else if (claimData.claimed_today) {
    claimBtn.prop("disabled", true).text("Already Claimed Today");
  } else {
    claimBtn.prop("disabled", true).text("Not Available Yet");
  }

  // Update the counters beneath the claim section
  try {
    const statusArray = Array.isArray(claimData.claim_status) ? claimData.claim_status : [];
    const claimedDays = statusArray.filter(d => d && d.claimed);
    const totalClaimed = typeof claimData.total_claimed === 'number' ? claimData.total_claimed : claimedDays.length;
    const pearlsEarned = typeof claimData.pearls_earned_from_claims === 'number'
      ? claimData.pearls_earned_from_claims
      : claimedDays.reduce((sum, d) => sum + (d?.reward || 0), 0);
    const cyclesCompleted = typeof claimData.completed_cycles === 'number'
      ? claimData.completed_cycles
      : Math.floor(totalClaimed / 7);

    $("#totalClaimed").text(totalClaimed || 0);
    $("#pearlsEarnedFromClaims").text(pearlsEarned || 0);
    $("#completedCycles").text(cyclesCompleted || 0);
  } catch (e) {
    console.warn('Failed to compute daily-claim counters:', e);
  }

  // Update reward days grid
  updateRewardDaysGrid(claimData.claim_status || []);
}

window.updateBioCharacterCount = function() {
  const textarea = $("#profileBioEdit");
  const currentCount = textarea.val().length;
  const maxCount = parseInt(textarea.attr('maxlength'));
  
  $("#bioCurrentCount").text(currentCount);
  $("#bioMaxCount").text(maxCount);
}

window.saveBio = function() {
  const bio = $("#profileBioEdit").val();
  
  fetch('/api/update-bio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bio: bio })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update the profile header bio display immediately
      const displayBio = bio || 'Pearl Verse Explorer';
      $("#profileBio").text(displayBio);
      
      // Update the current user object
      if (currentUser) {
        currentUser.bio = bio;
      }
      
      // Show success message
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'Bio Updated!',
          text: 'Your bio has been saved successfully.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    } else {
      console.error('Failed to save bio:', data.message);
      // Show error message
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: data.message || 'Failed to save bio. Please try again.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000
        });
      }
    }
  })
  .catch(error => {
    console.error('Error saving bio:', error);
    // Show error message
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Network Error!',
        text: 'Unable to save bio. Please check your connection and try again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });
    }
  });
}

function updateRewardDaysGrid(claimStatus) {
  const grid = $("#rewardDaysGrid");
  grid.empty();

  claimStatus.forEach((day, index) => {
    const dayElement = $(`
            <div class="reward-day ${day.claimed ? "claimed" : ""} ${
      day.is_today ? "today" : ""
    } ${day.can_claim ? "available" : "locked"}">
                <div class="reward-day-icon">
                    <i class="fas ${
                      day.claimed
                        ? "fa-check"
                        : day.can_claim
                        ? "fa-gift"
                        : "fa-lock"
                    }"></i>
                </div>
                <div>Day ${day.day}</div>
                <div class="reward-amount">${
                  day.reward
                } <i class="fas fa-gem"></i></div>
            </div>
        `);

    grid.append(dayElement);
  });
}

function claimDailyReward() {
  const claimBtn = $("#claimDailyReward");
  const originalText = claimBtn.html();

  // Show loading state
  claimBtn
    .prop("disabled", true)
    .html('<i class="fas fa-spinner fa-spin me-2"></i>Claiming...');

  fetch("/api/daily-claim/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSuccess(
          `${data.message} You earned ${data.claimed_amount} pearls!`
        );
        loadDailyClaimStatus();
        loadWalletStats();
      } else {
        showError(data.message || "Failed to claim daily reward");
      }
    })
    .catch(() => {
      showError("Failed to claim daily reward. Please try again.");
    })
    .finally(() => {
      claimBtn.prop("disabled", false).html(originalText);
    });
}

function loadTransactionHistory() {
  fetch("/api/transaction-history", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        updateTransactionHistory(data.transactions || []);
      }
    })
    .catch(() => {});
}

function updateTransactionHistory(transactions) {
  const tbody = $("#transactionHistory");
  tbody.empty();

  if (transactions.length === 0) {
    tbody.append(`
            <tr>
                <td colspan="5" class="text-center text-muted">No transactions yet</td>
            </tr>
        `);
    return;
  }

  transactions.slice(0, 10).forEach((tx) => {
    // Show only last 10 transactions
    const row = $(`
            <tr>
                <td>${new Date(tx.transaction_date).toLocaleDateString()}</td>
                <td><span class="badge bg-${getTransactionTypeColor(
                  tx.transaction_type
                )}">${getTransactionTypeLabel(tx.transaction_type)}</span></td>
                <td class="${
                  tx.pearl_amount >= 0 ? "text-success" : "text-danger"
                }">${tx.pearl_amount >= 0 ? "+" : ""}${
      tx.pearl_amount
    } <i class="fas fa-gem"></i></td>
                <td>${tx.from_to || "System"}</td>
                <td><span class="badge bg-success">Completed</span></td>
            </tr>
        `);
    tbody.append(row);
  });
}

function getTransactionTypeColor(type) {
  const colorMap = {
    send: "info",
    receive: "success",
    daily_claim: "primary",
    referral_bonus: "warning",
  };
  return colorMap[type] || "secondary";
}

function getTransactionTypeLabel(type) {
  const labelMap = {
    send: "Sent",
    receive: "Received",
    daily_claim: "Daily Reward",
    referral_bonus: "Referral Bonus",
  };
  return labelMap[type] || type;
}

/* =====================================================
   UTILITY FUNCTIONS
   ===================================================== */

function copyReferralCode() {
  const referralCode = $("#referralCode").text();

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(referralCode)
      .then(() => {
        showSuccess("Referral code copied to clipboard!");
      })
      .catch(() => {
        fallbackCopyTextToClipboard(referralCode);
      });
  } else {
    fallbackCopyTextToClipboard(referralCode);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
    showSuccess("Referral code copied to clipboard!");
  } catch (err) {
    showError("Failed to copy referral code");
  }

  document.body.removeChild(textArea);
}

window.toggleSidebar = function() {
  $("#sidebar").toggleClass("mobile-open");
  $("#sidebarOverlay").toggleClass("active");
}

window.toggleUserDropdown = function() {
  $("#userDropdown").toggleClass("show");
}

function showSuccess(message) {
  // Use SweetAlert2 for success notifications
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: '#28a745',
      color: '#fff'
    });
  } else {
    // Fallback to regular alert if SweetAlert2 is not available
    alert("Success: " + message);
  }
}

function showError(message) {
  // Use SweetAlert2 for error notifications
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'error',
      title: 'Error!',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: '#dc3545',
      color: '#fff'
    });
  } else {
    // Fallback to regular alert if SweetAlert2 is not available
    alert("Error: " + message);
  }
}

// General toast function for different types of notifications
function showToast(message, type = 'info') {
  if (typeof Swal !== 'undefined') {
    const config = {
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      text: message
    };

    switch (type) {
      case 'success':
        config.icon = 'success';
        config.title = 'Success!';
        config.background = '#28a745';
        config.color = '#fff';
        break;
      case 'error':
        config.icon = 'error';
        config.title = 'Error!';
        config.background = '#dc3545';
        config.color = '#fff';
        config.timer = 4000;
        break;
      case 'warning':
        config.icon = 'warning';
        config.title = 'Warning!';
        config.background = '#ffc107';
        config.color = '#000';
        break;
      case 'info':
      default:
        config.icon = 'info';
        config.title = 'Info';
        config.background = '#17a2b8';
        config.color = '#fff';
        break;
    }

    Swal.fire(config);
  } else {
    // Fallback to regular alert if SweetAlert2 is not available
    alert(`${type.toUpperCase()}: ${message}`);
  }
}

function showFieldError(fieldSelector, message) {
  const field = $(fieldSelector);
  field.siblings(".invalid-feedback").remove();
  field.after(
    `<div class="invalid-feedback" style="display: block;">${message}</div>`
  );
}

function showLoadingState(selector) {
  $(selector).html(`
        <div class="d-flex justify-content-center align-items-center p-3">
            <i class="fas fa-spinner fa-spin me-2"></i>
            <span class="text-muted">Loading...</span>
        </div>
    `);
}

function loadProfileStats() {
  fetch("/api/profile/stats", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        updateProfileStats(data);
      }
    })
    .catch(() => {});
}

function updateProfileStats(profileData) {
  $("#followersCount").text(profileData.followers_count || 0);
  $("#followingCount").text(profileData.following_count || 0);
  $("#postsCount").text(profileData.posts_count || 0);

  // Update bio if available
  if (profileData.profile_info && profileData.profile_info.bio) {
    $("#profileBio").text(profileData.profile_info.bio);
  }
}

// Placeholder functions for navigation
window.openAvatarShop = function() {
  alert('Avatar Shop - Coming Soon!');
};

window.openShop = function() {
  alert('Shop - Coming Soon!');
};

window.openInventory = function() {
  alert('Inventory - Coming Soon!');
};

window.openCommunity = function() {
  alert('Community - Coming Soon!');
};

window.openLeaderboard = function() {
  alert('Leaderboard - Coming Soon!');
};

window.toggleNotifications = function() {
  alert('Notifications - Coming Soon!');
};

window.toggleMessages = function() {
  alert('Messages - Coming Soon!');
};

// Posts functionality - Global variables
let currentPostsPage = 1;
let allLoadedPosts = [];
let isLoadingPosts = false;
let hasMorePosts = true;

window.createPost = function() {
  const postContent = document.getElementById('postContent')?.value?.trim();
  
  if (!postContent) {
    showError('Please enter some content for your post.');
    return;
  }
  
  if (postContent.length > 1000) {
    showError('Post content must be 1000 characters or less.');
    return;
  }
  
  // Show loading state
  const createButton = document.querySelector('.btn-post');
  const originalButtonText = createButton.innerHTML;
  createButton.disabled = true;
  createButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
  
  // Create post
  fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: postContent })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      // Clear the post input
      document.getElementById('postContent').value = '';
      
      // Show success message
      showSuccess(result.message || 'Post created successfully!');
      
      // Refresh the posts feed
      refreshPostsFeed();
      
      // Update user stats if returned
      if (result.exp_gained) {
        // Refresh user profile to get updated stats
        loadUserProfile();
      }
    } else {
      showError(result.message || 'Failed to create post. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error creating post:', error);
    showError('Network error. Please try again.');
  })
  .finally(() => {
    // Restore button state
    createButton.disabled = false;
    createButton.innerHTML = originalButtonText;
  });
};

// Function to refresh posts feed (reset and load from beginning)
function refreshPostsFeed() {
  console.log('Refreshing posts feed...');
  // Reset pagination state
  currentPostsPage = 1;
  allLoadedPosts = [];
  hasMorePosts = true;
  
  // Clear current posts display
  const postsList = document.getElementById('postsList');
  if (postsList) {
    postsList.innerHTML = '';
  }
  
  // Load fresh posts
  loadPosts(true);
}

// Function to load posts (with accumulative loading)
function loadPosts(isRefresh = false) {
  if (isLoadingPosts) return;
  
  console.log(`Loading posts - Page: ${currentPostsPage}, Refresh: ${isRefresh}`);
  isLoadingPosts = true;
  
  const postsContainer = document.getElementById('postsContainer');
  const postsList = document.getElementById('postsList');
  const loadingSpinner = document.getElementById('postsLoadingSpinner');
  const showMoreContainer = document.getElementById('showMoreContainer');
  const noPostsMessage = document.getElementById('noPostsMessage');
  
  if (!postsContainer || !postsList) {
    console.error('Posts container or posts list not found');
    isLoadingPosts = false;
    return;
  }
  
  // Show loading spinner
  if (loadingSpinner) {
    loadingSpinner.style.display = 'block';
  }
  
  // Hide other elements during loading
  if (showMoreContainer) showMoreContainer.style.display = 'none';
  if (noPostsMessage) noPostsMessage.style.display = 'none';
  
  fetch(`/api/posts?page=${currentPostsPage}&per_page=10`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      const posts = result.posts || [];
      const pagination = result.pagination || {};
      
      console.log(`Loaded ${posts.length} posts, total: ${pagination.total}`);
      
      if (posts.length === 0 && currentPostsPage === 1) {
        // No posts at all - show no posts message
        if (noPostsMessage) noPostsMessage.style.display = 'block';
        if (showMoreContainer) showMoreContainer.style.display = 'none';
        if (postsList) postsList.innerHTML = '';
      } else {
        // Hide no posts message if we have posts
        if (noPostsMessage) noPostsMessage.style.display = 'none';
        
        // Add new posts to our loaded posts array
        if (isRefresh) {
          allLoadedPosts = posts;
        } else {
          allLoadedPosts = allLoadedPosts.concat(posts);
        }
        
        // Update hasMorePosts flag
        hasMorePosts = pagination.has_next || false;
        
        // Render all posts
        renderPosts(allLoadedPosts);
        
        // Show/hide show more button
        if (showMoreContainer) {
          showMoreContainer.style.display = hasMorePosts ? 'block' : 'none';
        }
      }
    } else {
      console.error('Failed to load posts:', result.message);
      if (currentPostsPage === 1 && allLoadedPosts.length === 0) {
        // Failed to load any posts
        if (noPostsMessage) {
          noPostsMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle text-muted mb-3" style="font-size: 3rem; opacity: 0.3;"></i>
            <h5 class="text-muted">Failed to load posts</h5>
            <p class="text-muted">There was an error loading posts. Please try refreshing the page.</p>
          `;
          noPostsMessage.style.display = 'block';
        }
      }
    }
  })
  .catch(error => {
    console.error('Error loading posts:', error);
    if (currentPostsPage === 1 && allLoadedPosts.length === 0) {
      if (noPostsMessage) {
        noPostsMessage.innerHTML = `
          <i class="fas fa-wifi text-muted mb-3" style="font-size: 3rem; opacity: 0.3;"></i>
          <h5 class="text-muted">Connection Error</h5>
          <p class="text-muted">Unable to load posts. Please check your connection and try again.</p>
        `;
        noPostsMessage.style.display = 'block';
      }
    }
  })
  .finally(() => {
    // Hide loading spinner
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }
    isLoadingPosts = false;
  });
}

// Function to render posts in the UI
function renderPosts(posts) {
  const postsList = document.getElementById('postsList');
  if (!postsList) return;
  
  if (!posts || posts.length === 0) {
    postsList.innerHTML = '';
    return;
  }
  
  // Generate HTML for all posts
  const postsHTML = posts.map(post => createPostHTML(post)).join('');
  postsList.innerHTML = postsHTML;
}

// Function to create HTML for a single post
function createPostHTML(post) {
  const authorName = post.author_name || 'Unknown User';
  const authorInitials = post.author_initials || '??';
  const timeAgo = post.time_ago || 'Recently';
  const content = post.content || '';
  const likesCount = post.likes_count || 0;
  const commentsCount = post.comments_count || 0;
  const reactions = post.reactions_summary || {};
  const userReaction = post.user_reaction;
  const isOwnPost = currentUser && post.user_id === currentUser.id;
  
  // Build reactions display
  let reactionIcons = [];
  const reactionEmojis = {
    'like': '👍',
    'love': '❤️',
    'haha': '😆',
    'wow': '😮',
    'sad': '😢',
    'angry': '😠'
  };
  
  Object.keys(reactions).forEach(reaction => {
    if (reactions[reaction] > 0) {
      reactionIcons.push(`<span class="facebook-reaction-count" data-reaction="${reaction}">${reactionEmojis[reaction]} ${reactions[reaction]}</span>`);
    }
  });
  
  const reactionDisplay = reactionIcons.length > 0 ? 
    `<div class="facebook-reactions-summary">${reactionIcons.join(' ')}</div>` : '';
  
  // Dropdown options based on ownership
  let dropdownOptions = `
    <li><a class="dropdown-item" href="#" onclick="reportPost(${post.id})"><i class="fas fa-flag me-2"></i>Report</a></li>
  `;
  
  if (isOwnPost) {
    dropdownOptions = `
      <li><a class="dropdown-item" href="#" onclick="editPost(${post.id})"><i class="fas fa-edit me-2"></i>Edit</a></li>
      <li><a class="dropdown-item text-danger" href="#" onclick="deletePost(${post.id})"><i class="fas fa-trash me-2"></i>Delete</a></li>
      <li><hr class="dropdown-divider"></li>
      ${dropdownOptions}
    `;
  }
  
  return `
    <div class="facebook-post" data-post-id="${post.id}">
      <!-- Facebook-style Post Header -->
      <div class="facebook-post-header">
        <div class="facebook-post-avatar">
          ${authorInitials}
        </div>
        <div class="facebook-post-user-info">
          <h6 class="facebook-post-author">
            ${authorName}
            ${post.feeling ? ` <span class="facebook-post-feeling">is feeling ${post.feeling.charAt(0).toUpperCase() + post.feeling.slice(1)}</span>` : ''}
          </h6>
          <p class="facebook-post-meta">@${post.author_username || 'unknown'} • ${timeAgo}</p>
        </div>
        <div class="facebook-post-dropdown">
          <button class="btn dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-dark">
            ${dropdownOptions}
          </ul>
        </div>
      </div>
      
      <!-- Facebook-style Post Content -->
      <div class="facebook-post-content" id="post-content-${post.id}">
        <p class="facebook-post-text">
          ${content}
        </p>
        ${post.location ? `<div class="facebook-post-location"><i class="fas fa-map-marker-alt"></i>${post.location}</div>` : ''}
      </div>
      
      <!-- Facebook-style Post Image -->
      ${post.image_url ? `
      <div class="facebook-post-image-container">
        <img src="${post.image_url}" class="facebook-post-image" alt="Post image" onclick="openImageModal('${post.image_url}')">
      </div>` : ''}
      
      <!-- Facebook-style Reactions Summary -->
      ${reactionDisplay ? `<div class="facebook-reactions-summary">${reactionIcons.join(' ')}</div>` : ''}
      
      <!-- Facebook-style Post Actions -->
      <div class="facebook-post-actions">
        <!-- React Button with Dropdown -->
        <div class="dropdown facebook-reactions-dropdown">
          <button class="facebook-action-btn ${userReaction ? 'reacted' : ''}" 
                  data-bs-toggle="dropdown" aria-expanded="false" 
                  data-post-id="${post.id}" 
                  data-user-reaction="${userReaction || ''}" 
                  title="React">
            <i class="${userReaction ? getReactionIcon(userReaction) : 'fas fa-thumbs-up'}"></i>
            <span>${Object.values(reactions).reduce((a, b) => a + b, 0) || 'Like'}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-dark facebook-reactions-menu">
            <li class="d-flex justify-content-around p-2">
              <button class="facebook-reaction-emoji" data-reaction="like" onclick="reactToPost(${post.id}, 'like')" title="Like">👍</button>
              <button class="facebook-reaction-emoji" data-reaction="love" onclick="reactToPost(${post.id}, 'love')" title="Love">❤️</button>
              <button class="facebook-reaction-emoji" data-reaction="haha" onclick="reactToPost(${post.id}, 'haha')" title="Haha">😆</button>
              <button class="facebook-reaction-emoji" data-reaction="wow" onclick="reactToPost(${post.id}, 'wow')" title="Wow">😮</button>
              <button class="facebook-reaction-emoji" data-reaction="sad" onclick="reactToPost(${post.id}, 'sad')" title="Sad">😢</button>
              <button class="facebook-reaction-emoji" data-reaction="angry" onclick="reactToPost(${post.id}, 'angry')" title="Angry">😠</button>
            </li>
          </ul>
        </div>
        
        <button class="facebook-action-btn" onclick="toggleComments(${post.id})" title="Comment">
          <i class="fas fa-comment"></i>
          <span>${commentsCount}</span>
        </button>
      </div>
    </div>
  `;
}

// Function to load more posts (called by show more button)
window.loadMorePosts = function() {
  if (!hasMorePosts || isLoadingPosts) {
    console.log('Cannot load more posts:', { hasMorePosts, isLoadingPosts });
    return;
  }
  
  // Increment page and load more posts
  currentPostsPage += 1;
  loadPosts(false); // false = not a refresh, accumulate posts
};

// Helper function to get reaction icon
function getReactionIcon(reaction) {
  const icons = {
    'like': 'fas fa-thumbs-up',
    'love': 'fas fa-heart text-danger',
    'haha': 'fas fa-laugh text-warning',
    'wow': 'fas fa-surprise text-info',
    'sad': 'fas fa-sad-tear text-muted',
    'angry': 'fas fa-angry text-danger'
  };
  return icons[reaction] || 'fas fa-thumbs-up';
}

// React to post with Facebook-style reactions
window.reactToPost = function(postId, reaction) {
  console.log('Reacting to post:', postId, 'with', reaction);
  
  fetch(`/api/posts/${postId}/react`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reaction: reaction })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      updatePostReactions(postId, result);
    } else {
      console.error('Failed to react:', result.message);
    }
  })
  .catch(error => {
    console.error('Error reacting to post:', error);
  });
};

// Update post reactions display
function updatePostReactions(postId, result) {
  const postCard = document.querySelector(`[data-post-id="${postId}"]`);
  if (!postCard) return;
  
  const reactions = result.reactions_summary || {};
  const userReaction = result.user_reaction;
  
  // Update reactions summary
  const summaryContainer = postCard.querySelector('.reactions-summary');
  if (summaryContainer || Object.keys(reactions).length > 0) {
    const reactionEmojis = {
      'like': '👍',
      'love': '❤️',
      'haha': '😆',
      'wow': '😮',
      'sad': '😢',
      'angry': '😠'
    };
    
    let reactionIcons = [];
    Object.keys(reactions).forEach(reaction => {
      if (reactions[reaction] > 0) {
        reactionIcons.push(`<span class="reaction-count" data-reaction="${reaction}">${reactionEmojis[reaction]} ${reactions[reaction]}</span>`);
      }
    });
    
    if (summaryContainer) {
      summaryContainer.innerHTML = reactionIcons.join(' ');
      if (reactionIcons.length === 0) {
        summaryContainer.style.display = 'none';
      } else {
        summaryContainer.style.display = 'block';
      }
    } else if (reactionIcons.length > 0) {
      const contentDiv = postCard.querySelector('.post-content');
      contentDiv.insertAdjacentHTML('afterend', `<div class="reactions-summary mb-2">${reactionIcons.join(' ')}</div>`);
    }
  }
  
  // Update main reaction button
  const reactionBtn = postCard.querySelector('.reaction-btn');
  if (reactionBtn) {
    const icon = reactionBtn.querySelector('i');
    const count = reactionBtn.querySelector('.reaction-count-main');
    
    if (userReaction) {
      reactionBtn.classList.add('reacted');
      icon.className = getReactionIcon(userReaction) + ' me-1';
      reactionBtn.setAttribute('data-user-reaction', userReaction);
    } else {
      reactionBtn.classList.remove('reacted');
      icon.className = 'fas fa-thumbs-up me-1';
      reactionBtn.setAttribute('data-user-reaction', '');
    }
    
    const totalCount = Object.values(reactions).reduce((a, b) => a + b, 0);
    count.textContent = totalCount || '';
  }
}

// Backward-compatible like function
window.likePost = function(postId) {
  reactToPost(postId, 'like');
};

// Edit post function
window.editPost = function(postId) {
  const postCard = document.querySelector(`[data-post-id="${postId}"]`);
  if (!postCard) return;
  
  const contentDiv = postCard.querySelector(`#post-content-${postId}`);
  const currentContent = contentDiv.querySelector('p').textContent.trim();
  
  // Create edit form
  const editForm = `
    <div class="post-edit-form">
      <textarea class="form-control mb-2" id="edit-content-${postId}" rows="3" maxlength="1000">${currentContent}</textarea>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-sm btn-secondary" onclick="cancelEditPost(${postId})">Cancel</button>
        <button class="btn btn-sm btn-primary" onclick="saveEditPost(${postId})">Save</button>
      </div>
    </div>
  `;
  
  contentDiv.innerHTML = editForm;
};

// Cancel edit post
window.cancelEditPost = function(postId) {
  // Refresh the post to restore original content
  refreshPostsFeed();
};

// Save edited post
window.saveEditPost = function(postId) {
  const newContent = document.getElementById(`edit-content-${postId}`).value.trim();
  
  if (!newContent) {
    showError('Post content cannot be empty');
    return;
  }
  
  fetch(`/api/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: newContent })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      // Update the post content
      const postCard = document.querySelector(`[data-post-id="${postId}"]`);
      const contentDiv = postCard.querySelector(`#post-content-${postId}`);
      contentDiv.innerHTML = `<p class="text-light mb-0">${newContent}</p>`;
    } else {
      showError(result.message || 'Failed to update post');
    }
  })
  .catch(error => {
    console.error('Error editing post:', error);
    showError('Network error. Please try again.');
  });
};

// Delete post function
window.deletePost = function(postId) {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Delete Post',
      text: 'Are you sure you want to delete this post? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        performDeletePost(postId);
      }
    });
  } else {
    if (confirm('Are you sure you want to delete this post?')) {
      performDeletePost(postId);
    }
  }
};

// Perform the actual deletion
function performDeletePost(postId) {
  fetch(`/api/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      // Remove the post from UI
      const postCard = document.querySelector(`[data-post-id="${postId}"]`);
      if (postCard) {
        postCard.remove();
      }
    } else {
      showError(result.message || 'Failed to delete post');
    }
  })
  .catch(error => {
    console.error('Error deleting post:', error);
    showError('Network error. Please try again.');
  });
}

window.toggleComments = function(postId) {
  console.log('Toggling comments for post:', postId);
  openPostModal(postId);
};

/* =====================================================
   POST MODAL FUNCTIONS
   ===================================================== */

// Global variable to store current modal post
let currentModalPost = null;
let modalComments = [];

// Make posts clickable
function makePostsClickable() {
  $(document).on('click', '.post-card', function(e) {
    // Don't trigger modal if clicking on action buttons or dropdown
    if ($(e.target).closest('.post-action-btn, .dropdown, .reaction-emoji, .dropdown-menu').length > 0) {
      return;
    }
    
    const postId = $(this).data('post-id');
    if (postId) {
      openPostModal(postId);
    }
  });
}

// Open post modal
window.openPostModal = function(postId) {
  console.log('Opening post modal for post:', postId);
  
  // Find the post in our loaded posts
  const post = allLoadedPosts.find(p => p.id == postId);
  if (!post) {
    console.error('Post not found:', postId);
    showError('Post not found');
    return;
  }
  
  currentModalPost = post;
  
  // Show the modal
  const modal = document.getElementById('postModal');
  if (modal) {
    modal.style.display = 'flex';
    
    // Load post content into modal
    loadPostInModal(post);
    
    // Load comments
    loadPostComments(postId);
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
  }
};

// Close post modal
window.closePostModal = function() {
  const modal = document.getElementById('postModal');
  if (modal) {
    modal.style.display = 'none';
    currentModalPost = null;
    modalComments = [];
    
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  }
};

// Load post content into modal
function loadPostInModal(post) {
  // Update modal post header
  const authorName = post.author_name || 'Unknown User';
  const authorInitials = post.author_initials || '??';
  const timeAgo = post.time_ago || 'Recently';
  
  // Create username with inline feeling (same as main feed)
  let usernameHtml = authorName;
  if (post.feeling) {
    usernameHtml += ` <span class="feeling-status text-muted">is <i class="fas fa-smile text-warning me-1"></i>feeling ${post.feeling.charAt(0).toUpperCase() + post.feeling.slice(1)}</span>`;
  }
  
  $('#modalPostUsername').html(usernameHtml);
  $('#modalPostTime').text(timeAgo);
  $('#modalPostAvatar').text(authorInitials);
  
  // Update post content
  $('#modalPostContent p').text(post.content || '');
  
  // Handle post image
  const imageContainer = $('#modalPostImageContainer');
  const image = $('#modalPostImage');
  if (post.image_url) {
    image.attr('src', post.image_url).attr('alt', 'Post image');
    imageContainer.show();
  } else {
    imageContainer.hide();
  }
  
  // Update reactions display
  updateModalReactions(post);
  
  // Store post ID for form submissions
  $('#postModal').data('post-id', post.id);
}

// Update modal reactions display
function updateModalReactions(post) {
  const reactions = post.reactions_summary || {};
  const userReaction = post.user_reaction;
  
  // Update reactions dropdown in modal
  $('.modal-post-actions .reactions-dropdown button').each(function() {
    const $btn = $(this);
    const $icon = $btn.find('i');
    const $count = $btn.find('.reaction-count-main');
    
    if (userReaction) {
      $btn.addClass('reacted');
      $icon.removeClass().addClass(getReactionIcon(userReaction) + ' me-1');
    } else {
      $btn.removeClass('reacted');
      $icon.removeClass().addClass('fas fa-thumbs-up me-1');
    }
    
    const totalCount = Object.values(reactions).reduce((a, b) => a + b, 0);
    $count.text(totalCount || '');
  });
}

// Load comments for a post with pagination
function loadPostComments(postId) {
  console.log('Loading comments for post:', postId);
  
  // Show loading state
  const commentsList = document.getElementById('modalCommentsList');
  const loadMoreSection = document.getElementById('loadMoreCommentsSection');
  const noCommentsMessage = document.getElementById('noCommentsMessage');
  
  // Show loading indicator
  if (commentsList) {
    commentsList.innerHTML = `
      <div class="loading-comments text-center text-muted py-4">
        <i class="fas fa-spinner fa-spin me-2"></i>
        Loading comments...
      </div>
    `;
  }
  
  if (loadMoreSection) loadMoreSection.style.display = 'none';
  if (noCommentsMessage) noCommentsMessage.style.display = 'none';
  
  // Reset pagination state
  resetCommentPagination();
  isLoadingComments = true;
  
  // Fetch first page of comments (newest first)
  fetch(`/api/posts/${postId}/comments?page=1&per_page=${COMMENTS_PER_PAGE}&order=desc`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const comments = data.comments || [];
        const pagination = data.pagination || {};
        
        console.log(`Loaded ${comments.length} comments for post ${postId}`);
        
        // Store comments (newest first)
        allLoadedComments = comments;
        hasMoreComments = pagination.has_next || false;
        
        // Update comments count
        const totalCount = pagination.total || comments.length;
        $('#modalCommentsCount').text(totalCount);
        
        // Render comments
        renderModalComments(allLoadedComments);
        
        // Show/hide load more button
        updateLoadMoreCommentsButton();
      } else {
        console.error('Failed to load comments:', data.message);
        showCommentsError();
      }
    })
    .catch(error => {
      console.error('Error loading comments:', error);
      showCommentsError();
    })
    .finally(() => {
      isLoadingComments = false;
    });
}

// Render comments in modal
function renderModalComments(comments) {
  const commentsList = document.getElementById('modalCommentsList');
  const noCommentsState = document.getElementById('noCommentsMessage');
  
  if (!commentsList) return;
  
  if (!comments || comments.length === 0) {
    commentsList.style.display = 'none';
    if (noCommentsState) noCommentsState.style.display = 'block';
    return;
  }
  
  if (noCommentsState) noCommentsState.style.display = 'none';
  commentsList.style.display = 'block';
  
  // Update comments count
  $('#modalCommentsCount').text(comments.length);
  
  // Generate comments HTML
  const commentsHTML = comments.map(comment => {
    const authorName = comment.author_name || 'Unknown User';
    const authorInitials = comment.author_initials || '??';
    const timeAgo = comment.time_ago || 'Recently';
    const content = comment.content || '';
    const likesCount = comment.likes_count || 0;
    const isLiked = comment.user_liked || false;
    
    return `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-user-avatar">${authorInitials}</div>
        <div class="comment-content">
          <div class="comment-user-info">
            <span class="comment-username">${authorName}</span>
            <span class="comment-time">${timeAgo}</span>
          </div>
          <div class="comment-text">${content}</div>
          <div class="comment-actions">
            <button class="comment-action-btn ${isLiked ? 'liked' : ''}" onclick="likeComment(${comment.id})">
              <i class="fas fa-heart"></i>
              <span>${likesCount > 0 ? likesCount : ''}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  commentsList.innerHTML = commentsHTML;
}

// Show comments error state
function showCommentsError() {
  const commentsList = document.getElementById('modalCommentsList');
  const noCommentsState = document.getElementById('noCommentsMessage');
  
  if (commentsList) {
    commentsList.innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-exclamation-triangle text-muted mb-3" style="font-size: 2rem;"></i>
        <p class="text-muted">Failed to load comments</p>
        <button class="btn btn-sm btn-outline-primary" onclick="loadPostComments(${currentModalPost?.id})">
          <i class="fas fa-redo"></i> Try Again
        </button>
      </div>
    `;
    commentsList.style.display = 'block';
  }
  if (noCommentsState) noCommentsState.style.display = 'none';
}

// Global variables for comment pagination
let currentCommentsPage = 1;
let allLoadedComments = [];
let isLoadingComments = false;
let hasMoreComments = true;
const COMMENTS_PER_PAGE = 10;

// Add comment function
window.addComment = function() {
  if (!currentModalPost) {
    showError('No post selected');
    return;
  }
  
  const commentInput = document.getElementById('newCommentText');
  const commentText = commentInput.value.trim();
  
  if (!commentText) {
    showError('Please enter a comment');
    return;
  }
  
  if (commentText.length > 500) {
    showError('Comment must be 500 characters or less');
    return;
  }
  
  // Show loading state
  const submitBtn = document.getElementById('addCommentBtn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Posting...';
  
  // Submit comment
  fetch(`/api/posts/${currentModalPost.id}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: commentText })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Clear input
      commentInput.value = '';
      updateCommentCharCount();
      
      // Show success
      showSuccess(data.message || 'Comment added successfully!');
      
      // Reset comment pagination and reload from beginning
      resetCommentPagination();
      loadPostComments(currentModalPost.id);
      
      // Update comments count in main post card if visible
      updatePostCommentsCount(currentModalPost.id, data.new_comments_count);
    } else {
      showError(data.message || 'Failed to add comment');
    }
  })
  .catch(error => {
    console.error('Error adding comment:', error);
    showError('Network error. Please try again.');
  })
  .finally(() => {
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  });
};

// Reset comment pagination
function resetCommentPagination() {
  currentCommentsPage = 1;
  allLoadedComments = [];
  hasMoreComments = true;
  isLoadingComments = false;
}

// Load more comments function
window.loadMoreComments = function() {
  if (!currentModalPost || isLoadingComments || !hasMoreComments) {
    return;
  }
  
  console.log('Loading more comments, page:', currentCommentsPage + 1);
  
  // Show loading state
  const loadMoreBtn = document.getElementById('loadMoreCommentsBtn');
  const loadingIndicator = document.getElementById('loadingMoreComments');
  
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  if (loadingIndicator) loadingIndicator.style.display = 'block';
  
  isLoadingComments = true;
  currentCommentsPage += 1;
  
  // Fetch more comments
  fetch(`/api/posts/${currentModalPost.id}/comments?page=${currentCommentsPage}&per_page=${COMMENTS_PER_PAGE}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const newComments = data.comments || [];
        const pagination = data.pagination || {};
        
        console.log(`Loaded ${newComments.length} more comments`);
        
        // Add new comments to the end of the existing list (older comments)
        allLoadedComments = allLoadedComments.concat(newComments);
        
        // Update hasMoreComments flag
        hasMoreComments = pagination.has_next || false;
        
        // Re-render all comments
        renderModalComments(allLoadedComments);
        
        // Show/hide load more button
        updateLoadMoreCommentsButton();
      } else {
        console.error('Failed to load more comments:', data.message);
        showError('Failed to load more comments');
      }
    })
    .catch(error => {
      console.error('Error loading more comments:', error);
      showError('Network error while loading comments');
    })
    .finally(() => {
      isLoadingComments = false;
      if (loadingIndicator) loadingIndicator.style.display = 'none';
    });
};

// Update load more comments button visibility
function updateLoadMoreCommentsButton() {
  const loadMoreSection = document.getElementById('loadMoreCommentsSection');
  const loadMoreBtn = document.getElementById('loadMoreCommentsBtn');
  
  if (loadMoreSection && loadMoreBtn) {
    if (hasMoreComments) {
      loadMoreSection.style.display = 'block';
      loadMoreBtn.style.display = 'block';
    } else {
      loadMoreSection.style.display = 'none';
    }
  }
}

// Update comment character count
window.updateCommentCharCount = function() {
  const input = document.getElementById('newCommentText');
  const currentCountEl = document.getElementById('commentCurrentCount');
  
  if (input && currentCountEl) {
    const currentLength = input.value.length;
    const maxLength = 500;
    currentCountEl.textContent = currentLength;
    
    const counter = document.getElementById('commentCharCount');
    if (counter) {
      if (currentLength > maxLength) {
        counter.style.color = '#dc3545'; // red
      } else if (currentLength > maxLength * 0.8) {
        counter.style.color = '#ffc107'; // yellow
      } else {
        counter.style.color = '#6c757d'; // muted
      }
    }
  }
};

// Update post comments count in main feed
function updatePostCommentsCount(postId, newCount) {
  const postCard = document.querySelector(`[data-post-id="${postId}"]`);
  if (postCard) {
    const commentButton = postCard.querySelector('.post-action-btn[onclick*="toggleComments"] span');
    if (commentButton) {
      commentButton.textContent = newCount || 0;
    }
  }
}

// Like comment function
window.likeComment = function(commentId) {
  if (!currentModalPost) return;
  
  fetch(`/api/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update comment like button in UI
      const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (commentItem) {
        const likeBtn = commentItem.querySelector('.comment-action-btn');
        const likeCount = likeBtn.querySelector('span');
        const icon = likeBtn.querySelector('i');
        
        if (data.liked) {
          likeBtn.classList.add('liked');
          likeCount.textContent = data.likes_count > 0 ? data.likes_count : '';
        } else {
          likeBtn.classList.remove('liked');
          likeCount.textContent = data.likes_count > 0 ? data.likes_count : '';
        }
      }
    }
  })
  .catch(error => {
    console.error('Error liking comment:', error);
  });
};

// Reply to comment function
window.replyToComment = function(commentId) {
  showToast('Reply feature coming soon!', 'info');
};

// Initialize post modal functionality
function initPostModal() {
  // Make posts clickable
  makePostsClickable();
  
  // Close modal when clicking outside
  $(document).on('click', '#postModal .pearl-modal-backdrop', function() {
    closePostModal();
  });
  
  // Close modal with Escape key
  $(document).on('keydown', function(e) {
    if (e.key === 'Escape' && $('#postModal').is(':visible')) {
      closePostModal();
    }
  });
  
  // Initialize comment character counter
  $('#modalCommentInput').on('input', updateCommentCharCount);
  
  console.log('Post modal functionality initialized');
}


window.reportPost = function(postId) {
  console.log('Reporting post:', postId);
  showToast('Report feature coming soon!', 'info');
};

// Open image in full-screen modal
window.openImageModal = function(imageUrl) {
  if (!imageUrl) return;
  
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      imageUrl: imageUrl,
      imageAlt: 'Post image',
      showConfirmButton: false,
      showCloseButton: true,
      background: 'rgba(0, 0, 0, 0.9)',
      backdrop: 'rgba(0, 0, 0, 0.8)',
      customClass: {
        image: 'img-fluid',
        popup: 'image-modal-popup'
      },
      width: 'auto',
      padding: '20px'
    });
  } else {
    // Fallback: open image in new tab
    window.open(imageUrl, '_blank');
  }
};

// Logout function
window.logout = function() {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Logout',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        performLogout();
      }
    });
  } else {
    // Fallback to regular confirm if SweetAlert2 is not available
    if (confirm("Are you sure you want to logout?")) {
      performLogout();
    }
  }
}

function performLogout() {
  fetch("/api/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showToast('Logging out...', 'success');
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      } else {
        showError("Failed to logout");
      }
    })
    .catch(() => {
      window.location.href = "/login";
    });
}

/* =====================================================
   WALLET MODAL FUNCTIONS
   ===================================================== */

// Make functions globally accessible
window.openSendModal = function() {
  const modal = document.getElementById('sendModal');
  if (modal) {
    modal.style.display = 'flex';
    // Reset form
    document.getElementById('sendRecipientInput').value = '';
    document.getElementById('sendAmountInput').value = '';
    // Update balance display
    document.getElementById('sendBalanceAmount').textContent = (currentUser?.pearl || 0).toLocaleString();
  }
}

// Adds a utility function for generating a wallet address if missing
function generateWalletAddressForUser() {
  // Only proceed if the user is loaded and doesn't have a wallet address
  if (!currentUser || currentUser.wallet_address) return;
  
  // Generate temporary address format for display purposes
  const tempAddress = `pearl:${currentUser.id || 'user'}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
  
  // Simulate API call to generate a wallet address
  setTimeout(() => {
    // Update current user object
    if (currentUser) {
      currentUser.wallet_address = tempAddress;
      
      // Update the display if the receive modal is open
      const receiveModal = document.getElementById('receiveModal');
      if (receiveModal && receiveModal.style.display === 'flex') {
        document.getElementById('receiveAddressInput').value = tempAddress;
        generateQRCode(tempAddress);
      }
    }
  }, 1000);
  
  return tempAddress;
}

window.openReceiveModal = function() {
  const modal = document.getElementById('receiveModal');
  if (modal) {
    modal.style.display = 'flex';
    
    // Display loading state first
    showQRCodeLoadingState();
    
    // Get wallet address - use wallet_address if available, otherwise generate one
    let walletAddress = currentUser?.wallet_address;
    
    // Fallback: if no wallet address, create a temporary one or show error
    if (!walletAddress) {
      console.warn('User has no wallet address, attempting to generate one...');
      // Try to generate a wallet address for the user
      walletAddress = generateWalletAddressForUser() || 'pearl:generating...';
    }
    
    // Update address display
    document.getElementById('receiveAddressInput').value = walletAddress || 'pearl:loading...';
    
    // Check if QRCode library is available
    if (typeof QRCode === 'undefined') {
      console.warn('QRCode library not available, attempting to load fallback...');
      window.loadQRCodeFallback();
    } else {
      // Generate QR code only if we have a valid address
      if (walletAddress && walletAddress !== 'pearl:generating...' && walletAddress !== 'pearl:loading...') {
        setTimeout(() => generateQRCode(walletAddress), 500); // Small delay to ensure DOM is ready
      }
    }
  }
}

// Function to generate QR code
function showQRCodeLoadingState() {
  const qrcodeContainer = document.getElementById('qrcodeContainer');
  if (qrcodeContainer) {
    qrcodeContainer.innerHTML = `
      <div class="loading-spinner mb-3">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #007bff;"></i>
        <p class="mt-2 text-muted">Generating QR code...</p>
      </div>
    `;
  }
}

function generateQRCode(text) {
  const qrcodeContainer = document.getElementById('qrcodeContainer');
  
  if (!qrcodeContainer) {
    console.error('QR code container not found');
    return;
  }
  
  // Clear any existing content
  qrcodeContainer.innerHTML = '';
  
  // Check if QRCode library is available
  if (typeof QRCode === 'undefined') {
    console.error('QRCode library not loaded');
    qrcodeContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        QR Code library failed to load. Please try refreshing the page.
      </div>
      <button class="btn btn-primary mt-3" onclick="window.loadQRCodeFallback()">Try Loading QR Library Again</button>
    `;
    return;
  }
  
  try {
    // Try different QR code generation methods based on library version
    if (typeof QRCode.toCanvas === 'function') {
      // For qrcode@1.5.3 library (node-qrcode)
      // Create QR code with transparent background so we can apply rainbow gradient       
      QRCode.toCanvas(text, {
        width: 200,
        height: 200,
        margin: 2,
        color: {
          dark: '#FFFFFF',  // White foreground for rainbow background
          light: 'rgba(0,0,0,0)'  // Transparent background
        },
        errorCorrectionLevel: 'M'
      }, function (error, canvas) {
      if (error) {
        console.error('QR Code generation error:', error);
        qrcodeContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Failed to generate QR code. Please try again.
          </div>
        `;
        return;
      }
      
      // Create rainbow gradient background
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = 200;
      bgCanvas.height = 200;
      const bgCtx = bgCanvas.getContext('2d');
      
      // Create rainbow gradient
      const gradient = bgCtx.createLinearGradient(0, 0, 200, 200);
      gradient.addColorStop(0, '#ff0080');
      gradient.addColorStop(0.14, '#ff8c00');
      gradient.addColorStop(0.28, '#ffd700');
      gradient.addColorStop(0.42, '#32cd32');
      gradient.addColorStop(0.57, '#00bfff');
      gradient.addColorStop(0.71, '#8a2be2');
      gradient.addColorStop(0.85, '#ff1493');
      gradient.addColorStop(1, '#ff0080');
      
      bgCtx.fillStyle = gradient;
      bgCtx.fillRect(0, 0, 200, 200);
      
      // Apply QR code pattern over rainbow background
      bgCtx.globalCompositeOperation = 'multiply';
      bgCtx.drawImage(canvas, 0, 0);
      
      // Reset composite operation and draw white QR code
      bgCtx.globalCompositeOperation = 'screen';
      bgCtx.drawImage(canvas, 0, 0);
      
      // Style the canvas
      bgCanvas.style.borderRadius = '12px';
      bgCanvas.style.boxShadow = '0 4px 20px rgba(0,123,255,0.3)';
      
      // Create wrapper with rainbow border styling
      const qrWrapper = document.createElement('div');
      qrWrapper.className = 'qr-wrapper';
      
      // Add Pearl Verse logo overlay
      const logoOverlay = document.createElement('div');
      logoOverlay.className = 'pearl-logo-overlay';
      logoOverlay.innerHTML = '<i class="fas fa-gem"></i>';
      
      qrWrapper.appendChild(bgCanvas);
      qrWrapper.appendChild(logoOverlay);
      qrcodeContainer.appendChild(qrWrapper);
    });
    } else if (typeof QRCode === 'function') {
      // For qrcodejs library (alternative fallback)
      try {
        qrcodeContainer.innerHTML = '';
        
        // Create wrapper with rainbow styling
        const qrWrapper = document.createElement('div');
        qrWrapper.className = 'qr-wrapper';
        
        // Create container for QR code
        const qrContainer = document.createElement('div');
        qrContainer.id = 'qrcode-element';
        qrContainer.style.background = 'linear-gradient(45deg, #ff0080 0%, #ff8c00 14%, #ffd700 28%, #32cd32 42%, #00bfff 57%, #8a2be2 71%, #ff1493 85%, #ff0080 100%)';
        qrContainer.style.padding = '10px';
        qrContainer.style.borderRadius = '12px';
        qrWrapper.appendChild(qrContainer);
        qrcodeContainer.appendChild(qrWrapper);
        
        // Generate QR code with qrcodejs with white color for visibility on rainbow background
        new QRCode(qrContainer, {
          text: text,
          width: 180,
          height: 180,
          colorDark: '#FFFFFF',
          colorLight: 'rgba(0,0,0,0)',
          correctLevel: QRCode.CorrectLevel.M
        });
        
        // Add Pearl Verse logo overlay
        const logoOverlay = document.createElement('div');
        logoOverlay.className = 'pearl-logo-overlay';
        logoOverlay.innerHTML = '<i class="fas fa-gem"></i>';
        qrWrapper.appendChild(logoOverlay);
      } catch (innerError) {
        console.error('Error generating QR code with qrcodejs:', innerError);
        throw innerError;
      }
    } else {
      throw new Error('No compatible QR code generation method found');
    }
  } catch (error) {
    console.error('QR Code generation error:', error);
    qrcodeContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Failed to generate QR code. Please try again.
      </div>
    `;
  }
}

window.openTopUpModal = function() {
  showToast('Top Up feature coming soon!', 'info');
}

window.openWatchAdsModal = function() {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Watch Ads to Earn Pearls',
      html: `
        <div class="text-center mb-4">
          <i class="fas fa-video" style="font-size: 48px; color: #ffc107;"></i>
          <h5 class="mt-3">Earn Pearls by Watching Ads</h5>
        </div>
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded">
            <div>
              <strong>Short Ad (30s)</strong><br>
              <small class="text-muted">Earn 50 pearls</small>
            </div>
            <button class="btn btn-primary btn-sm" onclick="watchAd('short')">
              Watch Now
            </button>
          </div>
        </div>
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded">
            <div>
              <strong>Long Ad (60s)</strong><br>
              <small class="text-muted">Earn 100 pearls</small>
            </div>
            <button class="btn btn-primary btn-sm" onclick="watchAd('long')">
              Watch Now
            </button>
          </div>
        </div>
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          Watch ads to earn pearls instantly!
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#6c757d'
    });
  } else {
    alert('Watch Ads feature coming soon!');
  }
}

// Close modal functions
window.closeSendModal = function() {
  const modal = document.getElementById('sendModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

window.closeReceiveModal = function() {
  const modal = document.getElementById('receiveModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Function to refresh user balance across all UI elements
function refreshUserBalance() {
  return loadUserProfile().then((user) => {
    // Update the currentUser object with fresh data
    currentUser = user;
    
    // Update all balance displays
    updateUserDisplay(user);
    
    // Also refresh wallet stats if we're on the wallet tab
    loadWalletStats();
    
    console.log('User balance refreshed across all UI elements');
    return user;
  }).catch(error => {
    console.error('Error refreshing user balance:', error);
    // Fallback: just reload wallet stats
    loadWalletStats();
  });
}

// Send pearls function
window.sendPearls = function() {
  const recipient = document.getElementById('sendRecipientInput').value.trim();
  const amount = parseInt(document.getElementById('sendAmountInput').value);
  
  // Validate input
  if (!recipient) {
    showError('Please enter a recipient address');
    return;
  }
  if (!recipient.startsWith('pearl:')) {
    showError('Please enter a valid Pearl Verse address (starting with pearl:)');
    return;
  }
  if (!amount || amount < 1) {
    showError('Please enter a valid amount');
    return;
  }
  if (amount > (currentUser?.pearl || 0)) {
    showError('Insufficient pearls');
    return;
  }
  
  // Send request
  const data = { recipient, amount, message: '' };
  
  fetch('/api/wallet/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      showSuccess(`Successfully sent ${data.amount} pearls to ${data.recipient}`);
      closeSendModal();
      
      // Refresh user balance across all UI elements
      refreshUserBalance().then(() => {
        // Also refresh transaction history
        loadTransactionHistory();
      });
    } else {
      showError(result.message || 'Failed to send pearls');
    }
  })
  .catch(error => {
    console.error('Error sending pearls:', error);
    showError('Network error. Please try again.');
  });
}

// Copy receive address function
window.copyReceiveAddress = function() {
  const addressInput = document.getElementById('receiveAddressInput');
  if (addressInput) {
    addressInput.select();
    document.execCommand('copy');
    showSuccess('Address copied to clipboard!');
  }
}

// Download QR Code function
window.downloadQRCode = function() {
  const qrcodeContainer = document.getElementById('qrcodeContainer');
  const receiveAddress = document.getElementById('receiveAddressInput')?.value;
  
  if (!qrcodeContainer) {
    showError('QR code not found');
    return;
  }
  
  // Look for canvas element (from qrcode library)
  let canvas = qrcodeContainer.querySelector('canvas');
  
  if (!canvas) {
    // If no canvas found, try to find the QR code in a wrapper
    const qrWrapper = qrcodeContainer.querySelector('.qr-wrapper canvas');
    if (qrWrapper) {
      canvas = qrWrapper;
    }
  }
  
  if (canvas) {
    // Create download link
    const link = document.createElement('a');
    link.download = `pearl-verse-qr-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('QR code downloaded successfully!');
  } else {
    // Fallback: create a new QR code for download
    if (receiveAddress && receiveAddress !== 'pearl:loading...' && receiveAddress !== 'pearl:generating...') {
      try {
        // Create a temporary canvas for download
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 300;
        tempCanvas.height = 300;
        
        if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
          QRCode.toCanvas(tempCanvas, receiveAddress, {
            width: 300,
            height: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          }, function (error) {
            if (error) {
              console.error('QR Code generation error:', error);
              showError('Failed to generate QR code for download');
              return;
            }
            
            // Create download link
            const link = document.createElement('a');
            link.download = `pearl-verse-qr-${Date.now()}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showSuccess('QR code downloaded successfully!');
          });
        } else {
          showError('QR code library not available for download');
        }
      } catch (error) {
        console.error('Error creating QR code for download:', error);
        showError('Failed to create QR code for download');
      }
    } else {
      showError('No valid address available for QR code download');
    }
  }
}

// Amount setter helper functions for new send modal
window.setSendAmount = function(amount) {
  const amountInput = document.getElementById('sendAmountInput');
  if (amountInput) {
    const maxAmount = currentUser?.pearl || 0;
    const finalAmount = amount > maxAmount ? maxAmount : amount;
    amountInput.value = finalAmount;
  }
}

window.setSendMaxAmount = function() {
  const amountInput = document.getElementById('sendAmountInput');
  if (amountInput) {
    const maxAmount = currentUser?.pearl || 0;
    amountInput.value = maxAmount;
  }
}

window.selectPackage = function(pearls, price) {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Confirm Purchase',
      text: `Buy ${pearls.toLocaleString()} pearls for $${price.toFixed(2)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Buy Now',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        showToast('Payment processing coming soon!', 'info');
      }
    });
  } else {
    alert('Payment processing coming soon!');
  }
}

// Helper functions for send modal
window.setAmount = function(amount) {
  try {
    const amountInput = document.getElementById('amountInput');
    if (amountInput) {
      const maxAmount = currentUser?.pearl || 0;
      // If the requested amount is higher than user's balance, set to max amount
      const finalAmount = amount > maxAmount ? maxAmount : amount;
      amountInput.value = finalAmount;
      
      // Show a notification if the amount was adjusted
      if (amount > maxAmount) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'info',
            title: 'Amount Adjusted',
            text: `You only have ${maxAmount} pearls. Amount set to maximum available.`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            background: '#2d3748',
            color: '#ffffff'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in setAmount:', error);
    // Don't let errors close the modal
  }
};

window.setMaxAmount = function() {
  try {
    const amountInput = document.getElementById('amountInput');
    if (amountInput) {
      const maxAmount = currentUser?.pearl || 0;
      amountInput.value = maxAmount;
    }
  } catch (error) {
    console.error('Error in setMaxAmount:', error);
    // Don't let errors close the modal
  }
};

window.openQRScanner = function() {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'QR Code Scanner',
      html: `
        <div class="text-center mb-4">
          <div class="qr-scanner-placeholder bg-light p-4 rounded d-inline-block">
            <i class="fas fa-camera" style="font-size: 100px; color: #ccc;"></i>
          </div>
          <p class="mt-3 text-muted">Camera access required for QR scanning</p>
        </div>
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>
          QR Code scanning feature is coming soon!
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#6c757d'
    });
  } else {
    alert('QR Code scanning feature is coming soon!');
  }
};

window.watchAd = function(type) {
  const pearls = type === 'short' ? 50 : 100;
  const duration = type === 'short' ? 30 : 60;
  
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Watching Ad...',
      html: `
        <div class="text-center">
          <i class="fas fa-video fa-spin" style="font-size: 48px; color: #ffc107;"></i>
          <p class="mt-3">Please wait ${duration} seconds...</p>
          <div class="progress mt-3">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
          </div>
        </div>
      `,
      allowOutsideClick: false,
      didOpen: () => {
        // Simulate ad watching progress
        let progress = 0;
        const progressBar = Swal.getHtmlContainer().querySelector('.progress-bar');
        const interval = setInterval(() => {
          progress += 2;
          progressBar.style.width = progress + '%';
          if (progress >= 100) {
            clearInterval(interval);
            // Simulate earning pearls
            setTimeout(() => {
              Swal.fire({
                icon: 'success',
                title: 'Ad Completed!',
                text: `You earned ${pearls} pearls!`,
                confirmButtonColor: '#28a745'
              });
              // Refresh wallet stats
              loadWalletStats();
            }, 500);
          }
        }, duration * 10);
      }
    });
  } else {
    alert(`Watching ${type} ad... You will earn ${pearls} pearls!`);
  }
}

/* =====================================================
   CREATE POST MODAL FUNCTIONS
   ===================================================== */

// Global variables for image upload
let selectedImages = [];

// Open create post modal
window.openCreatePostModal = function() {
  const modal = document.getElementById('createPostModal');
  if (modal) {
    modal.style.display = 'flex';
    
    // Reset form
    document.getElementById('createPostContent').value = '';
    selectedImages = [];
    
    // Update user info
    if (currentUser) {
      const userNameEl = document.getElementById('createPostUserName');
      const userAvatarEl = document.getElementById('createPostAvatar');
      
      if (userNameEl) {
        userNameEl.textContent = `${currentUser.first_name} ${currentUser.last_name}`;
      }
      
      if (userAvatarEl) {
        const initials = `${currentUser.first_name.charAt(0)}${currentUser.last_name.charAt(0)}`;
        userAvatarEl.textContent = initials;
      }
    }
    
    // Reset image upload area
    resetImageUploadArea();
    
    // Update character count
    updateCreatePostCharCount();
    
    // Focus on content textarea
    setTimeout(() => {
      document.getElementById('createPostContent').focus();
    }, 300);
  }
}

// Close create post modal
window.closeCreatePostModal = function() {
  const modal = document.getElementById('createPostModal');
  if (modal) {
    modal.style.display = 'none';
    
    // Clear any selected images
    selectedImages = [];
    resetImageUploadArea();
  }
}

// Update character count for post content
window.updateCreatePostCharCount = function() {
  const textarea = document.getElementById('createPostContent');
  const countEl = document.getElementById('createPostCharCount');
  
  if (textarea && countEl) {
    const currentLength = textarea.value.length;
    countEl.textContent = currentLength;
    
    // Change color based on length
    if (currentLength > 900) {
      countEl.style.color = '#dc3545'; // red
    } else if (currentLength > 750) {
      countEl.style.color = '#ffc107'; // yellow
    } else {
      countEl.style.color = '#6c757d'; // muted
    }
  }
}

// Auto-update character count when typing
document.addEventListener('DOMContentLoaded', function() {
  const textarea = document.getElementById('createPostContent');
  if (textarea) {
    textarea.addEventListener('input', updateCreatePostCharCount);
  }
});

// Submit create post (now uses the enhanced version with metadata)
window.submitCreatePost = function() {
  // Use the enhanced version that includes feeling and location
  submitCreatePostWithMetadata();
}

/* =====================================================
   IMAGE UPLOAD FUNCTIONS
   ===================================================== */

// Trigger image upload
window.triggerImageUpload = function() {
  const fileInput = document.getElementById('postImageInput');
  if (fileInput) {
    fileInput.click();
  }
}

// Handle image upload
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('postImageInput');
  const uploadArea = document.getElementById('imageUploadArea');
  
  if (fileInput) {
    fileInput.addEventListener('change', handleImageSelection);
  }
  
  if (uploadArea) {
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (files.length > 0) {
        addImagesToSelection(files);
      }
    });
  }
});

// Handle image file selection
function handleImageSelection(event) {
  const files = Array.from(event.target.files).filter(file => 
    file.type.startsWith('image/')
  );
  
  if (files.length > 0) {
    addImagesToSelection(files);
  }
}

// Add images to selection
function addImagesToSelection(files) {
  // Limit total images to 4
  const remainingSlots = 4 - selectedImages.length;
  const filesToAdd = files.slice(0, remainingSlots);
  
  if (filesToAdd.length < files.length) {
    showToast('Maximum 4 images allowed per post', 'warning');
  }
  
  filesToAdd.forEach(file => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showError(`Image "${file.name}" is too large. Maximum size is 10MB.`);
      return;
    }
    
    selectedImages.push(file);
  });
  
  updateImagePreviews();
}

// Update image previews
function updateImagePreviews() {
  const previewContainer = document.getElementById('imagePreviewsContainer');
  const uploadArea = document.getElementById('imageUploadArea');
  
  if (!previewContainer) return;
  
  // Clear existing previews
  previewContainer.innerHTML = '';
  
  if (selectedImages.length === 0) {
    uploadArea.style.display = 'block';
    return;
  }
  
  // Hide upload area if we have images
  uploadArea.style.display = 'none';
  
  // Create previews
  selectedImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const previewDiv = document.createElement('div');
      previewDiv.className = 'image-preview';
      previewDiv.innerHTML = `
        <img src="${e.target.result}" alt="Preview ${index + 1}" class="preview-image">
        <button type="button" class="remove-image-btn" onclick="removeImage(${index})">
          <i class="fas fa-times"></i>
        </button>
        <div class="image-info">
          <small class="text-muted">${file.name}</small>
        </div>
      `;
      previewContainer.appendChild(previewDiv);
    };
    reader.readAsDataURL(file);
  });
  
  // Show add more button if less than 4 images
  if (selectedImages.length < 4) {
    const addMoreDiv = document.createElement('div');
    addMoreDiv.className = 'image-preview add-more';
    addMoreDiv.innerHTML = `
      <div class="add-more-content" onclick="triggerImageUpload()">
        <i class="fas fa-plus"></i>
        <small>Add More</small>
      </div>
    `;
    previewContainer.appendChild(addMoreDiv);
  }
}

// Remove image from selection
window.removeImage = function(index) {
  selectedImages.splice(index, 1);
  updateImagePreviews();
}

// Reset image upload area
function resetImageUploadArea() {
  const previewContainer = document.getElementById('imagePreviewsContainer');
  const uploadArea = document.getElementById('imageUploadArea');
  const fileInput = document.getElementById('postImageInput');
  
  if (previewContainer) previewContainer.innerHTML = '';
  if (uploadArea) uploadArea.style.display = 'block';
  if (fileInput) fileInput.value = '';
  
  selectedImages = [];
}

/* =====================================================
   POST MODAL OPTION FUNCTIONS
   ===================================================== */

/* =====================================================
   FEELING AND LOCATION FUNCTIONS
   ===================================================== */

// Open feeling modal
window.openFeelingModal = function() {
  const modal = document.getElementById('feelingModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Close feeling modal
window.closeFeelingModal = function() {
  const modal = document.getElementById('feelingModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Select a feeling
window.selectFeeling = function(feelingEmoji, feelingId) {
  selectedFeeling = {
    id: feelingId,
    emoji: feelingEmoji,
    text: capitalizeFirst(feelingId)
  };
  
  console.log('Selected feeling:', selectedFeeling);
  
  // Update the post modal display
  updateFeelingDisplay();
  
  // Close the feeling modal
  closeFeelingModal();
  
  showToast(`Feeling "${selectedFeeling.text}" selected!`, 'success');
}

// Helper function to capitalize first letter
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Update feeling display in post modal
function updateFeelingDisplay() {
  const feelingSection = document.getElementById('feelingSection');
  const feelingDisplay = document.getElementById('feelingDisplay');
  const feelingEmoji = document.getElementById('selectedFeelingEmoji');
  const feelingText = document.getElementById('selectedFeelingText');
  
  // Only proceed if the required elements exist
  if (!feelingSection || !feelingDisplay) {
    // Elements don't exist yet, exit gracefully
    return;
  }
  
  if (selectedFeeling) {
    // Show the feeling section and display
    feelingSection.style.display = 'block';
    feelingDisplay.style.display = 'block';
    
    // Update the content
    if (feelingEmoji) {
      feelingEmoji.textContent = selectedFeeling.emoji;
    }
    if (feelingText) {
      feelingText.textContent = `feeling ${selectedFeeling.text.toLowerCase()}`;
    }
  } else {
    // Hide the feeling section
    feelingSection.style.display = 'none';
  }
}

// Remove selected feeling
window.removeFeeling = function() {
  selectedFeeling = null;
  updateFeelingDisplay();
  showToast('Feeling removed', 'info');
}

// Get feeling emoji by ID
function getFeelingEmoji(feelingId) {
  const emojiMap = {
    'happy': '😊',
    'loved': '🥰',
    'excited': '🤩',
    'grateful': '🙏',
    'blessed': '🌟',
    'cool': '😎',
    'funny': '😂',
    'surprised': '😮',
    'thinking': '🤔',
    'sleepy': '😴',
    'hungry': '🍕',
    'working': '💼',
    'traveling': '✈️',
    'celebrating': '🎉',
    'relaxed': '😌',
    'motivated': '💪',
    'creative': '🎨',
    'nostalgic': '🥺'
  };
  return emojiMap[feelingId] || '😊';
}

// Open location modal
window.openLocationModal = function() {
  const modal = document.getElementById('locationModal');
  if (modal) {
    modal.style.display = 'flex';
    
    // Focus on search input
    setTimeout(() => {
      const searchInput = document.getElementById('locationSearchInput');
      if (searchInput) {
        searchInput.focus();
      }
    }, 300);
  }
}

// Close location modal
window.closeLocationModal = function() {
  const modal = document.getElementById('locationModal');
  if (modal) {
    modal.style.display = 'none';
    
    // Clear search input
    const searchInput = document.getElementById('locationSearchInput');
    if (searchInput) {
      searchInput.value = '';
    }
    clearLocationSearch();
  }
}

// Search locations (placeholder implementation)
window.searchLocations = function() {
  const searchInput = document.getElementById('locationSearchInput');
  const searchResults = document.getElementById('locationSearchResults');
  
  if (!searchInput || !searchResults) return;
  
  const query = searchInput.value.trim();
  
  if (query.length < 2) {
    clearLocationSearch();
    return;
  }
  
  // Show loading state
  searchResults.innerHTML = `
    <div class="location-result loading">
      <i class="fas fa-spinner fa-spin me-2"></i>
      Searching locations...
    </div>
  `;
  searchResults.style.display = 'block';
  
  // Simulate API call with fake results
  setTimeout(() => {
    const fakeResults = [
      { name: `${query} City, State`, type: 'city' },
      { name: `${query} Beach, FL`, type: 'landmark' },
      { name: `${query} Mall`, type: 'shopping' },
      { name: `${query} Restaurant`, type: 'restaurant' },
      { name: `${query} Park`, type: 'park' }
    ];
    
    displayLocationResults(fakeResults.slice(0, 3)); // Show first 3 results
  }, 800);
}

// Display location search results
function displayLocationResults(results) {
  const searchResults = document.getElementById('locationSearchResults');
  if (!searchResults) return;
  
  if (results.length === 0) {
    searchResults.innerHTML = `
      <div class="location-result no-results">
        <i class="fas fa-search me-2"></i>
        No locations found
      </div>
    `;
    return;
  }
  
  const resultsHTML = results.map(location => {
    const icon = getLocationIcon(location.type);
    return `
      <div class="location-result" onclick="selectLocation('${location.name}', '${location.type}')">
        <i class="${icon} me-2"></i>
        <span>${location.name}</span>
      </div>
    `;
  }).join('');
  
  searchResults.innerHTML = resultsHTML;
}

// Get location icon by type
function getLocationIcon(type) {
  const iconMap = {
    'city': 'fas fa-city',
    'landmark': 'fas fa-landmark',
    'shopping': 'fas fa-shopping-bag',
    'restaurant': 'fas fa-utensils',
    'park': 'fas fa-tree',
    'default': 'fas fa-map-marker-alt'
  };
  return iconMap[type] || iconMap['default'];
}

// Clear location search
function clearLocationSearch() {
  const searchResults = document.getElementById('locationSearchResults');
  if (searchResults) {
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
  }
}

// Select a location (from search results or popular locations)
window.selectLocation = function(locationName, locationType = 'custom') {
  selectedLocation = {
    name: locationName,
    type: locationType
  };
  
  // Update the post modal display
  updateLocationDisplay();
  
  // Close the location modal
  closeLocationModal();
  
  showToast(`Location "${locationName}" selected!`, 'success');
}

// Update location display in post modal
function updateLocationDisplay() {
  const locationDisplay = document.getElementById('selectedLocationDisplay');
  const locationIcon = document.getElementById('locationIcon');
  const locationText = document.getElementById('locationText');
  const addLocationBtn = document.getElementById('addLocationBtn');
  
  // Only proceed if the required elements exist
  if (!locationDisplay) {
    // Elements don't exist yet, exit gracefully
    return;
  }
  
  if (selectedLocation && locationDisplay) {
    // Show the location display and hide the add button
    locationDisplay.style.display = 'block';
    if (addLocationBtn) addLocationBtn.style.display = 'none';
    
    // Update the content
    if (locationIcon) {
      locationIcon.className = getLocationIcon(selectedLocation.type);
    }
    if (locationText) {
      locationText.textContent = selectedLocation.name;
    }
  } else {
    // Hide the location display and show the add button
    locationDisplay.style.display = 'none';
    if (addLocationBtn) addLocationBtn.style.display = 'flex';
  }
}

// Remove selected location
window.removeLocation = function() {
  selectedLocation = null;
  updateLocationDisplay();
  showToast('Location removed', 'info');
}

// Use current location (placeholder)
window.useCurrentLocation = function() {
  if (navigator.geolocation) {
    showToast('Getting your location...', 'info');
    
    navigator.geolocation.getCurrentPosition(
      function(position) {
        // In a real app, you would reverse geocode these coordinates
        const lat = position.coords.latitude.toFixed(4);
        const lng = position.coords.longitude.toFixed(4);
        const locationName = `Current Location (${lat}, ${lng})`;
        
        selectLocation(locationName, 'current');
      },
      function(error) {
        console.error('Geolocation error:', error);
        showError('Unable to get your current location. Please check your browser permissions.');
      },
      {
        timeout: 10000,
        enableHighAccuracy: false
      }
    );
  } else {
    showError('Geolocation is not supported by your browser.');
  }
}

// Updated post creation to include feeling and location
window.submitCreatePostWithMetadata = function() {
  const content = document.getElementById('createPostContent').value.trim();
  
  // Validate content
  if (!content) {
    showError('Please enter some content for your post.');
    return;
  }
  
  if (content.length > 1000) {
    showError('Post content must be 1000 characters or less.');
    return;
  }
  
  // Show loading state
  const submitBtn = document.getElementById('createPostBtn');
  const originalBtnContent = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
  
  // Prepare form data
  const formData = new FormData();
  formData.append('content', content);
  
  // Add feeling if selected
  if (selectedFeeling) {
    formData.append('feeling_id', selectedFeeling.id);
    formData.append('feeling_text', selectedFeeling.text);
  }
  
  // Add location if selected
  if (selectedLocation) {
    formData.append('location_name', selectedLocation.name);
    formData.append('location_type', selectedLocation.type);
  }
  
  // Add selected images
  selectedImages.forEach((imageFile, index) => {
    formData.append(`image_${index}`, imageFile);
  });
  
  // Submit post
  fetch('/api/posts', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      showSuccess(result.message || 'Post created successfully!');
      closeCreatePostModal();
      
      // Reset feeling and location selections
      selectedFeeling = null;
      selectedLocation = null;
      updateFeelingDisplay();
      updateLocationDisplay();
      
      // Refresh posts feed
      refreshPostsFeed();
      
      // Update user stats if returned
      if (result.exp_gained) {
        loadUserProfile();
      }
    } else {
      showError(result.message || 'Failed to create post. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error creating post:', error);
    showError('Network error. Please try again.');
  })
  .finally(() => {
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnContent;
  });
}

// Update the post modal initialization
function initPostModalExtended() {
  // Initialize feeling and location displays on page load
  updateFeelingDisplay();
  updateLocationDisplay();
  
  // Add event listeners for search input
  const locationSearchInput = document.getElementById('locationSearchInput');
  if (locationSearchInput) {
    // Debounced search
    let searchTimeout;
    locationSearchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(searchLocations, 300);
    });
    
    // Clear search on focus out
    locationSearchInput.addEventListener('blur', function() {
      setTimeout(clearLocationSearch, 200); // Delay to allow clicking on results
    });
  }
  
  // Close modals when clicking outside
  document.addEventListener('click', function(e) {
    // Close feeling modal
    const feelingModal = document.getElementById('feelingModal');
    if (feelingModal && e.target === feelingModal) {
      closeFeelingModal();
    }
    
    // Close location modal
    const locationModal = document.getElementById('locationModal');
    if (locationModal && e.target === locationModal) {
      closeLocationModal();
    }
  });
  
  // Close modals with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (document.getElementById('feelingModal').style.display === 'flex') {
        closeFeelingModal();
      }
      if (document.getElementById('locationModal').style.display === 'flex') {
        closeLocationModal();
      }
    }
  });
}

// Call the extended initialization
document.addEventListener('DOMContentLoaded', function() {
  // Initialize extended post modal functionality
  setTimeout(initPostModalExtended, 100);
});

// Legacy functions for compatibility
window.addFeeling = function() {
  openFeelingModal();
}

window.addLocation = function() {
  openLocationModal();
}

// Add tag people to post (placeholder)
window.addTag = function() {
  showToast('Tag people feature coming soon!', 'info');
}

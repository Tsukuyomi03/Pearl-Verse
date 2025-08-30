/**
 * Pearl Dashboard JavaScript
 * Handles tab switching, profile interactions, and dynamic content loading
 */

class PearlDashboard {
  constructor() {
    this.currentTab = "feed";
    this.userData = null;
    this.init();
  }

  init() {
    // Initialize tab functionality
    this.initTabs();

    // Load user data
    this.loadUserData();

    // Initialize event listeners
    this.initEventListeners();

    // Initialize modals
    this.initModals();

    // Load initial content
    this.loadTabContent("feed");
  }

  // Tab Management
  initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    // Update active tab button
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");

    // Update active tab pane
    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.classList.remove("active");
    });
    document.getElementById(`${tabId}-tab`).classList.add("active");

    // Load tab content
    this.loadTabContent(tabId);
    this.currentTab = tabId;
  }

  // Load tab-specific content
  loadTabContent(tabId) {
    switch (tabId) {
      case "feed":
        this.loadFeedContent();
        this.loadActiveSocials();
        break;
      case "wallet":
        this.loadWalletContent();
        break;
      case "info":
        this.loadInfoContent();
        break;
    }
  }

  // User Data Management
  async loadUserData() {
    try {
      const response = await fetch("/api/current-user");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.userData = data.user;
          this.updateProfileDisplay();
        } else {
          window.location.href = "/login";
        }
      } else {
        throw new Error("Failed to fetch user data");
      }
    } catch (error) {
      this.showError("Failed to load profile data");
    }
  }

  updateProfileDisplay() {
    if (!this.userData) return;

    // Update profile information using jQuery
    $("#display-name").text(`${this.userData.first_name} ${this.userData.last_name}`);
    $("#profile-bio").text(this.userData.bio || "Welcome to my Pearl Verse profile!");

    // Update stats using jQuery with smooth animation
    this.updateBalanceElements(this.userData.pearl);
    $("#level").text(this.userData.level);

    // Update info tab
    $("#info-full-name").text(`${this.userData.first_name} ${this.userData.last_name}`);
    $("#info-username").text(`@${this.userData.username}`);
    $("#info-email").text(this.userData.email);

    if (this.userData.created_at) {
      const memberSince = new Date(this.userData.created_at).toLocaleDateString();
      $("#info-member-since").text(memberSince);
    }
  }

  // Dynamic balance update with smooth animations using jQuery
  updateBalanceElements(newBalance, showAnimation = false) {
    const formattedBalance = this.formatNumber(newBalance);
    
    // All balance elements that need updating
    const balanceElements = [
      "#pearl-count",
      "#wallet-balance", 
      "#total-pearls",
      "#modal-balance"
    ];
    
    balanceElements.forEach(selector => {
      const $element = $(selector);
      if ($element.length) {
        if (showAnimation) {
          // Animate balance change
          $element.addClass('balance-updating');
          
          setTimeout(() => {
            $element.text(formattedBalance);
            $element.removeClass('balance-updating').addClass('balance-updated');
            
            // Remove animation class after animation completes
            setTimeout(() => {
              $element.removeClass('balance-updated');
            }, 1000);
          }, 200);
        } else {
          $element.text(formattedBalance);
        }
      }
    });
  }

  // Refresh specific sections of the UI
  async refreshWalletData() {
    try {
      // Show subtle loading indicator
      $("#wallet-balance").addClass('refreshing');
      
      // Reload user data
      const response = await fetch("/api/current-user");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const oldBalance = this.userData?.pearl || 0;
          const newBalance = data.user.pearl;
          
          this.userData = data.user;
          
          // Update balance with animation if it changed
          if (oldBalance !== newBalance) {
            this.updateBalanceElements(newBalance, true);
          } else {
            this.updateBalanceElements(newBalance, false);
          }
        }
      }
      
      // Refresh wallet stats
      await this.loadWalletStats();
      
      // Refresh daily claim status
      await this.loadDailyClaimStatus();
      
      // Refresh transaction history
      await this.loadTransactionHistory();
      
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    } finally {
      $("#wallet-balance").removeClass('refreshing');
    }
  }

  // Animate new transaction addition
  animateNewTransaction(transaction) {
    const transactionHtml = this.generateTransactionHtml(transaction);
    const $newTransaction = $(transactionHtml);
    
    // Add to top of transaction list with fade-in animation
    $newTransaction.hide().prependTo("#transaction-list").fadeIn(500);
    
    // Add highlight effect
    $newTransaction.addClass('new-transaction');
    setTimeout(() => {
      $newTransaction.removeClass('new-transaction');
    }, 3000);
  }

  // Generate transaction HTML (extracted for reuse)
  generateTransactionHtml(transaction) {
    const actualAmount = this.extractPearlAmountFromDescription(
      transaction.description,
      transaction.pearl_amount
    );
    
    return `
      <div class="transaction-item">
        <div class="transaction-icon">
          <i class="fas ${this.getTransactionIcon(transaction.transaction_type)}"></i>
        </div>
        <div class="transaction-details">
          <h5>${this.getTransactionTitle(transaction.transaction_type)}</h5>
          <p class="transaction-description">${this.cleanTransactionDescription(transaction.description)}</p>
          <p class="transaction-date">${this.formatTransactionDate(transaction.transaction_date || transaction.created_at)}</p>
        </div>
        <div class="transaction-amount ${actualAmount > 0 ? "positive" : "negative"}">
          ${actualAmount > 0 ? "+" : ""}${this.formatNumber(Math.abs(actualAmount))}
        </div>
      </div>
    `;
  }

  // Feed Content
  async loadFeedContent() {
    const feedContainer = document.getElementById("posts-feed");
    feedContainer.innerHTML = `
            <div class="loading-posts">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading your feed...</p>
            </div>
        `;

    // Simulate loading posts (replace with actual API call)
    setTimeout(() => {
      feedContainer.innerHTML = `
                <div class="post-card">
                    <div class="post-header">
                        <img src="/static/images/default-avatar.png" alt="Avatar" class="post-avatar">
                        <div class="post-info">
                            <h4>Welcome Post</h4>
                            <p class="post-time">Just now</p>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>Welcome to Pearl Verse! 🎮✨ Start your journey by claiming your daily rewards and connecting with friends!</p>
                    </div>
                    <div class="post-actions">
                        <button class="post-action">
                            <i class="fas fa-heart"></i>
                            Like
                        </button>
                        <button class="post-action">
                            <i class="fas fa-comment"></i>
                            Comment
                        </button>
                        <button class="post-action">
                            <i class="fas fa-share"></i>
                            Share
                        </button>
                    </div>
                </div>
            `;
    }, 1000);
  }

  async loadActiveSocials() {
    const socialsContainer = document.getElementById("active-socials");
    socialsContainer.innerHTML = `
            <div class="loading-posts" style="padding: 20px;">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading social platforms...</p>
            </div>
        `;

    try {
      const response = await fetch("/api/social-links", {
        method: "GET",
        credentials: "same-origin", // Ensure cookies are sent
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error("Invalid JSON response");
      }

      if (response.ok && data.success) {
        this.displayActiveSocialPlatforms(data.links || []);
      } else {
        // If not logged in or no data, show appropriate message
        if (data.message && data.message.includes("log in")) {
          this.displayLoginRequiredMessage();
        } else {
          this.displayActiveSocialPlatforms([]);
        }
      }
    } catch (error) {
      // Show error message instead of demo data
      socialsContainer.innerHTML = `
                <div class="no-socials">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading social links</p>
                    <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">${error.message}</p>
                </div>
            `;
    }
  }

  displayActiveSocials(friends) {
    const socialsContainer = document.getElementById("active-socials");

    // Filter only active/online friends
    const activeFriends = friends.filter(
      (friend) =>
        friend.is_active &&
        (friend.status === "online" || friend.status === "idle")
    );

    if (activeFriends.length === 0) {
      socialsContainer.innerHTML = `
                <div class="no-socials">
                    <i class="fas fa-user-friends"></i>
                    <p>No active friends online</p>
                </div>
            `;
      return;
    }

    const socialsHTML = activeFriends
      .map((friend) => {
        const timeAgo = this.getTimeAgo(friend.last_seen);
        const activity =
          friend.current_activity ||
          (friend.status === "online" ? "Online now" : `Last seen ${timeAgo}`);

        return `
                <div class="social-item" data-user-id="${friend.user_id}">
                    <div class="social-avatar">
                        ${
                          friend.avatar_url
                            ? `<img src="${friend.avatar_url}" alt="${friend.display_name}" class="mini-avatar">`
                            : `<div class="mini-avatar default-avatar">
                                <i class="fas fa-user"></i>
                            </div>`
                        }
                        <div class="social-status ${friend.status}"></div>
                    </div>
                    <div class="social-info">
                        <span class="social-name">${
                          friend.display_name || friend.username
                        }</span>
                        <span class="social-activity">${activity}</span>
                    </div>
                    <button class="social-action-btn" onclick="pearlDashboard.startChat('${
                      friend.user_id
                    }')">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            `;
      })
      .join("");

    socialsContainer.innerHTML = socialsHTML;
  }

  displayActiveSocialPlatforms(links) {
    const socialsContainer = document.getElementById("active-socials");

    // Filter only active social links
    const activeLinks = links.filter((link) => link.is_active);

    if (activeLinks.length === 0) {
      socialsContainer.innerHTML = `
                <div class="no-socials">
                    <i class="fas fa-link"></i>
                    <p>No active social platforms</p>
                    <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">Add social platforms in the Info tab</p>
                </div>
            `;
      return;
    }

    const socialsHTML = activeLinks
      .map((link) => {
        // Detect platform from URL if platform is generic (like 'website')
        const detectedPlatform =
          this.detectPlatformFromUrl(link.url) || link.platform;
        const platformIcon = this.getSocialPlatformIcon(detectedPlatform);
        const platformColor = this.getSocialPlatformColor(detectedPlatform);
        const lastUpdated = link.updated_at
          ? this.getTimeAgo(link.updated_at)
          : "Recently added";
        const platformName =
          link.platform_info?.name ||
          this.getPlatformDisplayName(detectedPlatform) ||
          link.platform;

        return `
                <div class="social-item" data-platform="${detectedPlatform}">
                    <div class="social-avatar">
                        <div class="mini-avatar platform-avatar" style="background: ${platformColor};">
                            <i class="${platformIcon}" style="color: white;"></i>
                        </div>
                        <div class="social-status online"></div>
                    </div>
                    <div class="social-info">
                        <span class="social-name">${platformName}</span>
                        <span class="social-activity">Active • ${lastUpdated}</span>
                    </div>
                    <button class="social-action-btn" onclick="pearlDashboard.openSocialPlatform('${link.url}')">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            `;
      })
      .join("");

    socialsContainer.innerHTML = socialsHTML;
  }

  displayLoginRequiredMessage() {
    const socialsContainer = document.getElementById("active-socials");
    socialsContainer.innerHTML = `
            <div class="no-socials">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Please log in to view social platforms</p>
            </div>
        `;
  }

  displayDemoSocialPlatforms() {
    // Demo data for social platforms - remove when API is ready
    const demoPlatforms = [
      {
        platform: "twitter",
        url: "https://twitter.com/yourhandle",
        is_active: true,
        platform_info: { name: "Twitter" },
        updated_at: new Date().toISOString(),
      },
    ];

    this.displayActiveSocialPlatforms(demoPlatforms);
  }

  displayDemoSocials() {
    // Demo data for testing - remove when API is ready
    const demoFriends = [
      {
        user_id: "demo1",
        username: "friend1",
        display_name: "Gaming Friend",
        status: "online",
        is_active: true,
        current_activity: "Playing Pearl Quest",
        last_seen: new Date().toISOString(),
      },
      {
        user_id: "demo2",
        username: "friend2",
        display_name: "Pearl Hunter",
        status: "online",
        is_active: true,
        current_activity: "Online now",
        last_seen: new Date().toISOString(),
      },
      {
        user_id: "demo3",
        username: "friend3",
        display_name: "Explorer",
        status: "idle",
        is_active: true,
        current_activity: null,
        last_seen: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
      },
    ];

    this.displayActiveSocials(demoFriends);
  }

  // Wallet Content
  async loadWalletContent() {
    if (!this.userData) return;

    // Update wallet balance
    document.getElementById("wallet-balance").textContent = this.formatNumber(
      this.userData.pearl
    );
    document.getElementById("wallet-address").textContent =
      this.userData.wallet_address || "pearl:0x...";

    // Update referral info in wallet
    document.getElementById("referral-code-wallet").textContent =
      this.userData.referral_code || "LOADING...";

    // Load wallet-specific data
    await this.loadWalletStats();
    await this.loadDailyClaimStatus();
    await this.loadTransactionHistory();
  }

  async loadWalletStats() {
    try {
      const response = await fetch("/api/wallet/stats");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update referral stats
          document.getElementById("referral-count-wallet").textContent =
            data.referral_count || 0;
          document.getElementById("referral-earnings").textContent =
            this.formatNumber(data.breakdown?.referral_bonuses || 0);
        }
      }
    } catch (error) {}
  }

  async loadDailyClaimStatus() {
    try {
      const response = await fetch("/api/daily-claim/status");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.displayDailyClaimGrid(data);
        }
      }
    } catch (error) {
      this.showDailyClaimError();
    }
  }

  displayDailyClaimGrid(claimData) {
    const claimGrid = document.getElementById("daily-claim-grid");
    const currentStreak = document.getElementById("current-streak");

    // Update streak display
    currentStreak.textContent = claimData.current_streak || 0;

    // Generate 7-day grid
    const claimHTML = claimData.claim_status
      .map((day, index) => {
        const dayNumber = index + 1;
        let statusClass = "claim-day";
        let buttonContent = "";
        let isClickable = false;

        if (day.claimed) {
          statusClass += " claimed";
          buttonContent = `
                    <i class="fas fa-check"></i>
                    <span class="day-number">Day ${dayNumber}</span>
                    <span class="reward-amount">${this.formatNumber(
                      day.reward
                    )} Pearls</span>
                `;
        } else if (day.can_claim) {
          statusClass += " available";
          isClickable = true;
          buttonContent = `
                    <i class="fas fa-gift"></i>
                    <span class="day-number">Day ${dayNumber}</span>
                    <span class="reward-amount">${this.formatNumber(
                      day.reward
                    )} Pearls</span>
                    <span class="claim-text">CLAIM NOW</span>
                `;
        } else {
          statusClass += " locked";
          buttonContent = `
                    <i class="fas fa-lock"></i>
                    <span class="day-number">Day ${dayNumber}</span>
                    <span class="reward-amount">${this.formatNumber(
                      day.reward
                    )} Pearls</span>
                `;
        }

        return `
                <button class="${statusClass}" ${
          isClickable
            ? `onclick="pearlDashboard.claimDailyReward(${dayNumber})"`
            : "disabled"
        }>
                    ${buttonContent}
                </button>
            `;
      })
      .join("");

    claimGrid.innerHTML = claimHTML;
  }

  showDailyClaimError() {
    const claimGrid = document.getElementById("daily-claim-grid");
    claimGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load daily claim status</p>
            </div>
        `;
  }

  async loadTransactionHistory(filter = "all", page = 1) {
    try {
      const params = new URLSearchParams({
        per_page: 10,
        page: page,
      });

      if (filter !== "all") {
        params.append("type", filter);
      }

      const response = await fetch(`/api/transaction-history?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (page === 1) {
            this.displayTransactionHistory(data.transactions);
          } else {
            this.appendTransactionHistory(data.transactions);
          }
          this.updateLoadMoreButton(data.pagination);
        }
      }
    } catch (error) {}
  }

  displayTransactionHistory(transactions) {
    const transactionList = document.getElementById("transaction-list");
    
    // Debug: Log transaction data to understand structure
    console.log('Transaction data received:', transactions);

    if (transactions.length === 0) {
      transactionList.innerHTML = `
                <div class="no-transactions">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions found</p>
                </div>
            `;
      return;
    }

    const transactionsHTML = transactions
      .map((transaction) => {
        // Extract the correct pearl amount from description if needed
        const actualAmount = this.extractPearlAmountFromDescription(
          transaction.description,
          transaction.pearl_amount
        );
        
        // Debug: Log individual transaction processing
        console.log('Processing transaction:', {
          description: transaction.description,
          original_amount: transaction.pearl_amount,
          extracted_amount: actualAmount,
          transaction_date: transaction.transaction_date,
          created_at: transaction.created_at,
          all_fields: Object.keys(transaction)
        });
        
        return `
            <div class="transaction-item">
                <div class="transaction-icon">
                    <i class="fas ${this.getTransactionIcon(
                      transaction.transaction_type
                    )}"></i>
                </div>
                <div class="transaction-details">
                    <h5>${this.getTransactionTitle(
                      transaction.transaction_type
                    )}</h5>
                    <p class="transaction-description">${this.cleanTransactionDescription(
                      transaction.description
                    )}</p>
                    <p class="transaction-date">${this.formatTransactionDate(
                      transaction.transaction_date || transaction.created_at
                    )}</p>
                </div>
                <div class="transaction-amount ${
                  actualAmount > 0 ? "positive" : "negative"
                }">
                    ${
                      actualAmount > 0 ? "+" : ""
                    }${this.formatNumber(Math.abs(actualAmount))}
                </div>
            </div>
        `;
      })
      .join("");

    transactionList.innerHTML = transactionsHTML;
  }

  appendTransactionHistory(transactions) {
    const transactionList = document.getElementById("transaction-list");

    const transactionsHTML = transactions
      .map((transaction) => {
        // Extract the correct pearl amount from description if needed
        const actualAmount = this.extractPearlAmountFromDescription(
          transaction.description,
          transaction.pearl_amount
        );
        
        return `
            <div class="transaction-item">
                <div class="transaction-icon">
                    <i class="fas ${this.getTransactionIcon(
                      transaction.transaction_type
                    )}"></i>
                </div>
                <div class="transaction-details">
                    <h5>${this.getTransactionTitle(
                      transaction.transaction_type
                    )}</h5>
                    <p class="transaction-description">${this.cleanTransactionDescription(
                      transaction.description
                    )}</p>
                    <p class="transaction-date">${this.formatTransactionDate(
                      transaction.transaction_date || transaction.created_at
                    )}</p>
                </div>
                <div class="transaction-amount ${
                  actualAmount > 0 ? "positive" : "negative"
                }">
                    ${
                      actualAmount > 0 ? "+" : ""
                    }${this.formatNumber(Math.abs(actualAmount))}
                </div>
            </div>
        `;
      })
      .join("");

    transactionList.insertAdjacentHTML("beforeend", transactionsHTML);
  }

  updateLoadMoreButton(pagination) {
    const loadMoreBtn = document.getElementById("load-more-transactions");
    const loadMoreSection = loadMoreBtn.parentElement;

    if (pagination.has_next) {
      loadMoreSection.style.display = "block";
      loadMoreBtn.onclick = () => this.loadMoreTransactions();
    } else {
      loadMoreSection.style.display = "none";
    }
  }

  loadMoreTransactions() {
    const filter = document.getElementById("transaction-filter").value;
    const currentPage = this.currentTransactionPage || 1;
    this.currentTransactionPage = currentPage + 1;
    this.loadTransactionHistory(filter, this.currentTransactionPage);
  }

    formatTransactionDate(dateString) {
        // Handle invalid or missing dates
        if (!dateString) {
            return 'Unknown date';
        }
        
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        // Format as readable date with time
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('en-US', options);
    }

  async loadTransactions() {
    try {
      const response = await fetch("/api/transaction-history?per_page=5");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.displayTransactions(data.transactions);
        }
      }
    } catch (error) {}
  }

  displayTransactions(transactions) {
    const transactionList = document.getElementById("transaction-list");

    if (transactions.length === 0) {
      transactionList.innerHTML = `
                <div class="no-transactions">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions yet. Start by claiming your daily reward!</p>
                </div>
            `;
      return;
    }

    const transactionHTML = transactions
      .map(
        (transaction) => `
            <div class="transaction-item">
                <div class="transaction-icon">
                    <i class="fas ${this.getTransactionIcon(
                      transaction.transaction_type
                    )}"></i>
                </div>
                <div class="transaction-details">
                    <h5>${this.getTransactionTitle(
                      transaction.transaction_type
                    )}</h5>
                    <p class="transaction-description">${
                      transaction.description || "No description"
                    }</p>
                    <p class="transaction-date">${this.formatTransactionDate(
                      transaction.transaction_date
                    )}</p>
                </div>
                <div class="transaction-amount ${
                  (transaction.pearl_amount || 0) > 0 ? "positive" : "negative"
                }">
                    ${
                      (transaction.pearl_amount || 0) > 0 ? "+" : ""
                    }${this.formatNumber(Math.abs(transaction.pearl_amount || 0))}
                </div>
            </div>
        `
      )
      .join("");

    transactionList.innerHTML = transactionHTML;
  }

  // Info Content
  async loadInfoContent() {
    if (!this.userData) return;

    // Load user bio
    await this.loadUserBio();
    
    // Load showcase cards
    await this.loadShowcaseCards();
    
    // Initialize bio editing
    this.initBioEditing();
    
    // Initialize showcase management
    this.initShowcaseManagement();
  }

  updateProfileStats(data) {
    document.getElementById("total-pearls").textContent = this.formatNumber(
      this.userData.pearl
    );
    document.getElementById("user-level").textContent = this.userData.level;
    document.getElementById("user-exp").textContent = this.formatNumber(
      this.userData.exp
    );
    document.getElementById("referral-count").textContent =
      data.referral_count || 0;
    document.getElementById("followers-count").textContent =
      data.followers_count || 0;
    document.getElementById("following-count").textContent =
      data.following_count || 0;
  }

  async loadSocialLinks() {
    try {
      const response = await fetch("/api/social-links");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.displaySocialLinks(data.links);
        }
      }
    } catch (error) {}
  }

  displaySocialLinks(links) {
    const socialLinksContainer = document.getElementById("social-links");

    if (links.length === 0) {
      socialLinksContainer.innerHTML =
        '<p class="no-links">No social links added yet.</p>';
      return;
    }

    const activeLinks = links.filter((link) => link.is_active);

    if (activeLinks.length === 0) {
      socialLinksContainer.innerHTML =
        '<p class="no-links">No active social links.</p>';
      return;
    }

    const socialHTML = activeLinks
      .map(
        (link) => `
            <a href="${link.url}" target="_blank" class="social-link" title="${link.platform}">
                <i class="${link.platform_info.icon}" style="color: ${link.platform_info.color}"></i>
                <span>${link.platform_info.name}</span>
            </a>
        `
      )
      .join("");

    socialLinksContainer.innerHTML = socialHTML;
  }

  // New Info Tab Functions
  async loadUserBio() {
    const bioElement = document.getElementById("user-bio");
    if (bioElement && this.userData) {
      bioElement.textContent = this.userData.bio || "Tell others about yourself...";
    }
  }

  async loadShowcaseCards() {
    // For now, this is a placeholder
    // In the future, this will load user's selected showcase cards
    console.log("Loading showcase cards...");
  }

  initBioEditing() {
    const editBtn = document.getElementById("edit-bio-btn");
    const cancelBtn = document.getElementById("cancel-bio-btn");
    const saveBtn = document.getElementById("save-bio-btn");
    const bioDisplay = document.getElementById("bio-display");
    const bioEdit = document.getElementById("bio-edit");
    const bioTextarea = document.getElementById("bio-textarea");
    const charCount = document.getElementById("bio-char-count");

    if (!editBtn) return;

    editBtn.addEventListener("click", () => {
      // Enter edit mode
      bioDisplay.style.display = "none";
      bioEdit.style.display = "block";
      
      // Set current bio text
      const currentBio = document.getElementById("user-bio").textContent;
      bioTextarea.value = currentBio === "Tell others about yourself..." ? "" : currentBio;
      
      // Update character count
      this.updateBioCharCount();
      
      // Focus textarea
      bioTextarea.focus();
    });

    cancelBtn?.addEventListener("click", () => {
      this.cancelBioEdit();
    });

    saveBtn?.addEventListener("click", () => {
      this.saveBio();
    });

    bioTextarea?.addEventListener("input", () => {
      this.updateBioCharCount();
    });

    // Save on Enter+Ctrl
    bioTextarea?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        this.saveBio();
      }
      if (e.key === "Escape") {
        this.cancelBioEdit();
      }
    });
  }

  updateBioCharCount() {
    const bioTextarea = document.getElementById("bio-textarea");
    const charCount = document.getElementById("bio-char-count");
    
    if (bioTextarea && charCount) {
      const length = bioTextarea.value.length;
      charCount.textContent = length;
      
      // Change color based on character count
      if (length > 450) {
        charCount.style.color = "#ef4444"; // Red when approaching limit
      } else if (length > 400) {
        charCount.style.color = "#f59e0b"; // Orange when getting close
      } else {
        charCount.style.color = "#a0aec0"; // Default color
      }
    }
  }

  cancelBioEdit() {
    const bioDisplay = document.getElementById("bio-display");
    const bioEdit = document.getElementById("bio-edit");
    
    bioDisplay.style.display = "block";
    bioEdit.style.display = "none";
  }

  async saveBio() {
    const bioTextarea = document.getElementById("bio-textarea");
    const saveBtn = document.getElementById("save-bio-btn");
    const newBio = bioTextarea.value.trim();
    
    // Show loading state
    const originalHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
      const response = await fetch("/api/profile/update-bio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: newBio }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update UI
        const bioText = newBio || "Tell others about yourself...";
        document.getElementById("user-bio").textContent = bioText;
        document.getElementById("profile-bio").textContent = bioText;
        
        // Update user data
        if (this.userData) {
          this.userData.bio = newBio;
        }
        
        this.showNotification("Bio updated successfully!", "success");
        this.cancelBioEdit();
      } else {
        this.showError(data.message || "Failed to update bio");
      }
    } catch (error) {
      this.showError("Network error. Please try again.");
    } finally {
      // Reset button state
      saveBtn.innerHTML = originalHtml;
      saveBtn.disabled = false;
    }
  }

  initShowcaseManagement() {
    const manageBtn = document.getElementById("edit-showcase-btn");
    
    if (!manageBtn) return;
    
    manageBtn.addEventListener("click", () => {
      this.openShowcaseManager();
    });
    
    // Add click handlers for showcase slots
    document.querySelectorAll(".showcase-slot").forEach((slot) => {
      slot.addEventListener("click", () => {
        const slotNumber = slot.getAttribute("data-slot");
        this.openCardSelector(slotNumber);
      });
    });
  }

  openShowcaseManager() {
    this.showNotification("Showcase management coming soon! 🎴", "info");
    // TODO: Implement showcase management modal
    // This would allow users to select which cards to display
  }

  openCardSelector(slotNumber) {
    this.showNotification(`Card selection for slot ${slotNumber} coming soon! 🎮`, "info");
    // TODO: Implement card selection modal
    // This would show user's owned cards and allow them to select one for the showcase
  }

  // Event Listeners
  initEventListeners() {
    // Copy functionality
    document.addEventListener("click", (e) => {
      if (e.target.closest(".copy-btn")) {
        const copyBtn = e.target.closest(".copy-btn");
        const targetId = copyBtn.getAttribute("data-copy");
        this.copyToClipboard(targetId);
      }
    });

    // Profile actions - removed edit and share buttons
    // These buttons have been removed from the profile header

    // Post creation
    document.querySelector(".post-input")?.addEventListener("click", () => {
      this.openCreatePostModal();
    });

    // Wallet actions
    document
      .getElementById("send-pearls-btn")
      ?.addEventListener("click", () => {
        this.openSendPearlsModal();
      });

    document
      .getElementById("receive-pearls-btn")
      ?.addEventListener("click", () => {
        this.openReceivePearlsModal();
      });

    document
      .getElementById("topup-pearls-btn")
      ?.addEventListener("click", () => {
        this.openTopUpModal();
      });

    document.getElementById("watch-ads-btn")?.addEventListener("click", () => {
      this.openWatchAdsModal();
    });

    document
      .getElementById("daily-claim-btn")
      ?.addEventListener("click", () => {
        this.claimDailyReward();
      });
  }

  // Utility Functions
  formatNumber(num) {
    // Handle invalid, null, or undefined values
    if (num === null || num === undefined || isNaN(num)) {
      return "0";
    }
    
    // Convert to number if it's a string
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    
    // Check again after conversion
    if (isNaN(numValue)) {
      return "0";
    }
    
    if (numValue >= 1000000) {
      return (numValue / 1000000).toFixed(1) + "M";
    }
    if (numValue >= 1000) {
      return (numValue / 1000).toFixed(1) + "K";
    }
    return numValue.toString();
  }
  
  // Extract pearl amount from transaction description if pearl_amount is missing
  extractPearlAmountFromDescription(description, pearlAmount) {
    // If we have a valid pearl_amount, use it
    if (pearlAmount !== null && pearlAmount !== undefined && !isNaN(pearlAmount)) {
      return pearlAmount;
    }
    
    // Try to extract amount from description
    if (description) {
      const match = description.match(/(\d+)\s*pearls?/i);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return 0;
  }
  
  // Clean up transaction description by removing pearl amount details
  cleanTransactionDescription(description) {
    if (!description) return "No description";
    
    // Remove pearl amount from description (e.g., "(750 pearls)" or "- 750 pearls")
    let cleanDesc = description
      .replace(/\s*[-–]?\s*\(?\d+\s*pearls?\)?/gi, '') // Remove pearl amounts
      .replace(/\s*[-–]\s*Day\s*\d+/gi, '') // Remove day numbers if they exist
      .trim();
    
    // If description becomes empty after cleaning, provide a default
    if (!cleanDesc) {
      return "Transaction completed";
    }
    
    return cleanDesc;
  }

  getTransactionIcon(type) {
    const icons = {
      daily_claim: "fa-calendar-check",
      referral_bonus: "fa-users",
      send: "fa-paper-plane",
      receive: "fa-inbox",
      transfer_sent: "fa-paper-plane",
      transfer_received: "fa-inbox",
    };
    return icons[type] || "fa-exchange-alt";
  }

  getTransactionTitle(type) {
    const titles = {
      daily_claim: "Daily Reward",
      referral_bonus: "Referral Bonus",
      send: "Sent Pearls",
      receive: "Received Pearls",
      transfer_sent: "Sent Pearls",
      transfer_received: "Received Pearls",
    };
    return titles[type] || "Transaction";
  }

  async copyToClipboard(targetId) {
    const element = document.getElementById(targetId);
    if (element) {
      try {
        await navigator.clipboard.writeText(element.textContent);
        this.showNotification("Copied to clipboard!", "success");
      } catch (err) {
        // Fallback for older browsers
        element.select();
        document.execCommand("copy");
        this.showNotification("Copied to clipboard!", "success");
      }
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <i class="fas ${
              type === "success" ? "fa-check-circle" : "fa-info-circle"
            }"></i>
            <span>${message}</span>
        `;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  // Time utility function
  getTimeAgo(timestamp) {
    if (!timestamp) return "unknown";

    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  }

  // Social interaction functions
  startChat(userId) {
    // Placeholder for chat functionality
    this.showNotification(`Starting chat with user ${userId}`, "info");
    // TODO: Implement actual chat opening logic
  }

  openSocialPlatform(url) {
    // Open social platform in new tab
    window.open(url, "_blank");
  }

  // Social platform utility functions
  getSocialPlatformIcon(platform) {
    const icons = {
      twitter: "fab fa-twitter",
      facebook: "fab fa-facebook",
      instagram: "fab fa-instagram",
      linkedin: "fab fa-linkedin-in",
      youtube: "fab fa-youtube",
      tiktok: "fab fa-tiktok",
      discord: "fab fa-discord",
      twitch: "fab fa-twitch",
      github: "fab fa-github",
      telegram: "fab fa-telegram-plane",
      whatsapp: "fab fa-whatsapp",
      snapchat: "fab fa-snapchat-ghost",
      pinterest: "fab fa-pinterest-p",
      reddit: "fab fa-reddit-alien",
    };
    return icons[platform.toLowerCase()] || "fas fa-link";
  }

  getSocialPlatformColor(platform) {
    const colors = {
      twitter: "#1da1f2",
      facebook: "#1877f2",
      instagram: "#e4405f",
      linkedin: "#0a66c2",
      youtube: "#ff0000",
      tiktok: "#000000",
      discord: "#7289da",
      twitch: "#9146ff",
      github: "#333333",
      telegram: "#0088cc",
      whatsapp: "#25d366",
      snapchat: "#fffc00",
      pinterest: "#bd081c",
      reddit: "#ff4500",
    };
    return colors[platform.toLowerCase()] || "#6c757d";
  }

  detectPlatformFromUrl(url) {
    if (!url) return null;

    const urlLower = url.toLowerCase();

    if (urlLower.includes("twitter.com") || urlLower.includes("x.com"))
      return "twitter";
    if (urlLower.includes("facebook.com") || urlLower.includes("fb.com"))
      return "facebook";
    if (urlLower.includes("instagram.com")) return "instagram";
    if (urlLower.includes("linkedin.com")) return "linkedin";
    if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be"))
      return "youtube";
    if (urlLower.includes("tiktok.com")) return "tiktok";
    if (urlLower.includes("discord.gg") || urlLower.includes("discord.com"))
      return "discord";
    if (urlLower.includes("twitch.tv")) return "twitch";
    if (urlLower.includes("github.com")) return "github";
    if (urlLower.includes("t.me") || urlLower.includes("telegram.me"))
      return "telegram";
    if (urlLower.includes("wa.me") || urlLower.includes("whatsapp.com"))
      return "whatsapp";
    if (urlLower.includes("snapchat.com")) return "snapchat";
    if (urlLower.includes("pinterest.com")) return "pinterest";
    if (urlLower.includes("reddit.com")) return "reddit";

    return null;
  }

  getPlatformDisplayName(platform) {
    const names = {
      twitter: "Twitter",
      facebook: "Facebook",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      youtube: "YouTube",
      tiktok: "TikTok",
      discord: "Discord",
      twitch: "Twitch",
      github: "GitHub",
      telegram: "Telegram",
      whatsapp: "WhatsApp",
      snapchat: "Snapchat",
      pinterest: "Pinterest",
      reddit: "Reddit",
      website: "Website",
    };
    return names[platform.toLowerCase()] || platform;
  }

  // Modal Functions (placeholders)
  // Removed openEditProfileModal and shareProfile functions as buttons were removed

  openCreatePostModal() {
    this.showNotification("Create Post feature coming soon!", "info");
  }

  // Top Up Modal
  openTopUpModal() {
    this.showNotification("Top Up feature coming soon! 💰", "info");
    // TODO: Implement actual top up functionality
    // Could include payment gateways, in-app purchases, etc.
  }

  // Watch Ads Modal
  openWatchAdsModal() {
    this.showNotification("Watch Ads feature coming soon! 📺", "info");
    // TODO: Implement actual ads functionality
    // Could include rewarded video ads, banner ads, etc.
  }

  // Modal Management
  initModals() {
    this.initSendPearlsModal();
    this.initReceivePearlsModal();
  }

  initSendPearlsModal() {
    const modal = document.getElementById("send-pearls-modal");
    const closeBtn = document.getElementById("close-send-modal");
    const cancelBtn = document.getElementById("cancel-send-btn");
    const form = document.getElementById("send-pearls-form");
    const scanQRBtn = document.getElementById("scan-qr-btn");
    const amountInput = document.getElementById("send-amount");
    const recipientInput = document.getElementById("recipient-address");

    // Close modal events
    [closeBtn, cancelBtn].forEach((btn) => {
      btn?.addEventListener("click", () => {
        this.closeSendPearlsModal();
      });
    });

    // Click outside to close
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeSendPearlsModal();
      }
    });

    // QR scanner functionality
    scanQRBtn?.addEventListener("click", () => {
      this.openQRScanner();
    });

    // Amount buttons (25%, 50%, 75%, Max)
    document.querySelectorAll(".amount-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const percentage = parseInt(btn.getAttribute("data-percentage"));
        const balance = this.userData?.pearl || 0;
        const amount = Math.floor(balance * (percentage / 100));
        amountInput.value = amount;
        this.updateTransactionSummary();
      });
    });

    // Update summary when amount changes
    amountInput?.addEventListener("input", () => {
      this.updateTransactionSummary();
    });

    // Form submission
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.processSendPearls();
    });
  }

  // QR scanner modal has been removed

  openSendPearlsModal() {
    const modal = document.getElementById("send-pearls-modal");
    if (modal) {
      // Update balance in modal
      const modalBalance = document.getElementById("modal-balance");
      if (modalBalance && this.userData) {
        modalBalance.textContent = this.formatNumber(this.userData.pearl);
      }

      // Clear form
      this.resetSendPearlsForm();

      // Show modal
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    }
  }

  closeSendPearlsModal() {
    const modal = document.getElementById("send-pearls-modal");
    if (modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "";
    }
  }

  resetSendPearlsForm() {
    const form = document.getElementById("send-pearls-form");
    if (form) {
      form.reset();
      this.updateTransactionSummary();
    }
  }

  updateTransactionSummary() {
    const amountInput = document.getElementById("send-amount");
    const amount = parseFloat(amountInput?.value) || 0;

    document.getElementById(
      "summary-amount"
    ).textContent = `${this.formatNumber(amount)} Pearls`;

    // Validate if user has enough balance
    const confirmBtn = document.getElementById("confirm-send-btn");
    const balance = this.userData?.pearl || 0;

    if (amount > balance) {
      confirmBtn.disabled = true;
      confirmBtn.classList.add("disabled");
    } else {
      confirmBtn.disabled = false;
      confirmBtn.classList.remove("disabled");
    }
  }

  async processSendPearls() {
    const recipientAddress = $("#recipient-address").val();
    const amount = parseFloat($("#send-amount").val());
    const $confirmBtn = $("#confirm-send-btn");

    // Validate inputs
    if (!this.validateWalletAddress(recipientAddress)) {
      this.showError("Invalid wallet address format");
      return;
    }

    if (!amount || amount <= 0) {
      this.showError("Please enter a valid amount");
      return;
    }

    const balance = this.userData?.pearl || 0;

    if (amount > balance) {
      this.showError("Insufficient balance");
      return;
    }

    // Show loading state with jQuery
    $confirmBtn.addClass("loading").prop("disabled", true)
      .html('<i class="fas fa-spinner fa-spin"></i> Sending...');

    try {
      const response = await fetch("/api/wallet/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_address: recipientAddress,
          amount: amount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification("Pearls sent successfully! ✨", "success");

        // Update balance dynamically with animation
        if (this.userData) {
          const oldBalance = this.userData.pearl;
          this.userData.pearl = data.new_balance;
          this.updateBalanceElements(data.new_balance, true);
        }

        // Close modal with fade effect
        this.closeSendPearlsModal();
        
        // Refresh wallet data to show new transaction
        setTimeout(() => {
          this.refreshWalletData();
        }, 500);
      } else {
        this.showError(data.message || "Failed to send pearls");
      }
    } catch (error) {
      this.showError("Network error. Please try again.");
    } finally {
      // Reset button state with jQuery
      $confirmBtn.removeClass("loading").prop("disabled", false)
        .html('<i class="fas fa-paper-plane"></i> Send Pearls');
    }
  }

  validateWalletAddress(address) {
    // Simple validation for Pearl wallet address format
    const pearlAddressRegex = /^pearl:0x[a-fA-F0-9]{40,}$/;
    return pearlAddressRegex.test(address);
  }

  // QR Scanner functionality
  openQRScanner() {
    // Check if browser supports camera access
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.showError("Camera access is not supported on this device");
      return;
    }

    // Create QR scanner modal
    this.createQRScannerModal();
    this.startQRScanning();
  }

  createQRScannerModal() {
    // Remove existing scanner modal if it exists
    const existingModal = document.getElementById("qr-scanner-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Create new scanner modal
    const scannerModal = document.createElement("div");
    scannerModal.id = "qr-scanner-modal";
    scannerModal.className = "modal show";
    scannerModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-qrcode"></i> Scan QR Code</h3>
                    <button class="close-modal" id="close-scanner-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="qr-scanner-container">
                        <video id="qr-scanner-video" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: 8px;"></video>
                        <div id="qr-scanner-overlay" style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: 200px;
                            height: 200px;
                            border: 2px solid #667eea;
                            border-radius: 8px;
                            pointer-events: none;
                            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
                        "></div>
                    </div>
                    <div class="scanner-instructions" style="text-align: center; margin-top: 15px; color: #666;">
                        <p>Point your camera at a QR code to scan</p>
                    </div>
                    <div id="scanner-error" style="display: none; color: #ef4444; text-align: center; margin-top: 10px;"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancel-scanner-btn">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(scannerModal);
    document.body.style.overflow = "hidden";

    // Add event listeners
    document
      .getElementById("close-scanner-modal")
      .addEventListener("click", () => {
        this.closeQRScanner();
      });

    document
      .getElementById("cancel-scanner-btn")
      .addEventListener("click", () => {
        this.closeQRScanner();
      });

    // Click outside to close
    scannerModal.addEventListener("click", (e) => {
      if (e.target === scannerModal) {
        this.closeQRScanner();
      }
    });
  }

  async startQRScanning() {
    const video = document.getElementById("qr-scanner-video");
    const errorDiv = document.getElementById("scanner-error");

    if (!video) return;

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera if available
          width: { ideal: 400 },
          height: { ideal: 400 },
        },
      });

      video.srcObject = stream;
      this.currentStream = stream;

      // Start scanning for QR codes
      this.scanInterval = setInterval(() => {
        this.captureAndDecodeQR(video);
      }, 500); // Check every 500ms
    } catch (error) {
      errorDiv.textContent =
        "Unable to access camera. Please check permissions and try again.";
      errorDiv.style.display = "block";
    }
  }

  captureAndDecodeQR(video) {
    try {
      // Create canvas to capture video frame
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(video, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Try to decode QR code using jsQR if available
        if (typeof window.jsQR !== "undefined") {
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            this.handleQRCodeDetected(code.data);
          }
        }
        // If jsQR is not available, try basic pattern detection
        else {
          // This is a very basic approach - in production you'd want to include jsQR
          const qrPattern = this.detectBasicQRPattern(imageData);
          if (qrPattern) {
            // For demo purposes, we'll simulate a successful scan
            this.handleQRCodeDetected(
              "pearl:0x1234567890abcdef1234567890abcdef12345678"
            );
          }
        }
      }
    } catch (error) {}
  }

  detectBasicQRPattern(imageData) {
    // Very basic QR pattern detection (not reliable, just for demo)
    // In a real implementation, you'd use a proper QR decoding library
    const { width, height, data } = imageData;
    let darkPixels = 0;

    // Sample some pixels to detect dark patterns
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;

      if (brightness < 100) {
        darkPixels++;
      }
    }

    // If more than 30% dark pixels, might be a QR code
    const totalPixels = width * height;
    return darkPixels / totalPixels > 0.3;
  }

  handleQRCodeDetected(qrData) {
    if (this.validateWalletAddress(qrData)) {
      const recipientInput = document.getElementById("recipient-address");
      if (recipientInput) {
        recipientInput.value = qrData;
        this.showNotification("QR code scanned successfully!", "success");
      }

      // Close scanner
      this.closeQRScanner();
    } else {
      // Try to extract wallet address from URL or other formats
      const extractedAddress = this.extractWalletAddress(qrData);
      if (extractedAddress && this.validateWalletAddress(extractedAddress)) {
        const recipientInput = document.getElementById("recipient-address");
        if (recipientInput) {
          recipientInput.value = extractedAddress;
          this.showNotification(
            "Wallet address extracted from QR code!",
            "success"
          );
        }
        this.closeQRScanner();
      } else {
        this.showError("QR code does not contain a valid wallet address");
      }
    }
  }

  extractWalletAddress(data) {
    // Try to extract wallet address from various formats
    // pearl:0x...
    const pearlMatch = data.match(/pearl:0x[a-fA-F0-9]{40,}/i);
    if (pearlMatch) {
      return pearlMatch[0];
    }

    // URL with wallet parameter
    const urlMatch = data.match(/[?&]wallet=([^&]*)/i);
    if (urlMatch) {
      const walletParam = decodeURIComponent(urlMatch[1]);
      if (this.validateWalletAddress(walletParam)) {
        return walletParam;
      }
    }

    return null;
  }

  closeQRScanner() {
    // Stop camera stream
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }

    // Clear scanning interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    // Remove modal
    const scannerModal = document.getElementById("qr-scanner-modal");
    if (scannerModal) {
      scannerModal.remove();
    }

    document.body.style.overflow = "";
  }

  async claimDailyReward(dayNumber = null) {
    try {
      // Show claiming animation on the specific day button if provided
      let $claimButton = null;
      if (dayNumber) {
        $claimButton = $(`.claim-day:nth-child(${dayNumber})`);
        $claimButton.addClass('claiming').prop('disabled', true);
      }

      const response = await fetch("/api/daily-claim/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification(`${data.message} 🎆`, "success");
        
        // Update balance dynamically with animation
        if (this.userData) {
          const oldBalance = this.userData.pearl;
          this.userData.pearl = data.new_pearl_balance;
          this.updateBalanceElements(data.new_pearl_balance, true);
        }

        // Refresh wallet data to show updated claim status and new transaction
        setTimeout(() => {
          this.refreshWalletData();
        }, 1000);
        
      } else {
        this.showError(data.message);
      }
    } catch (error) {
      this.showError("Failed to claim daily reward");
    } finally {
      // Remove claiming animation
      if ($claimButton) {
        $claimButton.removeClass('claiming').prop('disabled', false);
      }
    }
  }

  // Receive Pearls Modal Functions
  initReceivePearlsModal() {
    const modal = document.getElementById("receive-pearls-modal");
    const closeBtn = document.getElementById("close-receive-modal");
    const downloadBtn = document.getElementById("download-qr-btn");
    const copyBtn = document.getElementById("copy-qr-btn");
    const shareBtn = document.getElementById("share-qr-btn");

    // Close modal events
    closeBtn?.addEventListener("click", () => {
      this.closeReceivePearlsModal();
    });

    // Click outside to close
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeReceivePearlsModal();
      }
    });

    // QR Actions
    downloadBtn?.addEventListener("click", () => {
      this.downloadQRCode();
    });

    copyBtn?.addEventListener("click", () => {
      this.copyQRToClipboard();
    });

    shareBtn?.addEventListener("click", () => {
      this.shareQRCode();
    });
  }

  openReceivePearlsModal() {
    const modal = document.getElementById("receive-pearls-modal");
    if (modal && this.userData) {
      // Generate QR code with wallet address
      const walletAddress = this.userData.wallet_address || "pearl:0x...";
      this.generateQRCode(walletAddress);

      // Show modal
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    }
  }

  closeReceivePearlsModal() {
    const modal = document.getElementById("receive-pearls-modal");
    if (modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "";
    }
  }

  async generateQRCode(walletAddress) {
    const qrContainer = document.getElementById("receive-qr-code");
    const loadingElement = document.getElementById("qr-loading");

    if (!qrContainer || !walletAddress || walletAddress === "pearl:0x...") {
      return;
    }

    try {
      // Show loading state
      if (loadingElement) {
        loadingElement.style.display = "flex";
      }
      qrContainer.style.display = "none";

      // Clear previous QR code
      qrContainer.innerHTML = "";

      // Wait a moment for libraries to load if needed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if QRGenerator utility is available first (preferred)
      if (typeof window.QRGenerator !== "undefined") {
        const success = await window.QRGenerator.generateQR(
          qrContainer,
          walletAddress,
          {
            width: 256,
            height: 256,
          }
        );

        if (!success) {
          throw new Error("QRGenerator utility failed");
        }
      }
      // Check if QRious library is available (fallback)
      else if (typeof window.QRious !== "undefined") {
        // Create canvas element for QRious
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        qrContainer.appendChild(canvas);

        const qr = new QRious({
          element: canvas,
          value: walletAddress,
          size: 256,
          background: "#ffffff",
          foreground: "#000000",
          level: "M",
        });
      }
      // Final fallback - show text QR code
      else {
        qrContainer.innerHTML = `
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 40px 20px;
                        border: 2px dashed #ccc;
                        border-radius: 8px;
                        background: #f9f9f9;
                    ">
                        <i class="fas fa-qrcode" style="font-size: 48px; color: #666; margin-bottom: 16px;"></i>
                        <p style="margin: 0; color: #666; font-weight: 600;">QR Code Not Available</p>
                        <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">Please copy the wallet address above</p>
                    </div>
                `;
      }

      // Hide loading and show QR code
      if (loadingElement) {
        loadingElement.style.display = "none";
      }
      qrContainer.style.display = "block";
    } catch (error) {
      if (loadingElement) {
        loadingElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                    <p>Failed to generate QR code</p>
                    <p style="font-size: 12px; color: #666; margin-top: 8px;">Error: ${error.message}</p>
                `;
        loadingElement.style.display = "flex";
      }

      this.showError(
        "Failed to generate QR code. Please copy the address manually."
      );
    }
  }

  downloadQRCode() {
    const qrContainer = document.getElementById("receive-qr-code");

    if (!qrContainer) {
      this.showError("QR code not available for download");
      return;
    }

    // Find the canvas or img element in the QR container
    const canvas = qrContainer.querySelector("canvas");
    const img = qrContainer.querySelector("img");

    if (canvas) {
      // Use QR generator utility if available
      if (typeof window.QRGenerator !== "undefined") {
        const success = window.QRGenerator.downloadQR(canvas);
        if (success) {
          this.showNotification("QR code downloaded successfully!", "success");
        } else {
          this.showError("Failed to download QR code");
        }
      } else {
        // Fallback download method
        try {
          const link = document.createElement("a");
          link.download = `pearl-wallet-qr-${Date.now()}.png`;
          link.href = canvas.toDataURL("image/png");

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          this.showNotification("QR code downloaded successfully!", "success");
        } catch (error) {
          this.showError("Failed to download QR code");
        }
      }
    } else if (img) {
      // Download from image source
      try {
        const link = document.createElement("a");
        link.download = `pearl-wallet-qr-${Date.now()}.png`;
        link.href = img.src;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification("QR code downloaded successfully!", "success");
      } catch (error) {
        this.showError("Failed to download QR code");
      }
    } else {
      this.showError("QR code not found for download");
    }
  }

  async copyQRToClipboard() {
    const qrContainer = document.getElementById("receive-qr-code");
    const canvas = qrContainer?.querySelector("canvas");

    if (!canvas) {
      this.showError("QR code not available for copying");
      return;
    }

    // Use QR generator utility if available
    if (typeof window.QRGenerator !== "undefined") {
      try {
        const success = await window.QRGenerator.copyQRToClipboard(canvas);
        if (success) {
          this.showNotification("QR code copied to clipboard!", "success");
        } else {
          // Fallback to copying wallet address
          this.copyToClipboard("receive-wallet-address");
        }
      } catch (error) {
        this.copyToClipboard("receive-wallet-address");
      }
    } else {
      // Fallback: copy wallet address instead
      this.copyToClipboard("receive-wallet-address");
    }
  }

  async shareQRCode() {
    const qrContainer = document.getElementById("receive-qr-code");
    const canvas = qrContainer?.querySelector("canvas");
    const walletAddress = this.userData?.wallet_address;

    if (!canvas || !walletAddress) {
      this.showError("QR code not available for sharing");
      return;
    }

    // Use QR generator utility if available
    if (typeof window.QRGenerator !== "undefined") {
      try {
        const success = await window.QRGenerator.shareQR(canvas, walletAddress);
        if (success) {
          this.showNotification("QR code shared successfully!", "success");
        } else {
          throw new Error("Share not supported");
        }
      } catch (error) {
        // Fallback to copying share text
        this.fallbackShare(walletAddress);
      }
    } else {
      // Fallback sharing
      this.fallbackShare(walletAddress);
    }
  }

  fallbackShare(walletAddress) {
    try {
      const shareText = `Send Pearls to my wallet: ${walletAddress}`;
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          this.showNotification("Share text copied to clipboard!", "success");
        })
        .catch(() => {
          // Final fallback - just copy the address
          this.copyToClipboard("receive-wallet-address");
        });
    } catch (error) {
      this.showError("Failed to share QR code");
    }
  }
}

// Notification styles (injected dynamically)
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        max-width: 300px;
    }

    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }

    .notification-success {
        border-left: 4px solid #22c55e;
    }

    .notification-error {
        border-left: 4px solid #ef4444;
    }

    .notification-info {
        border-left: 4px solid #3b82f6;
    }

    .notification i {
        font-size: 16px;
    }

    .notification-success i {
        color: #22c55e;
    }

    .notification-error i {
        color: #ef4444;
    }

    .notification-info i {
        color: #3b82f6;
    }

    .notification span {
        flex: 1;
        font-size: 14px;
        color: #1c1e21;
        font-weight: 500;
    }

    /* Post card styles */
    .post-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 16px;
    }

    .post-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .post-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
    }

    .post-info h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1c1e21;
    }

    .post-time {
        margin: 0;
        font-size: 12px;
        color: #65676b;
    }

    .post-content {
        margin: 12px 0;
        line-height: 1.5;
        color: #1c1e21;
    }

    .post-actions {
        display: flex;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid #e4e6ea;
    }

    .post-action {
        flex: 1;
        background: none;
        border: none;
        padding: 8px;
        border-radius: 8px;
        color: #65676b;
        cursor: pointer;
        transition: background 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
    }

    .post-action:hover {
        background: #f0f2f5;
    }

    /* Transaction item styles */
    .transaction-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #f0f2f5;
    }

    .transaction-item:last-child {
        border-bottom: none;
    }

    .transaction-icon {
        width: 40px;
        height: 40px;
        background: #f0f2f5;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #1877f2;
    }

    .transaction-details {
        flex: 1;
    }

    .transaction-details h5 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
    }

    .transaction-description {
        margin: 2px 0;
        font-size: 12px;
        color: #e4e6ea;
    }

    .transaction-date {
        margin: 0;
        font-size: 11px;
        color: #b0b3b8;
    }

    .transaction-amount {
        font-weight: 700;
        font-size: 14px;
    }

    .transaction-amount.positive {
        color: #22c55e;
    }

    .transaction-amount.negative {
        color: #ef4444;
    }

    .no-transactions {
        text-align: center;
        padding: 20px;
        color: #65676b;
    }

    .no-transactions i {
        font-size: 24px;
        margin-bottom: 8px;
        display: block;
    }

    /* Social link styles */
    .social-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: #f0f2f5;
        border-radius: 20px;
        text-decoration: none;
        color: #1c1e21;
        font-size: 12px;
        font-weight: 500;
        transition: background 0.2s ease;
    }

    .social-link:hover {
        background: #e4e6ea;
        text-decoration: none;
        color: #1c1e21;
    }

    .social-link i {
        font-size: 14px;
    }

    /* Active Socials platform avatar improvements */
    .platform-avatar {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        position: relative !important;
    }

    .platform-avatar i {
        font-size: 18px !important;
        line-height: 1 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
    }

    .social-avatar {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .social-status {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #2c3e50;
        background: #22c55e;
    }
`;

// Inject styles
const notificationStyleSheet = document.createElement("style");
notificationStyleSheet.textContent = notificationStyles;
document.head.appendChild(notificationStyleSheet);

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.pearlDashboard = new PearlDashboard();
});

// Export for global access
window.PearlDashboard = PearlDashboard;

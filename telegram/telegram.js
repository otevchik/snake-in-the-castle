// =====================
// TELEGRAM WEB APP INTEGRATION
// =====================

const TelegramApp = {
  webApp: null,
  user: null,
  isReady: false,

  // Initialize Telegram Web App
  init() {
    return new Promise((resolve, reject) => {
      // Check if running inside Telegram
      if (window.Telegram && window.Telegram.WebApp) {
        this.webApp = window.Telegram.WebApp;
        
        // Expand to full height
        this.webApp.expand();
        
        // Set theme
        this.applyTheme();
        
        // Get user data
        if (this.webApp.initDataUnsafe && this.webApp.initDataUnsafe.user) {
          this.user = this.webApp.initDataUnsafe.user;
          this.isReady = true;
          
          console.log('Telegram user:', this.user);
          resolve(this.user);
        } else {
          // For testing outside Telegram
          console.warn('No Telegram user data, using test mode');
          this.user = {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
          };
          this.isReady = true;
          resolve(this.user);
        }
      } else {
        // Not in Telegram, use test mode
        console.warn('Not running in Telegram, using test mode');
        this.user = {
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser'
        };
        this.isReady = true;
        resolve(this.user);
      }
    });
  },

  // Apply Telegram theme colors
  applyTheme() {
    if (!this.webApp) return;
    
    const theme = this.webApp.themeParams;
    
    if (theme.bg_color) {
      document.documentElement.style.setProperty('--tg-bg-color', theme.bg_color);
    }
    if (theme.text_color) {
      document.documentElement.style.setProperty('--tg-text-color', theme.text_color);
    }
    if (theme.button_color) {
      document.documentElement.style.setProperty('--tg-button-color', theme.button_color);
    }
    if (theme.button_text_color) {
      document.documentElement.style.setProperty('--tg-button-text-color', theme.button_text_color);
    }
  },

  // Get user ID
  getUserId() {
    return this.user ? this.user.id : null;
  },

  // Get display name
  getDisplayName() {
    if (!this.user) return 'Player';
    
    if (this.user.username) {
      return '@' + this.user.username;
    }
    
    let name = this.user.first_name || '';
    if (this.user.last_name) {
      name += ' ' + this.user.last_name;
    }
    
    return name || 'Player';
  },

  // Get short name for leaderboard
  getShortName() {
    if (!this.user) return 'Player';
    
    if (this.user.username) {
      return '@' + this.user.username;
    }
    
    return this.user.first_name || 'Player';
  },

  // Get init data for server validation
  getInitData() {
    return this.webApp ? this.webApp.initData : '';
  },

  // Show alert
  showAlert(message) {
    if (this.webApp) {
      this.webApp.showAlert(message);
    } else {
      alert(message);
    }
  },

  // Show confirm
  showConfirm(message, callback) {
    if (this.webApp) {
      this.webApp.showConfirm(message, callback);
    } else {
      const result = confirm(message);
      callback(result);
    }
  },

  // Haptic feedback
  hapticImpact(style = 'medium') {
    if (this.webApp && this.webApp.HapticFeedback) {
      this.webApp.HapticFeedback.impactOccurred(style);
    }
  },

  // Notify ready
  ready() {
    if (this.webApp) {
      this.webApp.ready();
    }
  },

  // Close app
  close() {
    if (this.webApp) {
      this.webApp.close();
    }
  },

  // Enable closing confirmation
  enableClosingConfirmation() {
    if (this.webApp) {
      this.webApp.enableClosingConfirmation();
    }
  },

  // Disable closing confirmation
  disableClosingConfirmation() {
    if (this.webApp) {
      this.webApp.disableClosingConfirmation();
    }
  },

  // Set header color
  setHeaderColor(color) {
    if (this.webApp) {
      this.webApp.setHeaderColor(color);
    }
  },

  // Set background color
  setBackgroundColor(color) {
    if (this.webApp) {
      this.webApp.setBackgroundColor(color);
    }
  }
};

// Export
window.TelegramApp = TelegramApp;
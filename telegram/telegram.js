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
      console.log('=== TELEGRAM INIT START ===');
      console.log('window.Telegram:', window.Telegram);
      console.log('window.Telegram.WebApp:', window.Telegram?.WebApp);
      
      // Check if running inside Telegram
      if (window.Telegram && window.Telegram.WebApp) {
        this.webApp = window.Telegram.WebApp;
        
        console.log('WebApp version:', this.webApp.version);
        console.log('WebApp platform:', this.webApp.platform);
        console.log('initData:', this.webApp.initData);
        console.log('initDataUnsafe:', JSON.stringify(this.webApp.initDataUnsafe, null, 2));
        
        // Expand to full height
        this.webApp.expand();
        
        // Set theme
        this.applyTheme();
        
        // Get user data
        if (this.webApp.initDataUnsafe && this.webApp.initDataUnsafe.user) {
          this.user = this.webApp.initDataUnsafe.user;
          this.isReady = true;
          
          console.log('✅ TELEGRAM USER FOUND:');
          console.log('  ID:', this.user.id);
          console.log('  Username:', this.user.username);
          console.log('  First Name:', this.user.first_name);
          console.log('  Last Name:', this.user.last_name);
          
          resolve(this.user);
        } else {
          // For testing outside Telegram
          console.warn('⚠️ No Telegram user data - using TEST MODE');
          console.warn('initDataUnsafe:', this.webApp.initDataUnsafe);
          
          this.user = this.createTestUser();
          this.isReady = true;
          resolve(this.user);
        }
      } else {
        // Not in Telegram, use test mode
        console.warn('⚠️ Not running in Telegram - using TEST MODE');
        
        this.user = this.createTestUser();
        this.isReady = true;
        resolve(this.user);
      }
      
      console.log('=== TELEGRAM INIT END ===');
    });
  },
  
  // Create test user for development
  createTestUser() {
    // Генерируем уникальный ID на основе времени для тестов
    const testId = Math.floor(Date.now() / 1000);
    
    return {
      id: testId,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser_' + testId
    };
  },

  // Apply Telegram theme colors
  applyTheme() {
    if (!this.webApp) return;
    
    const theme = this.webApp.themeParams;
    console.log('Theme params:', theme);
    
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
    const id = this.user ? this.user.id : null;
    console.log('getUserId() =', id);
    return id;
  },

  // Get display name
  getDisplayName() {
    if (!this.user) {
      console.log('getDisplayName(): no user');
      return 'Player';
    }
    
    let name;
    if (this.user.username) {
      name = '@' + this.user.username;
    } else {
      name = this.user.first_name || '';
      if (this.user.last_name) {
        name += ' ' + this.user.last_name;
      }
    }
    
    console.log('getDisplayName() =', name);
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
    if (this.webApp && this.webApp.showAlert) {
      this.webApp.showAlert(message);
    } else {
      alert(message);
    }
  },

  // Show confirm
  showConfirm(message, callback) {
    if (this.webApp && this.webApp.showConfirm) {
      this.webApp.showConfirm(message, callback);
    } else {
      const result = confirm(message);
      callback(result);
    }
  },

  // Haptic feedback
  hapticImpact(style = 'medium') {
    try {
      if (this.webApp && this.webApp.HapticFeedback) {
        this.webApp.HapticFeedback.impactOccurred(style);
      }
    } catch (e) {
      // Ignore haptic errors
    }
  },

  // Notify ready
  ready() {
    if (this.webApp) {
      this.webApp.ready();
      console.log('✅ Telegram WebApp ready() called');
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
    try {
      if (this.webApp && this.webApp.enableClosingConfirmation) {
        this.webApp.enableClosingConfirmation();
      }
    } catch (e) {
      // Ignore
    }
  },

  // Disable closing confirmation
  disableClosingConfirmation() {
    try {
      if (this.webApp && this.webApp.disableClosingConfirmation) {
        this.webApp.disableClosingConfirmation();
      }
    } catch (e) {
      // Ignore
    }
  },

  // Set header color
  setHeaderColor(color) {
    try {
      if (this.webApp && this.webApp.setHeaderColor) {
        this.webApp.setHeaderColor(color);
      }
    } catch (e) {
      // Ignore
    }
  },

  // Set background color
  setBackgroundColor(color) {
    try {
      if (this.webApp && this.webApp.setBackgroundColor) {
        this.webApp.setBackgroundColor(color);
      }
    } catch (e) {
      // Ignore
    }
  }
};

// Export
window.TelegramApp = TelegramApp;
// wallet.js - Wallet adapter for Snake game
// Совместим с game.js который использует WalletApp

const WalletApp = {
  address: null,
  profile: null,
  devMode: false,
  
  async init() {
    this.devMode = this.checkDevMode();
    
    const savedAddress = localStorage.getItem('wallet_address');
    const savedProvider = localStorage.getItem('wallet_provider');
    
    if (savedAddress) {
      this.address = savedAddress;
      this.profile = {
        name: savedProvider === 'dev' ? '🔧 Dev Tester' : this.shortenAddress(savedAddress)
      };
      return true;
    }
    
    // No wallet - redirect to hub
    window.location.href = '../../index.html';
    return false;
  },
  
  checkDevMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const isLocalhost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    return urlParams.get('dev') === 'true' || localStorage.getItem('devMode') === 'true' || isLocalhost;
  },
  
  // Методы которые использует game.js
  getUserId() {
    return this.address;
  },
  
  getShortAddress() {
    return this.shortenAddress(this.address);
  },
  
  shortenAddress(addr) {
    if (!addr) return '0x...';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  },
  
  // Haptic feedback (заглушки для web)
  hapticImpact(style) {
    // На web ничего не делаем, на мобильном можно добавить вибрацию
    if (navigator.vibrate) {
      const duration = style === 'heavy' ? 50 : style === 'medium' ? 30 : 10;
      navigator.vibrate(duration);
    }
  },
  
  // Closing confirmation (заглушки)
  enableClosingConfirmation() {
    window.onbeforeunload = () => 'Game in progress. Are you sure?';
  },
  
  disableClosingConfirmation() {
    window.onbeforeunload = null;
  },
  
  // Dev badge
  showDevBadge() {
    if (document.querySelector('.dev-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'dev-badge';
    badge.textContent = '🔧 DEV';
    document.body.appendChild(badge);
  }
};

// Также экспортируем как Wallet для совместимости
window.WalletApp = WalletApp;
window.Wallet = WalletApp;
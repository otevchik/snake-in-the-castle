// wallet.js - Wallet adapter for Snake game

const WalletApp = {
  address: null,
  profile: null,
  devMode: false,
  
  async init() {
    this.devMode = this.checkDevMode();
    
    console.log('🔧 WalletApp.init()');
    console.log('   hostname:', window.location.hostname);
    console.log('   devMode:', this.devMode);
    
    const savedAddress = localStorage.getItem('wallet_address');
    const savedProvider = localStorage.getItem('wallet_provider');
    
    console.log('   savedAddress:', savedAddress);
    console.log('   savedProvider:', savedProvider);
    
    if (savedAddress) {
      this.address = savedAddress;
      this.profile = {
        name: savedProvider === 'dev' ? '🔧 Dev Tester' : this.shortenAddress(savedAddress)
      };
      return true;
    }
    
    window.location.href = '../../index.html';
    return false;
  },
  
  checkDevMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const hostname = window.location.hostname;
    
    // ИСПРАВЛЕНО: только localhost и 127.0.0.1, БЕЗ пустой строки!
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Явный параметр ?dev=true
    const hasDevParam = urlParams.get('dev') === 'true';
    
    // Dev provider на localhost
    const isDevProvider = localStorage.getItem('wallet_provider') === 'dev';
    
    const result = hasDevParam || (isLocalhost && isDevProvider);
    
    console.log('🔍 checkDevMode:', { hostname, isLocalhost, hasDevParam, isDevProvider, result });
    
    return result;
  },
  
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
  
  hapticImpact(style) {
    if (navigator.vibrate) {
      const duration = style === 'heavy' ? 50 : style === 'medium' ? 30 : 10;
      navigator.vibrate(duration);
    }
  },
  
  enableClosingConfirmation() {
    window.onbeforeunload = () => 'Game in progress. Are you sure?';
  },
  
  disableClosingConfirmation() {
    window.onbeforeunload = null;
  },
  
  showDevBadge() {
    if (document.querySelector('.dev-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'dev-badge';
    badge.textContent = '🔧 DEV';
    document.body.appendChild(badge);
  }
};

window.WalletApp = WalletApp;
window.Wallet = WalletApp;
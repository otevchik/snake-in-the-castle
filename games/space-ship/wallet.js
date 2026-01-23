// wallet.js - Wallet adapter for Space Ship game

const WalletApp = {
  address: null,
  profile: null,
  devMode: false,
  user: null,
  
  async init() {
    this.devMode = this.checkDevMode();
    
    const savedAddress = localStorage.getItem('wallet_address');
    const savedProvider = localStorage.getItem('wallet_provider');
    
    if (savedAddress) {
      this.address = savedAddress;
      this.profile = {
        name: savedProvider === 'dev' ? '🔧 Dev Tester' : this.shortenAddress(savedAddress)
      };
      this.user = {
        id: savedAddress,
        name: this.profile.name
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
  
  getUserId() {
    return this.address;
  },
  
  getDisplayName() {
    return this.profile?.name || 'Player';
  },
  
  getShortAddress() {
    return this.shortenAddress(this.address);
  },
  
  shortenAddress(addr) {
    if (!addr) return '0x...';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  },
  
  // Haptic feedback
  hapticImpact(style) {
    if (navigator.vibrate) {
      const duration = style === 'heavy' ? 50 : style === 'medium' ? 30 : 10;
      navigator.vibrate(duration);
    }
  },
  
  // Closing confirmation
  enableClosingConfirmation() {
    window.onbeforeunload = () => 'Game in progress!';
  },
  
  disableClosingConfirmation() {
    window.onbeforeunload = null;
  },
  
  ready() {
    console.log('🚀 WalletApp ready');
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
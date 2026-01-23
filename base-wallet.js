// base-wallet.js - Lightweight wallet (no ethers dependency)

const BaseWallet = {
  address: null,
  chainId: null,
  profile: null,
  isDevMode: false,

  BASE_CHAIN_ID: 8453,
  BASE_TESTNET_CHAIN_ID: 84532,

  CHAINS: {
    1: 'Ethereum',
    8453: 'Base',
    84532: 'Base Sepolia',
    10: 'Optimism',
    42161: 'Arbitrum'
  },

  // Check dev mode
  checkDevMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const isLocalhost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    return urlParams.get('dev') === 'true' || localStorage.getItem('devMode') === 'true' || isLocalhost;
  },

  // Promise with timeout
  withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  },

  // Fast init - no RPC calls that can hang
  async init() {
    this.isDevMode = this.checkDevMode();

    const savedAddress = localStorage.getItem('wallet_address');
    const savedProvider = localStorage.getItem('wallet_provider');

    // Dev wallet - instant
    if (savedAddress && savedProvider === 'dev') {
      this.address = savedAddress;
      this.chainId = 8453;
      this.profile = { name: '🔧 Dev Tester', avatar: null };
      return true;
    }

    // No saved wallet or no ethereum
    if (!savedAddress || !savedProvider || typeof window.ethereum === 'undefined') {
      return false;
    }

    // Fast reconnect with timeout
    try {
      const accounts = await this.withTimeout(
        window.ethereum.request({ method: 'eth_accounts' }),
        1500
      );

      if (!accounts || accounts.length === 0) {
        this.clearSession();
        return false;
      }

      this.address = accounts[0];

      // Get chain ID with timeout
      try {
        const chainIdHex = await this.withTimeout(
          window.ethereum.request({ method: 'eth_chainId' }),
          1500
        );
        this.chainId = parseInt(chainIdHex, 16);
      } catch (e) {
        this.chainId = 1; // fallback
      }

      this.profile = { name: this.shortenAddress(this.address), avatar: null };
      this.setupListeners();

      return true;
    } catch (e) {
      console.log('Reconnect failed:', e.message);
      this.clearSession();
      return false;
    }
  },

  // Connect wallet (any injected)
  async connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('No wallet found');
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

    if (accounts.length === 0) {
      throw new Error('No accounts');
    }

    this.address = accounts[0];

    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    this.chainId = parseInt(chainIdHex, 16);

    this.profile = { name: this.shortenAddress(this.address), avatar: null };

    this.saveSession('injected');
    this.setupListeners();

    // Try to switch to Base (non-blocking)
    this.trySwitchToBase();

    return { address: this.address, chainId: this.chainId, profile: this.profile };
  },

  // Aliases for different wallet types
  async connectSmartWallet() {
    return this.connectWallet();
  },

  async connectCoinbaseWallet() {
    return this.connectWallet();
  },

  async connectOtherWallet() {
    return this.connectWallet();
  },

  // Try to switch to Base (non-blocking)
  async trySwitchToBase() {
    if (this.chainId === this.BASE_CHAIN_ID) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }]
      });
      this.chainId = this.BASE_CHAIN_ID;
    } catch (e) {
      if (e.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
          this.chainId = this.BASE_CHAIN_ID;
        } catch (addError) {
          console.log('Failed to add Base network');
        }
      }
    }
  },

  // Setup event listeners
  setupListeners() {
    if (!window.ethereum?.on) return;

    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.address = accounts[0];
        this.profile = { name: this.shortenAddress(this.address), avatar: null };
        window.dispatchEvent(new CustomEvent('walletChanged'));
      }
    });

    window.ethereum.on('chainChanged', (chainId) => {
      this.chainId = parseInt(chainId, 16);
      window.dispatchEvent(new CustomEvent('chainChanged'));
    });

    window.ethereum.on('disconnect', () => this.disconnect());
  },

  // Disconnect
  disconnect() {
    this.address = null;
    this.chainId = null;
    this.profile = null;
    this.clearSession();
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  },

  // Save session
  saveSession(provider) {
    localStorage.setItem('wallet_address', this.address);
    localStorage.setItem('wallet_provider', provider);
    localStorage.setItem('wallet_chain', this.chainId?.toString() || '');
  },

  // Clear session
  clearSession() {
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_provider');
    localStorage.removeItem('wallet_chain');
  },

  // Helpers
  shortenAddress(addr) {
    if (!addr) return '0x...';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  },

  getNetworkName() {
    if (this.isDevMode && localStorage.getItem('wallet_provider') === 'dev') {
      return 'Base (Dev)';
    }
    return this.CHAINS[this.chainId] || `Chain ${this.chainId}`;
  },

  isOnBase() {
    return this.chainId === this.BASE_CHAIN_ID || this.chainId === this.BASE_TESTNET_CHAIN_ID;
  }
};

window.BaseWallet = BaseWallet;
// =====================
// WALLET CONNECTION - BASE NETWORK
// =====================

const WalletManager = {
  address: null,
  signature: null,
  isConnected: false,

  // Base Mainnet configuration
  BASE_CHAIN: {
    chainId: '0x2105', // 8453 in hex
    chainName: 'Base',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org']
  },

  // Base Sepolia Testnet (for testing)
  BASE_SEPOLIA_CHAIN: {
    chainId: '0x14a34', // 84532 in hex
    chainName: 'Base Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org']
  },

  // Use testnet for development, mainnet for production
  TARGET_CHAIN: null, // Will be set in init

  init(useTestnet = false) {
    this.TARGET_CHAIN = useTestnet ? this.BASE_SEPOLIA_CHAIN : this.BASE_CHAIN;
  },

  // Check if MetaMask is installed
  isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  },

  // Get current chain ID
  async getCurrentChainId() {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return chainId;
    } catch (error) {
      console.error('Error getting chain ID:', error);
      return null;
    }
  },

  // Check if connected to Base network
  async isOnBaseNetwork() {
    const chainId = await this.getCurrentChainId();
    return chainId === this.TARGET_CHAIN.chainId;
  },

  // Switch to Base network
  async switchToBase() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.TARGET_CHAIN.chainId }]
      });
      return true;
    } catch (switchError) {
      // Chain not added to MetaMask, try to add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [this.TARGET_CHAIN]
          });
          return true;
        } catch (addError) {
          throw new Error('Failed to add Base network to MetaMask.');
        }
      } else if (switchError.code === 4001) {
        throw new Error('Please switch to Base network to continue.');
      }
      throw switchError;
    }
  },

  // Generate message to sign
  generateSignMessage(address) {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    return {
      message: `Welcome to Snake in the Castle! 🏰🐍

Please sign this message to verify your wallet ownership.

Network: Base
Wallet: ${address}
Nonce: ${nonce}
Timestamp: ${timestamp}

This signature does not trigger any blockchain transaction or cost any gas fees.`,
      timestamp,
      nonce
    };
  },

  // Connect wallet
  async connect() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      this.address = accounts[0];

      // Check and switch to Base network
      const isOnBase = await this.isOnBaseNetwork();
      if (!isOnBase) {
        await this.switchToBase();
      }

      return this.address;

    } catch (error) {
      if (error.code === 4001) {
        throw new Error('Connection rejected. Please approve the connection request.');
      }
      throw error;
    }
  },

  // Request signature to verify ownership
  async requestSignature() {
    if (!this.address) {
      throw new Error('Wallet not connected. Please connect first.');
    }

    const { message, timestamp, nonce } = this.generateSignMessage(this.address);

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, this.address]
      });

      this.signature = signature;
      this.isConnected = true;

      // Store connection info
      this.saveSession({
        address: this.address,
        signature: this.signature,
        timestamp,
        nonce
      });

      return {
        address: this.address,
        signature: this.signature
      };

    } catch (error) {
      if (error.code === 4001) {
        throw new Error('Signature rejected. Please sign the message to verify ownership.');
      }
      throw error;
    }
  },

  // Full connection flow: connect + sign
  async connectAndSign() {
    const address = await this.connect();
    const result = await this.requestSignature();
    return result;
  },

  // Disconnect wallet
  disconnect() {
    this.address = null;
    this.signature = null;
    this.isConnected = false;
    this.clearSession();
  },

  // Save session to localStorage
  saveSession(data) {
    localStorage.setItem('walletSession', JSON.stringify(data));
  },

  // Get saved session
  getSession() {
    const session = localStorage.getItem('walletSession');
    return session ? JSON.parse(session) : null;
  },

  // Clear session
  clearSession() {
    localStorage.removeItem('walletSession');
  },

  // Get shortened address for display
  getShortAddress(address = this.address) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  },

  // Get network name
  getNetworkName() {
    return this.TARGET_CHAIN.chainName;
  },

  // Setup event listeners for account changes
  setupEventListeners(callbacks = {}) {
    if (!this.isMetaMaskInstalled()) return;

    // Account changed
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
        if (callbacks.onDisconnect) callbacks.onDisconnect();
      } else if (accounts[0] !== this.address) {
        this.address = accounts[0];
        this.signature = null;
        this.isConnected = false;
        if (callbacks.onAccountChange) callbacks.onAccountChange(accounts[0]);
      }
    });

    // Chain changed
    window.ethereum.on('chainChanged', async (chainId) => {
      if (chainId !== this.TARGET_CHAIN.chainId) {
        if (callbacks.onWrongNetwork) {
          callbacks.onWrongNetwork(chainId);
        } else {
          // Auto-switch back to Base
          try {
            await this.switchToBase();
          } catch (e) {
            console.error('Failed to switch back to Base:', e);
          }
        }
      }
      if (callbacks.onChainChange) callbacks.onChainChange(chainId);
    });

    // Disconnect event
    window.ethereum.on('disconnect', () => {
      this.disconnect();
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    });
  },

  // Check if already connected (from previous session)
  async checkExistingConnection() {
    if (!this.isMetaMaskInstalled()) return null;

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });

      if (accounts.length > 0) {
        const session = this.getSession();
        if (session && session.address.toLowerCase() === accounts[0].toLowerCase()) {
          // Check if on Base network
          const isOnBase = await this.isOnBaseNetwork();
          if (!isOnBase) {
            await this.switchToBase();
          }

          this.address = accounts[0];
          this.signature = session.signature;
          this.isConnected = true;
          return {
            address: this.address,
            signature: this.signature
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error checking existing connection:', error);
      return null;
    }
  }
};

// Initialize with mainnet (set to true for testnet)
WalletManager.init(false);

// Export for use in other files
window.WalletManager = WalletManager;
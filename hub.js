// hub.js - Fast loading hub

const Hub = {
  devMode: false,

  // Initialize - show UI immediately
  init() {
    console.log('🎮 Hub init');

    this.devMode = this.checkDevMode();

    // 1. Hide loading instantly
    this.hideLoading();

    // 2. Show connect screen immediately
    this.showConnect();

    // 3. Setup events
    this.setupEvents();

    // 4. Try auto-reconnect in background (non-blocking)
    this.tryAutoReconnect();

    // 5. Show dev badge if needed
    if (this.devMode) this.showDevBadge();
  },

  checkDevMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const isLocalhost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    return urlParams.get('dev') === 'true' || localStorage.getItem('devMode') === 'true' || isLocalhost;
  },

  hideLoading() {
    const el = document.getElementById('loadingScreen');
    if (el) el.style.display = 'none';
  },

  // Try reconnect with timeout (non-blocking)
  async tryAutoReconnect() {
    try {
      const connected = await Promise.race([
        BaseWallet.init(),
        new Promise(resolve => setTimeout(() => resolve(false), 2000))
      ]);

      if (connected) {
        this.showHub();
      }
    } catch (e) {
      console.log('Auto reconnect skipped');
    }
  },

  setupEvents() {
    // Connect buttons
    document.getElementById('connectBase')?.addEventListener('click', () => this.connect());
    document.getElementById('connectCoinbase')?.addEventListener('click', () => this.connect());
    document.getElementById('connectOther')?.addEventListener('click', () => this.connect());
    document.getElementById('connectDev')?.addEventListener('click', () => this.connectDev());

    // Disconnect
    document.getElementById('disconnectBtn')?.addEventListener('click', () => this.disconnect());

    // Games
    document.querySelectorAll('.game-card:not(.coming-soon)').forEach(card => {
      card.addEventListener('click', () => this.openGame(card.dataset.game));
    });

    // Wallet events
    window.addEventListener('walletDisconnected', () => this.showConnect());
    window.addEventListener('walletChanged', () => this.updateUI());
    window.addEventListener('chainChanged', () => this.updateUI());

    // Dev toggle: Ctrl+Shift+D
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDevMode();
      }
    });
  },

  // Connect real wallet
  async connect() {
    if (typeof window.ethereum === 'undefined') {
      this.toast('❌ No wallet found. Use Dev Wallet.');
      return;
    }

    const btns = ['connectBase', 'connectCoinbase', 'connectOther'];
    btns.forEach(id => this.setLoading(id, true));

    try {
      await BaseWallet.connectWallet();
      this.showHub();
      this.toast('✅ Connected!');
    } catch (e) {
      console.error(e);
      const msg = e.message?.includes('User rejected') ? 'Cancelled' : (e.message || 'Failed');
      this.toast('❌ ' + msg);
    } finally {
      btns.forEach(id => this.setLoading(id, false));
    }
  },

  // Connect dev wallet
  connectDev() {
    this.setLoading('connectDev', true);

    setTimeout(() => {
      BaseWallet.address = '0xDEV' + '0'.repeat(36) + 'TEST';
      BaseWallet.chainId = 8453;
      BaseWallet.profile = { name: '🔧 Dev Tester', avatar: null };

      localStorage.setItem('wallet_address', BaseWallet.address);
      localStorage.setItem('wallet_provider', 'dev');
      localStorage.setItem('devMode', 'true');

      this.devMode = true;
      this.setLoading('connectDev', false);
      this.showHub();
      this.toast('🔧 Dev connected!');
    }, 300);
  },

  setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.disabled = loading;
    const title = btn.querySelector('.wallet-btn-title');
    if (!title) return;

    if (loading) {
      btn.dataset.text = title.textContent;
      title.textContent = 'Connecting...';
    } else if (btn.dataset.text) {
      title.textContent = btn.dataset.text;
    }
  },

  disconnect() {
    BaseWallet.disconnect();
    this.showConnect();
    this.toast('Disconnected');
  },

  showConnect() {
    document.getElementById('connectScreen')?.classList.remove('hidden');
    document.getElementById('hubScreen')?.classList.add('hidden');

    const devBtn = document.getElementById('connectDev');
    if (devBtn) devBtn.style.display = this.devMode ? 'flex' : 'none';
  },

  showHub() {
    document.getElementById('connectScreen')?.classList.add('hidden');
    document.getElementById('hubScreen')?.classList.remove('hidden');
    this.updateUI();
    this.loadStats();
  },

  updateUI() {
    const addr = BaseWallet.address;
    const profile = BaseWallet.profile;

    // Profile
    const nameEl = document.getElementById('profileName');
    const addrEl = document.getElementById('profileAddress');
    const avatarEl = document.getElementById('avatarFallback');

    if (nameEl) nameEl.textContent = profile?.name || 'Player';
    if (addrEl) addrEl.textContent = BaseWallet.shortenAddress(addr);
    if (avatarEl) avatarEl.textContent = this.devMode ? '🔧' : '👤';

    // Network
    const netEl = document.getElementById('networkName');
    const dotEl = document.querySelector('.network-dot');

    if (netEl) netEl.textContent = BaseWallet.getNetworkName();

    const isBase = BaseWallet.isOnBase();
    const color = this.devMode ? '#f59e0b' : (isBase ? '#10b981' : '#f59e0b');

    if (dotEl) dotEl.style.background = color;
    if (netEl) netEl.style.color = color;
  },

  loadStats() {
    const addr = BaseWallet.address;
    if (!addr) return;

    // Load from localStorage only (fast)
    const key = this.devMode ? `dev_stats_${addr}` : `stats_${addr}`;
    const saved = localStorage.getItem(key);

    const stats = saved ? JSON.parse(saved) : {
      totalCoins: this.devMode ? 1000 : 0,
      totalGames: this.devMode ? 5 : 0,
      totalScore: this.devMode ? 500 : 0,
      snakeHighScore: this.devMode ? 300 : 0,
      spaceHighScore: this.devMode ? 200 : 0
    };

    document.getElementById('totalCoins').textContent = stats.totalCoins || 0;
    document.getElementById('totalGames').textContent = stats.totalGames || 0;
    document.getElementById('totalScore').textContent = stats.totalScore || 0;
    document.getElementById('snakeHighScore').textContent = stats.snakeHighScore || 0;
    document.getElementById('spaceHighScore').textContent = stats.spaceHighScore || 0;
  },

 openGame(game) {
  const urls = {
    'snake': 'games/snake/',
    'space-ship': 'games/space-ship/'
  };

  if (!urls[game]) return;

  // базовый путь репозитория (snake-in-the-castle)
  const basePath = window.location.pathname.replace(/\/[^\/]*$/, '');

  const url = new URL(`${basePath}/${urls[game]}`, window.location.origin);

  if (this.devMode) {
    url.searchParams.set('dev', 'true');
  }

  window.location.href = url.toString();
},


  toggleDevMode() {
    this.devMode = !this.devMode;
    localStorage.setItem('devMode', this.devMode.toString());
    this.toast(this.devMode ? '🔧 Dev ON' : '🔧 Dev OFF');
    setTimeout(() => location.reload(), 300);
  },

  showDevBadge() {
    if (document.querySelector('.dev-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'dev-badge';
    badge.textContent = '🔧 DEV';
    badge.title = 'Ctrl+Shift+D';
    badge.onclick = () => this.toggleDevMode();
    document.body.appendChild(badge);
  },

  toast(msg, ms = 2500) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div');
    t.className = 'toast show';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
};

// Start immediately
document.addEventListener('DOMContentLoaded', () => Hub.init());
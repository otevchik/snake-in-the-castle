// hub.js - Fast loading hub

const Hub = {
  devMode: false,

  init() {
    console.log('🎮 Hub init');
    
    this.devMode = this.checkDevMode();
    this.hideLoading();
    this.showConnect();
    this.setupEvents();
    this.tryAutoReconnect();
    
    if (this.devMode) this.showDevBadge();
  },

  checkDevMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const hostname = window.location.hostname;
    
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const hasDevParam = urlParams.get('dev') === 'true';
    const isDevProvider = localStorage.getItem('wallet_provider') === 'dev';
    
    return hasDevParam || (isLocalhost && isDevProvider);
  },

  hideLoading() {
    const el = document.getElementById('loadingScreen');
    if (el) el.style.display = 'none';
  },

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
    document.getElementById('connectBase')?.addEventListener('click', () => this.connect());
    document.getElementById('connectCoinbase')?.addEventListener('click', () => this.connect());
    document.getElementById('connectOther')?.addEventListener('click', () => this.connect());
    document.getElementById('connectDev')?.addEventListener('click', () => this.connectDev());
    document.getElementById('disconnectBtn')?.addEventListener('click', () => this.disconnect());
    
    document.querySelectorAll('.game-card:not(.coming-soon)').forEach(card => {
      card.addEventListener('click', () => this.openGame(card.dataset.game));
    });
    
    window.addEventListener('walletDisconnected', () => this.showConnect());
    window.addEventListener('walletChanged', () => this.updateUI());
    window.addEventListener('chainChanged', () => this.updateUI());
    
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDevMode();
      }
    });
  },

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
    
    const nameEl = document.getElementById('profileName');
    const addrEl = document.getElementById('profileAddress');
    const avatarEl = document.getElementById('avatarFallback');
    
    if (nameEl) nameEl.textContent = profile?.name || 'Player';
    if (addrEl) addrEl.textContent = BaseWallet.shortenAddress(addr);
    if (avatarEl) avatarEl.textContent = this.devMode ? '🔧' : '👤';
    
    const netEl = document.getElementById('networkName');
    const dotEl = document.querySelector('.network-dot');
    
    if (netEl) netEl.textContent = BaseWallet.getNetworkName();
    
    const isBase = BaseWallet.isOnBase();
    const color = this.devMode ? '#f59e0b' : (isBase ? '#10b981' : '#f59e0b');
    
    if (dotEl) dotEl.style.background = color;
    if (netEl) netEl.style.color = color;
  },

  // ИСПРАВЛЕНО: Загружаем из Supabase
  async loadStats() {
    const addr = BaseWallet.address;
    if (!addr) {
      console.log('No address, skipping stats');
      return;
    }
    
    console.log('Loading stats for:', addr);
    console.log('DevMode:', this.devMode);

    // Если DEV режим - показываем тестовые данные
    if (this.devMode) {
      console.log('DEV mode - using mock stats');
      this.renderStats({
        totalCoins: 1000,
        totalGames: 5,
        totalStars: 15,
        snakeHighScore: 300,
        spaceHighScore: 200
      });
      return;
    }

    // Загружаем из Supabase
    try {
      console.log('Fetching from Supabase...');
      
      const [snakeData, spaceData] = await Promise.all([
        this.fetchSupabase('web3_players', addr),
        this.fetchSupabase('space_web3_players', addr)
      ]);
      
      console.log('Snake data:', snakeData);
      console.log('Space data:', spaceData);
      
      // ИСПРАВЛЕНО: Сначала парсим данные
      const snake = Array.isArray(snakeData) && snakeData[0] ? snakeData[0] : {};
      const space = Array.isArray(spaceData) && spaceData[0] ? spaceData[0] : {};
      
      console.log('Snake parsed:', snake);
      console.log('Space parsed:', space);
      
      // ИСПРАВЛЕНО: Теперь создаём stats после парсинга
      const stats = {
        totalCoins: (snake.coins || 0) + (space.coins || 0),
        totalGames: (snake.games_played || 0) + (space.games_played || 0),
        totalStars: (snake.stars || 0) + (space.stars || 0),
        snakeHighScore: snake.high_score || 0,
        spaceHighScore: space.high_score || 0
      };
      
      console.log('Final stats:', stats);
      
      this.renderStats(stats);
      
      // Кэшируем
      const key = `stats_${addr}`;
      localStorage.setItem(key, JSON.stringify(stats));
      
      console.log('Stats rendered!');
    } catch (e) {
      console.error('Error loading stats:', e);
      // Показываем нули при ошибке
      this.renderStats({
        totalCoins: 0,
        totalGames: 0,
        totalStars: 0,
        snakeHighScore: 0,
        spaceHighScore: 0
      });
    }
  },

  // Вспомогательная функция для рендера
  renderStats(stats) {
    const coinsEl = document.getElementById('totalCoins');
    const gamesEl = document.getElementById('totalGames');
    const starsEl = document.getElementById('totalScore'); // В HTML это totalScore, но показываем звёзды
    const snakeEl = document.getElementById('snakeHighScore');
    const spaceEl = document.getElementById('spaceHighScore');
    
    if (coinsEl) coinsEl.textContent = stats.totalCoins || 0;
    if (gamesEl) gamesEl.textContent = stats.totalGames || 0;
    if (starsEl) starsEl.textContent = stats.totalStars || 0;
    if (snakeEl) snakeEl.textContent = stats.snakeHighScore || 0;
    if (spaceEl) spaceEl.textContent = stats.spaceHighScore || 0;
    
    console.log('Rendered:', {
      coins: stats.totalCoins,
      games: stats.totalGames,
      stars: stats.totalStars
    });
  },

  // Простой fetch для Supabase
  async fetchSupabase(table, address) {
    const SUPABASE_URL = 'https://hiicndghblbsrgbmtufd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWNuZGdoYmxic3JnYm10dWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTQ5NzIsImV4cCI6MjA4NDQ3MDk3Mn0.cX6CU4bl3jHbFRw75I0LyMpPMEK2GzYoDcmeQa05kMI';
    
    const url = `${SUPABASE_URL}/rest/v1/${table}?wallet_address=eq.${address.toLowerCase()}&select=*`;
    
    console.log('Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      console.error('Supabase error:', response.status, response.statusText);
      return [];
    }
    
    return response.json();
  },

  openGame(game) {
    const urls = {
      'snake': 'games/snake/',
      'space-ship': 'games/space-ship/'
    };
    
    if (!urls[game]) return;
    
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

document.addEventListener('DOMContentLoaded', () => Hub.init());
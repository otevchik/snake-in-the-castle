// game.js - Space Ship Game (Base App version)

// =====================
// GAME CONFIGURATION
// =====================

const ALL_SHIPS = [
  { id: 'fighter', name: 'Fighter', icon: '🚀', colors: ['#00d4ff', '#7b2cbf'], rarity: 'common', weight: 0, starter: true },
  { id: 'shuttle', name: 'Shuttle', icon: '🛸', colors: ['#4ade80', '#22c55e'], rarity: 'common', weight: 0, starter: true },
  { id: 'rocket', name: 'Rocket', icon: '🚁', colors: ['#f59e0b', '#ea580c'], rarity: 'common', weight: 25 },
  { id: 'satellite', name: 'Satellite', icon: '🛰️', colors: ['#64748b', '#475569'], rarity: 'common', weight: 22 },
  { id: 'jet', name: 'Jet', icon: '✈️', colors: ['#3b82f6', '#1d4ed8'], rarity: 'uncommon', weight: 18 },
  { id: 'meteor', name: 'Meteor', icon: '☄️', colors: ['#ef4444', '#dc2626'], rarity: 'uncommon', weight: 15 },
  { id: 'star', name: 'Star Ship', icon: '⭐', colors: ['#fbbf24', '#f59e0b'], rarity: 'rare', weight: 10 },
  { id: 'alien', name: 'Alien', icon: '👽', colors: ['#22c55e', '#16a34a'], rarity: 'rare', weight: 8 },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈', colors: ['#ec4899', '#8b5cf6'], rarity: 'epic', weight: 5 },
  { id: 'galaxy', name: 'Galaxy', icon: '🌌', colors: ['#6366f1', '#4f46e5'], rarity: 'epic', weight: 4 },
  { id: 'blackhole', name: 'Black Hole', icon: '🕳️', colors: ['#1f2937', '#111827'], rarity: 'legendary', weight: 2 },
  { id: 'supernova', name: 'Supernova', icon: '💫', colors: ['#fcd34d', '#f472b6'], rarity: 'legendary', weight: 1 }
];

const SHOP_ITEMS = [
  { id: 'double_coins', name: 'Double Coins', icon: '💰', price: 500, description: '2x coins this game' },
  { id: 'extra_life', name: 'Extra Life', icon: '❤️', price: 750, description: '+1 life' },
  { id: 'rapid_fire', name: 'Rapid Fire', icon: '🔥', price: 600, description: 'Faster shooting' },
  { id: 'shield', name: 'Shield', icon: '🛡️', price: 1000, description: 'Block one hit' },
  { id: 'magnet', name: 'Coin Magnet', icon: '🧲', price: 800, description: 'Attract coins' },
  { id: 'big_bullets', name: 'Big Bullets', icon: '💣', price: 900, description: 'Larger projectiles' }
];

const MYSTERY_CRATE = {
  id: 'mystery_crate',
  name: 'Mystery Crate',
  icon: '📦',
  price: 1000,
  description: 'Random ship! Duplicate = 25% refund'
};

const RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b'
};

// =====================
// GAME STATE
// =====================

let playerData = null;
let currentLeaderboardPage = 1;
let currentGameSession = null;
let selectedPerks = [];
let activePerks = {};
const MAX_PERKS = 3;

// Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

// Game variables
let gameRunning = false;
let animationId = null;
let score = 0;
let lives = 3;
let coinsCollected = 0;
let asteroidsDestroyed = 0;
let coinMultiplier = 1;
let hasShield = false;
let hasMagnet = false;
let rapidFire = false;
let bigBullets = false;

let ship = { x: 180, y: 520, width: 40, height: 40, speed: 6 };
let bullets = [];
let asteroids = [];
let coins = [];
let particles = [];
let stars = [];

let lastShot = 0;
let shootCooldown = 300;
let currentShipIcon = '🚀';
let currentShipColors = ['#00d4ff', '#7b2cbf'];

let keys = { left: false, right: false };

// =====================
// HELPER: Check DEV mode
// =====================

function isDevMode() {
  return WalletApp && WalletApp.devMode === true;
}

// =====================
// PERKS SYSTEM
// =====================

function renderPerksSelection() {
  const container = document.getElementById('perksGrid');
  container.innerHTML = '';
  
  if (!playerData || !playerData.inventory || playerData.inventory.length === 0) {
    container.innerHTML = '<p class="empty-text">No power-ups available. Buy some from the Shop!</p>';
    return;
  }
  
  playerData.inventory.forEach(invItem => {
    const itemData = SHOP_ITEMS.find(i => i.id === invItem.id);
    if (!itemData) return;
    
    const isSelected = selectedPerks.includes(invItem.id);
    const isDisabled = !isSelected && selectedPerks.length >= MAX_PERKS;
    
    const div = document.createElement('div');
    div.className = `perk-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;
    div.innerHTML = `
      <span class="item-quantity">x${invItem.quantity}</span>
      <div class="item-icon">${itemData.icon}</div>
      <h3>${itemData.name}</h3>
      <p class="item-desc">${itemData.description}</p>
    `;
    
    if (!isDisabled || isSelected) {
      div.addEventListener('click', () => {
        WalletApp.hapticImpact('light');
        togglePerkSelection(invItem.id);
      });
    }
    
    container.appendChild(div);
  });
  
  updateSelectedPerksList();
}

function togglePerkSelection(perkId) {
  const index = selectedPerks.indexOf(perkId);
  if (index > -1) {
    selectedPerks.splice(index, 1);
  } else if (selectedPerks.length < MAX_PERKS) {
    const invItem = playerData.inventory.find(i => i.id === perkId);
    if (invItem && invItem.quantity > 0) {
      selectedPerks.push(perkId);
    }
  }
  renderPerksSelection();
}

function updateSelectedPerksList() {
  const container = document.getElementById('selectedPerksList');
  const countEl = document.getElementById('selectedCount');
  countEl.textContent = selectedPerks.length;
  
  if (selectedPerks.length === 0) {
    container.innerHTML = '<span class="empty-text">No power-ups selected</span>';
    return;
  }
  
  container.innerHTML = '';
  selectedPerks.forEach(perkId => {
    const itemData = SHOP_ITEMS.find(i => i.id === perkId);
    if (!itemData) return;
    
    const badge = document.createElement('div');
    badge.className = 'selected-perk-badge';
    badge.innerHTML = `
      <span>${itemData.icon}</span>
      <span>${itemData.name}</span>
      <span class="remove-perk" data-perk="${perkId}">✕</span>
    `;
    container.appendChild(badge);
  });
  
  container.querySelectorAll('.remove-perk').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedPerks = selectedPerks.filter(p => p !== btn.dataset.perk);
      WalletApp.hapticImpact('light');
      renderPerksSelection();
    });
  });
}

async function consumeSelectedPerks() {
  // В DEV режиме не расходуем предметы
  if (isDevMode()) {
    console.log('🔧 DEV MODE: Skipping perk consumption');
    return;
  }
  
  for (const perkId of selectedPerks) {
    await SupabaseSpace.consumeItem(WalletApp.getUserId(), perkId);
  }
  playerData = await SupabaseSpace.getPlayer(WalletApp.getUserId());
}

function initializeActivePerks() {
  activePerks = {};
  selectedPerks.forEach(perkId => {
    activePerks[perkId] = { active: true, used: false };
  });
  renderActivePerksBar();
}

function renderActivePerksBar() {
  const container = document.getElementById('activePerksBar');
  if (selectedPerks.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = '';
  selectedPerks.forEach(perkId => {
    const itemData = SHOP_ITEMS.find(i => i.id === perkId);
    if (!itemData) return;
    
    const perk = activePerks[perkId];
    const div = document.createElement('div');
    div.className = `active-perk ${perk && perk.used ? 'used' : ''}`;
    div.innerHTML = `<span>${itemData.icon}</span><span>${itemData.name}</span>`;
    container.appendChild(div);
  });
}

function usePerk(perkId) {
  if (!activePerks[perkId] || activePerks[perkId].used) return false;
  activePerks[perkId].used = true;
  activePerks[perkId].active = false;
  renderActivePerksBar();
  return true;
}

function hasPerk(perkId) {
  return activePerks[perkId] && activePerks[perkId].active && !activePerks[perkId].used;
}

document.getElementById('startGameBtn').addEventListener('click', async () => {
  WalletApp.hapticImpact('medium');
  await consumeSelectedPerks();
  showScreen('gameScreen');
});

// =====================
// SCREEN NAVIGATION
// =====================

async function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  
  if (screenId === 'gameScreen') {
    WalletApp.enableClosingConfirmation();
    initializeActivePerks();
    await startNewGame();
  } else {
    WalletApp.disableClosingConfirmation();
    stopGame();
  }
  
  if (screenId === 'perksScreen') {
    selectedPerks = [];
    activePerks = {};
    document.getElementById('selectedCount').textContent = '0';
    document.getElementById('selectedPerksList').innerHTML = '<span class="empty-text">No power-ups selected</span>';
    if (WalletApp.getUserId()) {
      playerData = await SupabaseSpace.getPlayer(WalletApp.getUserId());
    }
    renderPerksSelection();
  }
  
  if (screenId === 'leaderboardScreen') {
    currentLeaderboardPage = 1;
    await renderLeaderboard();
  }
  
  if (screenId === 'shopScreen') await renderShop();
  if (screenId === 'skinsScreen') await renderSkins();
  if (screenId === 'inventoryScreen') renderInventory();
  
  if (screenId === 'menuScreen') {
    selectedPerks = [];
    activePerks = {};
    if (WalletApp.getUserId()) {
      playerData = await SupabaseSpace.getPlayer(WalletApp.getUserId());
    }
    await updateMenuUI();
  }
}

document.querySelectorAll('[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => {
    WalletApp.hapticImpact('light');
    showScreen(btn.dataset.screen);
  });
});

// =====================
// TOAST & MODAL
// =====================

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type} show`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function showModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// =====================
// UI HANDLERS
// =====================

async function updateMenuUI() {
  if (!WalletApp.user) return;
  
  document.getElementById('walletAddress').textContent = WalletApp.getShortAddress();
  
  const avatarEl = document.getElementById('walletAvatar');
  if (avatarEl) avatarEl.textContent = WalletApp.devMode ? '🔧' : '👤';
  
  if (playerData) {
    document.getElementById('playerCoins').textContent = playerData.coins || 0;
    document.getElementById('playerHighScore').textContent = playerData.high_score || 0;
    document.getElementById('gamesPlayed').textContent = playerData.games_played || 0;
    document.getElementById('asteroidsDestroyed').textContent = playerData.total_asteroids || 0;
    
    const shopCoins = document.getElementById('shopCoins');
    if (shopCoins) shopCoins.textContent = playerData.coins || 0;
  }
}

function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || '#9ca3af';
}

// =====================
// LEADERBOARD
// =====================

async function renderLeaderboard() {
  const container = document.getElementById('leaderboardList');
  const data = await SupabaseSpace.getLeaderboard(currentLeaderboardPage, 10);
  const myAddress = WalletApp.getUserId()?.toLowerCase();
  
  container.innerHTML = '';
  
  if (!data || !data.players || data.players.length === 0) {
    container.innerHTML = '<p class="empty-text">No pilots yet. Be the first!</p>';
    return;
  }
  
  data.players.forEach((player, index) => {
    const globalRank = (currentLeaderboardPage - 1) * 10 + index + 1;
    const isMe = myAddress && player.walletAddress.toLowerCase() === myAddress;
    
    let rankClass = '';
    let rankIcon = '';
    if (globalRank === 1) { rankClass = 'gold'; rankIcon = '🥇'; }
    else if (globalRank === 2) { rankClass = 'silver'; rankIcon = '🥈'; }
    else if (globalRank === 3) { rankClass = 'bronze'; rankIcon = '🥉'; }
    
    const item = document.createElement('div');
    item.className = `leaderboard-item ${rankClass} ${isMe ? 'current' : ''}`;
    item.innerHTML = `
      <span class="rank">${globalRank}</span>
      <span class="rank-icon">${rankIcon}</span>
      <span class="player">${player.displayName}${isMe ? ' 👈' : ''}</span>
      <span class="lb-score">${player.highScore}</span>
    `;
    container.appendChild(item);
  });
  
  document.getElementById('pageInfo').textContent = `${data.currentPage} / ${data.totalPages}`;
  document.getElementById('prevPageBtn').disabled = data.currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = data.currentPage >= data.totalPages;
}

document.getElementById('prevPageBtn').addEventListener('click', async () => {
  if (currentLeaderboardPage > 1) {
    currentLeaderboardPage--;
    await renderLeaderboard();
  }
});

document.getElementById('nextPageBtn').addEventListener('click', async () => {
  currentLeaderboardPage++;
  await renderLeaderboard();
});

// =====================
// SHOP
// =====================

async function renderShop() {
  const container = document.getElementById('shopGrid');
  const caseSection = document.getElementById('caseSection');
  
  document.getElementById('shopCoins').textContent = playerData?.coins || 0;
  
  const canAfford = playerData && playerData.coins >= MYSTERY_CRATE.price;
  caseSection.innerHTML = `
    <div class="case-item">
      <div class="item-icon">${MYSTERY_CRATE.icon}</div>
      <h3>${MYSTERY_CRATE.name}</h3>
      <p class="item-desc">${MYSTERY_CRATE.description}</p>
      <p class="item-price">💰 ${MYSTERY_CRATE.price}</p>
      <button id="openCaseBtn" class="open-case-btn" ${!canAfford ? 'disabled' : ''}>
        ${canAfford ? '🎲 Open Crate' : 'Not enough'}
      </button>
    </div>
  `;
  
  document.getElementById('openCaseBtn').addEventListener('click', () => {
    WalletApp.hapticImpact('heavy');
    openMysteryCrate();
  });
  
  container.innerHTML = '';
  
  SHOP_ITEMS.forEach(item => {
    const canBuy = playerData && playerData.coins >= item.price;
    
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <div class="item-icon">${item.icon}</div>
      <h3>${item.name}</h3>
      <p class="item-desc">${item.description}</p>
      <p class="item-price">💰 ${item.price}</p>
      <button class="buy-btn" data-item="${item.id}" data-price="${item.price}" ${!canBuy ? 'disabled' : ''}>
        ${canBuy ? 'Buy' : 'Not enough'}
      </button>
    `;
    container.appendChild(div);
  });
  
  container.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      WalletApp.hapticImpact('medium');
      
      // В DEV режиме блокируем покупки
      if (isDevMode()) {
        showToast('🔧 DEV: Purchase blocked', 'info');
        console.log('🔧 DEV MODE: Would buy item:', btn.dataset.item);
        return;
      }
      
      const result = await SupabaseSpace.buyItem(WalletApp.getUserId(), btn.dataset.item, parseInt(btn.dataset.price));
      if (result.success) {
        playerData = result.player;
        showToast('Item purchased! 🎉', 'success');
        await renderShop();
        await updateMenuUI();
      } else {
        showToast(result.error, 'error');
      }
    });
  });
}

async function openMysteryCrate() {
  // В DEV режиме блокируем открытие кейсов
  if (isDevMode()) {
    showToast('🔧 DEV: Crate opening blocked', 'info');
    console.log('🔧 DEV MODE: Would open crate');
    return;
  }
  
  const result = await SupabaseSpace.openCrate(WalletApp.getUserId(), MYSTERY_CRATE.price, ALL_SHIPS);
  
  if (!result.success) {
    showToast(result.error, 'error');
    return;
  }
  
  playerData = result.player;
  
  showModal('caseModal');
  document.getElementById('caseAnimation').style.display = 'block';
  document.getElementById('caseResult').style.display = 'none';
  
  setTimeout(() => {
    WalletApp.hapticImpact('heavy');
    document.getElementById('caseAnimation').style.display = 'none';
    document.getElementById('caseResult').style.display = 'block';
    
    const ship = result.ship;
    document.getElementById('resultIcon').style.background = `linear-gradient(135deg, ${ship.colors[0]}, ${ship.colors[1]})`;
    document.getElementById('resultIcon').textContent = ship.icon;
    document.getElementById('resultTitle').textContent = ship.name;
    document.getElementById('resultRarity').textContent = ship.rarity;
    document.getElementById('resultRarity').style.color = getRarityColor(ship.rarity);
    
    document.getElementById('resultMessage').textContent = result.isDuplicate
      ? `Duplicate! +${result.refundAmount} coins back.`
      : 'New ship unlocked!';
    
    renderShop();
    updateMenuUI();
  }, 2000);
}

document.getElementById('closeModalBtn').addEventListener('click', () => hideModal('caseModal'));

// =====================
// INVENTORY
// =====================

function renderInventory() {
  const container = document.getElementById('inventoryGrid');
  const emptyMsg = document.getElementById('emptyInventory');
  
  if (!playerData || !playerData.inventory || playerData.inventory.length === 0) {
    container.style.display = 'none';
    emptyMsg.classList.remove('hidden');
    return;
  }
  
  container.style.display = 'grid';
  emptyMsg.classList.add('hidden');
  container.innerHTML = '';
  
  playerData.inventory.forEach(invItem => {
    const itemData = SHOP_ITEMS.find(i => i.id === invItem.id);
    if (!itemData) return;
    
    const div = document.createElement('div');
    div.className = 'inventory-item';
    div.innerHTML = `
      <div class="item-icon">${itemData.icon}</div>
      <h3>${itemData.name}</h3>
      <p class="item-quantity">x${invItem.quantity}</p>
      <p class="item-desc">${itemData.description}</p>
    `;
    container.appendChild(div);
  });
}

// =====================
// SKINS (SHIPS)
// =====================

async function renderSkins() {
  const container = document.getElementById('skinsGrid');
  
  document.getElementById('skinsCoins').textContent = playerData?.coins || 0;
  
  const ownedShips = playerData?.ownedShips || ['fighter', 'shuttle'];
  const equippedId = playerData?.equipped_ship || 'fighter';
  
  const equipped = ALL_SHIPS.find(s => s.id === equippedId) || ALL_SHIPS[0];
  document.getElementById('equippedSkinName').textContent = equipped.name;
  document.querySelector('.preview-ship').textContent = equipped.icon;
  
  container.innerHTML = '';
  
  ALL_SHIPS.forEach(shipItem => {
    const owned = ownedShips.includes(shipItem.id);
    const isEquipped = equippedId === shipItem.id;
    
    const div = document.createElement('div');
    div.className = `skin-item ${isEquipped ? 'equipped' : ''} ${!owned ? 'locked' : ''}`;
    
    div.innerHTML = `
      <div class="skin-icon" style="background: linear-gradient(135deg, ${shipItem.colors[0]}, ${shipItem.colors[1]})">
        ${owned ? shipItem.icon : '🔒'}
      </div>
      <h3>${shipItem.name}</h3>
      <p class="skin-rarity" style="color: ${getRarityColor(shipItem.rarity)}">${shipItem.rarity}</p>
      <span class="skin-status ${isEquipped ? 'equipped' : ''}">${isEquipped ? '✓ Equipped' : (owned ? 'Equip' : '📦 Crate')}</span>
    `;
    
    div.addEventListener('click', () => {
      WalletApp.hapticImpact('light');
      if (isEquipped) return;
      if (owned) {
        equipShip(shipItem);
      } else {
        showToast('Get ships from Mystery Crate!', 'info');
      }
    });
    
    container.appendChild(div);
  });
}

async function equipShip(shipItem) {
  // В DEV режиме блокируем смену скина в БД
  if (isDevMode()) {
    showToast('🔧 DEV: Ship equipped (not saved)', 'info');
    console.log('🔧 DEV MODE: Would equip ship:', shipItem.id);
    // Но можно обновить локально для тестирования
    currentShipIcon = shipItem.icon;
    currentShipColors = shipItem.colors;
    return;
  }
  
  const result = await SupabaseSpace.equipShip(WalletApp.getUserId(), shipItem.id);
  if (result.success) {
    playerData = result.player;
    showToast(`${shipItem.name} equipped!`, 'success');
    await renderSkins();
  }
}

// =====================
// GAME LOGIC
// =====================

function createStars() {
  stars = [];
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 2 + 1
    });
  }
}

function stopGame() {
  gameRunning = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

async function startNewGame() {
  // В DEV режиме не создаём сессию в БД
  if (isDevMode()) {
    console.log('🔧 DEV MODE: Skipping game session creation');
    currentGameSession = { sessionToken: 'dev-session-' + Date.now() };
  } else {
    try {
      currentGameSession = await SupabaseSpace.startGameSession(WalletApp.getUserId());
    } catch (e) {
      currentGameSession = null;
    }
  }
  
  initGame();
  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

function initGame() {
  ship = { x: 180, y: 520, width: 40, height: 40, speed: 6 };
  bullets = [];
  asteroids = [];
  coins = [];
  particles = [];
  
  score = 0;
  lives = 3;
  coinsCollected = 0;
  asteroidsDestroyed = 0;
  coinMultiplier = 1;
  hasShield = false;
  hasMagnet = false;
  rapidFire = false;
  bigBullets = false;
  shootCooldown = 300;
  
  // Apply perks
  if (hasPerk('double_coins')) {
    coinMultiplier = 2;
    showToast('Double Coins! 💰x2', 'success');
  }
  if (hasPerk('extra_life')) {
    lives = 4;
    showToast('Extra Life! ❤️+1', 'success');
  }
  if (hasPerk('shield')) {
    hasShield = true;
  }
  if (hasPerk('magnet')) {
    hasMagnet = true;
    showToast('Coin Magnet! 🧲', 'success');
  }
  if (hasPerk('rapid_fire')) {
    rapidFire = true;
    shootCooldown = 150;
    showToast('Rapid Fire! 🔥', 'success');
  }
  if (hasPerk('big_bullets')) {
    bigBullets = true;
    showToast('Big Bullets! 💣', 'success');
  }
  
  // Load ship
  if (playerData) {
    const equipped = ALL_SHIPS.find(s => s.id === (playerData.equipped_ship || 'fighter'));
    if (equipped) {
      currentShipIcon = equipped.icon;
      currentShipColors = equipped.colors;
    }
  }
  
  createStars();
  updateGameUI();
}

function updateGameUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('coinsCollected').textContent = coinsCollected;
  document.getElementById('lives').textContent = lives;
}

// Controls
document.querySelectorAll('.move-btn').forEach(btn => {
  const dir = btn.dataset.dir.toLowerCase();
  
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys[dir] = true;
  });
  btn.addEventListener('touchend', () => keys[dir] = false);
  btn.addEventListener('mousedown', () => keys[dir] = true);
  btn.addEventListener('mouseup', () => keys[dir] = false);
  btn.addEventListener('mouseleave', () => keys[dir] = false);
});

document.getElementById('fireBtn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  shoot();
});
document.getElementById('fireBtn').addEventListener('click', shoot);

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  shoot();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if (e.key === ' ') { e.preventDefault(); shoot(); }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
});

function shoot() {
  if (!gameRunning) return;
  
  const now = Date.now();
  if (now - lastShot < shootCooldown) return;
  lastShot = now;
  
  WalletApp.hapticImpact('light');
  
  const size = bigBullets ? 10 : 5;
  bullets.push({
    x: ship.x + ship.width / 2 - size / 2,
    y: ship.y,
    width: size,
    height: bigBullets ? 18 : 12,
    speed: 12
  });
}

function spawnAsteroid() {
  const size = 25 + Math.random() * 35;
  const speed = 1.5 + Math.random() * 2.5 + score / 1000;
  
  asteroids.push({
    x: Math.random() * (CANVAS_WIDTH - size),
    y: -size,
    width: size,
    height: size,
    speed: Math.min(speed, 8),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.1,
    health: size > 40 ? 2 : 1
  });
}

function spawnCoin(x, y) {
  coins.push({
    x: x - 10,
    y: y,
    width: 20,
    height: 20,
    speed: 2,
    rotation: 0
  });
}

function createParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 30,
      color,
      size: Math.random() * 4 + 2
    });
  }
}

function collision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function update() {
  // Move ship
  if (keys.left && ship.x > 5) ship.x -= ship.speed;
  if (keys.right && ship.x < CANVAS_WIDTH - ship.width - 5) ship.x += ship.speed;
  
  // Update stars
  stars.forEach(star => {
    star.y += star.speed;
    if (star.y > CANVAS_HEIGHT) {
      star.y = 0;
      star.x = Math.random() * CANVAS_WIDTH;
    }
  });
  
  // Update bullets
  bullets = bullets.filter(b => {
    b.y -= b.speed;
    return b.y > -b.height;
  });
  
  // Spawn asteroids
  if (Math.random() < 0.015 + score / 10000) {
    spawnAsteroid();
  }
  
  // Update asteroids
  asteroids = asteroids.filter(a => {
    a.y += a.speed;
    a.rotation += a.rotationSpeed;
    
    // Check collision with bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (collision(bullets[i], a)) {
        bullets.splice(i, 1);
        a.health--;
        createParticles(a.x + a.width/2, a.y + a.height/2, '#ff6b6b', 5);
        
        if (a.health <= 0) {
          createParticles(a.x + a.width/2, a.y + a.height/2, '#ffa500', 12);
          WalletApp.hapticImpact('medium');
          score += 10;
          asteroidsDestroyed++;
          
          if (asteroidsDestroyed % 10 === 0) {
            const bonus = 5 * coinMultiplier;
            coinsCollected += bonus;
            showToast(`+${bonus} bonus! 🎉`, 'success');
          }
          
          if (Math.random() < 0.25) {
            spawnCoin(a.x + a.width/2, a.y + a.height/2);
          }
          
          updateGameUI();
          return false;
        }
        break;
      }
    }
    
    // Check collision with ship
    if (collision(a, ship)) {
      createParticles(ship.x + ship.width/2, ship.y + ship.height/2, '#00d4ff', 10);
      
      if (hasShield && hasPerk('shield') && !activePerks['shield'].used) {
        usePerk('shield');
        hasShield = false;
        showToast('Shield blocked! 🛡️', 'info');
        return false;
      }
      
      lives--;
      WalletApp.hapticImpact('heavy');
      updateGameUI();
      
      if (lives <= 0) {
        gameOver();
      }
      return false;
    }
    
    return a.y < CANVAS_HEIGHT + a.height;
  });
  
  // Update coins
  coins = coins.filter(c => {
    c.y += c.speed;
    c.rotation += 0.1;
    
    if (hasMagnet) {
      const dx = ship.x + ship.width/2 - c.x - c.width/2;
      const dy = ship.y + ship.height/2 - c.y - c.height/2;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 120) {
        c.x += dx * 0.08;
        c.y += dy * 0.08;
      }
    }
    
    if (collision(c, ship)) {
      coinsCollected += coinMultiplier;
      WalletApp.hapticImpact('light');
      createParticles(c.x + c.width/2, c.y + c.height/2, '#ffd700', 6);
      updateGameUI();
      return false;
    }
    
    return c.y < CANVAS_HEIGHT + c.height;
  });
  
  // Update particles
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.vx *= 0.95;
    p.vy *= 0.95;
    return p.life > 0;
  });
}

function draw() {
  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Stars
  stars.forEach(star => {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  
  // Bullets
  ctx.shadowColor = '#0052ff';
  ctx.shadowBlur = 10;
  bullets.forEach(b => {
    const gradient = ctx.createLinearGradient(b.x, b.y + b.height, b.x, b.y);
    gradient.addColorStop(0, 'rgba(0, 82, 255, 0.3)');
    gradient.addColorStop(1, '#0052ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });
  ctx.shadowBlur = 0;
  
  // Asteroids
  asteroids.forEach(a => {
    ctx.save();
    ctx.translate(a.x + a.width/2, a.y + a.height/2);
    ctx.rotate(a.rotation);
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, a.width/2);
    gradient.addColorStop(0, '#8b7355');
    gradient.addColorStop(0.7, '#6b5344');
    gradient.addColorStop(1, '#4a3728');
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    ctx.arc(0, 0, a.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(-a.width/4, -a.height/4, a.width/6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });
  
  // Coins
  coins.forEach(c => {
    ctx.save();
    ctx.translate(c.x + c.width/2, c.y + c.height/2);
    ctx.rotate(c.rotation);
    
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 8;
    
    const gradient = ctx.createRadialGradient(-3, -3, 0, 0, 0, c.width/2);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(0.7, '#daa520');
    gradient.addColorStop(1, '#b8860b');
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    ctx.arc(0, 0, c.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
    
    ctx.shadowBlur = 0;
    ctx.restore();
  });
  
  // Ship
  ctx.save();
  ctx.translate(ship.x + ship.width/2, ship.y + ship.height/2);
  
  // Shield glow
  if (hasShield && hasPerk('shield') && !activePerks['shield'].used) {
    ctx.shadowColor = '#0052ff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(0, 82, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ship.width/2 + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  // Engine glow
  ctx.shadowColor = currentShipColors[0];
  ctx.shadowBlur = 15;
  ctx.fillStyle = currentShipColors[0];
  ctx.beginPath();
  ctx.ellipse(0, ship.height/2 + 5, 8, 12 + Math.random() * 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Ship emoji
  ctx.font = `${ship.width}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(currentShipIcon, 0, 0);
  
  ctx.restore();
}

// =====================
// GAME OVER - ИСПРАВЛЕНО
// =====================

async function gameOver() {
  gameRunning = false;
  
  WalletApp.hapticImpact('heavy');
  
  const totalCoins = coinsCollected + Math.floor(score / 10);
  
  // ========== ПРОВЕРКА DEV РЕЖИМА ==========
  if (isDevMode()) {
    console.log('🔧 DEV MODE: Game results NOT saved to database');
    console.log('   Score:', score);
    console.log('   Asteroids destroyed:', asteroidsDestroyed);
    console.log('   Coins collected:', coinsCollected);
    console.log('   Total coins earned:', totalCoins);
  } else {
    // Сохраняем результаты ТОЛЬКО в продакшене
    if (currentGameSession?.sessionToken) {
      await SupabaseSpace.endGameSession(
        currentGameSession.sessionToken,
        score,
        asteroidsDestroyed,
        coinsCollected,
        WalletApp.getUserId()
      );
    }
    
    // Обновляем данные игрока из БД
    playerData = await SupabaseSpace.getPlayer(WalletApp.getUserId());
  }
  // ==========================================
  
  const isNewRecord = score > (playerData?.high_score || 0);
  
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalAsteroids').textContent = asteroidsDestroyed;
  document.getElementById('coinsEarned').textContent = totalCoins;
  document.getElementById('newRecordBadge').style.display = isNewRecord ? 'inline-block' : 'none';
  
  // Показываем DEV индикатор в модальном окне
  if (isDevMode()) {
    document.getElementById('coinsEarned').textContent = totalCoins + ' (not saved)';
  }
  
  showModal('gameOverModal');
  await updateMenuUI();
}

function gameLoop() {
  if (!gameRunning) return;
  
  update();
  draw();
  
  animationId = requestAnimationFrame(gameLoop);
}

// =====================
// BUTTON HANDLERS
// =====================

function setupModalButtons() {
  // Game Over кнопка
  const gameOverBtn = document.getElementById('gameOverCloseBtn');
  if (gameOverBtn) {
    gameOverBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Continue clicked');
      hideModal('gameOverModal');
      showScreen('menuScreen');
    };
    console.log('✅ gameOverCloseBtn handler attached');
  }
  
  // Case Modal кнопка
  const caseCloseBtn = document.getElementById('closeModalBtn');
  if (caseCloseBtn) {
    caseCloseBtn.onclick = function(e) {
      e.preventDefault();
      hideModal('caseModal');
    };
    console.log('✅ closeModalBtn handler attached');
  }
}

// =====================
// INITIALIZATION
// =====================

async function initApp() {
  console.log('🚀 Initializing Space Ship...');
  
  // Сначала настраиваем кнопки
  setupModalButtons();
  
  try {
    const walletReady = await WalletApp.init();
    
    if (!walletReady) {
      return;
    }
    
    WalletApp.ready();
    
    if (WalletApp.devMode) {
      WalletApp.showDevBadge();
      console.log('🔧 DEV MODE ACTIVE - Database writes are disabled');
    }
    
    const walletAddress = WalletApp.getUserId();
    
    playerData = await SupabaseSpace.getPlayer(walletAddress);
    
    if (!playerData) {
      if (isDevMode()) {
        console.log('🔧 DEV MODE: Using mock player data');
        playerData = {
          wallet_address: walletAddress,
          coins: 9999,
          high_score: 0,
          games_played: 0,
          total_asteroids: 0,
          ownedShips: ['fighter', 'shuttle'],
          equipped_ship: 'fighter',
          inventory: []
        };
      } else {
        playerData = await SupabaseSpace.createPlayer(walletAddress);
      }
    }
    
    await updateMenuUI();
    
    document.getElementById('loadingScreen').classList.add('hidden');
    
    console.log('✅ Space Ship ready!');
    
  } catch (error) {
    console.error('Init error:', error);
    document.getElementById('loadingScreen').classList.add('hidden');
  }
}

initApp();
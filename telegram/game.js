// =====================
// GAME CONFIGURATION
// =====================

const ALL_SKINS = [
  { id: 'knight', name: 'Knight', icon: '⚔️', colors: ['#667eea', '#764ba2'], rarity: 'common', weight: 0, starter: true },
  { id: 'dragon', name: 'Dragon', icon: '🐉', colors: ['#ff6b6b', '#ee5a24'], rarity: 'common', weight: 0, starter: true },
  { id: 'forest', name: 'Forest', icon: '🌲', colors: ['#134e5e', '#71b280'], rarity: 'common', weight: 25 },
  { id: 'ocean', name: 'Ocean', icon: '🌊', colors: ['#2193b0', '#6dd5ed'], rarity: 'common', weight: 22 },
  { id: 'phoenix', name: 'Phoenix', icon: '🔥', colors: ['#ff9500', '#ff5e3a'], rarity: 'uncommon', weight: 18 },
  { id: 'emerald', name: 'Emerald', icon: '💎', colors: ['#11998e', '#38ef7d'], rarity: 'uncommon', weight: 15 },
  { id: 'ice_king', name: 'Ice King', icon: '❄️', colors: ['#00d2ff', '#3a7bd5'], rarity: 'rare', weight: 10 },
  { id: 'shadow', name: 'Shadow', icon: '👤', colors: ['#232526', '#414345'], rarity: 'rare', weight: 8 },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈', colors: ['#ff0080', '#7928ca'], rarity: 'epic', weight: 5 },
  { id: 'neon', name: 'Neon', icon: '💫', colors: ['#00f260', '#0575e6'], rarity: 'epic', weight: 4 },
  { id: 'vampire', name: 'Vampire', icon: '🧛', colors: ['#8e0000', '#1f1c18'], rarity: 'legendary', weight: 2 },
  { id: 'golden', name: 'Golden', icon: '👑', colors: ['#f7971e', '#ffd200'], rarity: 'legendary', weight: 1 }
];

const SHOP_ITEMS = [
  { id: 'double_coins', name: 'Double Coins', icon: '💰', price: 500, description: '2x coins for next game' },
  { id: 'extra_life', name: 'Extra Life', icon: '❤️', price: 750, description: 'One extra life per game' },
  { id: 'slow_start', name: 'Slow Start', icon: '🐢', price: 300, description: 'Start slower, easier control' },
  { id: 'magnet', name: 'Food Magnet', icon: '🧲', price: 1000, description: 'Attract food from distance' },
  { id: 'shield', name: 'Shield', icon: '🛡️', price: 1200, description: 'Survive one wall hit' },
  { id: 'ghost', name: 'Ghost Mode', icon: '👻', price: 1500, description: 'Pass through yourself once' }
];

const MYSTERY_CASE = {
  id: 'mystery_case',
  name: 'Mystery Case',
  icon: '📦',
  price: 1000,
  description: 'Contains a random skin! Duplicate = 25% refund'
};

const RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b'
};

// =====================
// PLAYER DATA
// =====================

let playerData = null;
let currentLeaderboardPage = 1;
let currentGameSession = null;

// =====================
// PERKS SYSTEM
// =====================

let selectedPerks = [];
let activePerks = {};
const MAX_PERKS = 3;

function renderPerksSelection() {
  const container = document.getElementById('perksGrid');
  container.innerHTML = '';
  
  if (!playerData || !playerData.inventory || playerData.inventory.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #a0a0a0; padding: 30px; grid-column: 1/-1;">No power-ups available. Buy some from the Shop!</p>';
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
        TelegramApp.hapticImpact('light');
        togglePerkSelection(invItem.id, itemData);
      });
    }
    
    container.appendChild(div);
  });
  
  updateSelectedPerksList();
}

function togglePerkSelection(perkId, perkData) {
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
    container.innerHTML = '<p class="no-perks">No power-ups selected</p>';
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
      const perkId = btn.dataset.perk;
      selectedPerks = selectedPerks.filter(p => p !== perkId);
      TelegramApp.hapticImpact('light');
      renderPerksSelection();
    });
  });
}

async function consumeSelectedPerks() {
  for (const perkId of selectedPerks) {
    await SupabaseTelegram.consumeItem(TelegramApp.getUserId(), perkId);
  }
  playerData = await SupabaseTelegram.getPlayer(TelegramApp.getUserId());
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
    div.className = `active-perk ${perk.used ? 'used' : ''} ${perk.active && !perk.used ? 'active' : ''}`;
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

// Start game button
document.getElementById('startGameBtn').addEventListener('click', async () => {
  TelegramApp.hapticImpact('medium');
  await consumeSelectedPerks();
  showScreen('gameScreen');
});

// =====================
// SCREEN NAVIGATION
// =====================

async function showScreen(screenId) {
  console.log('showScreen:', screenId);
  
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
  
  if (screenId === 'gameScreen') {
    TelegramApp.enableClosingConfirmation();
    initializeActivePerks();
    await startNewGame();
  } else {
    TelegramApp.disableClosingConfirmation();
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }
  
  if (screenId === 'perksScreen') {
    selectedPerks = [];
    activePerks = {};
    document.getElementById('selectedCount').textContent = '0';
    document.getElementById('selectedPerksList').innerHTML = '<p class="no-perks">No power-ups selected</p>';
    
    if (TelegramApp.getUserId()) {
      playerData = await SupabaseTelegram.getPlayer(TelegramApp.getUserId());
    }
    renderPerksSelection();
  }
  
  if (screenId === 'leaderboardScreen') {
    currentLeaderboardPage = 1;
    await renderLeaderboard();
  }
  
  if (screenId === 'shopScreen') {
    await renderShop();
  }
  
  if (screenId === 'skinsScreen') {
    await renderSkins();
  }
  
  if (screenId === 'inventoryScreen') {
    renderInventory();
  }
  
  if (screenId === 'menuScreen') {
    selectedPerks = [];
    activePerks = {};
    
    if (TelegramApp.getUserId()) {
      playerData = await SupabaseTelegram.getPlayer(TelegramApp.getUserId());
    }
    await updateMenuUI();
  }
}

// Navigation buttons
document.querySelectorAll('[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => {
    TelegramApp.hapticImpact('light');
    showScreen(btn.dataset.screen);
  });
});

// =====================
// TOAST NOTIFICATIONS
// =====================

function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =====================
// MODAL HANDLERS
// =====================

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
  console.log('=== updateMenuUI ===');
  console.log('playerData:', playerData);
  console.log('TelegramApp.user:', TelegramApp.user);
  
  if (!TelegramApp.user) {
    console.warn('No TelegramApp.user!');
    return;
  }
  
  // Set username
  const displayName = TelegramApp.getDisplayName();
  console.log('displayName:', displayName);
  document.getElementById('userName').textContent = displayName;
  
  // Set stats
  if (playerData) {
    const coins = playerData.coins || 0;
    const highScore = playerData.high_score || 0;
    const gamesPlayed = playerData.games_played || 0;
    
    console.log('Setting stats - Coins:', coins, 'HighScore:', highScore, 'Games:', gamesPlayed);
    
    document.getElementById('playerCoins').textContent = coins;
    document.getElementById('playerHighScore').textContent = highScore;
    document.getElementById('gamesPlayed').textContent = gamesPlayed;
    
    // Get rank
    try {
      const rank = await SupabaseTelegram.getPlayerRank(TelegramApp.getUserId());
      document.getElementById('playerRank').textContent = rank ? `#${rank}` : '-';
    } catch (e) {
      console.error('Error getting rank:', e);
      document.getElementById('playerRank').textContent = '-';
    }
    
    // Update shop coins display
    const shopCoins = document.getElementById('shopCoins');
    if (shopCoins) {
      shopCoins.textContent = coins;
    }
  } else {
    console.warn('No playerData - setting defaults');
    document.getElementById('playerCoins').textContent = '0';
    document.getElementById('playerHighScore').textContent = '0';
    document.getElementById('gamesPlayed').textContent = '0';
    document.getElementById('playerRank').textContent = '-';
  }
}

function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || '#9ca3af';
}

// =====================
// MASK PLAYER NAME
// =====================

function maskPlayerName(name) {
  if (!name) {
    return 'P***r';
  }
  
  const str = String(name);
  
  if (str.length <= 2) {
    return str.charAt(0) + '*';
  }
  
  if (str.length <= 4) {
    return str.charAt(0) + '*'.repeat(str.length - 2) + str.charAt(str.length - 1);
  }
  
  // Показываем первые 2 и последний символ
  const hidden = '*'.repeat(str.length - 3);
  return str.slice(0, 2) + hidden + str.slice(-1);
}

// =====================
// LEADERBOARD
// =====================

async function renderLeaderboard() {
  const container = document.getElementById('leaderboardList');
  const data = await SupabaseTelegram.getLeaderboard(currentLeaderboardPage, 10);
  
  // Получаем ID текущего пользователя
  const currentUserId = TelegramApp.getUserId();
  
  console.log('=== LEADERBOARD DEBUG ===');
  console.log('Current user ID:', currentUserId, 'Type:', typeof currentUserId);
  
  container.innerHTML = '';
  
  if (data.players.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #a0a0a0; padding: 30px;">No players yet. Be the first!</p>';
    return;
  }
  
  data.players.forEach((player, index) => {
    const globalRank = (currentLeaderboardPage - 1) * 10 + index + 1;
    
    console.log(`Player ${index}: telegramId=${player.telegramId}, Type=${typeof player.telegramId}`);
    
    // Сравниваем оба значения как строки - самый надёжный способ
    const isCurrentPlayer = currentUserId != null && 
                           player.telegramId != null && 
                           String(currentUserId) === String(player.telegramId);
    
    console.log(`Match: ${String(currentUserId)} === ${String(player.telegramId)} = ${isCurrentPlayer}`);
    
    let rankClass = '';
    let rankIcon = '';
    
    if (globalRank === 1) { rankClass = 'gold'; rankIcon = '🥇'; }
    else if (globalRank === 2) { rankClass = 'silver'; rankIcon = '🥈'; }
    else if (globalRank === 3) { rankClass = 'bronze'; rankIcon = '🥉'; }
    
    // Маскируем имя для приватности
    const maskedName = maskPlayerName(player.displayName);
    
    // Добавляем метку если это текущий пользователь
    const displayName = isCurrentPlayer ? maskedName + ' 👈' : maskedName;
    
    const item = document.createElement('div');
    item.className = `leaderboard-item ${rankClass} ${isCurrentPlayer ? 'current-player' : ''}`;
    item.innerHTML = `
      <span class="rank">${globalRank}</span>
      <span class="rank-icon">${rankIcon}</span>
      <span class="player">${displayName}</span>
      <span class="lb-score">${player.highScore}</span>
    `;
    container.appendChild(item);
  });
  
  console.log('=== END LEADERBOARD DEBUG ===');
  
  document.getElementById('pageInfo').textContent = 
    `Page ${data.currentPage} of ${data.totalPages}`;
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
  
  const canAffordCase = playerData && playerData.coins >= MYSTERY_CASE.price;
  caseSection.innerHTML = `
    <div class="case-item">
      <div class="item-icon">${MYSTERY_CASE.icon}</div>
      <h3>${MYSTERY_CASE.name}</h3>
      <p class="item-desc">${MYSTERY_CASE.description}</p>
      <p class="item-price">💰 ${MYSTERY_CASE.price}</p>
      <button id="openCaseBtn" class="open-case-btn" ${!canAffordCase ? 'disabled' : ''}>
        ${canAffordCase ? '🎲 Open Case' : 'Not enough coins'}
      </button>
    </div>
  `;
  
  document.getElementById('openCaseBtn').addEventListener('click', () => {
    TelegramApp.hapticImpact('heavy');
    openMysteryCase();
  });
  
  container.innerHTML = '';
  
  SHOP_ITEMS.forEach(item => {
    const canAfford = playerData && playerData.coins >= item.price;
    
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <div class="item-icon">${item.icon}</div>
      <h3>${item.name}</h3>
      <p class="item-desc">${item.description}</p>
      <p class="item-price">💰 ${item.price}</p>
      <button class="buy-btn" data-item="${item.id}" data-price="${item.price}" ${!canAfford ? 'disabled' : ''}>
        ${canAfford ? 'Buy' : 'Not enough'}
      </button>
    `;
    container.appendChild(div);
  });
  
  container.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      TelegramApp.hapticImpact('medium');
      const itemId = btn.dataset.item;
      const price = parseInt(btn.dataset.price);
      const result = await SupabaseTelegram.buyItem(TelegramApp.getUserId(), itemId, price);
      
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

// =====================
// MYSTERY CASE
// =====================

async function openMysteryCase() {
  const result = await SupabaseTelegram.openCase(TelegramApp.getUserId(), MYSTERY_CASE.price, ALL_SKINS);
  
  if (!result.success) {
    showToast(result.error, 'error');
    return;
  }
  
  playerData = result.player;
  
  showModal('caseModal');
  document.getElementById('caseAnimation').style.display = 'block';
  document.getElementById('caseResult').style.display = 'none';
  
  setTimeout(() => {
    TelegramApp.hapticImpact('heavy');
    document.getElementById('caseAnimation').style.display = 'none';
    document.getElementById('caseResult').style.display = 'block';
    
    const skin = result.skin;
    const rarityColor = getRarityColor(skin.rarity);
    
    document.getElementById('resultIcon').style.background = 
      `linear-gradient(135deg, ${skin.colors[0]} 0%, ${skin.colors[1]} 100%)`;
    document.getElementById('resultIcon').textContent = skin.icon;
    document.getElementById('resultTitle').textContent = skin.name;
    document.getElementById('resultRarity').textContent = skin.rarity;
    document.getElementById('resultRarity').style.color = rarityColor;
    
    if (result.isDuplicate) {
      document.getElementById('resultMessage').textContent = 
        `Duplicate! You received ${result.refundAmount} coins back.`;
    } else {
      document.getElementById('resultMessage').textContent = 
        `New skin unlocked! Check your Skins collection.`;
    }
    
    renderShop();
    updateMenuUI();
  }, 2000);
}

document.getElementById('closeModalBtn').addEventListener('click', () => {
  hideModal('caseModal');
});

// =====================
// INVENTORY
// =====================

function renderInventory() {
  const container = document.getElementById('inventoryGrid');
  const emptyMsg = document.getElementById('emptyInventory');
  
  if (!playerData || !playerData.inventory || playerData.inventory.length === 0) {
    container.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }
  
  container.style.display = 'grid';
  emptyMsg.style.display = 'none';
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
// SKINS
// =====================

async function renderSkins() {
  const container = document.getElementById('skinsGrid');
  
  document.getElementById('skinsCoins').textContent = playerData?.coins || 0;
  
  const ownedSkins = playerData?.ownedSkins || ['knight', 'dragon'];
  const equippedSkinId = playerData?.equipped_skin || 'knight';
  
  const equippedSkin = ALL_SKINS.find(s => s.id === equippedSkinId) || ALL_SKINS[0];
  document.getElementById('equippedSkinName').textContent = equippedSkin.name;
  updateSkinPreview(equippedSkin.colors);
  
  container.innerHTML = '';
  
  ALL_SKINS.forEach(skin => {
    const owned = ownedSkins.includes(skin.id);
    const equipped = equippedSkinId === skin.id;
    
    const div = document.createElement('div');
    let statusClass = equipped ? 'equipped' : (owned ? 'owned' : 'locked');
    div.className = `skin-item ${statusClass}`;
    
    let statusText = '';
    let statusTextClass = '';
    
    if (equipped) {
      statusText = '✓ Equipped';
      statusTextClass = 'equipped';
    } else if (owned) {
      statusText = 'Equip';
      statusTextClass = 'owned';
    } else {
      statusText = '📦 Case';
      statusTextClass = 'locked';
    }
    
    const rarityColor = getRarityColor(skin.rarity);
    
    div.innerHTML = `
      <div class="skin-icon" style="background: linear-gradient(135deg, ${skin.colors[0]} 0%, ${skin.colors[1]} 100%)">
        ${owned ? skin.icon : '🔒'}
      </div>
      <h3>${skin.name}</h3>
      <p class="skin-rarity" style="color: ${rarityColor}">${skin.rarity}</p>
      <span class="skin-status ${statusTextClass}">${statusText}</span>
    `;
    
    div.addEventListener('click', () => {
      TelegramApp.hapticImpact('light');
      handleSkinClick(skin, owned, equipped);
    });
    container.appendChild(div);
  });
}

async function handleSkinClick(skin, owned, equipped) {
  if (equipped) return;
  
  if (owned) {
    const result = await SupabaseTelegram.equipSkin(TelegramApp.getUserId(), skin.id);
    if (result.success) {
      playerData = result.player;
      showToast(`${skin.name} equipped!`, 'success');
      await renderSkins();
    }
  } else {
    showToast('Skins can only be obtained from Mystery Case!', 'info');
  }
}

function updateSkinPreview(colors) {
  const segments = document.querySelectorAll('.preview-segment');
  segments.forEach(seg => {
    seg.style.background = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
  });
}

// =====================
// GAME OVER HANDLING
// =====================

async function handleGameOver(finalScore, coinsEarned) {
  console.log('========================================');
  console.log('🎮 GAME OVER');
  console.log('  Final Score:', finalScore);
  console.log('  Coins Earned:', coinsEarned);
  console.log('  User ID:', TelegramApp.getUserId());
  console.log('  Session Token:', currentGameSession?.sessionToken);
  console.log('========================================');
  
  TelegramApp.hapticImpact('heavy');
  
  const previousHighScore = playerData?.high_score || 0;
  const isNewRecord = finalScore > previousHighScore;
  
  console.log('Previous high score:', previousHighScore);
  console.log('Is new record:', isNewRecord);
  
  try {
    // End game session and save stats
    if (currentGameSession?.sessionToken) {
      console.log('Ending game session via token...');
      
      const result = await SupabaseTelegram.endGameSession(
        currentGameSession.sessionToken,
        finalScore,
        TelegramApp.getUserId(),
        TelegramApp.user
      );
      
      console.log('End session result:', result);
    } else {
      // Fallback: save directly without session
      console.log('No session token, saving directly...');
      
      const userId = TelegramApp.getUserId();
      const player = await SupabaseTelegram.getPlayer(userId);
      
      if (player) {
        const newCoins = (player.coins || 0) + coinsEarned;
        const newHighScore = Math.max(player.high_score || 0, finalScore);
        const newGamesPlayed = (player.games_played || 0) + 1;
        
        console.log('Updating player:', {
          coins: newCoins,
          high_score: newHighScore,
          games_played: newGamesPlayed
        });
        
        await SupabaseTelegram.updatePlayer(userId, {
          coins: newCoins,
          high_score: newHighScore,
          games_played: newGamesPlayed,
          equipped_skin: player.equipped_skin || 'knight'
        });
        
        // Update leaderboard
        if (finalScore > (player.high_score || 0)) {
          await SupabaseTelegram.updateLeaderboard(userId, finalScore, TelegramApp.user);
        }
      }
    }
    
    // Reload player data
    console.log('Reloading player data...');
    playerData = await SupabaseTelegram.getPlayer(TelegramApp.getUserId());
    console.log('Updated player data:', playerData);
    
  } catch (error) {
    console.error('Error saving game results:', error);
  }
  
  // Show game over modal
  document.getElementById('finalScore').textContent = finalScore;
  document.getElementById('coinsEarned').textContent = coinsEarned;
  document.getElementById('newRecordBadge').style.display = isNewRecord ? 'inline-block' : 'none';
  
  showModal('gameOverModal');
  
  // Update menu UI
  await updateMenuUI();
}

document.getElementById('gameOverCloseBtn').addEventListener('click', () => {
  hideModal('gameOverModal');
  showScreen('menuScreen');
});

// =====================
// GAME LOGIC
// =====================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const box = 25;
const canvasSize = 600;

const castleWallThickness = 50;
const gameFieldStartX = castleWallThickness;
const gameFieldStartY = castleWallThickness;
const gameFieldWidth = canvasSize - 2 * castleWallThickness;
const gameFieldHeight = canvasSize - 2 * castleWallThickness;

let snake = [];
let direction = "RIGHT";
let nextDirection = "RIGHT";
let speed = 6;
let baseSpeed = 6;
let lastTime = 0;
let score = 0;
let highScore = 0;
let gameOver = false;
let food = null;
let animationId = null;
let currentSkinColors = ['#667eea', '#764ba2'];
let coinsEarnedThisGame = 0;
let coinMultiplier = 1;
let lives = 1;
let magnetRadius = 0;
let hasShield = false;
let hasGhost = false;

async function startNewGame() {
  console.log('=== startNewGame ===');
  
  try {
    currentGameSession = await SupabaseTelegram.startGameSession(TelegramApp.getUserId());
    console.log('Game session started:', currentGameSession);
  } catch (error) {
    console.warn('Could not start game session:', error);
    currentGameSession = null;
  }
  
  initGame();
  animationId = requestAnimationFrame(gameLoop);
}

function initGame() {
  console.log('=== initGame ===');
  
  snake = [{ 
    x: Math.floor(gameFieldWidth / box / 2) * box + gameFieldStartX, 
    y: Math.floor(gameFieldHeight / box / 2) * box + gameFieldStartY, 
    dir: "RIGHT" 
  }];
  direction = "RIGHT";
  nextDirection = "RIGHT";
  score = 0;
  gameOver = false;
  lastTime = 0;
  coinsEarnedThisGame = 0;
  highScore = playerData?.high_score || 0;
  
  // Reset perk effects
  coinMultiplier = 1;
  lives = 1;
  magnetRadius = 0;
  hasShield = false;
  hasGhost = false;
  baseSpeed = 6;
  
  // Apply perks
  if (hasPerk('double_coins')) {
    coinMultiplier = 2;
    showToast('Double Coins activated! 💰x2', 'success');
  }
  
  if (hasPerk('extra_life')) {
    lives = 2;
    showToast('Extra Life activated! ❤️+1', 'success');
  }
  
  if (hasPerk('slow_start')) {
    baseSpeed = 4;
    showToast('Slow Start activated! 🐢', 'success');
  }
  
  if (hasPerk('magnet')) {
    magnetRadius = box * 3;
    showToast('Food Magnet activated! 🧲', 'success');
  }
  
  if (hasPerk('shield')) {
    hasShield = true;
  }
  
  if (hasPerk('ghost')) {
    hasGhost = true;
  }
  
  speed = baseSpeed;
  
  // Load skin
  if (playerData) {
    const equippedSkinId = playerData.equipped_skin || 'knight';
    const equipped = ALL_SKINS.find(s => s.id === equippedSkinId);
    if (equipped) {
      currentSkinColors = equipped.colors;
    }
  }
  
  document.getElementById('score').textContent = score;
  document.getElementById('highScore').textContent = highScore;
  food = spawnFood();
  
  console.log('Game initialized. HighScore:', highScore, 'CoinMultiplier:', coinMultiplier);
}

// Keyboard controls
document.addEventListener("keydown", (event) => {
  if (gameOver) return;
  
  const key = event.key;
  
  if ((key === "ArrowUp" || key === "w" || key === "W") && direction !== "DOWN") nextDirection = "UP";
  if ((key === "ArrowDown" || key === "s" || key === "S") && direction !== "UP") nextDirection = "DOWN";
  if ((key === "ArrowLeft" || key === "a" || key === "A") && direction !== "RIGHT") nextDirection = "LEFT";
  if ((key === "ArrowRight" || key === "d" || key === "D") && direction !== "LEFT") nextDirection = "RIGHT";
});

// Mobile controls
document.querySelectorAll('.control-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (gameOver) return;
    
    TelegramApp.hapticImpact('light');
    const dir = btn.dataset.dir;
    if (dir === "UP" && direction !== "DOWN") nextDirection = "UP";
    if (dir === "DOWN" && direction !== "UP") nextDirection = "DOWN";
    if (dir === "LEFT" && direction !== "RIGHT") nextDirection = "LEFT";
    if (dir === "RIGHT" && direction !== "LEFT") nextDirection = "RIGHT";
  });
});

// Restart button
document.getElementById('restartBtn').addEventListener('click', async () => {
  TelegramApp.hapticImpact('medium');
  selectedPerks = [];
  activePerks = {};
  if (TelegramApp.getUserId()) {
    playerData = await SupabaseTelegram.getPlayer(TelegramApp.getUserId());
  }
  await startNewGame();
  renderActivePerksBar();
});

function spawnFood() {
  const gridCols = Math.floor(gameFieldWidth / box);
  const gridRows = Math.floor(gameFieldHeight / box);
  
  let x, y;
  do {
    x = Math.floor(Math.random() * gridCols) * box + gameFieldStartX;
    y = Math.floor(Math.random() * gridRows) * box + gameFieldStartY;
  } while (snake.some(seg => seg.x === x && seg.y === y));
  
  return { x, y };
}

function applyMagnetEffect() {
  if (magnetRadius <= 0) return;
  
  const head = snake[0];
  const dx = head.x - food.x;
  const dy = head.y - food.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < magnetRadius && distance > box) {
    const moveSpeed = box / 2;
    const moveX = (dx / distance) * moveSpeed;
    const moveY = (dy / distance) * moveSpeed;
    
    food.x = Math.round((food.x + moveX) / box) * box;
    food.y = Math.round((food.y + moveY) / box) * box;
    
    food.x = Math.max(gameFieldStartX, Math.min(food.x, gameFieldStartX + gameFieldWidth - box));
    food.y = Math.max(gameFieldStartY, Math.min(food.y, gameFieldStartY + gameFieldHeight - box));
  }
}

// Drawing functions
function drawCastle() {
  const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
  gradient.addColorStop(0, '#5d4e37');
  gradient.addColorStop(0.5, '#8b7355');
  gradient.addColorStop(1, '#5d4e37');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.strokeStyle = '#3d3426';
  ctx.lineWidth = 1;
  
  for (let y = 0; y < castleWallThickness; y += 15) {
    for (let x = (y % 30 === 0 ? 0 : 15); x < canvasSize; x += 30) {
      ctx.strokeRect(x, y, 30, 15);
    }
  }

  for (let y = canvasSize - castleWallThickness; y < canvasSize; y += 15) {
    for (let x = (y % 30 === 0 ? 0 : 15); x < canvasSize; x += 30) {
      ctx.strokeRect(x, y, 30, 15);
    }
  }

  for (let y = castleWallThickness; y < canvasSize - castleWallThickness; y += 15) {
    for (let x = (y % 30 === 0 ? 0 : 15); x < castleWallThickness; x += 30) {
      ctx.strokeRect(x, y, 30, 15);
    }
  }

  for (let y = castleWallThickness; y < canvasSize - castleWallThickness; y += 15) {
    for (let x = canvasSize - castleWallThickness + (y % 30 === 0 ? 0 : 15); x < canvasSize; x += 30) {
      ctx.strokeRect(x, y, 30, 15);
    }
  }

  const towerSize = 60;
  drawTower(0, 0, towerSize);
  drawTower(canvasSize - towerSize, 0, towerSize);
  drawTower(0, canvasSize - towerSize, towerSize);
  drawTower(canvasSize - towerSize, canvasSize - towerSize, towerSize);

  drawBattlements();
}

function drawTower(x, y, size) {
  const towerGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
  towerGradient.addColorStop(0, '#a08060');
  towerGradient.addColorStop(1, '#5d4e37');
  ctx.fillStyle = towerGradient;
  ctx.fillRect(x, y, size, size);
  
  ctx.strokeStyle = '#3d2e1f';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, size, size);
  
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2a1e';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBattlements() {
  ctx.fillStyle = '#6d5e47';
  const battlementWidth = 20;
  const battlementHeight = 15;
  const gap = 10;
  
  for (let x = 60; x < canvasSize - 60; x += battlementWidth + gap) {
    ctx.fillRect(x, 0, battlementWidth, battlementHeight);
  }

  for (let x = 60; x < canvasSize - 60; x += battlementWidth + gap) {
    ctx.fillRect(x, canvasSize - battlementHeight, battlementWidth, battlementHeight);
  }

  for (let y = 60; y < canvasSize - 60; y += battlementWidth + gap) {
    ctx.fillRect(0, y, battlementHeight, battlementWidth);
  }

  for (let y = 60; y < canvasSize - 60; y += battlementWidth + gap) {
    ctx.fillRect(canvasSize - battlementHeight, y, battlementHeight, battlementWidth);
  }
}

function drawGameField() {
  const grassGradient = ctx.createLinearGradient(gameFieldStartX, gameFieldStartY, gameFieldStartX + gameFieldWidth, gameFieldStartY + gameFieldHeight);
  grassGradient.addColorStop(0, '#1a3d1a');
  grassGradient.addColorStop(0.5, '#2d5a2d');
  grassGradient.addColorStop(1, '#1a3d1a');
  ctx.fillStyle = grassGradient;
  ctx.fillRect(gameFieldStartX, gameFieldStartY, gameFieldWidth, gameFieldHeight);
  
  ctx.strokeStyle = 'rgba(0, 50, 0, 0.3)';
  ctx.lineWidth = 0.5;
  for (let x = gameFieldStartX; x <= gameFieldStartX + gameFieldWidth; x += box) {
    ctx.beginPath();
    ctx.moveTo(x, gameFieldStartY);
    ctx.lineTo(x, gameFieldStartY + gameFieldHeight);
    ctx.stroke();
  }
  for (let y = gameFieldStartY; y <= gameFieldStartY + gameFieldHeight; y += box) {
    ctx.beginPath();
    ctx.moveTo(gameFieldStartX, y);
    ctx.lineTo(gameFieldStartX + gameFieldWidth, y);
    ctx.stroke();
  }
  
  ctx.strokeStyle = '#4a3a2a';
  ctx.lineWidth = 4;
  ctx.strokeRect(gameFieldStartX, gameFieldStartY, gameFieldWidth, gameFieldHeight);
  
  if (magnetRadius > 0) {
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(snake[0].x + box/2, snake[0].y + box/2, magnetRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const x = segment.x;
    const y = segment.y;
    
    if (index === 0) {
      drawHead(x, y, segment.dir);
    } else if (index === snake.length - 1) {
      drawTail(x, y, snake[index - 1].dir);
    } else {
      drawBody(x, y, index);
    }
  });
}

function drawHead(x, y, dir) {
  ctx.save();
  ctx.translate(x + box/2, y + box/2);
  
  let angle = 0;
  if (dir === "UP") angle = -Math.PI/2;
  if (dir === "DOWN") angle = Math.PI/2;
  if (dir === "LEFT") angle = Math.PI;
  ctx.rotate(angle);
  
  if (hasGhost && hasPerk('ghost') && !activePerks['ghost'].used) {
    ctx.globalAlpha = 0.6;
  }
  
  if (hasShield && hasPerk('shield') && !activePerks['shield'].used) {
    ctx.shadowColor = '#00d2ff';
    ctx.shadowBlur = 15;
  }
  
  const gradient = ctx.createLinearGradient(-box/2, -box/2, box/2, box/2);
  gradient.addColorStop(0, currentSkinColors[0]);
  gradient.addColorStop(1, currentSkinColors[1]);
  ctx.fillStyle = gradient;
  
  ctx.beginPath();
  ctx.roundRect(-box/2 + 2, -box/2 + 2, box - 4, box - 4, 5);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(4, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(6, -4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, 4, 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawBody(x, y, index) {
  ctx.save();
  
  if (hasGhost && hasPerk('ghost') && !activePerks['ghost'].used) {
    ctx.globalAlpha = 0.6;
  }
  
  const gradient = ctx.createLinearGradient(x, y, x + box, y + box);
  gradient.addColorStop(0, currentSkinColors[0]);
  gradient.addColorStop(1, currentSkinColors[1]);
  ctx.fillStyle = gradient;
  
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, box - 4, box - 4, 3);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(x + box/2, y + box/2, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawTail(x, y, dir) {
  ctx.save();
  ctx.translate(x + box/2, y + box/2);
  
  let angle = 0;
  if (dir === "UP") angle = -Math.PI/2;
  if (dir === "DOWN") angle = Math.PI/2;
  if (dir === "LEFT") angle = Math.PI;
  ctx.rotate(angle);
  
  if (hasGhost && hasPerk('ghost') && !activePerks['ghost'].used) {
    ctx.globalAlpha = 0.6;
  }
  
  const gradient = ctx.createLinearGradient(-box/2, 0, box/2, 0);
  gradient.addColorStop(0, currentSkinColors[0]);
  gradient.addColorStop(1, currentSkinColors[1]);
  ctx.fillStyle = gradient;
  
  ctx.beginPath();
  ctx.moveTo(-box/2 + 4, -box/3);
  ctx.lineTo(box/2 - 2, 0);
  ctx.lineTo(-box/2 + 4, box/3);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawFood() {
  const x = food.x + box/2;
  const y = food.y + box/2;
  
  const glow = ctx.createRadialGradient(x, y, 0, x, y, box/2 + 5);
  glow.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
  glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, box/2 + 5, 0, Math.PI * 2);
  ctx.fill();
  
  const appleGradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, box/2);
  appleGradient.addColorStop(0, '#ffd700');
  appleGradient.addColorStop(0.7, '#daa520');
  appleGradient.addColorStop(1, '#b8860b');
  ctx.fillStyle = appleGradient;
  ctx.beginPath();
  ctx.arc(x, y, box/2 - 3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#228b22';
  ctx.beginPath();
  ctx.ellipse(x + 2, y - box/2 + 5, 3, 5, Math.PI/4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 4, 3, 0, Math.PI * 2);
  ctx.fill();
  
  if (coinMultiplier > 1) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`x${coinMultiplier}`, x, y + box);
  }
}

function drawLives() {
  if (lives > 1) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    for (let i = 0; i < lives; i++) {
      ctx.fillText('❤️', gameFieldStartX + 5 + (i * 25), gameFieldStartY + 25);
    }
  }
}

function updateSnake() {
  direction = nextDirection;
  
  let head = { x: snake[0].x, y: snake[0].y, dir: direction };
  
  if (direction === "UP") head.y -= box;
  if (direction === "DOWN") head.y += box;
  if (direction === "LEFT") head.x -= box;
  if (direction === "RIGHT") head.x += box;

  const hitWall = (
    head.x < gameFieldStartX || 
    head.x >= gameFieldStartX + gameFieldWidth ||
    head.y < gameFieldStartY || 
    head.y >= gameFieldStartY + gameFieldHeight
  );
  
  const hitSelf = collision(head, snake);
  
  if (hitWall) {
    if (hasShield && hasPerk('shield') && !activePerks['shield'].used) {
      usePerk('shield');
      hasShield = false;
      showToast('Shield used! 🛡️', 'info');
      return;
    }
    
    if (lives > 1) {
      lives--;
      usePerk('extra_life');
      showToast(`Life lost! ${lives} remaining ❤️`, 'error');
      return;
    }
    
    gameOver = true;
    onGameOver();
    return;
  }
  
  if (hitSelf) {
    if (hasGhost && hasPerk('ghost') && !activePerks['ghost'].used) {
      usePerk('ghost');
      hasGhost = false;
      showToast('Ghost mode used! 👻', 'info');
    } else {
      if (lives > 1) {
        lives--;
        usePerk('extra_life');
        showToast(`Life lost! ${lives} remaining ❤️`, 'error');
        return;
      }
      
      gameOver = true;
      onGameOver();
      return;
    }
  }

  applyMagnetEffect();

  if (head.x === food.x && head.y === food.y) {
    TelegramApp.hapticImpact('light');
    snake.unshift(head);
    food = spawnFood();
    score++;
    
    const coinsGained = 5 * coinMultiplier;
    coinsEarnedThisGame += coinsGained;
    document.getElementById('score').textContent = score;
    
    if (score > highScore) {
      highScore = score;
      document.getElementById('highScore').textContent = highScore;
    }
    
    if (score % 10 === 0 && speed < 10) {
      speed += 0.3;
    }
  } else {
    snake.pop();
    snake.unshift(head);
  }
}

function collision(head, array) {
  for (let i = 0; i < array.length; i++) {
    if (head.x === array[i].x && head.y === array[i].y) return true;
  }
  return false;
}

function onGameOver() {
  console.log('onGameOver called. Score:', score, 'Coins:', coinsEarnedThisGame);
  drawGameOverCanvas();
  handleGameOver(score, coinsEarnedThisGame);
}

function drawGameOverCanvas() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('💀 GAME OVER 💀', canvasSize/2, canvasSize/2 - 20);
  
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 32px Arial';
  ctx.fillText(`Score: ${score}`, canvasSize/2, canvasSize/2 + 30);
}

function gameLoop(timestamp) {
  if (gameOver) return;
  
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;

  if (delta > 1000 / speed) {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    drawCastle();
    drawGameField();
    updateSnake();
    
    if (!gameOver) {
      drawFood();
      drawSnake();
      drawLives();
    }
    
    lastTime = timestamp;
  }
  
  animationId = requestAnimationFrame(gameLoop);
}

// =====================
// INITIALIZATION
// =====================

async function initApp() {
  console.log('========================================');
  console.log('🎮 SNAKE GAME INITIALIZATION');
  console.log('========================================');
  
  try {
    // Step 1: Initialize Telegram
    console.log('Step 1: Initializing Telegram...');
    await TelegramApp.init();
    TelegramApp.ready();
    
    const userId = TelegramApp.getUserId();
    console.log('Step 2: User ID =', userId);
    console.log('Step 2: User =', JSON.stringify(TelegramApp.user, null, 2));
    
    if (!userId) {
      console.error('❌ NO USER ID!');
      document.querySelector('.loading-content h2').textContent = 'Error: No user ID';
      return;
    }
    
    // Step 3: Test Supabase connection
    console.log('Step 3: Testing Supabase...');
    const connectionOk = await SupabaseTelegram.testConnection();
    console.log('Step 3: Connection =', connectionOk ? '✅ OK' : '❌ FAILED');
    
    if (!connectionOk) {
      console.error('❌ Supabase connection failed!');
      document.querySelector('.loading-content h2').textContent = 'Error: Database connection failed';
      return;
    }
    
    // Step 4: Load or create player
    console.log('Step 4: Loading player...');
    playerData = await SupabaseTelegram.getPlayer(userId);
    console.log('Step 4: Player =', JSON.stringify(playerData, null, 2));
    
    if (!playerData) {
      console.log('Step 5: Creating new player...');
      playerData = await SupabaseTelegram.createPlayer(userId, TelegramApp.user);
      console.log('Step 5: Created =', JSON.stringify(playerData, null, 2));
    } else {
      console.log('Step 5: Player exists, skipping creation');
    }
    
    // Step 6: Update UI
    console.log('Step 6: Updating UI...');
    await updateMenuUI();
    
    // Hide loading screen
    document.getElementById('loadingScreen').classList.add('hidden');
    
    console.log('========================================');
    console.log('✅ INITIALIZATION COMPLETE');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ INITIALIZATION ERROR:', error);
    console.error('Stack:', error.stack);
    document.querySelector('.loading-content h2').textContent = 'Error: ' + error.message;
  }
}

// Start app when page loads
initApp();
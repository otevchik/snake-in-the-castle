// =====================
// GAME HUB LOGIC
// =====================

let hubPlayerData = null;

async function initHub() {
  console.log('🎮 Initializing Game Hub...');
  
  try {
    await TelegramApp.init();
    TelegramApp.ready();
    
    const userId = TelegramApp.getUserId();
    console.log('User ID:', userId);
    
    if (!userId) {
      showError('Could not get user data');
      return;
    }
    
    hubPlayerData = await SupabaseHub.getHubPlayer(userId);
    console.log('Hub player data:', hubPlayerData);
    
    if (!hubPlayerData) {
      hubPlayerData = await SupabaseHub.createHubPlayer(userId, TelegramApp.user);
    }
    
    updateHubUI();
    
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('hubScreen').classList.remove('hidden');
    
    setupGameCards();
    
    console.log('✅ Hub initialized!');
    
  } catch (error) {
    console.error('Hub init error:', error);
    showError('Failed to load hub');
  }
}

function updateHubUI() {
  document.getElementById('userName').textContent = TelegramApp.getDisplayName();
  
  if (hubPlayerData) {
    // Общая статистика
    document.getElementById('totalCoins').textContent = hubPlayerData.total_coins || 0;
    document.getElementById('totalGames').textContent = hubPlayerData.total_games_played || 0;
    
    // Статистика по играм
    const snakeScore = document.getElementById('snakeHighScore');
    if (snakeScore) {
      snakeScore.textContent = hubPlayerData.snake_high_score || 0;
    }
    
    const spaceScore = document.getElementById('spaceHighScore');
    if (spaceScore) {
      spaceScore.textContent = hubPlayerData.space_high_score || 0;
    }
  }
}

function setupGameCards() {
  const gameCards = document.querySelectorAll('.game-card');
  console.log('Found game cards:', gameCards.length);
  
  gameCards.forEach(card => {
    const game = card.dataset.game;
    const isComingSoon = card.classList.contains('coming-soon');
    
    card.addEventListener('click', () => {
      console.log('Clicked:', game);
      
      if (isComingSoon) {
        TelegramApp.hapticImpact('light');
        showToast('Coming soon! 🚀');
        return;
      }
      
      if (game) {
        TelegramApp.hapticImpact('medium');
        openGame(game);
      }
    });
  });
}

function openGame(gameId) {
  console.log('Opening game:', gameId);
  
  const id = gameId.toLowerCase().trim();
  
  if (id === 'snake') {
    window.location.href = './games/snake/index.html';
  } else if (id === 'space-ship') {
    window.location.href = './games/space-ship/index.html';
  } else {
    console.error('Unknown game:', gameId);
    showToast('Game not found');
  }
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 14px;
    z-index: 1000;
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function showError(message) {
  document.querySelector('.loading-content h2').textContent = message;
  const spinner = document.querySelector('.loading-spinner');
  if (spinner) spinner.style.display = 'none';
}

// Start
initHub();
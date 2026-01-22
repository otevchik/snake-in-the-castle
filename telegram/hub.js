// =====================
// GAME HUB LOGIC
// =====================

let hubPlayerData = null;

// Initialize Hub
async function initHub() {
  console.log('🎮 Initializing Game Hub...');
  
  try {
    // Initialize Telegram
    await TelegramApp.init();
    TelegramApp.ready();
    
    const userId = TelegramApp.getUserId();
    console.log('User ID:', userId);
    
    if (!userId) {
      showError('Could not get user data');
      return;
    }
    
    // Load player data from Supabase
    hubPlayerData = await SupabaseHub.getHubPlayer(userId);
    
    if (!hubPlayerData) {
      hubPlayerData = await SupabaseHub.createHubPlayer(userId, TelegramApp.user);
    }
    
    // Update UI
    updateHubUI();
    
    // Hide loading, show hub
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('hubScreen').classList.remove('hidden');
    
    // Setup game cards
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
    document.getElementById('totalCoins').textContent = hubPlayerData.total_coins || 0;
    document.getElementById('totalGames').textContent = hubPlayerData.total_games_played || 0;
    document.getElementById('snakeHighScore').textContent = hubPlayerData.snake_high_score || 0;
    
    // Space Ship high score (нужно добавить загрузку)
    const spaceHighScore = document.getElementById('spaceHighScore');
    if (spaceHighScore) {
      spaceHighScore.textContent = hubPlayerData.space_high_score || 0;
    }
  }
}

function setupGameCards() {
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      const game = card.dataset.game;
      
      console.log('Clicked game:', game); // Для отладки
      console.log('Has coming-soon:', card.classList.contains('coming-soon'));
      
      if (card.classList.contains('coming-soon')) {
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
  
  switch (gameId) {
    case 'snake':
      window.location.href = './games/snake/index.html';
      break;
    case 'space-ship':
      window.location.href = './games/space-ship/index.html';
      break;
    default:
      console.error('Unknown game:', gameId);
      showToast('Game not found: ' + gameId);
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
    animation: fadeIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 2500);
}

function showError(message) {
  document.querySelector('.loading-content h2').textContent = message;
  document.querySelector('.loading-spinner').style.display = 'none';
}

// Start
initHub();
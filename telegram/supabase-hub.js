// =====================
// SUPABASE HUB CLIENT
// =====================

const SUPABASE_URL = 'https://hiicndghblbsrgbmtufd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWNuZGdoYmxic3JnYm10dWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTQ5NzIsImV4cCI6MjA4NDQ3MDk3Mn0.cX6CU4bl3jHbFRw75I0LyMpPMEK2GzYoDcmeQa05kMI';

const SupabaseHub = {
  
  async request(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    };
    
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      
      const text = await response.text();
      if (!response.ok) {
        console.error('Hub request error:', response.status, text);
        return null;
      }
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('Hub fetch error:', error);
      return null;
    }
  },
  
  async getHubPlayer(telegramId) {
    try {
      // Получаем данные Snake
      const snakeData = await this.request(`telegram_players?telegram_id=eq.${telegramId}&select=*`);
      const snake = snakeData && snakeData.length > 0 ? snakeData[0] : null;
      
      // Получаем данные Space Ship
      const spaceData = await this.request(`space_players?telegram_id=eq.${telegramId}&select=*`);
      const space = spaceData && spaceData.length > 0 ? spaceData[0] : null;
      
      // Если нет данных ни в одной игре
      if (!snake && !space) return null;
      
      // Объединяем статистику
      const snakeCoins = snake?.coins || 0;
      const spaceCoins = space?.coins || 0;
      const snakeGames = snake?.games_played || 0;
      const spaceGames = space?.games_played || 0;
      
      return {
        telegram_id: telegramId,
        username: snake?.username || space?.username,
        first_name: snake?.first_name || space?.first_name,
        
        // Общая статистика (сумма из обеих игр)
        total_coins: snakeCoins + spaceCoins,
        total_games_played: snakeGames + spaceGames,
        
        // Статистика по играм
        snake_high_score: snake?.high_score || 0,
        snake_coins: snakeCoins,
        snake_games: snakeGames,
        
        space_high_score: space?.high_score || 0,
        space_coins: spaceCoins,
        space_games: spaceGames,
        space_asteroids: space?.total_asteroids || 0
      };
      
    } catch (error) {
      console.error('Error getting hub player:', error);
      return null;
    }
  },
  
  async createHubPlayer(telegramId, userData) {
    // Создаем игрока в Snake (основная таблица)
    try {
      const existing = await this.request(`telegram_players?telegram_id=eq.${telegramId}&select=telegram_id`);
      
      if (!existing || existing.length === 0) {
        await this.request('telegram_players', {
          method: 'POST',
          body: {
            telegram_id: telegramId,
            username: userData?.username || null,
            first_name: userData?.first_name || 'Player',
            last_name: userData?.last_name || null,
            coins: 250,
            high_score: 0,
            games_played: 0,
            equipped_skin: 'knight'
          }
        });
        
        // Добавляем стартовые скины для Snake
        await this.request('telegram_player_skins', {
          method: 'POST',
          body: [
            { telegram_id: telegramId, skin_id: 'knight' },
            { telegram_id: telegramId, skin_id: 'dragon' }
          ],
          prefer: 'return=minimal'
        });
      }
      
      return await this.getHubPlayer(telegramId);
      
    } catch (error) {
      console.error('Error creating hub player:', error);
      return await this.getHubPlayer(telegramId);
    }
  }
};

window.SupabaseHub = SupabaseHub;
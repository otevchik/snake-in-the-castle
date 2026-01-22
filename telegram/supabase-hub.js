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
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },
  
  async getHubPlayer(telegramId) {
    try {
      // Get from existing telegram_players table
      const data = await this.request(`telegram_players?telegram_id=eq.${telegramId}&select=*`);
      
      if (!data || data.length === 0) return null;
      
      const player = data[0];
      
      // Map to hub format
      return {
        telegram_id: player.telegram_id,
        username: player.username,
        first_name: player.first_name,
        total_coins: player.coins || 0,
        total_games_played: player.games_played || 0,
        snake_high_score: player.high_score || 0
      };
      
    } catch (error) {
      console.error('Error getting hub player:', error);
      return null;
    }
  },
  
  async createHubPlayer(telegramId, userData) {
    try {
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
      
      // Add starter skins
      await this.request('telegram_player_skins', {
        method: 'POST',
        body: [
          { telegram_id: telegramId, skin_id: 'knight' },
          { telegram_id: telegramId, skin_id: 'dragon' }
        ],
        prefer: 'return=minimal'
      });
      
      return await this.getHubPlayer(telegramId);
      
    } catch (error) {
      console.error('Error creating hub player:', error);
      return await this.getHubPlayer(telegramId);
    }
  }
};

window.SupabaseHub = SupabaseHub; 
// =====================
// SUPABASE CLIENT FOR TELEGRAM
// =====================

const SUPABASE_URL = 'https://hiicndghblbsrgbmtufd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWNuZGdoYmxic3JnYm10dWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTQ5NzIsImV4cCI6MjA4NDQ3MDk3Mn0.cX6CU4bl3jHbFRw75I0LyMpPMEK2GzYoDcmeQa05kMI';

const SupabaseTelegram = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  debug: true, // Включить логирование
  
  log(...args) {
    if (this.debug) {
      console.log('[Supabase]', ...args);
    }
  },
  
  error(...args) {
    console.error('[Supabase Error]', ...args);
  },
  
  // Make API request to Supabase
  async request(endpoint, options = {}) {
    const url = `${this.url}/rest/v1/${endpoint}`;
    
    this.log('Request:', options.method || 'GET', endpoint);
    
    const headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
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
        this.error('Response Error:', response.status, text);
        throw new Error(text || 'Supabase request failed');
      }
      
      const data = text ? JSON.parse(text) : null;
      this.log('Response:', data);
      
      return data;
    } catch (error) {
      this.error('Fetch Error:', error.message);
      throw error;
    }
  },

  // =====================
  // PLAYER METHODS
  // =====================
  
  async getPlayer(telegramId) {
    this.log('Getting player:', telegramId);
    
    try {
      const data = await this.request(`telegram_players?telegram_id=eq.${telegramId}&select=*`);
      
      if (!data || data.length === 0) {
        this.log('Player not found');
        return null;
      }
      
      const player = data[0];
      this.log('Player found:', player);
      
      // Get owned skins
      const skins = await this.request(`telegram_player_skins?telegram_id=eq.${telegramId}&select=skin_id`);
      player.ownedSkins = skins ? skins.map(s => s.skin_id) : ['knight', 'dragon'];
      
      // Get inventory
      const inventory = await this.request(`telegram_player_inventory?telegram_id=eq.${telegramId}&select=item_id,quantity`);
      player.inventory = inventory ? inventory.map(i => ({ id: i.item_id, quantity: i.quantity })) : [];
      
      return player;
    } catch (error) {
      this.error('Error getting player:', error);
      return null;
    }
  },
  
  async createPlayer(telegramId, userData) {
    this.log('Creating player:', telegramId, userData);
    
    try {
      // Create player
      const result = await this.request('telegram_players', {
        method: 'POST',
        body: {
          telegram_id: telegramId,
          username: userData?.username || null,
          first_name: userData?.first_name || 'Player',
          last_name: userData?.last_name || null,
          coins: 500,
          high_score: 0,
          games_played: 0,
          equipped_skin: 'knight'
        },
        prefer: 'return=representation'
      });
      
      this.log('Player created:', result);
      
      // Add starter skins
      await this.request('telegram_player_skins', {
        method: 'POST',
        body: [
          { telegram_id: telegramId, skin_id: 'knight' },
          { telegram_id: telegramId, skin_id: 'dragon' }
        ],
        prefer: 'return=minimal'
      });
      
      return await this.getPlayer(telegramId);
    } catch (error) {
      this.error('Error creating player:', error);
      // Попробуем получить существующего игрока
      return await this.getPlayer(telegramId);
    }
  },
  
  async updatePlayer(telegramId, data) {
    this.log('Updating player:', telegramId, data);
    
    try {
      const result = await this.request(`telegram_players?telegram_id=eq.${telegramId}`, {
        method: 'PATCH',
        body: {
          coins: data.coins,
          high_score: data.high_score,
          games_played: data.games_played,
          equipped_skin: data.equipped_skin,
          updated_at: new Date().toISOString()
        }
      });
      
      this.log('Player updated:', result);
      return true;
    } catch (error) {
      this.error('Error updating player:', error);
      return false;
    }
  },

  // =====================
  // GAME SESSION METHODS
  // =====================
  
  async startGameSession(telegramId) {
    const sessionToken = crypto.randomUUID();
    this.log('Starting game session:', telegramId, sessionToken);
    
    try {
      await this.request('telegram_game_sessions', {
        method: 'POST',
        body: {
          telegram_id: telegramId,
          session_token: sessionToken
        }
      });
      
      return { sessionToken };
    } catch (error) {
      this.error('Error starting game session:', error);
      return { sessionToken: null };
    }
  },
  
  async endGameSession(sessionToken, finalScore, telegramId, userData) {
    this.log('Ending game session:', sessionToken, 'Score:', finalScore);
    
    try {
      // Update session
      if (sessionToken) {
        await this.request(`telegram_game_sessions?session_token=eq.${sessionToken}`, {
          method: 'PATCH',
          body: {
            ended_at: new Date().toISOString(),
            final_score: finalScore
          }
        });
      }
      
      // Get and update player
      const player = await this.getPlayer(telegramId);
      const coinsEarned = finalScore * 10;
      const isNewRecord = finalScore > (player?.high_score || 0);
      
      this.log('Player before update:', player);
      this.log('Coins earned:', coinsEarned, 'New record:', isNewRecord);
      
      const updateResult = await this.updatePlayer(telegramId, {
        coins: (player?.coins || 0) + coinsEarned,
        high_score: Math.max(player?.high_score || 0, finalScore),
        games_played: (player?.games_played || 0) + 1,
        equipped_skin: player?.equipped_skin || 'knight'
      });
      
      this.log('Update result:', updateResult);
      
      // Update leaderboard if new record
      if (isNewRecord && finalScore > 0) {
        await this.updateLeaderboard(telegramId, finalScore, userData);
      }
      
      return {
        success: true,
        coinsEarned,
        newHighScore: Math.max(player?.high_score || 0, finalScore),
        isNewRecord
      };
    } catch (error) {
      this.error('Error ending game session:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================
  // LEADERBOARD METHODS
  // =====================
  
  async getLeaderboard(page = 1, perPage = 10) {
    try {
      // Get total count
      const countData = await this.request('telegram_leaderboard?select=telegram_id');
      const totalPlayers = Array.isArray(countData) ? countData.length : 0;
      const totalPages = Math.ceil(totalPlayers / perPage) || 1;
      
      // Get paginated data
      const offset = (page - 1) * perPage;
      const players = await this.request(
        `telegram_leaderboard?select=telegram_id,username,first_name,high_score,created_at,updated_at&order=high_score.desc&limit=${perPage}&offset=${offset}`
      );
      
      return {
        players: players ? players.map(p => ({
          telegramId: p.telegram_id,
          username: p.username,
          firstName: p.first_name,
          displayName: p.username ? '@' + p.username : p.first_name || 'Player',
          highScore: p.high_score,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })) : [],
        currentPage: page,
        totalPages,
        totalPlayers
      };
    } catch (error) {
      this.error('Error getting leaderboard:', error);
      return { players: [], currentPage: 1, totalPages: 1, totalPlayers: 0 };
    }
  },
  
  async updateLeaderboard(telegramId, score, userData) {
    this.log('Updating leaderboard:', telegramId, score);
    
    try {
      // Check if entry exists
      const existing = await this.request(`telegram_leaderboard?telegram_id=eq.${telegramId}&select=*`);
      
      if (existing && existing.length > 0) {
        // Update only if higher score
        if (score > existing[0].high_score) {
          await this.request(`telegram_leaderboard?telegram_id=eq.${telegramId}`, {
            method: 'PATCH',
            body: {
              high_score: score,
              username: userData?.username || null,
              first_name: userData?.first_name || 'Player',
              updated_at: new Date().toISOString()
            }
          });
        }
      } else {
        // Insert new entry
        await this.request('telegram_leaderboard', {
          method: 'POST',
          body: {
            telegram_id: telegramId,
            username: userData?.username || null,
            first_name: userData?.first_name || 'Player',
            high_score: score
          }
        });
      }
      
      return { success: true };
    } catch (error) {
      this.error('Error updating leaderboard:', error);
      return { success: false, error: error.message };
    }
  },
  
  async getPlayerRank(telegramId) {
    try {
      const player = await this.request(`telegram_leaderboard?telegram_id=eq.${telegramId}&select=high_score`);
      
      if (!player || player.length === 0) return null;
      
      const higher = await this.request(
        `telegram_leaderboard?high_score=gt.${player[0].high_score}&select=telegram_id`
      );
      
      return (higher?.length || 0) + 1;
    } catch (error) {
      this.error('Error getting player rank:', error);
      return null;
    }
  },

  // =====================
  // SHOP & INVENTORY
  // =====================
  
  async buyItem(telegramId, itemId, price) {
    this.log('Buying item:', itemId, 'Price:', price);
    
    try {
      const player = await this.getPlayer(telegramId);
      
      if (!player || player.coins < price) {
        return { success: false, error: 'Not enough coins' };
      }
      
      // Update coins
      await this.updatePlayer(telegramId, {
        coins: player.coins - price,
        high_score: player.high_score,
        games_played: player.games_played,
        equipped_skin: player.equipped_skin
      });
      
      // Check if item exists in inventory
      const existing = await this.request(
        `telegram_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}&select=*`
      );
      
      if (existing && existing.length > 0) {
        await this.request(
          `telegram_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity + 1 }
        });
      } else {
        await this.request('telegram_player_inventory', {
          method: 'POST',
          body: {
            telegram_id: telegramId,
            item_id: itemId,
            quantity: 1
          }
        });
      }
      
      return { success: true, player: await this.getPlayer(telegramId) };
    } catch (error) {
      this.error('Error buying item:', error);
      return { success: false, error: error.message };
    }
  },
  
  async consumeItem(telegramId, itemId) {
    this.log('Consuming item:', itemId);
    
    try {
      const existing = await this.request(
        `telegram_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}&select=*`
      );
      
      if (!existing || existing.length === 0) {
        return { success: false, error: 'Item not found' };
      }
      
      if (existing[0].quantity <= 1) {
        await this.request(
          `telegram_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}`, {
          method: 'DELETE'
        });
      } else {
        await this.request(
          `telegram_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity - 1 }
        });
      }
      
      return { success: true };
    } catch (error) {
      this.error('Error consuming item:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================
  // MYSTERY CASE
  // =====================
  
  async openCase(telegramId, casePrice, skins) {
    this.log('Opening case for:', telegramId);
    
    try {
      const player = await this.getPlayer(telegramId);
      
      if (!player || player.coins < casePrice) {
        return { success: false, error: 'Not enough coins!' };
      }
      
      // Get droppable skins
      const droppableSkins = skins.filter(s => !s.starter && s.weight > 0);
      const totalWeight = droppableSkins.reduce((sum, s) => sum + s.weight, 0);
      
      // Random selection
      let random = Math.random() * totalWeight;
      let selectedSkin = null;
      
      for (const skin of droppableSkins) {
        random -= skin.weight;
        if (random <= 0) {
          selectedSkin = skin;
          break;
        }
      }
      
      if (!selectedSkin) selectedSkin = droppableSkins[0];
      
      this.log('Selected skin:', selectedSkin);
      
      let isDuplicate = false;
      let refundAmount = 0;
      let newCoins = player.coins - casePrice;
      
      // Check if already owned
      if (player.ownedSkins && player.ownedSkins.includes(selectedSkin.id)) {
        isDuplicate = true;
        refundAmount = Math.floor(casePrice * 0.25);
        newCoins += refundAmount;
      } else {
        // Add skin
        await this.request('telegram_player_skins', {
          method: 'POST',
          body: {
            telegram_id: telegramId,
            skin_id: selectedSkin.id
          }
        });
      }
      
      // Update coins
      await this.updatePlayer(telegramId, {
        coins: newCoins,
        high_score: player.high_score,
        games_played: player.games_played,
        equipped_skin: player.equipped_skin
      });
      
      return {
        success: true,
        skin: selectedSkin,
        isDuplicate,
        refundAmount,
        player: await this.getPlayer(telegramId)
      };
    } catch (error) {
      this.error('Error opening case:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================
  // SKINS
  // =====================
  
  async equipSkin(telegramId, skinId) {
    this.log('Equipping skin:', skinId);
    
    try {
      const player = await this.getPlayer(telegramId);
      
      if (!player || !player.ownedSkins.includes(skinId)) {
        return { success: false, error: 'Skin not owned' };
      }
      
      await this.updatePlayer(telegramId, {
        coins: player.coins,
        high_score: player.high_score,
        games_played: player.games_played,
        equipped_skin: skinId
      });
      
      return { success: true, player: await this.getPlayer(telegramId) };
    } catch (error) {
      this.error('Error equipping skin:', error);
      return { success: false, error: error.message };
    }
  },
  
  // =====================
  // TEST CONNECTION
  // =====================
  
  async testConnection() {
    this.log('Testing Supabase connection...');
    
    try {
      const response = await fetch(`${this.url}/rest/v1/`, {
        headers: {
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`
        }
      });
      
      if (response.ok) {
        this.log('✅ Connection successful!');
        return true;
      } else {
        this.error('❌ Connection failed:', response.status);
        return false;
      }
    } catch (error) {
      this.error('❌ Connection error:', error);
      return false;
    }
  }
};

// Export
window.SupabaseTelegram = SupabaseTelegram;

// Test connection on load
SupabaseTelegram.testConnection();
// =====================
// SUPABASE CLIENT FOR SPACE SHIP
// =====================

const SUPABASE_URL = 'https://hiicndghblbsrgbmtufd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWNuZGdoYmxic3JnYm10dWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTQ5NzIsImV4cCI6MjA4NDQ3MDk3Mn0.cX6CU4bl3jHbFRw75I0LyMpPMEK2GzYoDcmeQa05kMI';

const SupabaseSpace = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  debug: true,
  
  log(...args) {
    if (this.debug) console.log('[SupabaseSpace]', ...args);
  },
  
  error(...args) {
    console.error('[SupabaseSpace Error]', ...args);
  },
  
  async request(endpoint, options = {}) {
    const url = `${this.url}/rest/v1/${endpoint}`;
    
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
        throw new Error(text || 'Request failed');
      }
      
      return text ? JSON.parse(text) : null;
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
      const data = await this.request(`space_players?telegram_id=eq.${telegramId}&select=*`);
      
      if (!data || data.length === 0) return null;
      
      const player = data[0];
      
      // Get owned ships
      const ships = await this.request(`space_player_ships?telegram_id=eq.${telegramId}&select=ship_id`);
      player.ownedShips = ships ? ships.map(s => s.ship_id) : ['fighter', 'shuttle'];
      
      // Get inventory
      const inventory = await this.request(`space_player_inventory?telegram_id=eq.${telegramId}&select=item_id,quantity`);
      player.inventory = inventory ? inventory.map(i => ({ id: i.item_id, quantity: i.quantity })) : [];
      
      return player;
    } catch (error) {
      this.error('Error getting player:', error);
      return null;
    }
  },
  
  async createPlayer(telegramId, userData) {
    this.log('Creating player:', telegramId);
    
    try {
      await this.request('space_players', {
        method: 'POST',
        body: {
          telegram_id: telegramId,
          username: userData?.username || null,
          first_name: userData?.first_name || 'Pilot',
          last_name: userData?.last_name || null,
          coins: 250,
          high_score: 0,
          games_played: 0,
          total_asteroids: 0,
          equipped_ship: 'fighter'
        }
      });
      
      // Add starter ships
      await this.request('space_player_ships', {
        method: 'POST',
        body: [
          { telegram_id: telegramId, ship_id: 'fighter' },
          { telegram_id: telegramId, ship_id: 'shuttle' }
        ],
        prefer: 'return=minimal'
      });
      
      return await this.getPlayer(telegramId);
    } catch (error) {
      this.error('Error creating player:', error);
      return await this.getPlayer(telegramId);
    }
  },
  
  async updatePlayer(telegramId, data) {
    this.log('Updating player:', telegramId, data);
    
    try {
      await this.request(`space_players?telegram_id=eq.${telegramId}`, {
        method: 'PATCH',
        body: {
          coins: data.coins,
          high_score: data.high_score,
          games_played: data.games_played,
          total_asteroids: data.total_asteroids,
          equipped_ship: data.equipped_ship,
          updated_at: new Date().toISOString()
        }
      });
      return true;
    } catch (error) {
      this.error('Error updating player:', error);
      return false;
    }
  },

  // =====================
  // GAME SESSION
  // =====================
  
  async startGameSession(telegramId) {
    const sessionToken = crypto.randomUUID();
    
    try {
      await this.request('space_game_sessions', {
        method: 'POST',
        body: {
          telegram_id: telegramId,
          session_token: sessionToken
        }
      });
      return { sessionToken };
    } catch (error) {
      this.error('Error starting session:', error);
      return { sessionToken: null };
    }
  },
  
  async endGameSession(sessionToken, finalScore, asteroidsDestroyed, coinsCollected, telegramId, userData) {
    this.log('Ending session:', sessionToken, 'Score:', finalScore);
    
    try {
      if (sessionToken) {
        await this.request(`space_game_sessions?session_token=eq.${sessionToken}`, {
          method: 'PATCH',
          body: {
            ended_at: new Date().toISOString(),
            final_score: finalScore,
            asteroids_destroyed: asteroidsDestroyed,
            coins_collected: coinsCollected
          }
        });
      }
      
      const player = await this.getPlayer(telegramId);
      const totalCoins = coinsCollected + Math.floor(finalScore / 10);
      const isNewRecord = finalScore > (player?.high_score || 0);
      
      await this.updatePlayer(telegramId, {
        coins: (player?.coins || 0) + totalCoins,
        high_score: Math.max(player?.high_score || 0, finalScore),
        games_played: (player?.games_played || 0) + 1,
        total_asteroids: (player?.total_asteroids || 0) + asteroidsDestroyed,
        equipped_ship: player?.equipped_ship || 'fighter'
      });
      
      if (isNewRecord && finalScore > 0) {
        await this.updateLeaderboard(telegramId, finalScore, asteroidsDestroyed, userData);
      }
      
      return { success: true, coinsEarned: totalCoins, isNewRecord };
    } catch (error) {
      this.error('Error ending session:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================
  // LEADERBOARD
  // =====================
  
  async getLeaderboard(page = 1, perPage = 10) {
    try {
      const countData = await this.request('space_leaderboard?select=telegram_id');
      const totalPlayers = Array.isArray(countData) ? countData.length : 0;
      const totalPages = Math.ceil(totalPlayers / perPage) || 1;
      
      const offset = (page - 1) * perPage;
      const players = await this.request(
        `space_leaderboard?select=telegram_id,username,first_name,high_score,total_asteroids&order=high_score.desc&limit=${perPage}&offset=${offset}`
      );
      
      return {
        players: players ? players.map(p => ({
          telegramId: p.telegram_id,
          username: p.username,
          firstName: p.first_name,
          displayName: p.username ? '@' + p.username : p.first_name || 'Pilot',
          highScore: p.high_score,
          totalAsteroids: p.total_asteroids
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
  
  async updateLeaderboard(telegramId, score, asteroids, userData) {
    try {
      const existing = await this.request(`space_leaderboard?telegram_id=eq.${telegramId}&select=*`);
      
      if (existing && existing.length > 0) {
        if (score > existing[0].high_score) {
          await this.request(`space_leaderboard?telegram_id=eq.${telegramId}`, {
            method: 'PATCH',
            body: {
              high_score: score,
              total_asteroids: (existing[0].total_asteroids || 0) + asteroids,
              username: userData?.username || null,
              first_name: userData?.first_name || 'Pilot',
              updated_at: new Date().toISOString()
            }
          });
        }
      } else {
        await this.request('space_leaderboard', {
          method: 'POST',
          body: {
            telegram_id: telegramId,
            username: userData?.username || null,
            first_name: userData?.first_name || 'Pilot',
            high_score: score,
            total_asteroids: asteroids
          }
        });
      }
      return { success: true };
    } catch (error) {
      this.error('Error updating leaderboard:', error);
      return { success: false };
    }
  },

  // =====================
  // SHOP & INVENTORY
  // =====================
  
  async buyItem(telegramId, itemId, price) {
    try {
      const player = await this.getPlayer(telegramId);
      
      if (!player || player.coins < price) {
        return { success: false, error: 'Not enough coins' };
      }
      
      await this.updatePlayer(telegramId, {
        coins: player.coins - price,
        high_score: player.high_score,
        games_played: player.games_played,
        total_asteroids: player.total_asteroids,
        equipped_ship: player.equipped_ship
      });
      
      const existing = await this.request(
        `space_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}&select=*`
      );
      
      if (existing && existing.length > 0) {
        await this.request(
          `space_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity + 1 }
        });
      } else {
        await this.request('space_player_inventory', {
          method: 'POST',
          body: { telegram_id: telegramId, item_id: itemId, quantity: 1 }
        });
      }
      
      return { success: true, player: await this.getPlayer(telegramId) };
    } catch (error) {
      this.error('Error buying item:', error);
      return { success: false, error: error.message };
    }
  },
  
  async consumeItem(telegramId, itemId) {
    try {
      const existing = await this.request(
        `space_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}&select=*`
      );
      
      if (!existing || existing.length === 0) return { success: false };
      
      if (existing[0].quantity <= 1) {
        await this.request(
          `space_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}`, {
          method: 'DELETE'
        });
      } else {
        await this.request(
          `space_player_inventory?telegram_id=eq.${telegramId}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity - 1 }
        });
      }
      
      return { success: true };
    } catch (error) {
      this.error('Error consuming item:', error);
      return { success: false };
    }
  },

  // =====================
  // MYSTERY CRATE
  // =====================
  
  async openCrate(telegramId, cratePrice, ships) {
    try {
      const player = await this.getPlayer(telegramId);
      
      if (!player || player.coins < cratePrice) {
        return { success: false, error: 'Not enough coins!' };
      }
      
      const droppableShips = ships.filter(s => !s.starter && s.weight > 0);
      const totalWeight = droppableShips.reduce((sum, s) => sum + s.weight, 0);
      
      let random = Math.random() * totalWeight;
      let selectedShip = null;
      
      for (const ship of droppableShips) {
        random -= ship.weight;
        if (random <= 0) {
          selectedShip = ship;
          break;
        }
      }
      
      if (!selectedShip) selectedShip = droppableShips[0];
      
      let isDuplicate = false;
      let refundAmount = 0;
      let newCoins = player.coins - cratePrice;
      
      if (player.ownedShips && player.ownedShips.includes(selectedShip.id)) {
        isDuplicate = true;
        refundAmount = Math.floor(cratePrice * 0.25);
        newCoins += refundAmount;
      } else {
        await this.request('space_player_ships', {
          method: 'POST',
          body: { telegram_id: telegramId, ship_id: selectedShip.id }
        });
      }
      
      await this.updatePlayer(telegramId, {
        coins: newCoins,
        high_score: player.high_score,
        games_played: player.games_played,
        total_asteroids: player.total_asteroids,
        equipped_ship: player.equipped_ship
      });
      
      return {
        success: true,
        ship: selectedShip,
        isDuplicate,
        refundAmount,
        player: await this.getPlayer(telegramId)
      };
    } catch (error) {
      this.error('Error opening crate:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================
  // SHIPS
  // =====================
  
  async equipShip(telegramId, shipId) {
    try {
      const player = await this.getPlayer(telegramId);
      
      if (!player || !player.ownedShips.includes(shipId)) {
        return { success: false, error: 'Ship not owned' };
      }
      
      await this.updatePlayer(telegramId, {
        coins: player.coins,
        high_score: player.high_score,
        games_played: player.games_played,
        total_asteroids: player.total_asteroids,
        equipped_ship: shipId
      });
      
      return { success: true, player: await this.getPlayer(telegramId) };
    } catch (error) {
      this.error('Error equipping ship:', error);
      return { success: false };
    }
  }
};

window.SupabaseSpace = SupabaseSpace;
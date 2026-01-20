// =====================
// SUPABASE CLIENT
// =====================
// ⚠️ REPLACE THESE WITH YOUR SUPABASE PROJECT VALUES
const SUPABASE_URL = 'https://hiicndghblbsrgbmtufd.supabase.co'; // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWNuZGdoYmxic3JnYm10dWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTQ5NzIsImV4cCI6MjA4NDQ3MDk3Mn0.cX6CU4bl3jHbFRw75I0LyMpPMEK2GzYoDcmeQa05kMI'; // e.g., eyJhbGciOiJS...

// Supabase client
const SupabaseClient = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  
  // Make API request to Supabase
  async request(endpoint, options = {}) {
    const url = `${this.url}/rest/v1/${endpoint}`;
    
    const headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    };
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Supabase request failed');
    }
    
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },
  
  // Call Edge Function
  async callFunction(functionName, body) {
    const url = `${this.url}/functions/v1/${functionName}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Function call failed');
    }
    
    return data;
  },

  // =====================
  // PLAYER METHODS
  // =====================
  
  async getPlayer(walletAddress) {
    const addr = walletAddress.toLowerCase();
    
    try {
      const data = await this.request(`players?wallet_address=eq.${addr}&select=*`);
      
      if (!data || data.length === 0) {
        return null;
      }
      
      const player = data[0];
      
      // Get owned skins
      const skins = await this.request(`player_skins?wallet_address=eq.${addr}&select=skin_id`);
      player.ownedSkins = skins.map(s => s.skin_id);
      
      // Get inventory
      const inventory = await this.request(`player_inventory?wallet_address=eq.${addr}&select=item_id,quantity`);
      player.inventory = inventory.map(i => ({ id: i.item_id, quantity: i.quantity }));
      
      return player;
    } catch (error) {
      console.error('Error getting player:', error);
      return null;
    }
  },
  
  async createPlayer(walletAddress) {
    const addr = walletAddress.toLowerCase();
    
    try {
      // Create player
      await this.request('players', {
        method: 'POST',
        body: {
          wallet_address: addr,
          coins: 500,
          high_score: 0,
          games_played: 0,
          equipped_skin: 'knight'
        },
        prefer: 'return=minimal'
      });
      
      // Add starter skins
      await this.request('player_skins', {
        method: 'POST',
        body: [
          { wallet_address: addr, skin_id: 'knight' },
          { wallet_address: addr, skin_id: 'dragon' }
        ],
        prefer: 'return=minimal'
      });
      
      return await this.getPlayer(walletAddress);
    } catch (error) {
      console.error('Error creating player:', error);
      // Player might already exist
      return await this.getPlayer(walletAddress);
    }
  },
  
  async updatePlayer(walletAddress, data) {
    const addr = walletAddress.toLowerCase();
    
    try {
      await this.request(`players?wallet_address=eq.${addr}`, {
        method: 'PATCH',
        body: {
          coins: data.coins,
          high_score: data.high_score,
          games_played: data.games_played,
          equipped_skin: data.equipped_skin,
          updated_at: new Date().toISOString()
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error updating player:', error);
      return false;
    }
  },
  
  // =====================
  // GAME SESSION METHODS (Anti-Cheat)
  // =====================
  
  async startGameSession(walletAddress) {
    try {
      // Try Edge Function first (more secure)
      return await this.callFunction('start-game', {
        wallet_address: walletAddress.toLowerCase()
      });
    } catch (error) {
      // Fallback to direct insert (less secure, for development)
      console.warn('Edge function not available, using fallback');
      
      const sessionToken = crypto.randomUUID();
      const seed = Math.floor(Math.random() * 1000000);
      
      await this.request('game_sessions', {
        method: 'POST',
        body: {
          wallet_address: walletAddress.toLowerCase(),
          session_token: sessionToken,
          seed: seed
        }
      });
      
      return { sessionToken, seed };
    }
  },
  
  async endGameSession(sessionToken, finalScore, signature, walletAddress) {
    try {
      // Try Edge Function first (validates score)
      return await this.callFunction('end-game', {
        session_token: sessionToken,
        final_score: finalScore,
        signature: signature,
        wallet_address: walletAddress.toLowerCase()
      });
    } catch (error) {
      // Fallback (less secure)
      console.warn('Edge function not available, using fallback:', error.message);
      
      // Update session
      await this.request(`game_sessions?session_token=eq.${sessionToken}`, {
        method: 'PATCH',
        body: {
          ended_at: new Date().toISOString(),
          final_score: finalScore
        }
      });
      
      // Get and update player
      const player = await this.getPlayer(walletAddress);
      const coinsEarned = finalScore * 10;
      const isNewRecord = finalScore > (player?.high_score || 0);
      
      await this.updatePlayer(walletAddress, {
        coins: (player?.coins || 0) + coinsEarned,
        high_score: Math.max(player?.high_score || 0, finalScore),
        games_played: (player?.games_played || 0) + 1,
        equipped_skin: player?.equipped_skin || 'knight'
      });
      
      // Update leaderboard if signature provided and new record
      if (signature && isNewRecord) {
        await this.submitToLeaderboard(walletAddress, finalScore, signature);
      }
      
      return {
        success: true,
        coinsEarned,
        newHighScore: Math.max(player?.high_score || 0, finalScore),
        isNewRecord
      };
    }
  },
  
  // =====================
  // LEADERBOARD METHODS
  // =====================
  
  async getLeaderboard(page = 1, perPage = 10) {
    try {
      // Get total count
      const countData = await this.request('leaderboard?select=wallet_address', {
        prefer: 'count=exact'
      });
      
      const totalPlayers = Array.isArray(countData) ? countData.length : 0;
      const totalPages = Math.ceil(totalPlayers / perPage) || 1;
      
      // Get paginated data
      const offset = (page - 1) * perPage;
      const players = await this.request(
        `leaderboard?select=wallet_address,high_score,signature,created_at,updated_at&order=high_score.desc&limit=${perPage}&offset=${offset}`
      );
      
      return {
        players: players.map(p => ({
          address: p.wallet_address,
          highScore: p.high_score,
          signature: p.signature,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })),
        currentPage: page,
        totalPages,
        totalPlayers
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return { players: [], currentPage: 1, totalPages: 1, totalPlayers: 0 };
    }
  },
  
  async submitToLeaderboard(walletAddress, score, signature) {
    const addr = walletAddress.toLowerCase();
    
    try {
      // Check if entry exists
      const existing = await this.request(`leaderboard?wallet_address=eq.${addr}&select=*`);
      
      if (existing && existing.length > 0) {
        // Update only if higher score
        if (score > existing[0].high_score) {
          await this.request(`leaderboard?wallet_address=eq.${addr}`, {
            method: 'PATCH',
            body: {
              high_score: score,
              signature: signature,
              updated_at: new Date().toISOString()
            }
          });
          return { success: true, message: 'New high score recorded!' };
        }
        return { success: true, message: 'Score not higher than existing record' };
      } else {
        // Insert new entry
        await this.request('leaderboard', {
          method: 'POST',
          body: {
            wallet_address: addr,
            high_score: score,
            signature: signature
          }
        });
        return { success: true, message: 'Score submitted to leaderboard!' };
      }
    } catch (error) {
      console.error('Error submitting to leaderboard:', error);
      return { success: false, error: error.message };
    }
  },
  
  async getPlayerRank(walletAddress) {
    const addr = walletAddress.toLowerCase();
    
    try {
      // Get player's score
      const player = await this.request(`leaderboard?wallet_address=eq.${addr}&select=high_score`);
      
      if (!player || player.length === 0) return null;
      
      // Count players with higher score
      const higher = await this.request(
        `leaderboard?high_score=gt.${player[0].high_score}&select=wallet_address`
      );
      
      return (higher?.length || 0) + 1;
    } catch (error) {
      console.error('Error getting player rank:', error);
      return null;
    }
  },
  
  // =====================
  // SHOP & INVENTORY METHODS
  // =====================
  
  async buyItem(walletAddress, itemId, price) {
    const addr = walletAddress.toLowerCase();
    
    try {
      // Get current player
      const player = await this.getPlayer(walletAddress);
      
      if (!player || player.coins < price) {
        return { success: false, error: 'Not enough coins' };
      }
      
      // Update coins
      await this.updatePlayer(walletAddress, {
        coins: player.coins - price,
        high_score: player.high_score,
        games_played: player.games_played,
        equipped_skin: player.equipped_skin
      });
      
      // Check if item exists in inventory
      const existing = await this.request(
        `player_inventory?wallet_address=eq.${addr}&item_id=eq.${itemId}&select=*`
      );
      
      if (existing && existing.length > 0) {
        // Update quantity
        await this.request(
          `player_inventory?wallet_address=eq.${addr}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity + 1 }
        });
      } else {
        // Insert new
        await this.request('player_inventory', {
          method: 'POST',
          body: {
            wallet_address: addr,
            item_id: itemId,
            quantity: 1
          }
        });
      }
      
      return { success: true, player: await this.getPlayer(walletAddress) };
    } catch (error) {
      console.error('Error buying item:', error);
      return { success: false, error: error.message };
    }
  },
  
  async consumeItem(walletAddress, itemId) {
    const addr = walletAddress.toLowerCase();
    
    try {
      const existing = await this.request(
        `player_inventory?wallet_address=eq.${addr}&item_id=eq.${itemId}&select=*`
      );
      
      if (!existing || existing.length === 0) {
        return { success: false, error: 'Item not found' };
      }
      
      if (existing[0].quantity <= 1) {
        // Delete item
        await this.request(
          `player_inventory?wallet_address=eq.${addr}&item_id=eq.${itemId}`, {
          method: 'DELETE'
        });
      } else {
        // Decrease quantity
        await this.request(
          `player_inventory?wallet_address=eq.${addr}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity - 1 }
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error consuming item:', error);
      return { success: false, error: error.message };
    }
  },
  
  // =====================
  // MYSTERY CASE METHODS
  // =====================
  
  async openCase(walletAddress, casePrice, skins) {
    const addr = walletAddress.toLowerCase();
    
    try {
      const player = await this.getPlayer(walletAddress);
      
      if (!player || player.coins < casePrice) {
        return { success: false, error: 'Not enough coins!' };
      }
      
      // Get droppable skins (exclude starters)
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
      
      let isDuplicate = false;
      let refundAmount = 0;
      let newCoins = player.coins - casePrice;
      
      // Check if already owned
      if (player.ownedSkins.includes(selectedSkin.id)) {
        isDuplicate = true;
        refundAmount = Math.floor(casePrice * 0.25);
        newCoins += refundAmount;
      } else {
        // Add skin
        await this.request('player_skins', {
          method: 'POST',
          body: {
            wallet_address: addr,
            skin_id: selectedSkin.id
          }
        });
      }
      
      // Update coins
      await this.updatePlayer(walletAddress, {
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
        player: await this.getPlayer(walletAddress)
      };
    } catch (error) {
      console.error('Error opening case:', error);
      return { success: false, error: error.message };
    }
  },
  
  // =====================
  // SKIN METHODS
  // =====================
  
  async equipSkin(walletAddress, skinId) {
    const addr = walletAddress.toLowerCase();
    
    try {
      const player = await this.getPlayer(walletAddress);
      
      if (!player || !player.ownedSkins.includes(skinId)) {
        return { success: false, error: 'Skin not owned' };
      }
      
      await this.updatePlayer(walletAddress, {
        coins: player.coins,
        high_score: player.high_score,
        games_played: player.games_played,
        equipped_skin: skinId
      });
      
      return { success: true, player: await this.getPlayer(walletAddress) };
    } catch (error) {
      console.error('Error equipping skin:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export
window.SupabaseClient = SupabaseClient;
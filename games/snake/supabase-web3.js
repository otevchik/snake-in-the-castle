// =====================
// SUPABASE CLIENT FOR WEB3 SNAKE
// =====================

const SUPABASE_URL = 'https://hiicndghblbsrgbmtufd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWNuZGdoYmxic3JnYm10dWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTQ5NzIsImV4cCI6MjA4NDQ3MDk3Mn0.cX6CU4bl3jHbFRw75I0LyMpPMEK2GzYoDcmeQa05kMI';

const SupabaseClient = {
  
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
        console.error('Request error:', response.status, text);
        throw new Error(text);
      }
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  },

  // =====================
  // PLAYER METHODS
  // =====================
  
  async getPlayer(walletAddress) {
    try {
      const address = walletAddress.toLowerCase();
      const data = await this.request(`web3_players?wallet_address=eq.${address}&select=*`);
      
      if (!data || data.length === 0) return null;
      
      const player = data[0];
      
      // Get skins
      const skins = await this.request(`web3_player_skins?wallet_address=eq.${address}&select=skin_id`);
      player.ownedSkins = skins ? skins.map(s => s.skin_id) : ['knight', 'dragon'];
      
      // Get inventory
      const inventory = await this.request(`web3_player_inventory?wallet_address=eq.${address}&select=item_id,quantity`);
      player.inventory = inventory ? inventory.map(i => ({ id: i.item_id, quantity: i.quantity })) : [];
      
      return player;
    } catch (error) {
      console.error('Error getting player:', error);
      return null;
    }
  },
  
  async createPlayer(walletAddress) {
    try {
      const address = walletAddress.toLowerCase();
      
      await this.request('web3_players', {
        method: 'POST',
        body: {
          wallet_address: address,
          coins: 250,
          high_score: 0,
          games_played: 0,
          stars: 0,
          equipped_skin: 'knight'
        }
      });
      
      // Starter skins
      await this.request('web3_player_skins', {
        method: 'POST',
        body: [
          { wallet_address: address, skin_id: 'knight' },
          { wallet_address: address, skin_id: 'dragon' }
        ],
        prefer: 'return=minimal'
      });
      
      return await this.getPlayer(address);
    } catch (error) {
      console.error('Error creating player:', error);
      return await this.getPlayer(walletAddress);
    }
  },
  
  async updatePlayer(walletAddress, data) {
    try {
      const address = walletAddress.toLowerCase();
      
      const updateData = {
        coins: data.coins,
        high_score: data.high_score,
        games_played: data.games_played,
        equipped_skin: data.equipped_skin,
        updated_at: new Date().toISOString()
      };
      
      // Добавляем stars только если передано
      if (data.stars !== undefined) {
        updateData.stars = data.stars;
      }
      
      await this.request(`web3_players?wallet_address=eq.${address}`, {
        method: 'PATCH',
        body: updateData
      });
      return true;
    } catch (error) {
      console.error('Error updating player:', error);
      return false;
    }
  },

  // =====================
  // GAME SESSION
  // =====================
  
  async endGameSession(finalScore, coinsEarned, starsEarned, walletAddress) {
    try {
      const address = walletAddress.toLowerCase();
      const player = await this.getPlayer(address);
      
      const isNewRecord = finalScore > (player?.high_score || 0);
      
      await this.updatePlayer(address, {
        coins: (player?.coins || 0) + coinsEarned,
        high_score: Math.max(player?.high_score || 0, finalScore),
        games_played: (player?.games_played || 0) + 1,
        stars: (player?.stars || 0) + starsEarned,
        equipped_skin: player?.equipped_skin || 'knight'
      });
      
      if (isNewRecord && finalScore > 0) {
        await this.updateLeaderboard(address, finalScore);
      }
      
      return { success: true, coinsEarned, starsEarned, isNewRecord };
    } catch (error) {
      console.error('Error ending session:', error);
      return { success: false };
    }
  },

  // =====================
  // LEADERBOARD
  // =====================
  
  async getLeaderboard(page = 1, perPage = 10) {
    try {
      const countData = await this.request('web3_leaderboard?select=wallet_address');
      const total = Array.isArray(countData) ? countData.length : 0;
      const totalPages = Math.ceil(total / perPage) || 1;
      
      const offset = (page - 1) * perPage;
      const players = await this.request(
        `web3_leaderboard?select=wallet_address,high_score&order=high_score.desc&limit=${perPage}&offset=${offset}`
      );
      
      return {
        players: players ? players.map(p => ({
          walletAddress: p.wallet_address,
          displayName: `${p.wallet_address.slice(0, 6)}...${p.wallet_address.slice(-4)}`,
          highScore: p.high_score
        })) : [],
        currentPage: page,
        totalPages,
        totalPlayers: total
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return { players: [], currentPage: 1, totalPages: 1, totalPlayers: 0 };
    }
  },
  
  async updateLeaderboard(walletAddress, score) {
    try {
      const address = walletAddress.toLowerCase();
      const existing = await this.request(`web3_leaderboard?wallet_address=eq.${address}&select=*`);
      
      if (existing && existing.length > 0) {
        if (score > existing[0].high_score) {
          await this.request(`web3_leaderboard?wallet_address=eq.${address}`, {
            method: 'PATCH',
            body: { high_score: score, updated_at: new Date().toISOString() }
          });
        }
      } else {
        await this.request('web3_leaderboard', {
          method: 'POST',
          body: { wallet_address: address, high_score: score }
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      return { success: false };
    }
  },
  
  async getPlayerRank(walletAddress) {
    try {
      const address = walletAddress.toLowerCase();
      const player = await this.request(`web3_leaderboard?wallet_address=eq.${address}&select=high_score`);
      
      if (!player || player.length === 0) return null;
      
      const higher = await this.request(
        `web3_leaderboard?high_score=gt.${player[0].high_score}&select=wallet_address`
      );
      
      return (higher?.length || 0) + 1;
    } catch (error) {
      return null;
    }
  },

  // =====================
  // SHOP & INVENTORY
  // =====================
  
  async buyItem(walletAddress, itemId, price) {
    try {
      const address = walletAddress.toLowerCase();
      const player = await this.getPlayer(address);
      
      if (!player || player.coins < price) {
        return { success: false, error: 'Not enough coins' };
      }
      
      await this.updatePlayer(address, {
        coins: player.coins - price,
        high_score: player.high_score,
        games_played: player.games_played,
        stars: player.stars,
        equipped_skin: player.equipped_skin
      });
      
      const existing = await this.request(
        `web3_player_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}&select=*`
      );
      
      if (existing && existing.length > 0) {
        await this.request(
          `web3_player_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity + 1 }
        });
      } else {
        await this.request('web3_player_inventory', {
          method: 'POST',
          body: { wallet_address: address, item_id: itemId, quantity: 1 }
        });
      }
      
      return { success: true, player: await this.getPlayer(address) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async consumeItem(walletAddress, itemId) {
    try {
      const address = walletAddress.toLowerCase();
      const existing = await this.request(
        `web3_player_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}&select=*`
      );
      
      if (!existing || existing.length === 0) return { success: false };
      
      if (existing[0].quantity <= 1) {
        await this.request(
          `web3_player_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}`, {
          method: 'DELETE'
        });
      } else {
        await this.request(
          `web3_player_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity - 1 }
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // =====================
  // MYSTERY CASE
  // =====================
  
  async openCase(walletAddress, casePrice, skins) {
    try {
      const address = walletAddress.toLowerCase();
      const player = await this.getPlayer(address);
      
      if (!player || player.coins < casePrice) {
        return { success: false, error: 'Not enough coins!' };
      }
      
      const droppableSkins = skins.filter(s => !s.starter && s.weight > 0);
      const totalWeight = droppableSkins.reduce((sum, s) => sum + s.weight, 0);
      
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
      
      if (player.ownedSkins && player.ownedSkins.includes(selectedSkin.id)) {
        isDuplicate = true;
        refundAmount = Math.floor(casePrice * 0.25);
        newCoins += refundAmount;
      } else {
        await this.request('web3_player_skins', {
          method: 'POST',
          body: { wallet_address: address, skin_id: selectedSkin.id }
        });
      }
      
      await this.updatePlayer(address, {
        coins: newCoins,
        high_score: player.high_score,
        games_played: player.games_played,
        stars: player.stars,
        equipped_skin: player.equipped_skin
      });
      
      return {
        success: true,
        skin: selectedSkin,
        isDuplicate,
        refundAmount,
        player: await this.getPlayer(address)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // =====================
  // SKINS
  // =====================
  
  async equipSkin(walletAddress, skinId) {
    try {
      const address = walletAddress.toLowerCase();
      const player = await this.getPlayer(address);
      
      if (!player || !player.ownedSkins.includes(skinId)) {
        return { success: false, error: 'Skin not owned' };
      }
      
      await this.updatePlayer(address, {
        coins: player.coins,
        high_score: player.high_score,
        games_played: player.games_played,
        stars: player.stars,
        equipped_skin: skinId
      });
      
      return { success: true, player: await this.getPlayer(address) };
    } catch (error) {
      return { success: false };
    }
  }
};

window.SupabaseClient = SupabaseClient;
// supabase-space.js - Supabase client for Space Ship (Web3 version)

const SUPABASE_URL = 'https://hiicndghblbsrgbmtufd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWNuZGdoYmxic3JnYm10dWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTQ5NzIsImV4cCI6MjA4NDQ3MDk3Mn0.cX6CU4bl3jHbFRw75I0LyMpPMEK2GzYoDcmeQa05kMI';

const SupabaseSpace = {
  
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
    if (!walletAddress) return null;
    const address = walletAddress.toLowerCase();
    
    try {
      const data = await this.request(`space_web3_players?wallet_address=eq.${address}&select=*`);
      
      if (!data || data.length === 0) return null;
      
      const player = data[0];
      
      // Get owned ships
      const ships = await this.request(`space_web3_ships?wallet_address=eq.${address}&select=ship_id`);
      player.ownedShips = ships ? ships.map(s => s.ship_id) : ['fighter', 'shuttle'];
      
      // Get inventory
      const inventory = await this.request(`space_web3_inventory?wallet_address=eq.${address}&select=item_id,quantity`);
      player.inventory = inventory ? inventory.map(i => ({ id: i.item_id, quantity: i.quantity })) : [];
      
      return player;
    } catch (error) {
      console.error('Error getting player:', error);
      return null;
    }
  },
  
  async createPlayer(walletAddress) {
    const address = walletAddress.toLowerCase();
    
    try {
      await this.request('space_web3_players', {
        method: 'POST',
        body: {
          wallet_address: address,
          coins: 250,
          high_score: 0,
          games_played: 0,
          total_asteroids: 0,
          equipped_ship: 'fighter'
        }
      });
      
      // Add starter ships
      await this.request('space_web3_ships', {
        method: 'POST',
        body: [
          { wallet_address: address, ship_id: 'fighter' },
          { wallet_address: address, ship_id: 'shuttle' }
        ],
        prefer: 'return=minimal'
      });
      
      return await this.getPlayer(address);
    } catch (error) {
      console.error('Error creating player:', error);
      return await this.getPlayer(address);
    }
  },
  
  async updatePlayer(walletAddress, data) {
    const address = walletAddress.toLowerCase();
    
    try {
      await this.request(`space_web3_players?wallet_address=eq.${address}`, {
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
      console.error('Error updating player:', error);
      return false;
    }
  },

  // =====================
  // GAME SESSION
  // =====================
  
  async startGameSession(walletAddress) {
    const sessionToken = crypto.randomUUID();
    const address = walletAddress.toLowerCase();
    
    try {
      await this.request('space_web3_sessions', {
        method: 'POST',
        body: {
          wallet_address: address,
          session_token: sessionToken
        }
      });
      return { sessionToken };
    } catch (error) {
      return { sessionToken: null };
    }
  },
  
  async endGameSession(sessionToken, finalScore, asteroidsDestroyed, coinsCollected, walletAddress) {
    const address = walletAddress.toLowerCase();
    
    try {
      if (sessionToken) {
        await this.request(`space_web3_sessions?session_token=eq.${sessionToken}`, {
          method: 'PATCH',
          body: {
            ended_at: new Date().toISOString(),
            final_score: finalScore,
            asteroids_destroyed: asteroidsDestroyed,
            coins_collected: coinsCollected
          }
        });
      }
      
      const player = await this.getPlayer(address);
      const totalCoins = coinsCollected + Math.floor(finalScore / 10);
      const isNewRecord = finalScore > (player?.high_score || 0);
      
      await this.updatePlayer(address, {
        coins: (player?.coins || 0) + totalCoins,
        high_score: Math.max(player?.high_score || 0, finalScore),
        games_played: (player?.games_played || 0) + 1,
        total_asteroids: (player?.total_asteroids || 0) + asteroidsDestroyed,
        equipped_ship: player?.equipped_ship || 'fighter'
      });
      
      if (isNewRecord && finalScore > 0) {
        await this.updateLeaderboard(address, finalScore, asteroidsDestroyed);
      }
      
      return { success: true, coinsEarned: totalCoins, isNewRecord };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // =====================
  // LEADERBOARD
  // =====================
  
  async getLeaderboard(page = 1, perPage = 10) {
    try {
      const countData = await this.request('space_web3_leaderboard?select=wallet_address');
      const totalPlayers = Array.isArray(countData) ? countData.length : 0;
      const totalPages = Math.ceil(totalPlayers / perPage) || 1;
      
      const offset = (page - 1) * perPage;
      const players = await this.request(
        `space_web3_leaderboard?select=wallet_address,high_score,total_asteroids&order=high_score.desc&limit=${perPage}&offset=${offset}`
      );
      
      return {
        players: players ? players.map(p => ({
          walletAddress: p.wallet_address,
          displayName: `${p.wallet_address.slice(0, 6)}...${p.wallet_address.slice(-4)}`,
          highScore: p.high_score,
          totalAsteroids: p.total_asteroids
        })) : [],
        currentPage: page,
        totalPages,
        totalPlayers
      };
    } catch (error) {
      return { players: [], currentPage: 1, totalPages: 1, totalPlayers: 0 };
    }
  },
  
  async updateLeaderboard(walletAddress, score, asteroids) {
    const address = walletAddress.toLowerCase();
    
    try {
      const existing = await this.request(`space_web3_leaderboard?wallet_address=eq.${address}&select=*`);
      
      if (existing && existing.length > 0) {
        if (score > existing[0].high_score) {
          await this.request(`space_web3_leaderboard?wallet_address=eq.${address}`, {
            method: 'PATCH',
            body: {
              high_score: score,
              total_asteroids: (existing[0].total_asteroids || 0) + asteroids,
              updated_at: new Date().toISOString()
            }
          });
        }
      } else {
        await this.request('space_web3_leaderboard', {
          method: 'POST',
          body: {
            wallet_address: address,
            high_score: score,
            total_asteroids: asteroids
          }
        });
      }
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // =====================
  // SHOP & INVENTORY
  // =====================
  
  async buyItem(walletAddress, itemId, price) {
    const address = walletAddress.toLowerCase();
    
    try {
      const player = await this.getPlayer(address);
      
      if (!player || player.coins < price) {
        return { success: false, error: 'Not enough coins' };
      }
      
      await this.updatePlayer(address, {
        coins: player.coins - price,
        high_score: player.high_score,
        games_played: player.games_played,
        total_asteroids: player.total_asteroids,
        equipped_ship: player.equipped_ship
      });
      
      const existing = await this.request(
        `space_web3_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}&select=*`
      );
      
      if (existing && existing.length > 0) {
        await this.request(
          `space_web3_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}`, {
          method: 'PATCH',
          body: { quantity: existing[0].quantity + 1 }
        });
      } else {
        await this.request('space_web3_inventory', {
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
    const address = walletAddress.toLowerCase();
    
    try {
      const existing = await this.request(
        `space_web3_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}&select=*`
      );
      
      if (!existing || existing.length === 0) return { success: false };
      
      if (existing[0].quantity <= 1) {
        await this.request(
          `space_web3_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}`, {
          method: 'DELETE'
        });
      } else {
        await this.request(
          `space_web3_inventory?wallet_address=eq.${address}&item_id=eq.${itemId}`, {
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
  // MYSTERY CRATE
  // =====================
  
  async openCrate(walletAddress, cratePrice, ships) {
    const address = walletAddress.toLowerCase();
    
    try {
      const player = await this.getPlayer(address);
      
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
        await this.request('space_web3_ships', {
          method: 'POST',
          body: { wallet_address: address, ship_id: selectedShip.id }
        });
      }
      
      await this.updatePlayer(address, {
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
        player: await this.getPlayer(address)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // =====================
  // SHIPS
  // =====================
  
  async equipShip(walletAddress, shipId) {
    const address = walletAddress.toLowerCase();
    
    try {
      const player = await this.getPlayer(address);
      
      if (!player || !player.ownedShips.includes(shipId)) {
        return { success: false, error: 'Ship not owned' };
      }
      
      await this.updatePlayer(address, {
        coins: player.coins,
        high_score: player.high_score,
        games_played: player.games_played,
        total_asteroids: player.total_asteroids,
        equipped_ship: shipId
      });
      
      return { success: true, player: await this.getPlayer(address) };
    } catch (error) {
      return { success: false };
    }
  }
};

window.SupabaseSpace = SupabaseSpace;
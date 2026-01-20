// =====================
// SQLite DATABASE (using sql.js)
// =====================

const Database = {
  db: null,
  isReady: false,
  readyCallbacks: [],

  // Initialize SQLite database
  async init() {
    try {
      // Load sql.js library
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem('snakeGame_sqlite');
      
      if (savedDb) {
        const binaryArray = this.base64ToUint8Array(savedDb);
        this.db = new SQL.Database(binaryArray);
        console.log('Database loaded from localStorage');
      } else {
        this.db = new SQL.Database();
        this.createTables();
        console.log('New database created');
      }

      this.isReady = true;
      this.readyCallbacks.forEach(cb => cb());
      this.readyCallbacks = [];
      
      return true;
    } catch (error) {
      console.error('Database init error:', error);
      return false;
    }
  },

  // Wait for database to be ready
  onReady(callback) {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  },

  // Create database tables
  createTables() {
    // Players table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS players (
        address TEXT PRIMARY KEY,
        coins INTEGER DEFAULT 500,
        high_score INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        equipped_skin TEXT DEFAULT 'knight',
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Player owned skins table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_skins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_address TEXT,
        skin_id TEXT,
        acquired_at INTEGER,
        UNIQUE(player_address, skin_id)
      )
    `);

    // Player inventory table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_address TEXT,
        item_id TEXT,
        quantity INTEGER DEFAULT 1,
        UNIQUE(player_address, item_id)
      )
    `);

    // Leaderboard table (verified scores only)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        address TEXT PRIMARY KEY,
        high_score INTEGER,
        signature TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    this.save();
  },

  // Save database to localStorage
  save() {
    if (!this.db) return;
    const data = this.db.export();
    const base64 = this.uint8ArrayToBase64(data);
    localStorage.setItem('snakeGame_sqlite', base64);
  },

  // Helper: Uint8Array to Base64
  uint8ArrayToBase64(uint8Array) {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  },

  // Helper: Base64 to Uint8Array
  base64ToUint8Array(base64) {
    const binary = atob(base64);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    return uint8Array;
  },

  // =====================
  // SKINS CONFIGURATION
  // =====================

  ALL_SKINS: [
    { id: 'knight', name: 'Knight', icon: '⚔️', price: 0, colors: ['#667eea', '#764ba2'], rarity: 'common', weight: 0, starter: true },
    { id: 'dragon', name: 'Dragon', icon: '🐉', price: 0, colors: ['#ff6b6b', '#ee5a24'], rarity: 'common', weight: 0, starter: true },
    { id: 'forest', name: 'Forest', icon: '🌲', price: 1600, colors: ['#134e5e', '#71b280'], rarity: 'common', weight: 25 },
    { id: 'ocean', name: 'Ocean', icon: '🌊', price: 2200, colors: ['#2193b0', '#6dd5ed'], rarity: 'common', weight: 22 },
    { id: 'phoenix', name: 'Phoenix', icon: '🔥', price: 1500, colors: ['#ff9500', '#ff5e3a'], rarity: 'uncommon', weight: 18 },
    { id: 'emerald', name: 'Emerald', icon: '💎', price: 1800, colors: ['#11998e', '#38ef7d'], rarity: 'uncommon', weight: 15 },
    { id: 'ice_king', name: 'Ice King', icon: '❄️', price: 2000, colors: ['#00d2ff', '#3a7bd5'], rarity: 'rare', weight: 10 },
    { id: 'shadow', name: 'Shadow', icon: '👤', price: 2500, colors: ['#232526', '#414345'], rarity: 'rare', weight: 8 },
    { id: 'rainbow', name: 'Rainbow', icon: '🌈', price: 3000, colors: ['#ff0080', '#7928ca'], rarity: 'epic', weight: 5 },
    { id: 'neon', name: 'Neon', icon: '💫', price: 3500, colors: ['#00f260', '#0575e6'], rarity: 'epic', weight: 4 },
    { id: 'vampire', name: 'Vampire', icon: '🧛', price: 4000, colors: ['#8e0000', '#1f1c18'], rarity: 'legendary', weight: 2 },
    { id: 'golden', name: 'Golden', icon: '👑', price: 5000, colors: ['#f7971e', '#ffd200'], rarity: 'legendary', weight: 1 }
  ],

  MYSTERY_CASE: {
    id: 'mystery_case',
    name: 'Mystery Case',
    icon: '📦',
    price: 1000,
    description: 'Contains a random skin! Duplicate = 25% refund',
    type: 'case'
  },

  SHOP_ITEMS: [
    { id: 'double_coins', name: 'Double Coins', icon: '💰', price: 500, description: '2x coins for next game' },
    { id: 'extra_life', name: 'Extra Life', icon: '❤️', price: 750, description: 'One extra life per game' },
    { id: 'slow_start', name: 'Slow Start', icon: '🐢', price: 300, description: 'Start slower, easier control' },
    { id: 'magnet', name: 'Food Magnet', icon: '🧲', price: 1000, description: 'Attract food from distance' },
    { id: 'shield', name: 'Shield', icon: '🛡️', price: 1200, description: 'Survive one wall hit' },
    { id: 'ghost', name: 'Ghost Mode', icon: '👻', price: 1500, description: 'Pass through yourself once' }
  ],

  RARITY_COLORS: {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b'
  },

  // =====================
  // PLAYER METHODS
  // =====================

  getPlayer(address) {
    if (!this.db) return null;
    
    const result = this.db.exec(`
      SELECT * FROM players WHERE address = '${address.toLowerCase()}'
    `);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    const columns = result[0].columns;
    
    const player = {};
    columns.forEach((col, i) => {
      player[this.snakeToCamel(col)] = row[i];
    });

    // Get owned skins
    player.ownedSkins = this.getPlayerOwnedSkins(address);
    
    // Get inventory
    player.inventory = this.getPlayerInventory(address);

    return player;
  },

  createPlayer(address) {
    if (!this.db) return null;
    
    const now = Date.now();
    const addr = address.toLowerCase();

    this.db.run(`
      INSERT OR IGNORE INTO players (address, coins, high_score, games_played, equipped_skin, created_at, updated_at)
      VALUES ('${addr}', 500, 0, 0, 'knight', ${now}, ${now})
    `);

    // Add starter skins
    this.db.run(`INSERT OR IGNORE INTO player_skins (player_address, skin_id, acquired_at) VALUES ('${addr}', 'knight', ${now})`);
    this.db.run(`INSERT OR IGNORE INTO player_skins (player_address, skin_id, acquired_at) VALUES ('${addr}', 'dragon', ${now})`);

    this.save();
    return this.getPlayer(address);
  },

  savePlayer(address, data) {
    if (!this.db) return;
    
    const now = Date.now();
    const addr = address.toLowerCase();

    this.db.run(`
      UPDATE players SET 
        coins = ${data.coins || 0},
        high_score = ${data.highScore || 0},
        games_played = ${data.gamesPlayed || 0},
        equipped_skin = '${data.equippedSkin || 'knight'}',
        updated_at = ${now}
      WHERE address = '${addr}'
    `);

    this.save();
  },

  getPlayerOwnedSkins(address) {
    if (!this.db) return ['knight', 'dragon'];
    
    const result = this.db.exec(`
      SELECT skin_id FROM player_skins WHERE player_address = '${address.toLowerCase()}'
    `);
    
    if (result.length === 0) return ['knight', 'dragon'];
    return result[0].values.map(row => row[0]);
  },

  getPlayerInventory(address) {
    if (!this.db) return [];
    
    const result = this.db.exec(`
      SELECT item_id, quantity FROM player_inventory WHERE player_address = '${address.toLowerCase()}'
    `);
    
    if (result.length === 0) return [];
    return result[0].values.map(row => ({ id: row[0], quantity: row[1] }));
  },

  // =====================
  // LEADERBOARD METHODS
  // =====================

  getLeaderboard(page = 1, perPage = 10) {
    if (!this.db) return { players: [], currentPage: 1, totalPages: 1, totalPlayers: 0 };
    
    // Get total count
    const countResult = this.db.exec('SELECT COUNT(*) FROM leaderboard');
    const totalPlayers = countResult.length > 0 ? countResult[0].values[0][0] : 0;
    const totalPages = Math.ceil(totalPlayers / perPage) || 1;
    
    const offset = (page - 1) * perPage;
    
    const result = this.db.exec(`
      SELECT address, high_score, signature, created_at, updated_at 
      FROM leaderboard 
      ORDER BY high_score DESC 
      LIMIT ${perPage} OFFSET ${offset}
    `);
    
    let players = [];
    if (result.length > 0) {
      players = result[0].values.map(row => ({
        address: row[0],
        highScore: row[1],
        signature: row[2],
        createdAt: row[3],
        updatedAt: row[4]
      }));
    }

    return {
      players,
      currentPage: page,
      totalPages,
      totalPlayers
    };
  },

  submitScore(address, score, signature) {
    if (!this.db) return { success: false, error: 'Database not ready' };
    if (!signature) return { success: false, error: 'Signature required to submit score' };

    const addr = address.toLowerCase();
    const now = Date.now();

    // Check if player exists in leaderboard
    const existing = this.db.exec(`SELECT high_score FROM leaderboard WHERE address = '${addr}'`);
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      const currentHighScore = existing[0].values[0][0];
      
      if (score > currentHighScore) {
        this.db.run(`
          UPDATE leaderboard SET 
            high_score = ${score}, 
            signature = '${signature}',
            updated_at = ${now}
          WHERE address = '${addr}'
        `);
        this.save();
        return { success: true, message: 'New high score recorded!' };
      } else {
        return { success: true, message: 'Score not higher than existing record' };
      }
    } else {
      this.db.run(`
        INSERT INTO leaderboard (address, high_score, signature, created_at, updated_at)
        VALUES ('${addr}', ${score}, '${signature}', ${now}, ${now})
      `);
      this.save();
      return { success: true, message: 'Score submitted to leaderboard!' };
    }
  },

  getPlayerRank(address) {
    if (!this.db) return null;
    
    const result = this.db.exec(`
      SELECT COUNT(*) + 1 as rank FROM leaderboard 
      WHERE high_score > (
        SELECT COALESCE(high_score, 0) FROM leaderboard WHERE address = '${address.toLowerCase()}'
      )
    `);
    
    // Check if player exists in leaderboard
    const exists = this.db.exec(`SELECT 1 FROM leaderboard WHERE address = '${address.toLowerCase()}'`);
    if (exists.length === 0 || exists[0].values.length === 0) return null;
    
    if (result.length > 0) {
      return result[0].values[0][0];
    }
    return null;
  },

  // =====================
  // SHOP METHODS
  // =====================

  getShopItems() {
    return this.SHOP_ITEMS;
  },

  getMysteryCase() {
    return this.MYSTERY_CASE;
  },

  buyItem(address, itemId) {
    const player = this.getPlayer(address);
    if (!player) return { success: false, error: 'Player not found' };

    const item = this.SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    if (player.coins < item.price) {
      return { success: false, error: 'Not enough coins' };
    }

    const addr = address.toLowerCase();
    const newCoins = player.coins - item.price;

    // Update coins
    this.db.run(`UPDATE players SET coins = ${newCoins} WHERE address = '${addr}'`);

    // Add to inventory
    const existing = this.db.exec(`
      SELECT quantity FROM player_inventory 
      WHERE player_address = '${addr}' AND item_id = '${itemId}'
    `);

    if (existing.length > 0 && existing[0].values.length > 0) {
      const newQty = existing[0].values[0][0] + 1;
      this.db.run(`
        UPDATE player_inventory SET quantity = ${newQty} 
        WHERE player_address = '${addr}' AND item_id = '${itemId}'
      `);
    } else {
      this.db.run(`
        INSERT INTO player_inventory (player_address, item_id, quantity) 
        VALUES ('${addr}', '${itemId}', 1)
      `);
    }

    this.save();
    return { success: true, player: this.getPlayer(address) };
  },

  // Consume one item from inventory (used when perks are activated)
  consumeItem(address, itemId) {
    if (!this.db) return { success: false, error: 'Database not ready' };
    
    const addr = address.toLowerCase();
    
    // Get current quantity
    const existing = this.db.exec(`
      SELECT quantity FROM player_inventory 
      WHERE player_address = '${addr}' AND item_id = '${itemId}'
    `);

    if (existing.length === 0 || existing[0].values.length === 0) {
      return { success: false, error: 'Item not in inventory' };
    }

    const currentQty = existing[0].values[0][0];

    if (currentQty <= 1) {
      // Remove the item completely
      this.db.run(`
        DELETE FROM player_inventory 
        WHERE player_address = '${addr}' AND item_id = '${itemId}'
      `);
    } else {
      // Decrease quantity by 1
      this.db.run(`
        UPDATE player_inventory SET quantity = ${currentQty - 1} 
        WHERE player_address = '${addr}' AND item_id = '${itemId}'
      `);
    }

    this.save();
    return { success: true };
  },

  // =====================
  // MYSTERY CASE METHODS
  // =====================

  openCase(address) {
    const player = this.getPlayer(address);
    if (!player) return { success: false, error: 'Player not found' };

    if (player.coins < this.MYSTERY_CASE.price) {
      return { success: false, error: 'Not enough coins!' };
    }

    const addr = address.toLowerCase();
    let newCoins = player.coins - this.MYSTERY_CASE.price;

    // Get droppable skins (exclude starters)
    const droppableSkins = this.ALL_SKINS.filter(s => !s.starter && s.weight > 0);
    const totalWeight = droppableSkins.reduce((sum, s) => sum + s.weight, 0);

    // Random selection based on weight
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

    // Check if player already owns this skin
    const ownedSkins = this.getPlayerOwnedSkins(address);
    
    if (ownedSkins.includes(selectedSkin.id)) {
      isDuplicate = true;
      refundAmount = Math.floor(this.MYSTERY_CASE.price * 0.25);
      newCoins += refundAmount;
    } else {
      // Add skin to player
      this.db.run(`
        INSERT INTO player_skins (player_address, skin_id, acquired_at) 
        VALUES ('${addr}', '${selectedSkin.id}', ${Date.now()})
      `);
    }

    // Update coins
    this.db.run(`UPDATE players SET coins = ${newCoins} WHERE address = '${addr}'`);
    this.save();

    return {
      success: true,
      skin: selectedSkin,
      isDuplicate,
      refundAmount,
      player: this.getPlayer(address)
    };
  },

  // =====================
  // SKINS METHODS
  // =====================

  getAllSkins() {
    return this.ALL_SKINS;
  },

  getPlayerSkins(address) {
    const ownedSkins = this.getPlayerOwnedSkins(address);
    const player = this.getPlayer(address);
    const equippedSkin = player?.equippedSkin || 'knight';

    return this.ALL_SKINS.map(skin => ({
      ...skin,
      owned: ownedSkins.includes(skin.id),
      equipped: equippedSkin === skin.id
    }));
  },

  // Skins can only be obtained from Mystery Case - no direct purchase
  buySkin(address, skinId) {
    return { success: false, error: 'Skins can only be obtained from Mystery Case!' };
  },

  equipSkin(address, skinId) {
    const player = this.getPlayer(address);
    if (!player) return { success: false, error: 'Player not found' };

    const ownedSkins = this.getPlayerOwnedSkins(address);
    if (!ownedSkins.includes(skinId)) {
      return { success: false, error: 'Skin not owned' };
    }

    const addr = address.toLowerCase();
    this.db.run(`UPDATE players SET equipped_skin = '${skinId}' WHERE address = '${addr}'`);
    this.save();

    return { success: true, player: this.getPlayer(address) };
  },

  // =====================
  // UTILITY METHODS
  // =====================

  shortenAddress(address) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  },

  getRarityColor(rarity) {
    return this.RARITY_COLORS[rarity] || '#9ca3af';
  },

  snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  },

  // Debug: Clear all data
  clearDatabase() {
    localStorage.removeItem('snakeGame_sqlite');
    location.reload();
  },

  // Debug: Show all tables
  showTables() {
    if (!this.db) return;
    
    console.log('=== PLAYERS ===');
    console.log(this.db.exec('SELECT * FROM players'));
    
    console.log('=== PLAYER_SKINS ===');
    console.log(this.db.exec('SELECT * FROM player_skins'));
    
    console.log('=== PLAYER_INVENTORY ===');
    console.log(this.db.exec('SELECT * FROM player_inventory'));
    
    console.log('=== LEADERBOARD ===');
    console.log(this.db.exec('SELECT * FROM leaderboard'));
  }
};

// Export
window.Database = Database;
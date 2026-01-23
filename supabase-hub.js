// =====================
// SUPABASE HUB CLIENT (WEB3 VERSION)
// =====================
// supabase-hub.js - Supabase Integration for Base Wallet Hub

// Supabase Config - ЗАМЕНИ НА СВОИ ДАННЫЕ
const SUPABASE_URL = 'https://hiicndghblbsrgbmtufd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWNuZGdoYmxic3JnYm10dWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTQ5NzIsImV4cCI6MjA4NDQ3MDk3Mn0.cX6CU4bl3jHbFRw75I0LyMpPMEK2GzYoDcmeQa05kMI';

const SupabaseHub = {
  client: null,
  
  // Initialize Supabase
  init() {
    if (typeof supabase !== 'undefined') {
      this.client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase initialized');
      return true;
    } else {
      console.error('Supabase library not loaded');
      return false;
    }
  },

  // Get or create user by wallet address
  async getOrCreateUser(walletAddress, profile = null) {
    if (!this.client || !walletAddress) return null;
    
    const address = walletAddress.toLowerCase();
    
    try {
      // Try to get existing user
      let { data: user, error } = await this.client
        .from('users')
        .select('*')
        .eq('wallet_address', address)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // User not found, create new one
        const newUser = {
          wallet_address: address,
          username: profile?.name || this.shortenAddress(address),
          avatar_url: profile?.avatar || null,
          basename: profile?.basename || null,
          ens_name: profile?.ens || null,
          total_coins: 0,
          total_games: 0,
          created_at: new Date().toISOString(),
          last_seen: new Date().toISOString()
        };
        
        const { data: created, error: createError } = await this.client
          .from('users')
          .insert([newUser])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating user:', createError);
          return null;
        }
        
        console.log('New user created:', created);
        return created;
      }
      
      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }
      
      // Update last seen and profile if changed
      const updates = {
        last_seen: new Date().toISOString()
      };
      
      if (profile?.name && profile.name !== user.username) {
        updates.username = profile.name;
      }
      if (profile?.avatar && profile.avatar !== user.avatar_url) {
        updates.avatar_url = profile.avatar;
      }
      if (profile?.basename && profile.basename !== user.basename) {
        updates.basename = profile.basename;
      }
      if (profile?.ens && profile.ens !== user.ens_name) {
        updates.ens_name = profile.ens;
      }
      
      await this.client
        .from('users')
        .update(updates)
        .eq('wallet_address', address);
      
      return { ...user, ...updates };
    } catch (e) {
      console.error('getOrCreateUser error:', e);
      return null;
    }
  },

  // Get user stats
  async getUserStats(walletAddress) {
    if (!this.client || !walletAddress) return null;
    
    const address = walletAddress.toLowerCase();
    
    try {
      // Get user
      const { data: user } = await this.client
        .from('users')
        .select('total_coins, total_games')
        .eq('wallet_address', address)
        .single();
      
      // Get high scores for each game
      const { data: scores } = await this.client
        .from('scores')
        .select('game, score')
        .eq('wallet_address', address)
        .order('score', { ascending: false });
      
      // Process scores by game
      const highScores = {};
      let totalScore = 0;
      
      if (scores) {
        scores.forEach(s => {
          if (!highScores[s.game] || s.score > highScores[s.game]) {
            highScores[s.game] = s.score;
          }
          totalScore = Math.max(totalScore, s.score);
        });
      }
      
      return {
        totalCoins: user?.total_coins || 0,
        totalGames: user?.total_games || 0,
        totalScore: totalScore,
        snakeHighScore: highScores['snake'] || 0,
        spaceHighScore: highScores['space-ship'] || 0,
        highScores: highScores
      };
    } catch (e) {
      console.error('getUserStats error:', e);
      return null;
    }
  },

  // Save game score
  async saveScore(walletAddress, game, score, coins = 0) {
    if (!this.client || !walletAddress) return false;
    
    const address = walletAddress.toLowerCase();
    
    try {
      // Insert score record
      const { error: scoreError } = await this.client
        .from('scores')
        .insert([{
          wallet_address: address,
          game: game,
          score: score,
          coins: coins,
          played_at: new Date().toISOString()
        }]);
      
      if (scoreError) {
        console.error('Error saving score:', scoreError);
        return false;
      }
      
      // Update user totals
      const { data: user } = await this.client
        .from('users')
        .select('total_coins, total_games')
        .eq('wallet_address', address)
        .single();
      
      if (user) {
        await this.client
          .from('users')
          .update({
            total_coins: (user.total_coins || 0) + coins,
            total_games: (user.total_games || 0) + 1
          })
          .eq('wallet_address', address);
      }
      
      console.log('Score saved:', { game, score, coins });
      return true;
    } catch (e) {
      console.error('saveScore error:', e);
      return false;
    }
  },

  // Get leaderboard
  async getLeaderboard(game, limit = 10) {
    if (!this.client) return [];
    
    try {
      const { data, error } = await this.client
        .from('scores')
        .select(`
          score,
          coins,
          played_at,
          wallet_address,
          users (
            username,
            avatar_url,
            basename,
            ens_name
          )
        `)
        .eq('game', game)
        .order('score', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }
      
      // Format leaderboard
      return data.map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        coins: entry.coins,
        address: entry.wallet_address,
        username: entry.users?.username || this.shortenAddress(entry.wallet_address),
        avatar: entry.users?.avatar_url,
        basename: entry.users?.basename,
        ens: entry.users?.ens_name,
        playedAt: entry.played_at
      }));
    } catch (e) {
      console.error('getLeaderboard error:', e);
      return [];
    }
  },

  // Get global leaderboard (all games combined)
  async getGlobalLeaderboard(limit = 10) {
    if (!this.client) return [];
    
    try {
      const { data, error } = await this.client
        .from('users')
        .select('wallet_address, username, avatar_url, basename, ens_name, total_coins, total_games')
        .order('total_coins', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching global leaderboard:', error);
        return [];
      }
      
      return data.map((entry, index) => ({
        rank: index + 1,
        address: entry.wallet_address,
        username: entry.username || this.shortenAddress(entry.wallet_address),
        avatar: entry.avatar_url,
        basename: entry.basename,
        totalCoins: entry.total_coins,
        totalGames: entry.total_games
      }));
    } catch (e) {
      console.error('getGlobalLeaderboard error:', e);
      return [];
    }
  },

  // Get user rank
  async getUserRank(walletAddress, game = null) {
    if (!this.client || !walletAddress) return null;
    
    const address = walletAddress.toLowerCase();
    
    try {
      if (game) {
        // Get rank for specific game
        const { data: userScore } = await this.client
          .from('scores')
          .select('score')
          .eq('wallet_address', address)
          .eq('game', game)
          .order('score', { ascending: false })
          .limit(1)
          .single();
        
        if (!userScore) return null;
        
        const { count } = await this.client
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .eq('game', game)
          .gt('score', userScore.score);
        
        return (count || 0) + 1;
      } else {
        // Get global rank by total coins
        const { data: user } = await this.client
          .from('users')
          .select('total_coins')
          .eq('wallet_address', address)
          .single();
        
        if (!user) return null;
        
        const { count } = await this.client
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gt('total_coins', user.total_coins);
        
        return (count || 0) + 1;
      }
    } catch (e) {
      console.error('getUserRank error:', e);
      return null;
    }
  },

  // Add coins to user
  async addCoins(walletAddress, amount) {
    if (!this.client || !walletAddress || amount <= 0) return false;
    
    const address = walletAddress.toLowerCase();
    
    try {
      const { data: user } = await this.client
        .from('users')
        .select('total_coins')
        .eq('wallet_address', address)
        .single();
      
      if (user) {
        await this.client
          .from('users')
          .update({
            total_coins: (user.total_coins || 0) + amount
          })
          .eq('wallet_address', address);
        
        return true;
      }
      return false;
    } catch (e) {
      console.error('addCoins error:', e);
      return false;
    }
  },

  // Utility: Shorten address
  shortenAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
};

// Export
window.SupabaseHub = SupabaseHub;
/**
 * Client-side lobby state management
 * Handles local lobby state for hosting games before connecting to signaling server
 */

import { GameLobby, Player, HostGameConfig, LobbyStatus, PlayerStatus } from './multiplayer-types';
import { generateGameCode, generateLobbyId, generatePlayerId, normalizeGameCode } from './game-code-generator';

/**
 * Client-side lobby manager for host game functionality
 * In production, this would sync with a signaling server/WebRTC
 */
class LobbyManager {
  private currentLobby: GameLobby | null = null;
  private hostPlayerId: string | null = null;
  private currentPlayerId: string | null = null;
  private isHosting: boolean = false;

  /**
   * Create a new game lobby
   */
  createLobby(config: HostGameConfig, hostName: string): GameLobby {
    const gameCode = generateGameCode();
    const lobbyId = generateLobbyId();
    const hostPlayerId = generatePlayerId();

    const hostPlayer: Player = {
      id: hostPlayerId,
      name: hostName,
      status: 'host',
      joinedAt: Date.now(),
    };

    const lobby: GameLobby = {
      id: lobbyId,
      gameCode,
      name: config.name,
      hostId: hostPlayerId,
      format: config.format,
      maxPlayers: config.maxPlayers,
      players: [hostPlayer],
      status: 'waiting',
      createdAt: Date.now(),
      settings: config.settings,
    };

    this.currentLobby = lobby;
    this.hostPlayerId = hostPlayerId;
    this.currentPlayerId = hostPlayerId;
    this.isHosting = true;

    // Store in localStorage for persistence
    this.saveLobbyToStorage();

    return lobby;
  }

  /**
   * Get the current lobby (if hosting or joined)
   */
  getCurrentLobby(): GameLobby | null {
    if (!this.currentLobby) {
      // Try to load from storage
      this.loadLobbyFromStorage();
    }
    return this.currentLobby;
  }

  /**
   * Check if current user is hosting
   */
  getIsHosting(): boolean {
    return this.isHosting;
  }

  /**
   * Get the current player ID
   */
  getCurrentPlayerId(): string | null {
    return this.currentPlayerId;
  }

  /**
   * Add a player to the lobby (simulated for host view)
   */
  addPlayer(playerName: string): Player | null {
    if (!this.currentLobby) return null;

    // Check if lobby is full
    const maxPlayers = parseInt(this.currentLobby.maxPlayers);
    if (this.currentLobby.players.length >= maxPlayers) {
      return null;
    }

    const newPlayer: Player = {
      id: generatePlayerId(),
      name: playerName,
      status: 'not-ready',
      joinedAt: Date.now(),
    };

    this.currentLobby.players.push(newPlayer);
    this.saveLobbyToStorage();

    return newPlayer;
  }

  /**
   * Remove a player from the lobby
   */
  removePlayer(playerId: string): boolean {
    if (!this.currentLobby) return false;

    // Cannot remove host
    if (playerId === this.currentLobby.hostId) return false;

    const initialLength = this.currentLobby.players.length;
    this.currentLobby.players = this.currentLobby.players.filter(p => p.id !== playerId);

    if (this.currentLobby.players.length < initialLength) {
      this.saveLobbyToStorage();
      return true;
    }

    return false;
  }

  /**
   * Update player ready status
   */
  updatePlayerStatus(playerId: string, status: PlayerStatus): boolean {
    if (!this.currentLobby) return false;

    const player = this.currentLobby.players.find(p => p.id === playerId);
    if (player) {
      player.status = status;
      this.saveLobbyToStorage();
      return true;
    }

    return false;
  }

  /**
   * Update player deck selection
   */
  updatePlayerDeck(playerId: string, deckId: string, deckName: string): boolean {
    if (!this.currentLobby) return false;

    const player = this.currentLobby.players.find(p => p.id === playerId);
    if (player) {
      player.deckId = deckId;
      player.deckName = deckName;
      this.saveLobbyToStorage();
      return true;
    }

    return false;
  }

  /**
   * Update lobby status
   */
  updateLobbyStatus(status: LobbyStatus): boolean {
    if (!this.currentLobby) return false;

    this.currentLobby.status = status;
    this.saveLobbyToStorage();
    return true;
  }

  /**
   * Check if all players are ready
   */
  allPlayersReady(): boolean {
    if (!this.currentLobby) return false;

    const maxPlayers = parseInt(this.currentLobby.maxPlayers);
    if (this.currentLobby.players.length < maxPlayers) return false;

    return this.currentLobby.players.every(
      p => p.status === 'ready' || p.status === 'host'
    );
  }

  /**
   * Check if lobby can start
   */
  canStartGame(): boolean {
    if (!this.currentLobby) return false;

    const maxPlayers = parseInt(this.currentLobby.maxPlayers);
    const hasEnoughPlayers = this.currentLobby.players.length >= 2;
    const allReady = this.allPlayersReady();

    return hasEnoughPlayers && allReady;
  }

  /**
   * Join an existing lobby by game code
   * In production, this would connect to a signaling server to find the lobby
   * For now, it looks for lobbies stored in localStorage (for testing)
   */
  joinLobby(gameCode: string, playerName: string): { success: boolean; lobby?: GameLobby; error?: string } {
    // Normalize the game code
    const normalizedCode = normalizeGameCode(gameCode);

    // In production, this would make an API call to find the lobby
    // For now, we'll simulate by looking for the lobby in a simulated lobby registry
    const lobby = this.findLobbyByCode(normalizedCode);

    if (!lobby) {
      return {
        success: false,
        error: 'Invalid game code. Please check the code and try again.',
      };
    }

    // Check if lobby is full
    const maxPlayers = parseInt(lobby.maxPlayers);
    if (lobby.players.length >= maxPlayers) {
      return {
        success: false,
        error: 'This lobby is full.',
      };
    }

    // Check if lobby is already in progress
    if (lobby.status === 'in-progress') {
      return {
        success: false,
        error: 'This game has already started.',
      };
    }

    // Create a new player
    const newPlayer: Player = {
      id: generatePlayerId(),
      name: playerName,
      status: 'not-ready',
      joinedAt: Date.now(),
    };

    // Add player to the lobby
    lobby.players.push(newPlayer);

    // Set as current lobby (we're joining, not hosting)
    this.currentLobby = lobby;
    this.currentPlayerId = newPlayer.id;
    this.isHosting = false;

    // Store in localStorage with a different key to distinguish from hosted lobbies
    this.saveJoinedLobbyToStorage(lobby, newPlayer.id);

    return {
      success: true,
      lobby,
    };
  }

  /**
   * Leave a joined lobby
   */
  leaveLobby(): void {
    if (!this.currentLobby || !this.currentPlayerId || this.isHosting) {
      return;
    }

    // Remove the current player from the lobby
    const playerId = this.currentPlayerId;
    this.removePlayer(playerId);

    // Clear local state
    this.currentLobby = null;
    this.currentPlayerId = null;
    localStorage.removeItem('planar_nexus_joined_lobby');
  }

  /**
   * Find a lobby by game code (simulated for prototype)
   * In production, this would query a server
   */
  private findLobbyByCode(gameCode: string): GameLobby | null {
    // For prototype testing, look for hosted lobbies in localStorage
    const hostedLobby = localStorage.getItem('planar_nexus_current_lobby');
    if (hostedLobby) {
      try {
        const lobby: GameLobby = JSON.parse(hostedLobby);
        if (normalizeGameCode(lobby.gameCode) === normalizeGameCode(gameCode)) {
          return lobby;
        }
      } catch (e) {
        console.error('Failed to parse hosted lobby:', e);
      }
    }

    // In production, this would make an API call to a lobby registry
    // For now, return null to indicate no lobby found
    return null;
  }

  /**
   * Close and destroy the current lobby (host only)
   */
  closeLobby(): void {
    this.currentLobby = null;
    this.hostPlayerId = null;
    this.currentPlayerId = null;
    this.isHosting = false;
    localStorage.removeItem('planar_nexus_current_lobby');
    localStorage.removeItem('planar_nexus_joined_lobby');
  }

  /**
   * Save lobby to localStorage for persistence (host)
   */
  private saveLobbyToStorage(): void {
    if (this.currentLobby) {
      localStorage.setItem('planar_nexus_current_lobby', JSON.stringify(this.currentLobby));
    }
  }

  /**
   * Save joined lobby to localStorage (for non-host players)
   */
  private saveJoinedLobbyToStorage(lobby: GameLobby, playerId: string): void {
    const joinedData = {
      lobby,
      playerId,
    };
    localStorage.setItem('planar_nexus_joined_lobby', JSON.stringify(joinedData));
  }

  /**
   * Load lobby from localStorage
   */
  private loadLobbyFromStorage(): void {
    // First try to load as host
    const hostedLobby = localStorage.getItem('planar_nexus_current_lobby');
    if (hostedLobby) {
      try {
        this.currentLobby = JSON.parse(hostedLobby);
        this.isHosting = true;
        this.currentPlayerId = this.currentLobby?.hostId || null;
        return;
      } catch (e) {
        console.error('Failed to load hosted lobby from storage:', e);
        localStorage.removeItem('planar_nexus_current_lobby');
      }
    }

    // Then try to load as joined player
    const joinedLobby = localStorage.getItem('planar_nexus_joined_lobby');
    if (joinedLobby) {
      try {
        const joinedData = JSON.parse(joinedLobby);
        this.currentLobby = joinedData.lobby;
        this.currentPlayerId = joinedData.playerId;
        this.isHosting = false;
      } catch (e) {
        console.error('Failed to load joined lobby from storage:', e);
        localStorage.removeItem('planar_nexus_joined_lobby');
      }
    }
  }

  /**
   * Get the host player ID
   */
  getHostPlayerId(): string | null {
    return this.hostPlayerId;
  }
}

// Singleton instance
export const lobbyManager = new LobbyManager();

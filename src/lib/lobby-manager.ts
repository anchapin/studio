/**
 * Client-side lobby state management
 * Handles local lobby state for hosting games before connecting to signaling server
 */

import { GameLobby, Player, HostGameConfig, LobbyStatus, PlayerStatus } from './multiplayer-types';
import { generateGameCode, generateLobbyId, generatePlayerId, normalizeGameCode } from './game-code-generator';
import { publicLobbyBrowser } from './public-lobby-browser';
import { validateDeckForLobby } from './format-validator';
import type { SavedDeck } from '@/app/actions';

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
   * Join an existing lobby by game code
   */
  joinLobby(gameCode: string, playerName: string): { success: boolean; lobby?: GameLobby; error?: string } {
    // Normalize the game code (remove hyphens, uppercase)
    const normalizedCode = normalizeGameCode(gameCode);
    
    // Try to load lobby from storage
    const existingLobby = this.loadLobbyFromStorage('joined');
    if (existingLobby && normalizeGameCode(existingLobby.gameCode) === normalizedCode) {
      this.currentLobby = existingLobby;
      this.currentPlayerId = existingLobby.players.find(p => p.name === playerName)?.id || null;
      this.isHosting = false;
      return { success: true, lobby: existingLobby };
    }
    
    // For now, simulate successful join (in real app, this would fetch from server)
    const mockLobby: GameLobby = {
      id: generateLobbyId(),
      gameCode: normalizedCode,
      name: 'Game',
      hostId: 'mock-host-id',
      format: 'commander',
      maxPlayers: '4',
      status: 'waiting',
      createdAt: Date.now(),
      settings: {
        allowSpectators: true,
        isPublic: false,
        timerEnabled: false,
      },
      players: [],
    };
    
    const newPlayer: Player = {
      id: generatePlayerId(),
      name: playerName,
      status: 'not-ready',
      joinedAt: Date.now(),
    };
    
    mockLobby.players.push(newPlayer);
    this.currentLobby = mockLobby;
    this.currentPlayerId = newPlayer.id;
    this.isHosting = false;
    this.saveLobbyToStorage('joined');
    
    return { success: true, lobby: mockLobby };
  }

  /**
   * Leave the current lobby
   */
  leaveLobby(): void {
    this.currentLobby = null;
    this.currentPlayerId = null;
    this.isHosting = false;
    localStorage.removeItem('lobby_joined');
  }

  /**
   * Find a lobby by game code
   */
  findLobbyByCode(gameCode: string): GameLobby | null {
    const normalizedCode = normalizeGameCode(gameCode);
    const hostedLobby = this.loadLobbyFromStorage('hosted');
    if (hostedLobby && normalizeGameCode(hostedLobby.gameCode) === normalizedCode) {
      return hostedLobby;
    }
    const joinedLobby = this.loadLobbyFromStorage('joined');
    if (joinedLobby && normalizeGameCode(joinedLobby.gameCode) === normalizedCode) {
      return joinedLobby;
    }
    return null;
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
    if (!this.currentLobby) return null;
    return this.isHosting ? this.hostPlayerId : this.currentPlayerId;
  }

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
    this.isHosting = true;

    // Store in localStorage for persistence
    this.saveLobbyToStorage();

    // Register public game if applicable
    if (config.settings.isPublic) {
      const hostPlayer = lobby.players.find(p => p.id === hostPlayerId);
      publicLobbyBrowser.registerPublicGame({
        id: lobby.id,
        gameCode: lobby.gameCode,
        name: lobby.name,
        hostName: hostPlayer?.name || 'Host',
        format: lobby.format,
        maxPlayers: lobby.maxPlayers,
        currentPlayers: lobby.players.length,
        status: lobby.status === 'in-progress' ? 'in-progress' : 'waiting',
        isPublic: config.settings.isPublic,
        hasPassword: !!config.settings.password,
        allowSpectators: config.settings.allowSpectators,
        createdAt: lobby.createdAt,
      });
    }

    return lobby;
  }

  /**
   * Get the current lobby (if hosting)
   */
  getCurrentLobby(): GameLobby | null {
    if (!this.currentLobby) {
      // Try to load from storage
      this.loadLobbyFromStorage();
    }
    return this.currentLobby;
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

    // Update public game if applicable
    if (this.currentLobby.settings.isPublic) {
      publicLobbyBrowser.updatePublicGame(this.currentLobby.id, {
        currentPlayers: this.currentLobby.players.length,
      });
    }

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

      // Update public game if applicable
      if (this.currentLobby.settings.isPublic) {
        publicLobbyBrowser.updatePublicGame(this.currentLobby.id, {
          currentPlayers: this.currentLobby.players.length,
        });
      }

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
   * Update player deck selection with format validation
   */
  updatePlayerDeck(
    playerId: string,
    deckId: string,
    deckName: string,
    deck?: SavedDeck
  ): { success: boolean; isValid: boolean; errors: string[] } {
    if (!this.currentLobby) {
      return { success: false, isValid: false, errors: ['Lobby not found'] };
    }

    const player = this.currentLobby.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, isValid: false, errors: ['Player not found'] };
    }

    // Update deck info
    player.deckId = deckId;
    player.deckName = deckName;
    player.deckFormat = deck?.format;

    // Validate deck against lobby format
    if (deck) {
      const validation = validateDeckForLobby(deck, this.currentLobby.format);
      player.deckValidationErrors = [...validation.errors, ...validation.warnings];
      this.saveLobbyToStorage();
      return {
        success: true,
        isValid: validation.isValid && validation.canPlay,
        errors: player.deckValidationErrors,
      };
    }

    this.saveLobbyToStorage();
    return { success: true, isValid: true, errors: [] };
  }

  /**
   * Update lobby status
   */
  updateLobbyStatus(status: LobbyStatus): boolean {
    if (!this.currentLobby) return false;

    this.currentLobby.status = status;
    this.saveLobbyToStorage();

    // Update public game if applicable
    if (this.currentLobby.settings.isPublic) {
      publicLobbyBrowser.updatePublicGame(this.currentLobby.id, {
        status: status === 'in-progress' ? 'in-progress' : 'waiting',
      });
    }

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
   * Now includes format validation check
   */
  canStartGame(): boolean {
    if (!this.currentLobby) return false;

    const maxPlayers = parseInt(this.currentLobby.maxPlayers);
    const hasEnoughPlayers = this.currentLobby.players.length >= 2;
    const allReady = this.allPlayersReady();

    // Check that all players have valid decks for the format
    const allDecksValid = this.currentLobby.players.every(player => {
      // Players must have a deck selected
      if (!player.deckId) return false;

      // Players must not have validation errors
      const hasErrors = player.deckValidationErrors && player.deckValidationErrors.length > 0;
      return !hasErrors;
    });

    return hasEnoughPlayers && allReady && allDecksValid;
  }

  /**
   * Close and destroy the current lobby
   */
  closeLobby(): void {
    // Unregister from public browser if applicable
    if (this.currentLobby?.settings.isPublic) {
      publicLobbyBrowser.unregisterPublicGame(this.currentLobby.id);
    }

    this.currentLobby = null;
    this.hostPlayerId = null;
    localStorage.removeItem('planar_nexus_current_lobby');
  }

  /**
   * Save lobby to localStorage for persistence
   */
  private saveLobbyToStorage(type: "hosted" | "joined" = "hosted"): void {
    if (this.currentLobby) {
      localStorage.setItem('planar_nexus_current_lobby', JSON.stringify(this.currentLobby));
    }
  }

  /**
   * Load lobby from localStorage
   */
  private loadLobbyFromStorage(type: "hosted" | "joined" = "hosted"): GameLobby | null {
    try {
      const stored = localStorage.getItem(`lobby_${type}`);
      if (!stored) return null;
      const lobby: GameLobby = JSON.parse(stored);
      return lobby;
    } catch {
      return null;
    }
  }

  /**(): void {
    const stored = localStorage.getItem('planar_nexus_current_lobby');
    if (stored) {
      try {
        this.currentLobby = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load lobby from storage:', e);
        localStorage.removeItem('planar_nexus_current_lobby');
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

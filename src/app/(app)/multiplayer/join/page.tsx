/**
 * Join game lobby page
 * Allows players to join existing lobbies using a game code
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, Crown, Users, Clock, Eye, ArrowLeft } from 'lucide-react';
import { useLobby } from '@/hooks/use-lobby';
import { PlayerStatus } from '@/lib/multiplayer-types';

export default function JoinLobbyPage() {
  const { lobby, isHost, isLoading, error, joinLobby, updatePlayerStatus, leaveLobby, getCurrentPlayerId } = useLobby();

  // Form state
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(true);

  // Load player name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('planar_nexus_player_name');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const handleJoinLobby = () => {
    if (!gameCode.trim() || !playerName.trim()) {
      return;
    }

    // Save player name to localStorage for future use
    localStorage.setItem('planar_nexus_player_name', playerName);

    joinLobby(gameCode, playerName);
    setShowJoinForm(false);
  };

  const handleReadyToggle = () => {
    if (!lobby) return;

    const currentPlayerId = getCurrentPlayerId();
    if (!currentPlayerId) return;

    const currentPlayer = lobby.players.find(p => p.id === currentPlayerId);
    if (currentPlayer) {
      const newStatus: PlayerStatus = currentPlayer.status === 'ready' ? 'not-ready' : 'ready';
      updatePlayerStatus(currentPlayerId, newStatus);
    }
  };

  const handleLeaveLobby = () => {
    if (confirm('Are you sure you want to leave the lobby?')) {
      leaveLobby();
      window.location.href = '/multiplayer';
    }
  };

  // Format display name
  const formatDisplayNames: Record<string, string> = {
    commander: 'Commander',
    modern: 'Modern',
    standard: 'Standard',
    pioneer: 'Pioneer',
    legacy: 'Legacy',
    vintage: 'Vintage',
    pauper: 'Pauper',
  };

  if (showJoinForm && !lobby) {
    return (
      <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto">
        <header className="mb-6">
          <Button variant="ghost" onClick={() => window.location.href = '/multiplayer'} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-headline text-3xl font-bold">Join a Game</h1>
          <p className="text-muted-foreground mt-1">
            Enter a game code to join your friends lobby.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Enter Game Code</CardTitle>
            <CardDescription>
              Ask the host for their game code and enter it below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Game Code Input */}
            <div className="space-y-2">
              <Label htmlFor="game-code">Game Code *</Label>
              <Input
                id="game-code"
                placeholder="e.g., ABC-123"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                maxLength={9}
                className="text-center text-2xl font-mono tracking-wider"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-character code from your host (hyphens are optional)
              </p>
            </div>

            {/* Player Name Input */}
            <div className="space-y-2">
              <Label htmlFor="player-name">Your Name *</Label>
              <Input
                id="player-name"
                placeholder="e.g., Alex"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is how other players will see you in the lobby
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleJoinLobby}
              disabled={!gameCode.trim() || !playerName.trim() || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Joining...' : 'Join Lobby'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have a code? <a href="/multiplayer" className="text-primary hover:underline">Browse games</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lobby) {
    const maxPlayers = parseInt(lobby.maxPlayers);
    const currentPlayerId = getCurrentPlayerId();
    const currentPlayer = lobby.players.find(p => p.id === currentPlayerId);

    return (
      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto">
        <header className="mb-6">
          <Button variant="ghost" onClick={handleLeaveLobby} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Leave Lobby
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
                {lobby.name}
                <Badge variant="secondary">{formatDisplayNames[lobby.format]}</Badge>
              </h1>
              <p className="text-muted-foreground mt-1">
                Waiting for the host to start the game...
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Lobby Info Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Lobby Info
              </CardTitle>
              <CardDescription>Game details and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{formatDisplayNames[lobby.format]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-medium">{lobby.players.length} / {maxPlayers}</span>
                </div>
                {lobby.settings.timerEnabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Timer:
                    </span>
                    <span className="font-medium">{lobby.settings.timerMinutes} min turns</span>
                  </div>
                )}
                {lobby.settings.allowSpectators && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Spectators:
                    </span>
                    <span className="font-medium">Allowed</span>
                  </div>
                )}
              </div>

              <Separator />

              <Alert>
                <AlertDescription className="text-sm">
                  {!isHost && (
                    <span>Waiting for the host to start the game. Make sure you're ready when all players have joined!</span>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Players List */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Players in Lobby</CardTitle>
              <CardDescription>
                All players must be ready before the host can start the game
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lobby.players.map((player) => {
                  const isCurrentPlayer = player.id === currentPlayerId;
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 border rounded-lg bg-card ${
                        isCurrentPlayer ? 'border-primary' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {player.id === lobby.hostId && (
                          <Crown className="w-5 h-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium">
                            {player.name}
                            {player.id === lobby.hostId && (
                              <Badge variant="outline" className="ml-2">Host</Badge>
                            )}
                            {isCurrentPlayer && (
                              <Badge variant="default" className="ml-2">You</Badge>
                            )}
                          </div>
                          {player.deckName && (
                            <div className="text-sm text-muted-foreground">
                              Deck: {player.deckName}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={player.status === 'ready' || player.status === 'host' ? 'default' : 'secondary'}
                      >
                        {player.status === 'ready' ? 'Ready' : player.status === 'host' ? 'Host' : 'Not Ready'}
                      </Badge>
                    </div>
                  );
                })}

                {/* Empty slots */}
                {Array.from({ length: maxPlayers - lobby.players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg bg-muted/20"
                  >
                    <span className="text-sm text-muted-foreground">
                      Waiting for player...
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {!isHost && currentPlayer && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleReadyToggle}
                    variant={currentPlayer.status === 'ready' ? 'outline' : 'default'}
                    className="flex-1"
                    size="lg"
                  >
                    {currentPlayer.status === 'ready' ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Not Ready
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Ready Up
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!isHost && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Toggle your ready status to let the host know you're prepared
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Note: This is a prototype lobby. P2P networking (WebRTC) is not yet implemented.
        </p>
      </div>
    );
  }

  return null;
}

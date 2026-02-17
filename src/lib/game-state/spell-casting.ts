/**
 * Spell Casting System
 * 
 * This module implements the spell casting system for Magic: The Gathering,
 * including cost validation, stack management, and timing restrictions.
 * 
 * Reference: CR 601 - Casting Spells
 */

import type { 
  GameState, 
  PlayerId, 
  CardInstanceId, 
  StackObject, 
  Target,
  WaitingChoice,
  ChoiceOption
} from "./types";
import { Phase } from "./types";
import { moveCardBetweenZones } from "./zones";
import { canPlayLand } from "./mana";
import { isInstantOrSorcery, isCreature, isPlaneswalker, isArtifact, isEnchantment } from "./card-instance";
import { parseOracleText, getManaValue } from "./oracle-text-parser";

/**
 * Generate a unique stack object ID
 */
function generateStackObjectId(): string {
  return `stack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a player can cast a spell from their hand
 */
export function canCastSpell(
  state: GameState,
  playerId: PlayerId,
  cardId: CardInstanceId
): { canCast: boolean; reason?: string } {
  const player = state.players.get(playerId);
  if (!player) {
    return { canCast: false, reason: "Player not found" };
  }

  // Player must have priority
  if (state.priorityPlayerId !== playerId) {
    return { canCast: false, reason: "Player does not have priority" };
  }

  // Verify the card is in player's hand
  const handZone = state.zones.get(`hand-${playerId}`);
  if (!handZone || !handZone.cardIds.includes(cardId)) {
    return { canCast: false, reason: "Card not in hand" };
  }

  // Get the card
  const card = state.cards.get(cardId);
  if (!card) {
    return { canCast: false, reason: "Card not found" };
  }

  // Check phase/timing restrictions
  const currentPhase = state.turn.currentPhase;
  const isMainPhase = currentPhase === Phase.PRECOMBAT_MAIN || currentPhase === Phase.POSTCOMBAT_MAIN;
  const stackIsEmpty = state.stack.length === 0;
  const isFirstTurn = state.turn.isFirstTurn;
  const isActivePlayer = state.turn.activePlayerId === playerId;

  // Check if it's an instant
  const typeLine = card.cardData.type_line?.toLowerCase() || "";
  const isInstant = typeLine.includes("instant");
  
  // Sorcery-speed check: can only cast during main phase, stack empty, and player must be active (or first turn)
  if (!isInstant && !stackIsEmpty) {
    return { canCast: false, reason: "Stack must be empty to cast sorcery-speed spells" };
  }
  
  if (!isInstant && !isMainPhase) {
    return { canCast: false, reason: "Can only cast sorcery-speed spells during main phase" };
  }
  
  if (!isInstant && !isActivePlayer && !isFirstTurn) {
    return { canCast: false, reason: "Can only cast sorcery-speed spells during your turn" };
  }

  // Check for cards that can only be cast at specific times (e.g., flash)
  const oracleText = card.cardData.oracle_text || "";
  if (oracleText.toLowerCase().includes("flash")) {
    // Flash allows casting at any time
    return { canCast: true };
  }

  // For split cards, check both halves
  if (card.cardData.layout === "split") {
    // Split cards can be cast as either half during main phase
    if (!isMainPhase || !stackIsEmpty) {
      return { canCast: false, reason: "Split cards can only be cast during main phase with empty stack" };
    }
  }

  return { canCast: true };
}

/**
 * Determine the mana cost for a spell
 */
export function getSpellManaCost(
  card: { mana_cost?: string }
): { generic: number; white: number; blue: number; black: number; red: number; green: number } | null {
  const manaCost = card.mana_cost || "";
  return parseManaCostString(manaCost);
}

/**
 * Parse a mana cost string into components
 */
function parseManaCostString(manaCost: string): { 
  generic: number; 
  white: number; 
  blue: number; 
  black: number; 
  red: number; 
  green: number 
} {
  const result = { generic: 0, white: 0, blue: 0, black: 0, red: 0, green: 0 };
  
  const matches = manaCost.match(/{[^}]+}/g) || [];
  
  for (const match of matches) {
    const symbol = match.slice(1, -1).toUpperCase();
    
    if (/^\d+$/.test(symbol)) {
      result.generic += parseInt(symbol, 10);
    } else if (symbol === "W") {
      result.white += 1;
    } else if (symbol === "U") {
      result.blue += 1;
    } else if (symbol === "B") {
      result.black += 1;
    } else if (symbol === "R") {
      result.red += 1;
    } else if (symbol === "G") {
      result.green += 1;
    } else if (symbol === "X" || symbol === "X") {
      // X spells require special handling - return null to indicate X
      result.generic += 0; // X will be handled separately
    }
  }
  
  return result;
}

/**
 * Cast a spell from hand and put it on the stack
 */
export function castSpell(
  state: GameState,
  playerId: PlayerId,
  cardId: CardInstanceId,
  targets: Target[] = [],
  chosenModes: string[] = [],
  xValue: number = 0
): { success: boolean; state: GameState } {
  // Check if player can cast this spell
  const canCastResult = canCastSpell(state, playerId, cardId);
  if (!canCastResult.canCast) {
    return { success: false, state };
  }

  // Get the card
  const card = state.cards.get(cardId);
  if (!card) {
    return { success: false, state };
  }

  // Verify the card is in player's hand
  const handZone = state.zones.get(`hand-${playerId}`);
  if (!handZone || !handZone.cardIds.includes(cardId)) {
    return { success: false, state };
  }

  // Get the stack zone
  const stackZone = state.zones.get("stack");
  if (!stackZone) {
    return { success: false, state };
  }

  // Create stack object
  const stackObject: StackObject = {
    id: generateStackObjectId(),
    type: "spell",
    sourceCardId: cardId,
    controllerId: playerId,
    name: card.cardData.name,
    text: card.cardData.oracle_text || "",
    manaCost: card.cardData.mana_cost ?? null,
    targets,
    chosenModes,
    variableValues: new Map([["X", xValue]]),
    isCountered: false,
    timestamp: Date.now(),
  };

  // Move card from hand to stack
  const moved = moveCardBetweenZones(handZone, stackZone, cardId);
  
  // Update zones
  const updatedZones = new Map(state.zones);
  updatedZones.set(`hand-${playerId}`, moved.from);
  updatedZones.set("stack", moved.to);

  // Add stack object to stack
  const updatedStack = [...state.stack, stackObject];

  // Reset the player's priority pass flag since they just cast something
  const player = state.players.get(playerId);
  const updatedPlayers = new Map(state.players);
  if (player) {
    updatedPlayers.set(playerId, {
      ...player,
      hasPassedPriority: false,
    });
  }

  // Pass priority to next player
  // Find the next player in APNAP order
  const activePlayerId = state.turn.activePlayerId;
  const playerIds = Array.from(state.players.keys());
  const currentIndex = playerIds.indexOf(activePlayerId);
  let nextIndex = (currentIndex + 1) % playerIds.length;
  
  // Skip players who have lost
  while (playerIds.length > 1 && nextIndex !== currentIndex) {
    const nextPlayerId = playerIds[nextIndex];
    const nextPlayer = state.players.get(nextPlayerId);
    if (nextPlayer && !nextPlayer.hasLost) {
      break;
    }
    nextIndex = (nextIndex + 1) % playerIds.length;
  }

  return {
    success: true,
    state: {
      ...state,
      zones: updatedZones,
      stack: updatedStack,
      players: updatedPlayers,
      priorityPlayerId: playerIds[nextIndex],
      consecutivePasses: 0,
      lastModifiedAt: Date.now(),
    },
  };
}

/**
 * Resolve the top object on the stack
 */
export function resolveTopOfStack(
  state: GameState
): GameState {
  if (state.stack.length === 0) {
    return state;
  }

  // Get the top object (last one added resolves first - LIFO)
  const stackObject = state.stack[state.stack.length - 1];
  
  // If it's countered, just remove it
  if (stackObject.isCountered) {
    return removeFromStack(state, stackObject.id);
  }

  // Get the card
  if (stackObject.sourceCardId) {
    const card = state.cards.get(stackObject.sourceCardId);
    if (card) {
      // Move card from stack to appropriate zone based on card type
      const typeLine = card.cardData.type_line?.toLowerCase() || "";
      
      let destinationZone: string;
      if (typeLine.includes("instant") || typeLine.includes("sorcery")) {
        // Instants and sorceries go to graveyard
        destinationZone = `graveyard-${card.controllerId}`;
      } else {
        // Permanents go to battlefield
        destinationZone = `battlefield-${card.controllerId}`;
      }

      const stackZone = state.zones.get("stack");
      const destZone = state.zones.get(destinationZone);

      if (stackZone && destZone) {
        const moved = moveCardBetweenZones(stackZone, destZone, stackObject.sourceCardId);
        
        const updatedZones = new Map(state.zones);
        updatedZones.set("stack", moved.from);
        updatedZones.set(destinationZone, moved.to);

        const updatedStack = state.stack.filter(obj => obj.id !== stackObject.id);

        return {
          ...state,
          zones: updatedZones,
          stack: updatedStack,
          lastModifiedAt: Date.now(),
        };
      }
    }
  }

  // Fallback: just remove from stack
  return removeFromStack(state, stackObject.id);
}

/**
 * Remove an object from the stack
 */
function removeFromStack(
  state: GameState,
  stackObjectId: string
): GameState {
  const updatedStack = state.stack.filter(obj => obj.id !== stackObjectId);

  return {
    ...state,
    stack: updatedStack,
    lastModifiedAt: Date.now(),
  };
}

// Note: counterSpell is already exported in keyword-actions.ts
// Re-export it here for convenience
// export { counterSpell } from "./keyword-actions";

/**
 * Check if a spell/ability can be targeted
 */
export function canTarget(
  targetType: Target["type"],
  targetId: string,
  state: GameState,
  sourcePlayerId: PlayerId
): boolean {
  switch (targetType) {
    case "card": {
      // Check if card exists
      const card = state.cards.get(targetId);
      if (!card) return false;
      
      // Check if source player can see the card
      // (In reality, would check visibility rules)
      return true;
    }
    case "player": {
      // Check if player exists
      const player = state.players.get(targetId);
      return !!player;
    }
    case "stack": {
      // Check if target stack object exists
      return state.stack.some(obj => obj.id === targetId);
    }
    case "zone": {
      // Check if zone exists
      return state.zones.has(targetId);
    }
    default:
      return false;
  }
}

/**
 * Create a waiting choice for spell targeting
 */
export function createTargetingChoice(
  state: GameState,
  playerId: PlayerId,
  stackObjectId: string,
  spellName: string,
  targetType: Target["type"],
  validTargets: ChoiceOption[]
): WaitingChoice {
  return {
    type: "choose_targets",
    playerId,
    stackObjectId,
    prompt: `Choose target ${targetType} for ${spellName}:`,
    choices: validTargets,
    minChoices: 1,
    maxChoices: 1,
    presentedAt: Date.now(),
  };
}

/**
 * Create a waiting choice for choosing modes
 */
export function createModeChoice(
  state: GameState,
  playerId: PlayerId,
  stackObjectId: string,
  spellName: string,
  availableModes: string[]
): WaitingChoice {
  return {
    type: "choose_mode",
    playerId,
    stackObjectId,
    prompt: `Choose mode for ${spellName}:`,
    choices: availableModes.map(mode => ({
      label: mode,
      value: mode,
      isValid: true,
    })),
    minChoices: 1,
    maxChoices: 1,
    presentedAt: Date.now(),
  };
}

/**
 * Create a waiting choice for X value
 */
export function createXValueChoice(
  state: GameState,
  playerId: PlayerId,
  stackObjectId: string,
  spellName: string,
  maxX: number
): WaitingChoice {
  const choices: ChoiceOption[] = [];
  for (let i = 0; i <= maxX; i++) {
    choices.push({
      label: i.toString(),
      value: i,
      isValid: true,
    });
  }

  return {
    type: "choose_value",
    playerId,
    stackObjectId,
    prompt: `Choose value for X in ${spellName}:`,
    choices,
    minChoices: 1,
    maxChoices: 1,
    presentedAt: Date.now(),
  };
}

/**
 * Get valid targets for a spell based on its text
 */
export function getValidTargets(
  stackObjectId: string,
  state: GameState,
  playerId: PlayerId
): ChoiceOption[] {
  const stackObject = state.stack.find(obj => obj.id === stackObjectId);
  if (!stackObject) {
    return [];
  }

  // For now, return all valid targets based on target type
  // In a full implementation, this would parse the spell's text
  // to determine what kinds of targets are valid
  
  const targets: ChoiceOption[] = [];

  // Add all creatures on battlefield
  for (const [zoneId, zone] of state.zones.entries()) {
    if (zoneId.startsWith("battlefield-")) {
      for (const cardId of zone.cardIds) {
        const card = state.cards.get(cardId);
        if (card) {
          targets.push({
            label: card.cardData.name,
            value: cardId,
            isValid: true,
          });
        }
      }
    }
  }

  return targets;
}

/**
 * Check if all required targets for a spell are valid
 */
export function validateSpellTargets(
  stackObject: StackObject,
  state: GameState
): boolean {
  // If no targets required, spell is valid
  if (stackObject.targets.length === 0) {
    return true;
  }

  // Check all targets are valid
  for (const target of stackObject.targets) {
    if (!target.isValid) {
      return false;
    }
  }

  return true;
}

/**
 * Get the mana value of a spell from its card data
 */
export function getSpellManaValueFromCard(card: { mana_cost?: string }): number {
  if (!card?.mana_cost) {
    return 0;
  }
  return getManaValueFromCost(card.mana_cost);
}

/**
 * Parse mana cost string and return total mana value
 */
function getManaValueFromCost(manaCost: string): number {
  let total = 0;
  
  const matches = manaCost.match(/{[^}]+}/g) || [];
  
  for (const match of matches) {
    const symbol = match.slice(1, -1).toUpperCase();
    
    // Generic mana
    if (/^\d+$/.test(symbol)) {
      total += parseInt(symbol, 10);
    }
    // Colored mana
    else if (["W", "U", "B", "R", "G", "C"].includes(symbol)) {
      total += 1;
    }
    // X spells - need context to determine value
    else if (symbol === "X") {
      // Can't determine without context
    }
    // Phyrexian mana counts as 1
    else if (symbol === "P") {
      total += 1;
    }
  }
  
  return total;
}

/**
 * Card instance factory and utility functions
 */

import type {
  CardInstanceId,
  CardInstance,
  Counter,
  PlayerId,
} from "./types";
import type { ScryfallCard } from "@/app/actions";

/**
 * Generate a unique card instance ID
 */
export function generateCardInstanceId(): CardInstanceId {
  return `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new card instance from Scryfall data
 */
export function createCardInstance(
  cardData: ScryfallCard,
  ownerId: PlayerId,
  controllerId: PlayerId,
  options: Partial<CardInstance> = {}
): CardInstance {
  const id = options.id || generateCardInstanceId();

  return {
    id,
    oracleId: cardData.id,
    cardData,
    currentFaceIndex: 0,
    isFaceDown: false,
    controllerId,
    ownerId,
    isTapped: false,
    isFlipped: false,
    isTurnedFaceUp: false,
    isPhasedOut: false,
    hasSummoningSickness: true, // Default for permanents entering battlefield
    counters: [],
    damage: 0,
    toughnessModifier: 0,
    powerModifier: 0,
    attachedToId: null,
    attachedCardIds: [],
    enteredBattlefieldTimestamp: Date.now(),
    attachedTimestamp: null,
    isToken: options.isToken || false,
    tokenData: options.tokenData || null,
  };
}

/**
 * Create a token from a card definition
 */
export function createToken(
  tokenData: ScryfallCard,
  controllerId: PlayerId,
  ownerId: PlayerId
): CardInstance {
  return createCardInstance(tokenData, ownerId, controllerId, {
    isToken: true,
    tokenData,
  });
}

/**
 * Tap a permanent
 */
export function tapCard(card: CardInstance): CardInstance {
  return { ...card, isTapped: true };
}

/**
 * Untap a permanent
 */
export function untapCard(card: CardInstance): CardInstance {
  return { ...card, isTapped: false };
}

/**
 * Flip a card (for flip cards)
 */
export function flipCard(card: CardInstance): CardInstance {
  return { ...card, isFlipped: !card.isFlipped };
}

/**
 * Turn a card face down
 */
export function turnFaceDown(card: CardInstance): CardInstance {
  return { ...card, isFaceDown: true };
}

/**
 * Turn a card face up
 */
export function turnFaceUp(card: CardInstance): CardInstance {
  return { ...card, isFaceDown: false, isTurnedFaceUp: true };
}

/**
 * Add counters to a card
 */
export function addCounters(
  card: CardInstance,
  counterType: string,
  count: number
): CardInstance {
  const existingCounter = card.counters.find((c) => c.type === counterType);
  const updatedCounters = existingCounter
    ? card.counters.map((c) =>
        c.type === counterType ? { ...c, count: c.count + count } : c
      )
    : [...card.counters, { type: counterType, count }];

  return { ...card, counters: updatedCounters };
}

/**
 * Remove counters from a card
 */
export function removeCounters(
  card: CardInstance,
  counterType: string,
  count: number
): CardInstance {
  const existingCounter = card.counters.find((c) => c.type === counterType);

  if (!existingCounter) {
    return card;
  }

  const newCount = Math.max(0, existingCounter.count - count);

  const updatedCounters =
    newCount === 0
      ? card.counters.filter((c) => c.type !== counterType)
      : card.counters.map((c) =>
          c.type === counterType ? { ...c, count: newCount } : c
        );

  return { ...card, counters: updatedCounters };
}

/**
 * Mark damage on a creature
 */
export function markDamage(card: CardInstance, damage: number): CardInstance {
  return { ...card, damage: card.damage + damage };
}

/**
 * Reset damage marked on a creature (happens during cleanup)
 */
export function resetDamage(card: CardInstance): CardInstance {
  return { ...card, damage: 0 };
}

/**
 * Attach a card to another (Equipment, Aura, Fortification)
 */
export function attachCard(
  card: CardInstance,
  attachToId: CardInstanceId
): CardInstance {
  return {
    ...card,
    attachedToId: attachToId,
    attachedTimestamp: Date.now(),
  };
}

/**
 * Detach a card from its permanent
 */
export function detachCard(card: CardInstance): CardInstance {
  return {
    ...card,
    attachedToId: null,
    attachedTimestamp: null,
  };
}

/**
 * Change controller of a card
 */
export function changeController(
  card: CardInstance,
  newControllerId: PlayerId
): CardInstance {
  return {
    ...card,
    controllerId: newControllerId,
    // Reset summoning sickness when control changes
    hasSummoningSickness: true,
  };
}

/**
 * Check if a card is a creature
 */
export function isCreature(card: CardInstance): boolean {
  const typeLine = card.cardData.type_line?.toLowerCase() || "";
  return typeLine.includes("creature");
}

/**
 * Check if a card is a land
 */
export function isLand(card: CardInstance): boolean {
  const typeLine = card.cardData.type_line?.toLowerCase() || "";
  return typeLine.includes("land");
}

/**
 * Check if a card is a planeswalker
 */
export function isPlaneswalker(card: CardInstance): boolean {
  const typeLine = card.cardData.type_line?.toLowerCase() || "";
  return typeLine.includes("planeswalker");
}

/**
 * Check if a card is an artifact
 */
export function isArtifact(card: CardInstance): boolean {
  const typeLine = card.cardData.type_line?.toLowerCase() || "";
  return typeLine.includes("artifact");
}

/**
 * Check if a card is an enchantment
 */
export function isEnchantment(card: CardInstance): boolean {
  const typeLine = card.cardData.type_line?.toLowerCase() || "";
  return typeLine.includes("enchantment");
}

/**
 * Check if a card is an instant or sorcery
 */
export function isInstantOrSorcery(card: CardInstance): boolean {
  const typeLine = card.cardData.type_line?.toLowerCase() || "";
  return typeLine.includes("instant") || typeLine.includes("sorcery");
}

/**
 * Check if a card is a permanent
 */
export function isPermanent(card: CardInstance): boolean {
  return (
    isCreature(card) ||
    isLand(card) ||
    isPlaneswalker(card) ||
    isArtifact(card) ||
    isEnchantment(card)
  );
}

/**
 * Get the power of a creature
 */
export function getPower(card: CardInstance): number {
  if (!isCreature(card)) {
    return 0;
  }

  // Parse power from oracle text
  // This is a simplified version - real implementation would need to handle * power
  const oracleText = card.cardData.oracle_text || "";
  const powerMatch = oracleText.match(/Power\/Toughness:\s*(\d+)\/(\d+)/);

  if (powerMatch) {
    const basePower = parseInt(powerMatch[1], 10);
    return basePower + card.powerModifier;
  }

  // For cards with * power, we'd need more complex parsing
  // For now, return the modifier
  return card.powerModifier;
}

/**
 * Get the toughness of a creature
 */
export function getToughness(card: CardInstance): number {
  if (!isCreature(card)) {
    return 0;
  }

  // Parse toughness from oracle text
  const oracleText = card.cardData.oracle_text || "";
  const ptMatch = oracleText.match(/Power\/Toughness:\s*(\d+)\/(\d+)/);

  if (ptMatch) {
    const baseToughness = parseInt(ptMatch[2], 10);
    return baseToughness + card.toughnessModifier;
  }

  // For cards with * toughness, we'd need more complex parsing
  return card.toughnessModifier;
}

/**
 * Check if a creature has lethal damage marked
 */
export function hasLethalDamage(card: CardInstance): boolean {
  const toughness = getToughness(card);
  return card.damage >= toughness;
}

/**
 * Check if a card can attack (creatures only)
 */
export function canAttack(card: CardInstance): boolean {
  if (!isCreature(card)) {
    return false;
  }
  if (card.isTapped) {
    return false;
  }
  if (card.hasSummoningSickness) {
    // Check for haste
    const oracleText = card.cardData.oracle_text?.toLowerCase() || "";
    if (!oracleText.includes("haste")) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a card can block (creatures only)
 */
export function canBlock(card: CardInstance): boolean {
  if (!isCreature(card)) {
    return false;
  }
  if (card.isTapped) {
    return false;
  }
  return true;
}

/**
 * Get the mana cost of a card as an integer
 */
export function getManaValue(card: CardInstance): number {
  const cmc = (card.cardData as ScryfallCard & { cmc?: number }).cmc;
  return cmc ?? 0;
}

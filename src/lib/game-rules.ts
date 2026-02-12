/**
 * Game rules and format definitions for Planar Nexus
 *
 * This module defines the rules for Magic: The Gathering formats,
 * including deck construction rules and game setup parameters.
 */

import type { GameState } from "./game-state";

/**
 * Format-specific deck construction rules
 */
export const formatRules = {
  commander: {
    maxCopies: 1,
    minCards: 100,
    maxCards: 100,
    startingLife: 40,
    commanderDamage: 21,
  },
  standard: {
    maxCopies: 4,
    minCards: 60,
    maxCards: Infinity,
    startingLife: 20,
    commanderDamage: null,
  },
  modern: {
    maxCopies: 4,
    minCards: 60,
    maxCards: Infinity,
    startingLife: 20,
    commanderDamage: null,
  },
  pioneer: {
    maxCopies: 4,
    minCards: 60,
    maxCards: Infinity,
    startingLife: 20,
    commanderDamage: null,
  },
  legacy: {
    maxCopies: 4,
    minCards: 60,
    maxCards: Infinity,
    startingLife: 20,
    commanderDamage: null,
  },
  vintage: {
    maxCopies: 4,
    minCards: 60,
    maxCards: Infinity,
    startingLife: 20,
    commanderDamage: null,
  },
  pauper: {
    maxCopies: 4,
    minCards: 60,
    maxCards: Infinity,
    startingLife: 20,
    commanderDamage: null,
  },
};

export type Format = keyof typeof formatRules;

/**
 * Validate a decklist for a specific format
 */
export function validateDeckFormat(
  deckCards: { name: string; count: number }[],
  format: Format
): {
  isValid: boolean;
  errors: string[];
} {
  const rules = formatRules[format];
  const errors: string[] = [];

  // Check total card count
  const totalCards = deckCards.reduce((sum, card) => sum + card.count, 0);
  if (totalCards < rules.minCards) {
    errors.push(
      `Deck must have at least ${rules.minCards} cards (has ${totalCards})`
    );
  }

  if (totalCards > rules.maxCards) {
    errors.push(
      `Deck must have at most ${rules.maxCards} cards (has ${totalCards})`
    );
  }

  // Check individual card counts (except basic lands)
  const cardCounts = new Map<string, number>();
  const basicLandNames = [
    "forest",
    "island",
    "mountain",
    "plains",
    "swamp",
    "snow-covered forest",
    "snow-covered island",
    "snow-covered mountain",
    "snow-covered plains",
    "snow-covered swamp",
  ];

  deckCards.forEach(({ name, count }) => {
    const normalizedName = name.toLowerCase().trim();

    // Basic lands can have any number of copies
    if (basicLandNames.some((basic) => basic === normalizedName)) {
      return;
    }

    const currentCount = cardCounts.get(normalizedName) || 0;
    cardCounts.set(normalizedName, currentCount + count);
  });

  cardCounts.forEach((count, cardName) => {
    if (count > rules.maxCopies) {
      errors.push(
        `${cardName} has ${count} copies, maximum is ${rules.maxCopies}`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get starting life total for a format
 */
export function getStartingLife(format: Format): number {
  return formatRules[format].startingLife;
}

/**
 * Get commander damage threshold for formats that use it
 */
export function getCommanderDamageThreshold(format: Format): number | null {
  return formatRules[format].commanderDamage;
}

/**
 * Get mulligan rules for a format
 */
export function getMulliganRules(format: Format) {
  // All current formats use the "London mulligan"
  return {
    type: "london",
    // First mulligan: draw 7, put N on bottom
    // Second mulligan: draw 7, put N-1 on bottom
    // etc.
    minHandSize: 0, // Can mulligan to 0 in most formats
  };
}

/**
 * Get maximum hand size for a format
 */
export function getMaxHandSize(format: Format): number {
  // Most formats use 7
  return 7;
}

/**
 * Check if a format uses sideboards
 */
export function formatUsesSideboard(format: Format): boolean {
  // Commander doesn't use sideboards
  return format !== "commander";
}

/**
 * Get sideboard size for a format
 */
export function getSideboardSize(format: Format): number {
  if (format === "commander") {
    return 0;
  }
  return 15; // Standard for most constructed formats
}

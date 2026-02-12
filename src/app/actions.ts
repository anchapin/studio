
"use server";

import { reviewDeck, DeckReviewInput } from "@/ai/flows/ai-deck-coach-review";
import { generateAIOpponentDeck, AIOpponentDeckGenerationInput } from "@/ai/flows/ai-opponent-deck-generation";

export interface ScryfallCard {
  id: string;
  name: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  legalities?: { [format: string]: string };
}

export interface DeckCard extends ScryfallCard {
  count: number;
};

export interface SavedDeck {
  id: string;
  name:string;
  format: string;
  cards: DeckCard[];
  createdAt: string;
  updatedAt: string;
}


export async function searchScryfall(query: string): Promise<ScryfallCard[]> {
  if (!query || query.length < 3) {
    return [];
  }

  // Add type:commander to narrow down search for commander format relevant cards.
  const searchQuery = `${query} (game:paper)`;

  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
        searchQuery
      )}`
    );
    if (!res.ok) {
      if (res.status === 404) return []; // No cards found is a valid outcome
      console.error(`Scryfall API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Failed to fetch from Scryfall API", error);
    return [];
  }
}

export async function getDeckReview(input: DeckReviewInput) {
  try {
    const review = await reviewDeck(input);
    return review;
  } catch (error) {
    console.error("Error getting deck review:", error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error("Failed to get deck review from AI.");
  }
}

export async function generateOpponent(input: AIOpponentDeckGenerationInput) {
    try {
        const opponent = await generateAIOpponentDeck(input);
        return opponent;
    } catch(error) {
        console.error("Error generating AI opponent:", error);
        throw new Error("Failed to generate AI opponent.");
    }
}

export async function importDecklist(
  decklist: string,
  format?: string
): Promise<{ found: DeckCard[]; notFound: string[]; illegal: string[] }> {
  const lines = decklist.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) {
    return { found: [], notFound: [], illegal: [] };
  }

  const nameToCountMap = new Map<string, number>();
  const unprocessedLines: string[] = [];

  for (const line of lines) {
    // Regex ensures that the name part (.+) is not empty
    const match = line.trim().match(/^(?:(\d+)\s*x?\s*)?(.+)/);
    if (match) {
      const name = match[2]?.trim();
      const count = parseInt(match[1] || '1', 10);
      if (name) {
        const lowerCaseName = name.toLowerCase();
        nameToCountMap.set(lowerCaseName, (nameToCountMap.get(lowerCaseName) || 0) + count);
      } else {
        unprocessedLines.push(line);
      }
    } else {
      unprocessedLines.push(line);
    }
  }

  const requestedCardNames = Array.from(nameToCountMap.keys());
  if (requestedCardNames.length === 0) {
    return { found: [], notFound: unprocessedLines, illegal: [] };
  }

  try {
    const res = await fetch(`https://api.scryfall.com/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifiers: requestedCardNames.map(name => ({ name })),
      }),
      next: { revalidate: 3600 * 24 }, // Cache for a day
    });

    if (!res.ok) {
      console.error(`Scryfall API error: ${res.status}`);
      return { found: [], notFound: [...requestedCardNames, ...unprocessedLines], illegal: [] };
    }

    const collection = await res.json();

    const foundCards: DeckCard[] = [];
    const illegalCardNames: string[] = [];
    const foundOrIllegalCardNames = new Set<string>();

    for (const card of (collection.data || [])) {
      // CRITICAL: Defensively check for card object and name property.
      if (!card || !card.name) {
        continue;
      }
      
      const lowerCaseName = card.name.toLowerCase();

      // Ensure the card returned by Scryfall is one we actually asked for.
      if (nameToCountMap.has(lowerCaseName)) {
        foundOrIllegalCardNames.add(lowerCaseName);
        const count = nameToCountMap.get(lowerCaseName)!;

        const isLegal = format ? card.legalities?.[format] === 'legal' : true;
        if (isLegal) {
          foundCards.push({ ...card, count });
        } else {
          illegalCardNames.push(card.name);
        }
      }
    }

    const notFoundCardNames = requestedCardNames.filter(
      name => !foundOrIllegalCardNames.has(name)
    );

    return {
      found: foundCards,
      notFound: [...notFoundCardNames, ...unprocessedLines],
      illegal: illegalCardNames,
    };
  } catch (error) {
    console.error('Failed to fetch from Scryfall API', error);
    return { found: [], notFound: [...requestedCardNames, ...unprocessedLines], illegal: [] };
  }
}

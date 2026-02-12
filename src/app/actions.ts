
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

export async function validateCardLegality(
  cards: { name: string; quantity: number }[],
  format: string
): Promise<{ found: DeckCard[]; notFound: string[]; illegal: string[] }> {
  if (!cards || cards.length === 0) {
    return { found: [], notFound: [], illegal: [] };
  }

  // Paranoid filter to ensure we don't process malformed data, even if the caller should have sanitized it.
  const validCards = cards.filter(c => c && typeof c.name === 'string' && c.name.trim() !== '' && typeof c.quantity === 'number');
  if (validCards.length === 0) {
    return { found: [], notFound: cards.map(c => c?.name || 'Unknown Card'), illegal: [] };
  }

  const identifiersToFetch = validCards.map(c => ({ name: c.name }));
  const counts = new Map(validCards.map(c => [c.name.toLowerCase(), c.quantity]));

  try {
    const res = await fetch(`https://api.scryfall.com/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: identifiersToFetch }),
      next: { revalidate: 3600 * 24 }, // Cache for a day
    });

    if (!res.ok) {
      console.error(`Scryfall API error on collection fetch: ${res.status}`);
      return { found: [], notFound: validCards.map(c => c.name), illegal: [] };
    }

    const collection = await res.json();
    
    const found: DeckCard[] = [];
    const illegal: string[] = [];
    const foundNames = new Set<string>();

    if (collection?.data && Array.isArray(collection.data)) {
      for (const card of collection.data as ScryfallCard[]) {
        // Super defensive check against malformed Scryfall responses.
        if (!card || typeof card.name !== 'string' || !card.name) continue;

        const lowerCaseName = card.name.toLowerCase();
        const count = counts.get(lowerCaseName);
        
        if (count === undefined) continue;

        foundNames.add(lowerCaseName);
        const isLegal = card.legalities?.[format] === 'legal';
        if (isLegal) {
          found.push({ ...card, count });
        } else {
          illegal.push(card.name);
        }
      }
    }
    
    // Reliably determine notFound cards by comparing the input list with the found names.
    const notFound = validCards
        .filter(c => !foundNames.has(c.name.toLowerCase()))
        .map(c => c.name);
    
    return { found, notFound, illegal };

  } catch (error) {
    console.error('Failed to fetch or process from Scryfall API', error);
    return { found: [], notFound: validCards.map(c => c.name), illegal: [] };
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

  const cardDetails: { name: string; quantity: number }[] = [];
  const unprocessedLines: string[] = [];

  for (const line of lines) {
    const match = line.trim().match(/^(?:(\d+)\s*x?\s*)?(\S.*)/);
    if (match) {
      const name = match[2]?.trim();
      const count = parseInt(match[1] || '1', 10);
      if (name) {
        cardDetails.push({ name, quantity: count });
      } else {
        unprocessedLines.push(line);
      }
    } else {
      unprocessedLines.push(line);
    }
  }

  if (cardDetails.length === 0) {
    return { found: [], notFound: unprocessedLines, illegal: [] };
  }
  
  const { found, notFound, illegal } = await validateCardLegality(cardDetails, format || 'commander');

  // Combine notFound from validation with any lines that failed to parse initially.
  const allNotFound = [...unprocessedLines, ...notFound];

  // Aggregate quantities for found cards
  const aggregatedFound = Array.from(
      found.reduce((acc, card) => {
        const existing = acc.get(card.id);
        if(existing) {
            existing.count += card.count;
        } else {
            acc.set(card.id, {...card});
        }
        return acc;
      }, new Map<string, DeckCard>()).values()
  );

  return { found: aggregatedFound, notFound: allNotFound, illegal };
}


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

  // 1. Parse input into a map of lower-case name to original name and count
  const cardRequests = new Map<string, { originalName: string; count: number }>();
  const unprocessedLines: string[] = [];

  for (const line of lines) {
    const match = line.trim().match(/^(?:(\d+)\s*x?\s*)?(.+)/);
    if (match) {
      const name = match[2]?.trim();
      const count = parseInt(match[1] || '1', 10);
      if (name) {
        const lowerCaseName = name.toLowerCase();
        const existing = cardRequests.get(lowerCaseName);
        cardRequests.set(lowerCaseName, {
          originalName: name,
          count: (existing?.count || 0) + count,
        });
      } else {
        unprocessedLines.push(line);
      }
    } else {
      unprocessedLines.push(line);
    }
  }
  
  const identifiersToFetch = Array.from(cardRequests.keys()).map(name => ({ name }));
  if (identifiersToFetch.length === 0) {
    return { found: [], notFound: unprocessedLines, illegal: [] };
  }

  // 2. Call Scryfall API
  try {
    const res = await fetch(`https://api.scryfall.com/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: identifiersToFetch }),
      next: { revalidate: 3600 * 24 },
    });

    if (!res.ok) {
      console.error(`Scryfall API error: ${res.status}`);
      // If the API fails, assume all requested cards are not found
      return { found: [], notFound: Array.from(cardRequests.values()).map(req => req.originalName), illegal: [] };
    }

    const collection = await res.json();

    // 3. Process the response
    const foundCards: DeckCard[] = [];
    const illegalCards: string[] = [];

    // Process cards Scryfall found
    for (const card of (collection.data || [])) {
      if (!card || !card.name) continue; // Safety check

      const lowerCaseName = card.name.toLowerCase();
      const request = cardRequests.get(lowerCaseName);
      if (!request) continue; // Should not happen if API is consistent

      const isLegal = format ? card.legalities?.[format] === 'legal' : true;

      if (isLegal) {
        foundCards.push({ ...card, count: request.count });
      } else {
        illegalCards.push(card.name);
      }
    }

    // Process cards Scryfall did not find
    const notFoundCards = (collection.not_found || []).map((identifier: { name: string }) => {
        // Find the original casing of the name from our request map
        if (!identifier || !identifier.name) return null;
        const request = cardRequests.get(identifier.name.toLowerCase());
        return request ? request.originalName : identifier.name;
    }).filter((name): name is string => name !== null);

    return {
      found: foundCards,
      notFound: [...notFoundCards, ...unprocessedLines],
      illegal: illegalCards,
    };

  } catch (error) {
    console.error('Failed to fetch from Scryfall API', error);
    return { found: [], notFound: Array.from(cardRequests.values()).map(req => req.originalName), illegal: [] };
  }
}

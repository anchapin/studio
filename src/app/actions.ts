
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
  // 1. Parse decklist into a map of card names to quantities.
  const nameToCountMap = new Map<string, number>();
  const unprocessedLines: string[] = [];
  decklist.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const match = trimmedLine.match(/^(?:(\d+)\s*x?\s*)?(.*)/);
    if (match && match[2]) {
      const name = match[2].trim();
      const count = parseInt(match[1] || '1', 10);
      if (name) {
        const lowerCaseName = name.toLowerCase();
        nameToCountMap.set(lowerCaseName, (nameToCountMap.get(lowerCaseName) || 0) + count);
      } else {
        unprocessedLines.push(trimmedLine);
      }
    } else {
      unprocessedLines.push(trimmedLine);
    }
  });

  const requestedLowerNames = Array.from(nameToCountMap.keys());
  if (requestedLowerNames.length === 0) {
    return { found: [], notFound: unprocessedLines, illegal: [] };
  }

  // 2. Fetch card data from Scryfall API.
  try {
    const res = await fetch(`https://api.scryfall.com/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: requestedLowerNames.map(name => ({ name })) }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
        console.error(`Scryfall API error: ${res.status}`);
        // If API fails, assume all requested cards are not found.
        return { found: [], notFound: [...requestedLowerNames, ...unprocessedLines], illegal: [] };
    }
    
    const result = await res.json();
    
    const found: DeckCard[] = [];
    const illegal: string[] = [];
    const foundOrIllegalLowerNames = new Set<string>();

    // 3. Process the cards Scryfall found.
    (result.data || []).forEach((card: ScryfallCard) => {
        // This is a critical guard. If scryfall sends a null/undefined object in the data array, or one without a name, skip it.
        if (!card || !card.name) {
            return;
        }

        const lowerCaseName = card.name.toLowerCase();
        const count = nameToCountMap.get(lowerCaseName);

        // This check is important for fuzzy matching cases. If we requested 'sol ring' and got 'Sol Ring', we need to find it.
        if (count !== undefined) {
            foundOrIllegalLowerNames.add(lowerCaseName);
            const isLegal = format ? card.legalities?.[format] === 'legal' : true;
            if (isLegal) {
                found.push({ ...card, count });
            } else {
                illegal.push(card.name);
            }
        }
    });

    // 4. Determine notFound names.
    // A card is "not found" if we requested it, but it wasn't in the "data" array Scryfall returned.
    const notFound = requestedLowerNames.filter(name => !foundOrIllegalLowerNames.has(name));

    return {
      found,
      notFound: [...notFound, ...unprocessedLines],
      illegal,
    };

  } catch (error) {
    console.error('Failed to fetch from Scryfall API', error);
    // On any other error, assume all requested cards are not found.
    return { found: [], notFound: [...requestedLowerNames, ...unprocessedLines], illegal: [] };
  }
}

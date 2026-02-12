
"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";
import { SavedDeck } from "@/app/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "./ui/label";

interface DeckSelectorProps {
  onDeckSelect: (deck: SavedDeck) => void;
  className?: string;
}

export function DeckSelector({ onDeckSelect, className }: DeckSelectorProps) {
  const [savedDecks] = useLocalStorage<SavedDeck[]>("saved-decks", []);

  const handleSelect = (deckId: string) => {
    const selectedDeck = savedDecks.find(d => d.id === deckId);
    if (selectedDeck) {
      onDeckSelect(selectedDeck);
    }
  };

  return (
    <div className={className}>
        <Label htmlFor="deck-selector">Load a Saved Deck</Label>
        <Select onValueChange={handleSelect} disabled={savedDecks.length === 0}>
            <SelectTrigger id="deck-selector">
                <SelectValue placeholder="Select a deck..." />
            </SelectTrigger>
            <SelectContent>
                {savedDecks.length > 0 ? (
                    savedDecks.map(deck => (
                        <SelectItem key={deck.id} value={deck.id}>
                           <div className="flex justify-between w-full">
                             <span>{deck.name}</span>
                             <span className="text-muted-foreground capitalize ml-4">{deck.format}</span>
                           </div>
                        </SelectItem>
                    ))
                ) : (
                    <SelectItem value="no-decks" disabled>No saved decks found</SelectItem>
                )}
            </SelectContent>
        </Select>
    </div>
  );
}

# AI Decision-Making System

## Overview

The AI Decision-Making System provides intelligent opponent behavior for Magic: The Gathering gameplay in Planar Nexus. This module implements decision trees that evaluate possible actions and select strategic plays during different game phases.

## Architecture

### Phase 3.1: Main Phase Decision Tree (Current Implementation)

The main phase decision tree evaluates and selects actions during pre-combat and post-combat main phases. It considers:

- **Land Play Decisions**: Which land to play (if multiple options)
- **Spell Casting Priority**: Which spells to cast and in what order
- **Activated Ability Usage**: When to use abilities permanents have
- **Resource Management**: Mana efficiency and timing considerations
- **Passing Priority**: When to hold mana for instant-speed interaction

### Key Components

#### 1. Action Generation

The system generates all possible legal actions for the current game state:

```typescript
interface PossibleAction {
  type: 'play_land' | 'cast_spell' | 'activate_ability' | 'pass_priority';
  cardId?: string;
  value: number;        // 0-1, higher is better
  risk: number;         // 0-1, lower is safer
  reasoning: string;    // Human-readable explanation
  priority: 'critical' | 'high' | 'medium' | 'low';
}
```

#### 2. Action Evaluation

Each possible action is evaluated based on:

- **Strategic Value**: How much the action advances winning conditions
- **Mana Efficiency**: Cost vs. benefit ratio
- **Timing**: Whether this is the right moment for the action
- **Risk Assessment**: Potential for 2-for-1s or negative card advantage
- **Game State Context**: Current board state, threats, opportunities

#### 3. Decision Selection

The system ranks all actions and selects the best one, or determines if it should pass priority and hold mana for interaction.

## Usage

### Basic Usage

```typescript
import { getBestMainPhaseAction } from '@/ai/decision-making';

// Get the best action for the current game state
const result = getBestMainPhaseAction(gameState, playerId);

if (result.bestAction) {
  console.log('Best action:', result.bestAction.reasoning);
  console.log('Confidence:', result.confidence);

  // Execute the action
  executeAction(result.bestAction);
} else {
  console.log('Pass priority');
  passPriority();
}
```

### Advanced Usage with Custom Configuration

```typescript
import { MainPhaseDecisionTree } from '@/ai/decision-making';

const tree = new MainPhaseDecisionTree(gameState, playerId, {
  minValueThreshold: 0.4,     // Only take actions with value >= 0.4
  maxRiskThreshold: 0.3,      // Avoid actions with risk > 0.3
  manaEfficiencyWeight: 0.7,  // Prioritize mana efficiency
  tempoWeight: 0.6,           // Consider tempo
  cardAdvantageWeight: 0.8,   // Value card draw highly
  holdManaForInstants: true,  // Hold mana back for instant-speed interaction
  maxLandsPerTurn: 1,         // Standard land drop rule
  difficulty: 'hard',         // Use hard difficulty weights
});

const result = tree.decide();
```

### Difficulty Levels

#### Easy

```typescript
const easyConfig = {
  minValueThreshold: 0.2,     // Will take marginal actions
  maxRiskThreshold: 0.3,      // Avoids risky plays
  manaEfficiencyWeight: 0.3,  // Doesn't optimize mana heavily
  tempoWeight: 0.3,           // Less tempo-aware
  cardAdvantageWeight: 0.4,   // Some card advantage awareness
  holdManaForInstants: false, // Doesn't hold mana for interaction
};
```

#### Medium

```typescript
const mediumConfig = {
  minValueThreshold: 0.3,     // Moderate action quality
  maxRiskThreshold: 0.4,      // Accepts some risk
  manaEfficiencyWeight: 0.5,  // Considers mana efficiency
  tempoWeight: 0.5,           // Tempo-aware
  cardAdvantageWeight: 0.6,   // Values card advantage
  holdManaForInstants: true,  // Holds mana for instants
};
```

#### Hard

```typescript
const hardConfig = {
  minValueThreshold: 0.4,     // Only takes high-quality actions
  maxRiskThreshold: 0.5,      // Accepts calculated risks
  manaEfficiencyWeight: 0.7,  // Highly optimizes mana
  tempoWeight: 0.7,           // Strong tempo awareness
  cardAdvantageWeight: 0.8,   // Prioritizes card advantage
  holdManaForInstants: true,  // Strategic mana holding
};
```

## Decision Logic

### Land Play Evaluation

Lands are evaluated based on:

1. **Mana Development**: Higher value if behind on lands
2. **Color Fixing**: Bonus for providing needed colors
3. **Land Type**: Dual lands and utility lands valued higher
4. **Timing**: Generally prioritize early land drops

Example evaluation:
```typescript
// Behind on mana? +0.3 value
// Provides needed color? +0.3 value
// Is dual/utility land? +0.2 value
// Base value: 0.5
// Total: 0.5 + 0.3 + 0.3 + 0.2 = 1.3 (clamped to 1.0)
```

### Creature Spell Evaluation

Creatures are evaluated based on:

1. **Stat Efficiency**: Power + toughness vs. mana cost
2. **Keywords**: Flying, haste, vigilance, trample, deathtouch add value
3. **Board State**: Higher value when needing board presence
4. **Risk**: Consideration of opponent's removal

Example evaluation:
```typescript
// 3/3 for 3 mana: 2.0 efficiency = +0.0 value
// Has haste: +0.1 value
// Need board presence: +0.2 value
// Base: 0.5
// Total: 0.5 + 0.0 + 0.1 + 0.2 = 0.8
```

### Instant/Sorcery Evaluation

Instants and sorceries are evaluated based on:

1. **Card Type**: Instants valued higher for flexibility
2. **Effect Type**: Draw, removal, ramp have different values
3. **Timing**: Some effects better at specific times
4. **Game State**: Removal valued higher when threats exist

Example evaluation:
```typescript
// Instant type: +0.2 value
// Interactive (counter/destroy): +0.3 value
// Threats on board: +0.2 value
// Base: 0.5
// Total: 0.5 + 0.2 + 0.3 + 0.2 = 1.2 (clamped to 1.0)
```

### Equipment/Aura Evaluation

Auras and equipment are evaluated based on:

1. **Target Availability**: Value if creatures exist
2. **Stat Bonus**: Power/toughness increases
3. **Keywords**: Granted abilities
4. **Investment Risk**: Risk of 2-for-1s

Example evaluation:
```typescript
// Has creatures: +0.3 value
// Gives +2/+2: +0.2 value
// Base: 0.5
// Total: 0.5 + 0.3 + 0.2 = 1.0
```

### Activated Ability Evaluation

Abilities are evaluated based on:

1. **Effect Type**: Draw, pump, removal have different values
2. **Mana Cost**: Efficiency of activation
3. **Timing**: When to activate is strategic
4. **Repeatable Value**: Repeatable effects valued higher

Example evaluation:
```typescript
// Draw ability: +0.4 value
// Repeatable: +0.2 value
// Base: 0.3
// Total: 0.3 + 0.4 + 0.2 = 0.9
```

### When to Pass Priority

The AI passes priority when:

1. **No Good Actions**: All actions below threshold
2. **Too Risky**: Best action exceeds risk tolerance
3. **Holding Mana**: Has instants and wants to hold mana for opponent's turn
4. **Post-Combat Main**: Often better to wait until after combat

```typescript
// Pass if:
// - No actions available
// - Best action value < threshold
// - Best action risk > max risk
// - Has instants in pre-combat main
```

## Integration with Game State Evaluator

The decision tree integrates with the game state evaluator to:

1. **Assess Threats**: Boosts removal value when threats exist
2. **Evaluate Position**: Adjusts priorities based on winning/losing
3. **Card Advantage**: Prioritizes draw when behind on cards
4. **Board Presence**: Prioritizes creatures when behind on board

## Examples

### Example 1: Early Game Land Drop

```typescript
const gameState = {
  // Turn 3, only 2 lands in play, need mana
  turn: { turnNumber: 3, currentPhase: Phase.PRECOMBAT_MAIN },
  players: {
    player1: {
      landsPlayedThisTurn: 0,
      hand: [
        { name: 'Forest', type: 'Land', cmc: 0 },
        { name: 'Llanowar Elves', type: 'Creature', cmc: 1 },
      ],
      // Only 2 lands in play
    },
  },
};

const result = getBestMainPhaseAction(gameState, 'player1');

// Result: Plays Forest
// Reasoning: "Play Forest - behind on mana development - high priority"
// Value: 0.8
// Priority: 'high'
```

### Example 2: Holding for Interaction

```typescript
const gameState = {
  // Pre-combat main, has removal, opponent has threats
  turn: {
    turnNumber: 5,
    currentPhase: Phase.PRECOMBAT_MAIN,
  },
  players: {
    player1: {
      manaPool: { white: 2, total: 4 },
      hand: [
        { name: 'Swords to Plowshares', type: 'Instant', cmc: 1 },
        { name: 'Creature', type: 'Creature', cmc: 3 },
      ],
    },
    player2: {
      battlefield: [
        { name: 'Threatening Creature', power: 5, toughness: 5 },
      ],
    },
  },
};

const result = getBestMainPhaseAction(gameState, 'player1', {
  holdManaForInstants: true,
});

// Result: Pass priority
// Reasoning: Holding mana for Swords to Plowshares during combat
// Confidence: 0.85
```

### Example 3: Casting Efficient Creature

```typescript
const gameState = {
  // Turn 4, good mana, has efficient creature
  turn: { turnNumber: 4, currentPhase: Phase.POSTCOMBAT_MAIN },
  players: {
    player1: {
      manaPool: { total: 4 },
      hand: [
        { name: 'Steel Leaf Champion', type: 'Creature', cmc: 3, power: 5, toughness: 4 },
      ],
      // Opponent has more creatures
    },
    player2: {
      battlefield: [
        { name: 'Creature 1', power: 2, toughness: 2 },
        { name: 'Creature 2', power: 2, toughness: 2 },
      ],
    },
  },
};

const result = getBestMainPhaseAction(gameState, 'player1');

// Result: Cast Steel Leaf Champion
// Reasoning: "Creature (5/4, 3 mana) - efficient stats - need board presence"
// Value: 0.9
// Priority: 'high'
```

## Testing

The decision tree can be tested by:

1. **Unit Tests**: Test individual evaluation functions
2. **Integration Tests**: Test decision flow with known game states
3. **Scenario Tests**: Test specific gameplay scenarios
4. **Performance Tests**: Ensure fast evaluation (< 50ms)

See `__tests__/main-phase-decision-tree.test.ts` for test examples.

## Future Enhancements

### Phase 3.2: Combat Decision Tree
- Attacking decisions
- Blocking decisions
- Damage assignment
- Combat tricks

### Phase 3.3: Response Decision Tree
- Instant-speed responses
- Stack interaction
- Counter-spell decisions
- Priority passing

### Phase 3.4: Multi-Turn Planning
- Lookahead search
- Minimax with alpha-beta pruning
- Monte Carlo Tree Search
- Opponent modeling

## Performance Considerations

- **Evaluation Speed**: ~5-20ms per decision
- **Memory Usage**: Minimal, no state mutation
- **Scalability**: Handles 1v1 and multiplayer
- **Caching**: Can cache repeated evaluations

## Contributing

When adding new decision logic:

1. Implement evaluation function following naming convention
2. Add to appropriate decision section (land, spell, ability)
3. Update documentation with examples
4. Add tests for new logic
5. Consider all difficulty levels

## License

Part of the Planar Nexus project.

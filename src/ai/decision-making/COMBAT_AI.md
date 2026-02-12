# Combat AI Decision-Making System

## Overview

The Combat AI Decision-Making System provides intelligent combat decision-making for AI opponents in Planar Nexus. It handles attacker selection, blocking decisions, damage optimization, and combat trick evaluation.

## Features

### 1. Attacker Selection
- Determines which creatures to attack with
- Evaluates attack targets (player or planeswalker)
- Considers evasion abilities (flying, menace, etc.)
- Calculates expected value vs risk for each attack
- Handles summoning sickness and tapping restrictions

### 2. Attack Decisions
- **Face Attacks**: Attack opponent directly when safe
- **Trades**: Make favorable creature trades
- **Hold Back**: Keep creatures for defense when appropriate
- **Evasion**: Prioritize attacking with evasive creatures
- **Race Decisions**: Decide when to race vs when to play defense

### 3. Blocking Decisions
- Evaluates each attacker independently
- Selects optimal blockers
- Handles chump blocking decisions
- Considers creature value (mana cost)
- Accounts for first strike and double strike

### 4. Blocker Assignment
- **Multi-Blocking**: Handles menace and multiple blocker scenarios
- **Damage Order**: Optimizes damage assignment order
- **Trade Assessment**: Evaluates 2-for-1 opportunities
- **First Strike**: Considers first/double strike interactions

### 5. Combat Trick Evaluation
- Framework for instant-speed effects (pump spells, etc.)
- Timing recommendations (before attackers, before blockers, etc.)
- Target selection for combat tricks

### 6. Special Mechanics
- **Evasion**: Flying, menace, intimidate, fear, unblockable, shadow, etc.
- **Trample**: Calculates damage through blockers
- **First Strike/Double Strike**: Handles two-step combat damage
- **Menace**: Requires multiple blockers
- **Deathtouch**: Any amount of damage is lethal

## Installation

The combat AI is located in `/src/ai/decision-making/combat-decision-tree.ts`.

## Usage

### Basic Attack Decisions

```typescript
import { generateAttackDecisions } from '@/ai/decision-making/combat-decision-tree';

// Generate attack decisions for the AI player
const combatPlan = generateAttackDecisions(gameState, 'ai_player', 'medium');

// Check which creatures to attack with
combatPlan.attacks.forEach(attack => {
  console.log(`${attack.creatureId}: ${attack.reasoning}`);
  console.log(`Target: ${attack.target}`);
  console.log(`Expected Value: ${attack.expectedValue}`);
});
```

### Blocking Decisions

```typescript
import { generateBlockingDecisions } from '@/ai/decision-making/combat-decision-tree';

// Generate blocking decisions
const attackers = [attacker1, attacker2, attacker3];
const combatPlan = generateBlockingDecisions(
  gameState,
  'ai_player',
  attackers,
  'medium'
);

// Check which creatures to block with
combatPlan.blocks.forEach(block => {
  console.log(`${block.blockerId} blocks ${block.attackerId}`);
  console.log(`Reasoning: ${block.reasoning}`);
});
```

### Advanced Usage with Custom Configuration

```typescript
import { CombatDecisionTree } from '@/ai/decision-making/combat-decision-tree';

// Create AI with custom configuration
const ai = new CombatDecisionTree(gameState, 'ai_player', 'medium');

// Customize behavior
ai.setConfig({
  aggression: 0.8,        // Very aggressive
  riskTolerance: 0.7,     // Willing to take risks
  lifeThreshold: 5,       // Only defensive at 5 life
  cardAdvantageWeight: 0.5, // Don't care much about card advantage
  useCombatTricks: true,
});

// Generate combat plan
const plan = ai.generateAttackPlan();
```

## Configuration

### CombatAIConfig

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `aggression` | number | 0-1 | How aggressively to attack (0 = defensive, 1 = aggressive) |
| `riskTolerance` | number | 0-1 | Willingness to take risky combat trades |
| `lifeThreshold` | number | 0-20 | Life total where AI becomes defensive |
| `cardAdvantageWeight` | number | 0+ | Importance of card advantage vs life |
| `useCombatTricks` | boolean | - | Whether to consider instant-speed effects |

### Difficulty Presets

#### Easy Difficulty
```typescript
{
  aggression: 0.3,        // Cautious attacks
  riskTolerance: 0.2,     // Avoids risks
  lifeThreshold: 15,      // Plays defensively early
  cardAdvantageWeight: 0.5,
  useCombatTricks: false, // No combat tricks
}
```

#### Medium Difficulty
```typescript
{
  aggression: 0.5,        // Balanced approach
  riskTolerance: 0.5,     // Moderate risk
  lifeThreshold: 10,      // Defensive at 10 life
  cardAdvantageWeight: 1.0,
  useCombatTricks: true,
}
```

#### Hard Difficulty
```typescript
{
  aggression: 0.7,        // Very aggressive
  riskTolerance: 0.7,     // Takes calculated risks
  lifeThreshold: 7,       // Stays aggressive longer
  cardAdvantageWeight: 1.5, // Values card advantage highly
  useCombatTricks: true,
}
```

## Combat Strategies

The AI dynamically adjusts its combat strategy based on game state:

### Aggressive Strategy
- Triggered when: Opponent is low on life, or AI has significant board advantage
- Behavior: Attacks with most creatures, takes favorable trades, pushes damage

### Moderate Strategy
- Triggered when: Board is relatively even, life totals are healthy
- Behavior: Selective attacks, only attacks with evasive creatures or when safe

### Defensive Strategy
- Triggered when: AI is low on life, or opponent has overwhelming board
- Behavior: Holds back creatures for blocks, only attacks with evasion

## Decision Factors

### Attack Evaluation

When deciding whether to attack, the AI considers:

1. **Potential Damage**: How much damage will be dealt
2. **Opponent Life**: Higher value when opponent is low
3. **Blocking Creatures**: Which creatures can block
4. **Trade Potential**: Will our creature die?
5. **Mana Value**: Risking expensive creatures is worse
6. **Evasion**: Creatures with evasion are safer to attack with
7. **Trample**: Can damage through blockers
8. **First Strike**: First strike changes combat math

### Block Evaluation

When deciding whether to block, the AI considers:

1. **Life Saved**: How much damage will be prevented
2. **Creature Value**: Mana cost of blocker vs attacker
3. **Trade Outcome**: Does the blocker die? Does the attacker die?
4. **Current Life**: More willing to chump block when low
5. **First Strike**: First strike changes combat math
6. **Multiple Blockers**: For menace or strategic blocks
7. **Damage Order**: Optimal ordering when multi-blocking

## Examples

See `/src/ai/decision-making/combat-examples.ts` for comprehensive examples:

- `example1_BasicAttacks()`: Basic attack decision-making
- `example2_BlockingDecisions()`: Blocking decisions
- `example3_StrategyComparison()`: Aggressive vs defensive approaches
- `example4_EvasionCreatures()`: Handling flying and other evasion
- `example5_CombatTrades()`: Evaluating creature trades
- `example6_MultiBlocking()`: Menace and multi-block scenarios
- `example7_DifficultyComparison()`: Difficulty level differences
- `example8_CustomConfiguration()`: Custom AI behavior

Run all examples:
```typescript
import { runAllCombatExamples } from '@/ai/decision-making/combat-examples';
runAllCombatExamples();
```

## Integration with Game State Evaluator

The Combat AI integrates with the game state evaluator for strategic assessment:

```typescript
import { GameStateEvaluator } from '@/ai/game-state-evaluator';
import { CombatDecisionTree } from '@/ai/decision-making/combat-decision-tree';

// Evaluate overall game state
const evaluator = new GameStateEvaluator(gameState, 'ai_player', 'medium');
const evaluation = evaluator.evaluate();

// Use evaluation to inform combat decisions
const combatAI = new CombatDecisionTree(gameState, 'ai_player', 'medium');

// Adjust combat strategy based on game state
if (evaluation.factors.lifeScore < -0.5) {
  combatAI.setConfig({ aggression: 0.3, lifeThreshold: 15 });
}

const plan = combatAI.generateAttackPlan();
```

## Architecture

### Core Classes

#### `CombatDecisionTree`
Main AI class that generates combat decisions.

**Methods:**
- `generateAttackPlan()`: Creates attack decisions
- `generateBlockingPlan(attackers)`: Creates blocking decisions
- `setConfig(config)`: Customize AI behavior

#### `AttackDecision`
Represents a single attack decision.

**Properties:**
- `creatureId`: Which creature to attack with
- `shouldAttack`: Whether to attack
- `target`: Who to attack (player ID or 'none')
- `reasoning`: Text explanation
- `expectedValue`: 0-1 scale of attack quality
- `riskLevel`: 0-1 scale of risk

#### `BlockDecision`
Represents a single blocking decision.

**Properties:**
- `blockerId`: Which creature to block with
- `attackerId`: Which attacker to block
- `damageOrder`: Order for multi-blocks
- `reasoning`: Text explanation
- `expectedValue`: 0-1 scale of block quality

#### `CombatPlan`
Complete combat strategy for a turn.

**Properties:**
- `attacks`: Array of AttackDecision
- `blocks`: Array of BlockDecision
- `strategy`: 'aggressive' | 'moderate' | 'defensive'
- `totalExpectedValue`: Overall plan quality
- `combatTricks`: Recommended instant-speed effects

## Advanced Topics

### Handling Special Abilities

#### First Strike/Double Strike
The AI accounts for first strike when evaluating combat:
- First strike creatures deal damage first
- Can kill blockers before they deal damage
- Changes trade calculations significantly

#### Trample
Trample damage is calculated correctly:
- Excess damage carries over to the player
- Blocking with a single creature is less effective
- Chump blocks still prevent some damage

#### Menace
Menace requires multiple blockers:
- AI evaluates if it has enough creatures
- Assigns optimal blockers
- Orders damage to minimize losses

#### Evasion
Creatures with evasion (flying, etc.) are prioritized:
- Higher attack value
- Lower risk assessment
- More likely to attack

### Trade Assessment

The AI evaluates creature trades based on:

1. **Mana Value**: Trading a 2-drop for a 6-drop is good
2. **Card Advantage**: 2-for-1 trades are avoided
3. **Board Impact**: Will the trade improve board position?
4. **Life Total**: More willing to trade when ahead on life

### Chump Blocking

The AI decides when to chump block:

**Block when:**
- Low on life and facing lethal
- Blocker is cheap (1-2 mana)
- Preventing significant damage (3+ damage)
- Opponent creature is very valuable

**Don't block when:**
- Blocker is expensive
- Damage is minimal
- Can race instead
- Need creature for future attacks

## Testing

The combat AI includes validation tests in `/src/ai/__tests__/`:

```typescript
import { CombatDecisionTree } from '@/ai/decision-making/combat-decision-tree';

// Test basic attack generation
const ai = new CombatDecisionTree(gameState, 'ai_player', 'medium');
const plan = ai.generateAttackPlan();

assert(plan.attacks.length > 0, 'Should generate attack decisions');
assert(plan.strategy === 'aggressive' || 'moderate' || 'defensive');
```

## Performance Considerations

The combat AI is designed for real-time gameplay:

- **Fast Evaluation**: Typical decision time < 10ms
- **Linear Complexity**: O(n × m) where n = creatures, m = opponents
- **Minimal Memory**: No deep recursion or game state simulation
- **Caching**: Can cache repeated evaluations

## Future Enhancements

Planned features for future versions:

1. **Combat Tricks**: Full integration with hand analysis
2. **Predictive Modeling**: Anticipate opponent's blocks
3. **Multi-Turn Planning**: Consider future board states
4. **Deck Archetype Awareness**: Adjust strategy based on deck type
5. **Sideboard Guidance**: Suggest boarding decisions based on combat patterns

## Contributing

When adding new combat logic:

1. Update the `CombatDecisionTree` class
2. Add examples to `combat-examples.ts`
3. Document new features in this README
4. Add tests to `__tests__/`
5. Update this documentation

## License

Part of the Planar Nexus project.

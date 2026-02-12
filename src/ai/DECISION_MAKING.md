# AI Decision-Making System - Implementation Guide

## Overview

This document provides implementation details for the AI Decision-Making System in Planar Nexus, specifically focusing on **Phase 3.1: Main Phase Decision Trees**.

## Architecture

### System Components

```
src/ai/
├── decision-making/
│   ├── index.ts                              # Module exports
│   ├── main-phase-decision-tree.ts           # Core decision tree logic
│   ├── main-phase-decision-tree-example.ts   # Usage examples
│   ├── __tests__/
│   │   └── main-phase-decision-tree.test.ts  # Test suite
│   └── README.md                             # Detailed documentation
├── game-state-evaluator.ts                   # State evaluation (Phase 2)
└── game-state-evaluator-example.ts           # Evaluator examples
```

### Data Flow

```
GameState Input
    ↓
Action Generation (Generate all legal actions)
    ↓
Action Evaluation (Score each action)
    ↓
Action Ranking (Sort by value/priority)
    ↓
Decision Selection (Choose best or pass)
    ↓
Decision Output (Action to execute)
```

## Implementation Details

### 1. Action Generation

The decision tree generates all legally possible actions:

```typescript
private generatePossibleActions(): PossibleAction[] {
  const actions: PossibleAction[] = [];

  // Check phase
  if (!isMainPhase) return actions;

  // Land plays
  actions.push(...this.evaluateLandPlays(player));

  // Spell casts
  actions.push(...this.evaluateSpellCasts(player));

  // Activated abilities
  actions.push(...this.evaluateActivatedAbilities(player));

  return actions;
}
```

**Key Points:**
- Only generates legal actions (checks mana, timing, restrictions)
- Respects land drop limits
- Considers summoning sickness
- Evaluates targets for abilities

### 2. Action Evaluation Framework

Each action is evaluated using a multi-factor scoring system:

```typescript
private evaluateSpellCast(spell: CardInstance, player: Player): PossibleAction {
  let value = BASE_VALUE;
  let risk = BASE_RISK;

  // Type-specific evaluation
  if (isCreature) {
    const eval = this.evaluateCreatureSpell(spell, player);
    value = eval.value;
    risk = eval.risk;
  }

  // Adjust for mana efficiency
  value *= this.calculateManaEfficiency(spell, manaCost);

  // Adjust for timing
  value *= this.evaluateSpellTiming(spell, player);

  return { value, risk, reasoning };
}
```

**Evaluation Factors:**

1. **Base Value** (0.0 - 1.0)
   - Starting point for action value
   - Different base values for different action types

2. **Strategic Value** (+/- 0.0 - 0.5)
   - How much the action advances win conditions
   - Context-dependent (board state, threats, opportunities)

3. **Mana Efficiency** (+/- 0.0 - 0.3)
   - Stats/power vs. mana cost ratio
   - Color availability considerations
   - Curve optimization

4. **Timing Score** (0.0 - 1.0)
   - Right moment for the action
   - Phase considerations (pre vs post combat)
   - Turn number (early vs late game)

5. **Risk Assessment** (0.0 - 1.0)
   - Probability of 2-for-1s
   - Removal vulnerability
   - Counter-spell risk

### 3. Land Play Logic

Lands are evaluated based on multiple factors:

```typescript
private evaluateLandPlay(land: CardInstance, player: Player): PossibleAction {
  let value = 0.5; // Base value

  // Mana development
  if (landsInPlay < turnNumber) value += 0.3;

  // Land type
  if (isDual || isUtility) value += 0.2;

  // Color fixing
  if (providesNeededColor) value += 0.3;

  return { value, risk: 0.0, reasoning };
}
```

**Land Priority Logic:**

1. **Mana Development** (highest priority early game)
   - Behind on lands? +0.3 value
   - On curve? +0.0 value
   - Ahead on lands? -0.1 value

2. **Color Fixing**
   - Needed color in hand? +0.3 value
   - Multi-color deck? +0.2 value for duals
   - Mono-color? No bonus

3. **Land Type**
   - Basic: 0.0 value modifier
   - Dual land: +0.2 value
   - Utility land: +0.2 value
   - Fetch land: +0.3 value (when needed)

### 4. Creature Spell Logic

Creatures are evaluated comprehensively:

```typescript
private evaluateCreatureSpell(spell: CardInstance, player: Player) {
  let value = 0.5;

  // Stat efficiency
  const efficiency = (power + toughness) / cmc;
  value += Math.min(0.3, (efficiency - 2) * 0.1);

  // Keywords
  const valuableKeywords = ['flying', 'haste', 'vigilance', 'trample', 'deathtouch'];
  value += keywordCount * 0.1;

  // Board state need
  if (ourCreatures < opponentCreatures) value += 0.2;

  return { value, risk, reasoning };
}
```

**Creature Evaluation Criteria:**

1. **Stat Efficiency**
   - 2+ stats per mana: +0.1 value
   - 3+ stats per mana: +0.2 value
   - 4+ stats per mana: +0.3 value

2. **Keyword Value**
   - Evasive abilities (flying, shadow): +0.15 each
   - Combat keywords (first strike, deathtouch): +0.1 each
   - Utility keywords (vigilance, haste): +0.1 each

3. **Board Context**
   - Behind on creatures: +0.3 value
   - Even board: +0.0 value
   - Ahead on board: -0.1 value

4. **Risk Factors**
   - Opponent has removal: +0.2 risk
   - High-cost creature: +0.1 risk
   - No immediate impact: +0.1 risk

### 5. Instant/Sorcery Logic

Non-creature spells have different evaluation:

```typescript
private evaluateInstantSpell(spell: CardInstance, player: Player) {
  let value = 0.7; // Instants have higher base for flexibility

  // Interaction
  if (isCounterspell || isRemoval) value += 0.3;

  // Card draw
  if (drawsCards) value += 0.2;

  // Threats on board
  if (threats.length > 0 && isRemoval) value += 0.2;

  return { value, risk: 0.3, reasoning };
}
```

**Spell Type Values:**

1. **Instants**
   - Base: 0.7 (flexibility bonus)
   - Interactive (counter, destroy, prevent): +0.3
   - Card draw: +0.2
   - Protection: +0.2 (when threats exist)

2. **Sorceries**
   - Base: 0.5
   - Card draw: +0.2 per card
   - Removal: +0.3 (when targets exist)
   - Ramp: +0.3 (early game)
   - Board wipe: +0.4 (when behind)

### 6. Equipment/Aura Logic

Auras and equipment have special considerations:

```typescript
private evaluateArtifactSpell(spell: CardInstance, player: Player) {
  let value = 0.5;

  if (isEquipment) {
    // Check for creatures to equip
    if (creaturesInPlay > 0) value += 0.3;
  }

  if (isManaRock) {
    // Early game ramp
    if (landsInPlay < 5) value += 0.3;
  }

  return { value, risk: 0.2, reasoning };
}
```

**Attachment Evaluation:**

1. **Target Availability**
   - No creatures? -0.5 value (can't use)
   - One creature? +0.1 value
   - Multiple creatures? +0.2 value

2. **Stat Bonus**
   - +1/+1: +0.1 value
   - +2/+2: +0.2 value
   - +3/+3 or more: +0.3 value

3. **Risk of 2-for-1**
   - Base risk: 0.2
   - Opponent has removal: +0.3 risk
   - High-value target: +0.1 risk

### 7. Activated Ability Logic

Activated abilities are evaluated for optimal timing:

```typescript
private evaluateActivatedAbility(permanent: CardInstance, ability: string) {
  let value = 0.3; // Lower base, abilities vary widely

  // Card draw
  if (ability.includes('draw')) value += 0.4;

  // Pump effect
  if (ability.includes('+1/+1')) value += 0.3;

  // Removal
  if (ability.includes('destroy')) value += 0.4;

  return { value, risk: 0.3, reasoning };
}
```

**Ability Categories:**

1. **Mana Abilities**
   - Always use when needed
   - Don't clutter decision tree (handled separately)

2. **Draw Abilities**
   - High value (+0.4)
   - Use immediately unless saving mana

3. **Pump Abilities**
   - Combat trick potential
   - Value depends on board state

4. **Removal Abilities**
   - High value when threats exist
   - Timing is crucial

### 8. Priority Passing Logic

The AI intelligently decides when to pass:

```typescript
private shouldPassPriority(actions: PossibleAction[], evaluation: DetailedEvaluation): boolean {
  // No good actions
  if (actions.length === 0) return true;

  // Best action below threshold
  if (bestAction.value < minValueThreshold) return true;

  // Best action too risky
  if (bestAction.risk > maxRiskThreshold) return true;

  // Hold for instant-speed interaction
  if (holdManaForInstants && hasInstants && isPrecombatMain) {
    if (manaRemaining >= 2) return true;
  }

  return false;
}
```

**Passing Triggers:**

1. **No Actions**
   - Empty hand or no mana
   - Pass with high confidence (0.9)

2. **Low Value Actions**
   - All actions below threshold
   - Pass to save resources

3. **High Risk**
   - Best action exceeds risk tolerance
   - Wait for better opportunity

4. **Holding Mana**
   - Have instant-speed interaction
   - Pre-combat main phase
   - 2+ mana available
   - Hold for opponent's turn

## Integration with Game State Evaluator

The decision tree uses the game state evaluator for:

1. **Threat Assessment**
   - Boosts removal value when threats exist
   - Identifies high-priority targets

2. **Opportunity Detection**
   - Identifies advantageous board states
   - Suggests strategic plays

3. **Position Evaluation**
   - Winning? Take safe lines
   - Losing? Take calculated risks
   - Even? Optimize value

4. **Card Advantage Awareness**
   - Behind on cards? Prioritize draw
   - Ahead on cards? Pressure opponent

```typescript
// Example integration
const evaluation = this.evaluator.evaluate();

// Boost removal if threats exist
if (evaluation.threats.length > 0) {
  const removalAction = actions.find(a => a.isRemoval);
  if (removalAction) {
    removalAction.value += 0.2;
  }
}

// Prioritize card draw if behind
if (evaluation.factors.cardAdvantage < 0) {
  const drawAction = actions.find(a => a.isCardDraw);
  if (drawAction) {
    drawAction.value += 0.3;
  }
}
```

## Difficulty Implementation

### Easy AI

```typescript
const easyConfig: DecisionTreeConfig = {
  minValueThreshold: 0.2,      // Takes marginal actions
  maxRiskThreshold: 0.3,       // Avoids risk
  manaEfficiencyWeight: 0.3,   // Less optimization
  tempoWeight: 0.3,            // Less tempo-aware
  cardAdvantageWeight: 0.4,    // Some card awareness
  holdManaForInstants: false,  // Doesn't hold mana
  difficulty: 'easy',
};
```

**Behavior:**
- Plays creatures on curve
- Doesn't hold up interaction
- Takes obvious value plays
- Misses subtle optimization

### Medium AI

```typescript
const mediumConfig: DecisionTreeConfig = {
  minValueThreshold: 0.3,      // Moderate quality requirement
  maxRiskThreshold: 0.4,       // Accepts some risk
  manaEfficiencyWeight: 0.5,   // Considers efficiency
  tempoWeight: 0.5,            // Tempo-aware
  cardAdvantageWeight: 0.6,    // Values card advantage
  holdManaForInstants: true,   // Holds interaction
  difficulty: 'medium',
};
```

**Behavior:**
- Makes strategic land drops
- Holds mana for interaction
- Evaluates risk/reward
- Prioritizes card advantage

### Hard AI

```typescript
const hardConfig: DecisionTreeConfig = {
  minValueThreshold: 0.4,      // High quality requirement
  maxRiskThreshold: 0.5,       // Calculated risks
  manaEfficiencyWeight: 0.7,   // Highly optimized
  tempoWeight: 0.7,            // Strong tempo awareness
  cardAdvantageWeight: 0.8,    // Prioritizes card advantage
  holdManaForInstants: true,   // Strategic holding
  difficulty: 'hard',
};
```

**Behavior:**
- Optimal land sequencing
- Perfect mana holding
- Advanced threat assessment
- Maximizes card advantage
- Minimizes risk

## Performance Considerations

### Evaluation Speed

- **Target:** < 50ms per decision
- **Current:** ~5-20ms
- **Optimization:**
  - Lazy evaluation of actions
  - Early pruning of bad actions
  - Caching of repeated evaluations

### Memory Usage

- **Minimal:** No state mutation
- **Immutable:** Creates new action objects
- **GC-Friendly:** Short-lived objects

### Scalability

- **1v1:** Fully supported
- **Multiplayer:** Fully supported
- **Commander:** Fully supported
- **Brawl:** Fully supported

## Testing Strategy

### Unit Tests

Test individual evaluation functions:

```typescript
describe('Land Evaluation', () => {
  it('should value dual lands higher than basics', () => {
    // Test logic
  });

  it('should prioritize mana development', () => {
    // Test logic
  });
});
```

### Integration Tests

Test full decision flow:

```typescript
describe('Decision Flow', () => {
  it('should choose best action from multiple options', () => {
    // Test logic
  });

  it('should pass when no good actions', () => {
    // Test logic
  });
});
```

### Scenario Tests

Test real gameplay scenarios:

```typescript
describe('Game Scenarios', () => {
  it('should hold mana for combat trick', () => {
    // Test logic
  });

  it('should tap out for bomb creature', () => {
    // Test logic
  });
});
```

## Future Enhancements

### Phase 3.2: Combat Decision Tree
- Attack decisions
- Block decisions
- Damage assignment
- Combat tricks

### Phase 3.3: Response Decision Tree
- Stack interaction
- Counter-spell decisions
- Response timing
- Bluffing

### Phase 3.4: Multi-Turn Planning
- Lookahead search
- Minimax/alpha-beta
- Monte Carlo Tree Search
- Opponent modeling

## Troubleshooting

### Common Issues

**Issue: AI always passes priority**
- Check: Threshold too high?
- Check: No mana available?
- Check: Empty hand?

**Issue: AI makes suboptimal plays**
- Check: Weights appropriate?
- Check: Game state correct?
- Check: Evaluation accurate?

**Issue: Slow performance**
- Check: Caching enabled?
- Check: Unnecessary evaluations?
- Check: Efficient data structures?

## Contributing

When adding new decision logic:

1. **Implement evaluation function**
   - Follow naming convention
   - Return value, risk, reasoning
   - Consider all difficulty levels

2. **Add tests**
   - Unit tests for function
   - Integration tests for flow
   - Scenario tests for behavior

3. **Update documentation**
   - Add to this guide
   - Update README
   - Add examples

4. **Code review**
   - Ensure consistency
   - Check performance
   - Verify correctness

## License

Part of the Planar Nexus project.

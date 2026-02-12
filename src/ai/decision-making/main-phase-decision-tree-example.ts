/**
 * @fileoverview Main Phase Decision Tree Examples
 *
 * This file demonstrates how to use the Main Phase Decision Tree system
 * for AI decision-making during Magic: The Gathering main phases.
 */

import {
  MainPhaseDecisionTree,
  getBestMainPhaseAction,
  type DecisionTreeResult,
  type PossibleAction,
} from './main-phase-decision-tree';
import { GameState, Player, CardInstance, Phase } from '@/lib/game-state/types';
import { ScryfallCard } from '@/app/actions';

/**
 * Example 1: Basic Land Play Decision
 *
 * Scenario: Turn 3, AI only has 2 lands in play and needs to develop mana
 */
function example1LandPlayDecision() {
  console.log('\n=== Example 1: Land Play Decision ===\n');

  // Create a simple game state
  const gameState: GameState = createSimpleGameState({
    turnNumber: 3,
    currentPhase: Phase.PRECOMBAT_MAIN,
    playerId: 'ai-player',
    landsPlayedThisTurn: 0,
    landsInPlay: 2,
    hand: [
      createMockCard({
        id: 'land-1',
        name: 'Forest',
        type: 'Land',
        cmc: 0,
        colors: ['G'],
      }),
      createMockCard({
        id: 'creature-1',
        name: 'Llanowar Elves',
        type: 'Creature',
        cmc: 1,
        power: 1,
        toughness: 1,
        colors: ['G'],
      }),
    ],
    manaPool: { colorless: 2, white: 0, blue: 0, black: 0, red: 0, green: 0, generic: 0 },
  });

  // Get the best action
  const result = getBestMainPhaseAction(gameState, 'ai-player');

  // Display results
  displayDecisionResult(result);

  console.log('\nExpected: Play Forest (high priority due to being behind on mana)');
}

/**
 * Example 2: Creature Casting Decision
 *
 * Scenario: Turn 4, AI has efficient creature and needs board presence
 */
function example2CreatureCasting() {
  console.log('\n=== Example 2: Creature Casting Decision ===\n');

  const gameState: GameState = createSimpleGameState({
    turnNumber: 4,
    currentPhase: Phase.POSTCOMBAT_MAIN,
    playerId: 'ai-player',
    landsPlayedThisTurn: 1,
    landsInPlay: 4,
    hand: [
      createMockCard({
        id: 'creature-1',
        name: 'Steel Leaf Champion',
        type: 'Creature',
        cmc: 3,
        power: 5,
        toughness: 4,
        colors: ['G'],
        keywords: [],
      }),
    ],
    opponentCreatures: 2,
    manaPool: { colorless: 0, white: 0, blue: 0, black: 0, red: 0, green: 3, generic: 1 },
  });

  const result = getBestMainPhaseAction(gameState, 'ai-player');
  displayDecisionResult(result);

  console.log('\nExpected: Cast Steel Leaf Champion (efficient stats, needs board presence)');
}

/**
 * Example 3: Holding Mana for Instant
 *
 * Scenario: Pre-combat main phase, AI has instant-speed removal
 */
function example3HoldingMana() {
  console.log('\n=== Example 3: Holding Mana for Instant ===\n');

  const gameState: GameState = createSimpleGameState({
    turnNumber: 5,
    currentPhase: Phase.PRECOMBAT_MAIN,
    playerId: 'ai-player',
    landsPlayedThisTurn: 1,
    landsInPlay: 4,
    hand: [
      createMockCard({
        id: 'instant-1',
        name: "Swords to Plowshares",
        type: 'Instant',
        cmc: 1,
        colors: ['W'],
        oracleText: 'Exile target creature. Its controller gains life equal to its power.',
      }),
      createMockCard({
        id: 'creature-1',
        name: 'Creature',
        type: 'Creature',
        cmc: 3,
        power: 3,
        toughness: 3,
        colors: ['W'],
      }),
    ],
    opponentCreatures: 1,
    opponentThreat: true,
    manaPool: { colorless: 0, white: 2, blue: 0, black: 0, red: 0, green: 0, generic: 2 },
  });

  const result = getBestMainPhaseAction(gameState, 'ai-player', {
    holdManaForInstants: true,
  });

  displayDecisionResult(result);

  console.log('\nExpected: Pass priority (holding Swords for combat)');
}

/**
 * Example 4: Multiple Action Evaluation
 *
 * Scenario: AI has multiple playable cards
 */
function example4MultipleActions() {
  console.log('\n=== Example 4: Multiple Action Evaluation ===\n');

  const gameState: GameState = createSimpleGameState({
    turnNumber: 6,
    currentPhase: Phase.POSTCOMBAT_MAIN,
    playerId: 'ai-player',
    landsPlayedThisTurn: 1,
    landsInPlay: 5,
    hand: [
      createMockCard({
        id: 'creature-1',
        name: 'Creature A',
        type: 'Creature',
        cmc: 3,
        power: 3,
        toughness: 3,
        colors: ['G'],
      }),
      createMockCard({
        id: 'creature-2',
        name: 'Creature B',
        type: 'Creature',
        cmc: 4,
        power: 4,
        toughness: 4,
        colors: ['G'],
        keywords: ['Trample'],
      }),
      createMockCard({
        id: 'sorcery-1',
        name: 'Draw Spell',
        type: 'Sorcery',
        cmc: 3,
        colors: ['G'],
        oracleText: 'Draw two cards.',
      }),
    ],
    manaPool: { colorless: 0, white: 0, blue: 0, black: 0, red: 0, green: 5, generic: 2 },
  });

  const result = getBestMainPhaseAction(gameState, 'ai-player');

  console.log('Ranked Actions:');
  result.rankedActions.forEach((action, index) => {
    console.log(`\n${index + 1}. ${action.type}: ${action.reasoning}`);
    console.log(`   Value: ${action.value.toFixed(2)}, Risk: ${action.risk.toFixed(2)}`);
    console.log(`   Priority: ${action.priority}`);
  });

  console.log(`\nBest Action: ${result.bestAction?.type || 'Pass'}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
}

/**
 * Example 5: Difficulty Level Comparison
 *
 * Scenario: Same game state, different difficulty levels
 */
function example5DifficultyComparison() {
  console.log('\n=== Example 5: Difficulty Level Comparison ===\n');

  const gameState: GameState = createSimpleGameState({
    turnNumber: 4,
    currentPhase: Phase.POSTCOMBAT_MAIN,
    playerId: 'ai-player',
    landsPlayedThisTurn: 1,
    landsInPlay: 4,
    hand: [
      createMockCard({
        id: 'creature-1',
        name: 'Decent Creature',
        type: 'Creature',
        cmc: 3,
        power: 2,
        toughness: 2,
        colors: ['G'],
      }),
      createMockCard({
        id: 'instant-1',
        name: 'Response Instant',
        type: 'Instant',
        cmc: 2,
        colors: ['G'],
        oracleText: 'Counter target creature spell.',
      }),
    ],
    manaPool: { colorless: 0, white: 0, blue: 0, black: 0, red: 0, green: 3, generic: 1 },
  });

  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  for (const difficulty of difficulties) {
    console.log(`\n--- ${difficulty.toUpperCase()} Difficulty ---\n`);

    const result = getBestMainPhaseAction(gameState, 'ai-player', {
      difficulty,
    });

    console.log(`Decision: ${result.bestAction?.type || 'Pass'}`);
    if (result.bestAction) {
      console.log(`Reasoning: ${result.bestAction.reasoning}`);
      console.log(`Value: ${result.bestAction.value.toFixed(2)}`);
    }
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  }
}

/**
 * Example 6: Activated Ability Decision
 *
 * Scenario: AI has creature with activated ability
 */
function example6ActivatedAbilities() {
  console.log('\n=== Example 6: Activated Ability Decision ===\n');

  const gameState: GameState = createSimpleGameState({
    turnNumber: 5,
    currentPhase: Phase.POSTCOMBAT_MAIN,
    playerId: 'ai-player',
    landsPlayedThisTurn: 1,
    landsInPlay: 5,
    hand: [],
    battlefield: [
      createMockCard({
        id: 'creature-1',
        name: 'Pillage Elf',
        type: 'Creature',
        cmc: 2,
        power: 1,
        toughness: 1,
        colors: ['G'],
        oracleText: '{G}, {T}: Destroy target artifact or enchantment.',
      }),
    ],
    opponentArtifacts: 1,
    manaPool: { colorless: 0, white: 0, blue: 0, black: 0, red: 0, green: 3, generic: 0 },
  });

  const result = getBestMainPhaseAction(gameState, 'ai-player');
  displayDecisionResult(result);

  console.log('\nExpected: Activate Pillage Elf ability (if opponent has artifact/enchantment)');
}

/**
 * Example 7: Risk Assessment
 *
 * Scenario: AI considers risky play
 */
function example7RiskAssessment() {
  console.log('\n=== Example 7: Risk Assessment ===\n');

  const gameState: GameState = createSimpleGameState({
    turnNumber: 4,
    currentPhase: Phase.POSTCOMBAT_MAIN,
    playerId: 'ai-player',
    landsPlayedThisTurn: 1,
    landsInPlay: 4,
    hand: [
      createMockCard({
        id: 'aura-1',
        name: 'Powerful Aura',
        type: 'Enchantment',
        cmc: 2,
        colors: ['G'],
        oracleText: 'Enchant creature\nEnchanted creature gets +3/+3.',
      }),
      createMockCard({
        id: 'creature-1',
        name: 'Safe Creature',
        type: 'Creature',
        cmc: 2,
        power: 2,
        toughness: 2,
        colors: ['G'],
      }),
    ],
    battlefield: [
      createMockCard({
        id: 'creature-2',
        name: 'Target Creature',
        type: 'Creature',
        cmc: 2,
        power: 1,
        toughness: 1,
        colors: ['G'],
      }),
    ],
    opponentRemoval: true,
    manaPool: { colorless: 0, white: 0, blue: 0, black: 0, red: 0, green: 3, generic: 0 },
  });

  const result = getBestMainPhaseAction(gameState, 'ai-player', {
    maxRiskThreshold: 0.3,
  });

  displayDecisionResult(result);

  console.log('\nNote: Aura attached to creature is risky if opponent has removal');
  console.log('AI may choose safer option based on risk threshold');
}

/**
 * Example 8: Mana Efficiency
 *
 * Scenario: AI evaluates mana efficiency of different plays
 */
function example8ManaEfficiency() {
  console.log('\n=== Example 8: Mana Efficiency ===\n');

  const gameState: GameState = createSimpleGameState({
    turnNumber: 4,
    currentPhase: Phase.POSTCOMBAT_MAIN,
    playerId: 'ai-player',
    landsPlayedThisTurn: 1,
    landsInPlay: 4,
    hand: [
      createMockCard({
        id: 'creature-1',
        name: 'Efficient Creature',
        type: 'Creature',
        cmc: 2,
        power: 3,
        toughness: 3,
        colors: ['G'],
      }),
      createMockCard({
        id: 'creature-2',
        name: 'Inefficient Creature',
        type: 'Creature',
        cmc: 4,
        power: 3,
        toughness: 3,
        colors: ['G'],
      }),
    ],
    manaPool: { colorless: 0, white: 0, blue: 0, black: 0, red: 0, green: 4, generic: 0 },
  });

  const result = getBestMainPhaseAction(gameState, 'ai-player', {
    manaEfficiencyWeight: 0.8,
  });

  console.log('Ranked Actions (Mana Efficiency Priority):');
  result.rankedActions.forEach((action, index) => {
    console.log(`\n${index + 1}. ${action.reasoning}`);
    console.log(`   Value: ${action.value.toFixed(2)}`);
  });

  console.log('\nNote: More mana-efficient creatures are prioritized');
}

// Helper Functions

interface GameStateConfig {
  turnNumber: number;
  currentPhase: Phase;
  playerId: string;
  landsPlayedThisTurn: number;
  landsInPlay: number;
  hand: any[];
  opponentCreatures?: number;
  opponentThreat?: boolean;
  opponentArtifacts?: number;
  opponentRemoval?: boolean;
  battlefield?: any[];
  manaPool: any;
}

function createSimpleGameState(config: GameStateConfig): GameState {
  const opponentId = 'opponent';

  const aiPlayer: Player = {
    id: config.playerId,
    name: 'AI Player',
    life: 20,
    poisonCounters: 0,
    commanderDamage: new Map(),
    maxHandSize: 7,
    currentHandSizeModifier: 0,
    hasLost: false,
    lossReason: null,
    landsPlayedThisTurn: config.landsPlayedThisTurn,
    maxLandsPerTurn: 1,
    manaPool: config.manaPool,
    isInCommandZone: false,
    experienceCounters: 0,
    commanderCastCount: 0,
    hasPassedPriority: false,
    hasActivatedManaAbility: false,
    additionalCombatPhase: false,
    additionalMainPhase: false,
  };

  const opponentPlayer: Player = {
    id: opponentId,
    name: 'Opponent',
    life: 20,
    poisonCounters: 0,
    commanderDamage: new Map(),
    maxHandSize: 7,
    currentHandSizeModifier: 0,
    hasLost: false,
    lossReason: null,
    landsPlayedThisTurn: 1,
    maxLandsPerTurn: 1,
    manaPool: {
      colorless: 0,
      white: 0,
      blue: 0,
      black: 0,
      red: 0,
      green: 0,
      generic: 0,
    },
    isInCommandZone: false,
    experienceCounters: 0,
    commanderCastCount: 0,
    hasPassedPriority: false,
    hasActivatedManaAbility: false,
    additionalCombatPhase: false,
    additionalMainPhase: false,
  };

  const players = new Map();
  players.set(config.playerId, aiPlayer);
  players.set(opponentId, opponentPlayer);

  const cards = new Map();
  const zones = new Map();

  // Add hand cards
  const handCards: string[] = [];
  config.hand.forEach((card, index) => {
    cards.set(card.id, card);
    handCards.push(card.id);
  });

  zones.set(`${config.playerId}-hand`, {
    type: 'hand',
    playerId: config.playerId,
    cardIds: handCards,
    isRevealed: false,
    visibleTo: [config.playerId],
  });

  // Add battlefield cards
  const battlefieldCards: string[] = [];
  if (config.battlefield) {
    config.battlefield.forEach((card) => {
      cards.set(card.id, card);
      battlefieldCards.push(card.id);
    });
  }

  // Add lands
  for (let i = 0; i < config.landsInPlay; i++) {
    const landId = `land-${config.playerId}-${i}`;
    const land = createMockCard({
      id: landId,
      name: 'Forest',
      type: 'Land',
      cmc: 0,
      colors: ['G'],
    });
    cards.set(landId, land);
    battlefieldCards.push(landId);
  }

  zones.set(`${config.playerId}-battlefield`, {
    type: 'battlefield',
    playerId: config.playerId,
    cardIds: battlefieldCards,
    isRevealed: true,
    visibleTo: [],
  });

  // Add opponent creatures
  const opponentBattlefieldCards: string[] = [];
  for (let i = 0; i < (config.opponentCreatures || 0); i++) {
    const creatureId = `opponent-creature-${i}`;
    const creature = createMockCard({
      id: creatureId,
      name: 'Opponent Creature',
      type: 'Creature',
      cmc: 3,
      power: 3,
      toughness: 3,
      colors: ['R'],
    });
    cards.set(creatureId, creature);
    opponentBattlefieldCards.push(creatureId);
  }

  zones.set(`${opponentId}-battlefield`, {
    type: 'battlefield',
    playerId: opponentId,
    cardIds: opponentBattlefieldCards,
    isRevealed: true,
    visibleTo: [],
  });

  return {
    gameId: 'example-game',
    players,
    cards,
    zones,
    stack: [],
    turn: {
      activePlayerId: config.playerId,
      currentPhase: config.currentPhase,
      turnNumber: config.turnNumber,
      extraTurns: 0,
      isFirstTurn: config.turnNumber === 1,
      startedAt: Date.now(),
    },
    combat: {
      inCombatPhase: false,
      attackers: [],
      blockers: [],
      remainingCombatPhases: 0,
    },
    waitingChoice: null,
    priorityPlayerId: config.playerId,
    consecutivePasses: 0,
    status: 'in_progress',
    winners: [],
    endReason: null,
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
  };
}

function createMockCard(config: any): CardInstance {
  const cardData: Partial<ScryfallCard> = {
    id: config.id,
    oracle_id: config.id,
    name: config.name,
    type_line: config.type,
    cmc: config.cmc,
    colors: config.colors || [],
    power: config.power?.toString(),
    toughness: config.toughness?.toString(),
    oracle_text: config.oracleText || '',
    keywords: config.keywords || [],
    mana_cost: config.manaCost || '',
  };

  return {
    id: config.id,
    oracleId: config.id,
    cardData: cardData as ScryfallCard,
    currentFaceIndex: 0,
    isFaceDown: false,
    controllerId: 'ai-player',
    ownerId: 'ai-player',
    isTapped: false,
    isFlipped: false,
    isTurnedFaceUp: false,
    isPhasedOut: false,
    hasSummoningSickness: true,
    counters: [],
    damage: 0,
    toughnessModifier: 0,
    powerModifier: 0,
    attachedToId: null,
    attachedCardIds: [],
    enteredBattlefieldTimestamp: Date.now(),
    attachedTimestamp: null,
    isToken: false,
    tokenData: null,
  };
}

function displayDecisionResult(result: DecisionTreeResult) {
  console.log('Decision Result:');
  console.log('================');

  if (result.bestAction) {
    console.log(`\nBest Action: ${result.bestAction.type}`);
    console.log(`Card ID: ${result.bestAction.cardId || 'N/A'}`);
    console.log(`Reasoning: ${result.bestAction.reasoning}`);
    console.log(`Value: ${result.bestAction.value.toFixed(2)} / 1.00`);
    console.log(`Risk: ${result.bestAction.risk.toFixed(2)} / 1.00`);
    console.log(`Priority: ${result.bestAction.priority}`);
  } else {
    console.log('\nBest Action: Pass Priority');
  }

  console.log(`\nConfidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Total Actions Evaluated: ${result.rankedActions.length}`);

  if (result.rankedActions.length > 1) {
    console.log('\nTop 3 Alternatives:');
    result.rankedActions.slice(1, 4).forEach((action, index) => {
      console.log(`\n${index + 1}. ${action.type}`);
      console.log(`   ${action.reasoning}`);
      console.log(`   Value: ${action.value.toFixed(2)}, Risk: ${action.risk.toFixed(2)}`);
    });
  }

  console.log('\nGame State Evaluation:');
  console.log(`Total Score: ${result.stateEvaluation.totalScore.toFixed(2)}`);
  console.log(`Threats: ${result.stateEvaluation.threats.length}`);
  console.log(`Opportunities: ${result.stateEvaluation.opportunities.length}`);
}

// Run examples
export function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Main Phase Decision Tree - Usage Examples               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    example1LandPlayDecision();
    example2CreatureCasting();
    example3HoldingMana();
    example4MultipleActions();
    example5DifficultyComparison();
    example6ActivatedAbilities();
    example7RiskAssessment();
    example8ManaEfficiency();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  All Examples Completed Successfully                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Export individual examples for testing
export {
  example1LandPlayDecision,
  example2CreatureCasting,
  example3HoldingMana,
  example4MultipleActions,
  example5DifficultyComparison,
  example6ActivatedAbilities,
  example7RiskAssessment,
  example8ManaEfficiency,
};

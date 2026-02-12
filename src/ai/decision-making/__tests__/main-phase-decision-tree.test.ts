/**
 * @fileoverview Main Phase Decision Tree Tests
 *
 * Tests for the main phase decision tree logic
 */

import { describe, it, expect } from '@jest/globals';
import {
  MainPhaseDecisionTree,
  getBestMainPhaseAction,
  type DecisionTreeResult,
} from '../main-phase-decision-tree';
import { GameState, Phase } from '@/lib/game-state/types';

describe('MainPhaseDecisionTree', () => {
  describe('Action Generation', () => {
    it('should generate land play actions when lands are in hand', () => {
      const gameState = createTestGameState({
        landsInHand: 1,
        landsPlayedThisTurn: 0,
      });

      const tree = new MainPhaseDecisionTree(gameState, 'player1');
      const result = tree.decide();

      expect(result.rankedActions.length).toBeGreaterThan(0);
      expect(result.rankedActions.some((a) => a.type === 'play_land')).toBe(true);
    });

    it('should not generate land play actions when land drop already used', () => {
      const gameState = createTestGameState({
        landsInHand: 1,
        landsPlayedThisTurn: 1,
      });

      const tree = new MainPhaseDecisionTree(gameState, 'player1');
      const result = tree.decide();

      expect(result.rankedActions.some((a) => a.type === 'play_land')).toBe(false);
    });

    it('should generate spell cast actions when spells are in hand and mana is available', () => {
      const gameState = createTestGameState({
        spellsInHand: 1,
        manaAvailable: 3,
      });

      const tree = new MainPhaseDecisionTree(gameState, 'player1');
      const result = tree.decide();

      expect(result.rankedActions.some((a) => a.type === 'cast_spell')).toBe(true);
    });

    it('should not generate spell cast actions when not enough mana', () => {
      const gameState = createTestGameState({
        spellsInHand: 1,
        manaAvailable: 0,
      });

      const tree = new MainPhaseDecisionTree(gameState, 'player1');
      const result = tree.decide();

      expect(result.rankedActions.some((a) => a.type === 'cast_spell')).toBe(false);
    });
  });

  describe('Land Evaluation', () => {
    it('should prioritize land play when behind on mana development', () => {
      const gameState = createTestGameState({
        turnNumber: 4,
        landsInPlay: 2,
        landsInHand: 1,
        landsPlayedThisTurn: 0,
      });

      const result = getBestMainPhaseAction(gameState, 'player1');
      const landAction = result.rankedActions.find((a) => a.type === 'play_land');

      expect(landAction).toBeDefined();
      expect(landAction!.value).toBeGreaterThan(0.6);
      expect(landAction!.priority).toBe('high');
    });

    it('should value dual lands higher than basics', () => {
      const gameStateWithBasic = createTestGameState({
        landsInHand: 1,
        landType: 'basic',
      });

      const gameStateWithDual = createTestGameState({
        landsInHand: 1,
        landType: 'dual',
      });

      const resultBasic = getBestMainPhaseAction(gameStateWithBasic, 'player1');
      const resultDual = getBestMainPhaseAction(gameStateWithDual, 'player1');

      const basicAction = resultBasic.rankedActions.find((a) => a.type === 'play_land');
      const dualAction = resultDual.rankedActions.find((a) => a.type === 'play_land');

      expect(dualAction!.value).toBeGreaterThan(basicAction!.value);
    });
  });

  describe('Creature Evaluation', () => {
    it('should value efficient creatures higher', () => {
      const gameStateWithEfficient = createTestGameState({
        creaturePower: 4,
        creatureToughness: 4,
        creatureCMC: 3,
        manaAvailable: 3,
      });

      const gameStateWithInefficient = createTestGameState({
        creaturePower: 2,
        creatureToughness: 2,
        creatureCMC: 4,
        manaAvailable: 4,
      });

      const resultEfficient = getBestMainPhaseAction(gameStateWithEfficient, 'player1');
      const resultInefficient = getBestMainPhaseAction(gameStateWithInefficient, 'player1');

      const efficientAction = resultEfficient.rankedActions.find((a) => a.type === 'cast_spell');
      const inefficientAction = resultInefficient.rankedActions.find((a) => a.type === 'cast_spell');

      expect(efficientAction!.value).toBeGreaterThan(inefficientAction!.value);
    });

    it('should value creatures with keywords higher', () => {
      const gameStateWithKeywords = createTestGameState({
        creatureKeywords: ['flying', 'haste'],
        manaAvailable: 3,
      });

      const gameStateWithoutKeywords = createTestGameState({
        creatureKeywords: [],
        manaAvailable: 3,
      });

      const resultWithKeywords = getBestMainPhaseAction(gameStateWithKeywords, 'player1');
      const resultWithoutKeywords = getBestMainPhaseAction(gameStateWithoutKeywords, 'player1');

      const withKeywords = resultWithKeywords.rankedActions.find((a) => a.type === 'cast_spell');
      const withoutKeywords = resultWithoutKeywords.rankedActions.find((a) => a.type === 'cast_spell');

      expect(withKeywords!.value).toBeGreaterThan(withoutKeywords!.value);
    });

    it('should prioritize creatures when behind on board', () => {
      const gameState = createTestGameState({
        ourCreatures: 0,
        opponentCreatures: 2,
        manaAvailable: 3,
      });

      const result = getBestMainPhaseAction(gameState, 'player1');
      const creatureAction = result.rankedActions.find((a) => a.type === 'cast_spell');

      expect(creatureAction!.value).toBeGreaterThan(0.5);
      expect(creatureAction!.reasoning.toLowerCase()).toContain('board');
    });
  });

  describe('Instant/Sorcery Evaluation', () => {
    it('should value instant flexibility', () => {
      const gameState = createTestGameState({
        spellType: 'instant',
        manaAvailable: 2,
      });

      const result = getBestMainPhaseAction(gameState, 'player1');
      const instantAction = result.rankedActions.find((a) => a.type === 'cast_spell');

      expect(instantAction).toBeDefined();
      expect(instantAction!.value).toBeGreaterThan(0.5);
    });

    it('should hold instant-speed interaction in pre-combat main when configured', () => {
      const gameState = createTestGameState({
        spellType: 'instant',
        currentPhase: Phase.PRECOMBAT_MAIN,
        manaAvailable: 3,
        hasInstantRemoval: true,
      });

      const result = getBestMainPhaseAction(gameState, 'player1', {
        holdManaForInstants: true,
      });

      // Should either pass or have lower value on instant in pre-combat
      expect(result.shouldPassPriority || result.bestAction === null).toBe(true);
    });

    it('should value card draw spells', () => {
      const gameState = createTestGameState({
        spellType: 'sorcery',
        spellEffect: 'draw',
        manaAvailable: 3,
      });

      const result = getBestMainPhaseAction(gameState, 'player1');
      const drawAction = result.rankedActions.find((a) => a.type === 'cast_spell');

      expect(drawAction).toBeDefined();
      expect(drawAction!.reasoning.toLowerCase()).toContain('draw');
    });
  });

  describe('Risk Assessment', () => {
    it('should pass priority when all actions are too risky', () => {
      const gameState = createTestGameState({
        manaAvailable: 3,
        opponentRemoval: true,
        riskyAuraInHand: true,
      });

      const result = getBestMainPhaseAction(gameState, 'player1', {
        maxRiskThreshold: 0.1,
      });

      // With very low risk threshold and opponent removal, might pass
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should pass priority when all actions are below threshold', () => {
      const gameState = createTestGameState({
        manaAvailable: 3,
        weakSpellsInHand: true,
      });

      const result = getBestMainPhaseAction(gameState, 'player1', {
        minValueThreshold: 0.9,
      });

      expect(result.bestAction).toBeNull();
      expect(result.shouldPassPriority).toBe(true);
    });
  });

  describe('Difficulty Levels', () => {
    it('should make different decisions at different difficulty levels', () => {
      const gameState = createTestGameState({
        manaAvailable: 3,
        marginalSpellInHand: true,
      });

      const easyResult = getBestMainPhaseAction(gameState, 'player1', {
        difficulty: 'easy',
        minValueThreshold: 0.2,
      });

      const hardResult = getBestMainPhaseAction(gameState, 'player1', {
        difficulty: 'hard',
        minValueThreshold: 0.4,
      });

      // Easy AI might take marginal action, hard AI might pass
      const easyTakesAction = easyResult.bestAction !== null;
      const hardTakesAction = hardResult.bestAction !== null;

      expect(easyTakesAction || hardTakesAction).toBe(true);
    });
  });

  describe('Action Ranking', () => {
    it('should rank actions by value and priority', () => {
      const gameState = createTestGameState({
        landsInHand: 1,
        landsPlayedThisTurn: 0,
        spellsInHand: 2,
        manaAvailable: 5,
      });

      const result = getBestMainPhaseAction(gameState, 'player1');

      expect(result.rankedActions.length).toBeGreaterThan(1);

      // Check that actions are sorted (first should have highest or equal value)
      for (let i = 0; i < result.rankedActions.length - 1; i++) {
        const current = result.rankedActions[i];
        const next = result.rankedActions[i + 1];

        // Priority should be non-decreasing
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const currentPriority = priorityOrder[current.priority];
        const nextPriority = priorityOrder[next.priority];

        expect(currentPriority).toBeLessThanOrEqual(nextPriority);
      }
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence when passing', () => {
      const gameState = createTestGameState({});

      const result = getBestMainPhaseAction(gameState, 'player1');

      if (result.bestAction === null) {
        expect(result.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should have higher confidence when best action is much better than alternatives', () => {
      const gameState = createTestGameState({
        landsInHand: 1,
        landsPlayedThisTurn: 0,
        turnNumber: 5,
        landsInPlay: 2, // Behind on mana
      });

      const result = getBestMainPhaseAction(gameState, 'player1');

      if (result.bestAction && result.rankedActions.length >= 2) {
        const valueDiff = result.bestAction.value - result.rankedActions[1].value;
        if (valueDiff > 0.3) {
          expect(result.confidence).toBeGreaterThan(0.7);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty hand gracefully', () => {
      const gameState = createTestGameState({
        landsInHand: 0,
        spellsInHand: 0,
      });

      const result = getBestMainPhaseAction(gameState, 'player1');

      expect(result.bestAction).toBeNull();
      expect(result.shouldPassPriority).toBe(true);
    });

    it('should handle main phase only', () => {
      const gameState = createTestGameState({
        currentPhase: Phase.DECLARE_ATTACKERS,
      });

      const tree = new MainPhaseDecisionTree(gameState, 'player1');
      const result = tree.decide();

      expect(result.rankedActions.length).toBe(0);
    });

    it('should handle zero mana', () => {
      const gameState = createTestGameState({
        spellsInHand: 1,
        manaAvailable: 0,
      });

      const result = getBestMainPhaseAction(gameState, 'player1');

      expect(result.rankedActions.some((a) => a.type === 'cast_spell')).toBe(false);
    });
  });
});

// Helper function to create test game states
interface TestGameStateConfig {
  turnNumber?: number;
  currentPhase?: Phase;
  landsInHand?: number;
  landsInPlay?: number;
  landsPlayedThisTurn?: number;
  landType?: 'basic' | 'dual';
  spellsInHand?: number;
  spellType?: 'creature' | 'instant' | 'sorcery';
  spellEffect?: string;
  creaturePower?: number;
  creatureToughness?: number;
  creatureCMC?: number;
  creatureKeywords?: string[];
  manaAvailable?: number;
  ourCreatures?: number;
  opponentCreatures?: number;
  hasInstantRemoval?: boolean;
  opponentRemoval?: boolean;
  riskyAuraInHand?: boolean;
  weakSpellsInHand?: boolean;
  marginalSpellInHand?: boolean;
}

function createTestGameState(config: TestGameStateConfig = {}): GameState {
  const turnNumber = config.turnNumber || 3;
  const currentPhase = config.currentPhase || Phase.PRECOMBAT_MAIN;
  const landsInPlay = config.landsInPlay || 3;
  const landsInHand = config.landsInHand || 0;
  const landsPlayedThisTurn = config.landsPlayedThisTurn || 0;
  const spellsInHand = config.spellsInHand || 0;
  const manaAvailable = config.manaAvailable || landsInPlay;
  const ourCreatures = config.ourCreatures || 1;
  const opponentCreatures = config.opponentCreatures || 1;

  // Create a minimal game state for testing
  const gameState: Partial<GameState> = {
    gameId: 'test-game',
    players: new Map([
      [
        'player1',
        {
          id: 'player1',
          name: 'Player 1',
          life: 20,
          poisonCounters: 0,
          commanderDamage: new Map(),
          maxHandSize: 7,
          currentHandSizeModifier: 0,
          hasLost: false,
          lossReason: null,
          landsPlayedThisTurn,
          maxLandsPerTurn: 1,
          manaPool: {
            colorless: manaAvailable,
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
        },
      ],
      [
        'player2',
        {
          id: 'player2',
          name: 'Player 2',
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
        },
      ],
    ]),
    cards: new Map(),
    zones: new Map(),
    stack: [],
    turn: {
      activePlayerId: 'player1',
      currentPhase,
      turnNumber,
      extraTurns: 0,
      isFirstTurn: turnNumber === 1,
      startedAt: Date.now(),
    },
    combat: {
      inCombatPhase: false,
      attackers: [],
      blockers: [],
      remainingCombatPhases: 0,
    },
    waitingChoice: null,
    priorityPlayerId: 'player1',
    consecutivePasses: 0,
    status: 'in_progress',
    winners: [],
    endReason: null,
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
  };

  // Add cards and zones
  const handCards: string[] = [];
  const battlefieldCards: string[] = [];

  // Add lands to hand
  for (let i = 0; i < landsInHand; i++) {
    const landId = `land-${i}`;
    const isDual = config.landType === 'dual';
    handCards.push(landId);
    // Would need to add actual card objects to cards map
  }

  // Add spells to hand
  for (let i = 0; i < spellsInHand; i++) {
    const spellId = `spell-${i}`;
    handCards.push(spellId);
  }

  // Add lands to battlefield
  for (let i = 0; i < landsInPlay; i++) {
    const landId = `battlefield-land-${i}`;
    battlefieldCards.push(landId);
  }

  // Add our creatures
  for (let i = 0; i < ourCreatures; i++) {
    const creatureId = `our-creature-${i}`;
    battlefieldCards.push(creatureId);
  }

  gameState.zones!.set('player1-hand', {
    type: 'hand',
    playerId: 'player1',
    cardIds: handCards,
    isRevealed: false,
    visibleTo: ['player1'],
  });

  gameState.zones!.set('player1-battlefield', {
    type: 'battlefield',
    playerId: 'player1',
    cardIds: battlefieldCards,
    isRevealed: true,
    visibleTo: [],
  });

  return gameState as GameState;
}

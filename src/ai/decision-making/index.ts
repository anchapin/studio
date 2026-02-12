/**
 * @fileoverview AI Decision-Making Module
 *
 * This module provides decision-making systems for AI opponents in Planar Nexus.
 * It includes decision trees for different phases of the game, evaluating possible
 * actions and selecting the best strategic choice.
 *
 * Main components:
 * - Main Phase Decision Tree: Evaluates land plays, spell casts, and abilities
 * - Combat Decision Tree: Manages attacking and blocking decisions (future)
 * - Response Decision Tree: Handles instant-speed interactions (future)
 *
 * @module ai/decision-making
 */

export {
  MainPhaseDecisionTree,
  getBestMainPhaseAction,
  type PossibleAction,
  type DecisionTreeResult,
  type DecisionTreeConfig,
  DefaultConfigs,
} from './main-phase-decision-tree';

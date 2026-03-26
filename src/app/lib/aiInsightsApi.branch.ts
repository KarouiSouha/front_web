/**
 * aiInsightsApi.branch.ts
 * ───────────────────────
 * Branch-aware type extensions for the Stock module (Phase 1-4).
 *
 * Import these types alongside the base types from aiInsightsApi.ts.
 * The backend should extend its /ai-insights/stock/ response to include
 * the new fields; all fields are optional for backward compatibility.
 *
 * Usage:
 *   import type { BranchStockItem, BranchStockResult } from './aiInsightsApi.branch';
 */

import type { StockItem, StockResult, Confidence } from './aiInsightsApi';

// ── Phase 1: richer item ──────────────────────────────────────────────────────

/**
 * Sibling branch record for the same product.
 * Tells you where else the product is held — critical for transfers.
 */
export interface SiblingBranch {
  branch_name:   string;
  branch_id?:    string;
  current_stock: number;
  urgency:       'immediate' | 'soon' | 'watch' | 'ok';
}

/**
 * Phase 4: AI-generated inter-branch transfer recommendation.
 * Only populated when a sibling has enough surplus to cover this branch's need.
 */
export interface TransferSuggestion {
  from_branch: string;
  qty:         number;
  rationale:   string;
  savings_lyd?: number;   // estimated revenue saved vs emergency reorder
}

/**
 * Extended StockItem with full branch-level data.
 * All new fields are optional → backward compatible.
 *
 * Phase 1 additions:
 *   - stock_source (was already in original but repeated for clarity)
 *   - safety_stock_raw, season_multiplier, active_days (also in original)
 *   - branch_id (new: stable identifier for the branch)
 *
 * Phase 2 additions:
 *   - sales_attribution_method: how the branch was determined
 *   - branch_sales_pct: % of product's total sales attributed to this branch
 *
 * Phase 4 additions:
 *   - sibling_branches: other branches holding the same SKU
 *   - transfer_suggestion: AI-generated inter-branch transfer advice
 */
export interface BranchStockItem extends StockItem {
  // ── Phase 1 ──
  branch_id?:              string;

  // ── Phase 2: attribution ──
  /** How the branch was determined: 'user_selected' | 'sales_distribution' | 'last_sale' */
  sales_attribution_method?: 'user_selected' | 'sales_distribution' | 'last_sale';
  /** Fraction of this product's total sales in the last window attributed here */
  branch_sales_pct?:       number;

  // ── Phase 4: cross-branch intelligence ──
  /** Other branches that also hold this SKU */
  sibling_branches?:       SiblingBranch[];
  /** AI suggestion to transfer stock from a sibling instead of ordering externally */
  transfer_suggestion?:    TransferSuggestion;
}

// ── Phase 1: richer result ────────────────────────────────────────────────────

/**
 * Per-branch aggregated stats.
 * Returned by the backend in branch_summaries; also computed client-side
 * as a fallback when the backend doesn't include it.
 */
export interface BranchSummary {
  total_items:              number;
  immediate_reorders:       number;
  soon_reorders:            number;
  class_a_count?:           number;
  class_b_count?:           number;
  class_c_count?:           number;
  total_stock_value_lyd?:   number;
}

/**
 * Phase 1: Data validation result attached to the stock response.
 * Set by the backend after parsing the uploaded snapshot.
 */
export interface StockValidation {
  passed:          boolean;
  total_qty:       number;         // sum of all quantities in snapshot
  branches_found:  number;         // unique branch names detected
  products_found:  number;         // unique product codes detected
  warnings:        string[];       // non-fatal issues (e.g. "3 rows with zero qty")
  errors?:         string[];       // fatal issues (only when passed = false)
}

/**
 * Extended StockResult with branch-level breakdown.
 * All new top-level fields are optional → backward compatible.
 */
export interface BranchStockResult extends Omit<StockResult, 'items'> {
  // ── Phase 1 ──
  /** ISO date string of the uploaded inventory snapshot (if any) */
  snapshot_date?:    string;
  /** Data quality validation — present when a snapshot was parsed */
  validation?:       StockValidation;
  /** Total unique branches found in the data */
  branches:          string[];

  // ── Phase 3 ──
  /** Per-branch summary keyed by normalized branch name */
  branch_summaries?: Record<string, BranchSummary>;

  /** Override items with richer type */
  items:             BranchStockItem[];
}

// ── Phase 2: Excel parser contract (for backend reference) ───────────────────

/**
 * Describes the normalized column mapping the backend Excel parser
 * should produce when ingesting an inventory snapshot.
 *
 * Column detection must be dynamic (not position-based).
 * Supported aliases for each logical column:
 */
export const EXCEL_COLUMN_ALIASES: Record<string, string[]> = {
  product_code: ['code', 'ref', 'référence', 'sku', 'article', 'product_code', 'item_code'],
  product_name: ['libellé', 'designation', 'name', 'description', 'product', 'produit'],
  quantity:     ['qty', 'quantité', 'qte', 'stock', 'quantity', 'solde', 'stock_qty'],
  branch:       ['agence', 'dépôt', 'depot', 'branch', 'warehouse', 'site', 'location'],
  unit:         ['unite', 'uom', 'unit', 'unité'],
};

/**
 * Normalized row produced by the parser — one row per (product × branch).
 * Quantity must be > 0 to be included.
 */
export interface ParsedStockRow {
  product_code:    string;
  product_name:    string;
  quantity:        number;
  branch_name:     string;   // normalized (trimmed, lowercased, prefix-stripped)
  branch_raw?:     string;   // original value before normalization
  unit?:           string;
}

// ── Phase 3: branch filter state (for frontend use) ───────────────────────────

/**
 * Branch filter mode used in StockContent.
 * 'all' = aggregate view across all branches.
 * A branch name = scoped to that specific branch.
 */
export type BranchFilterState = null | string;   // null = all branches

export type UrgencyFilter = 'all' | 'immediate' | 'soon';

// ── Phase 4: AI transfer insight (aggregated, for the executive briefing) ─────

/**
 * A recommended stock transfer between two branches.
 * Could appear in the Executive Risk Briefing as a cost-saving action.
 */
export interface StockTransferInsight {
  product_code:    string;
  product_name:    string;
  from_branch:     string;
  to_branch:       string;
  qty:             number;
  urgency:         'immediate' | 'soon';
  revenue_at_risk: number;
  rationale:       string;
  confidence:      Confidence;
}

/**
 * Phase 4: Top-level transfer summary, optionally returned by /ai-insights/stock/
 * when AI detects cross-branch rebalancing opportunities.
 */
export interface StockTransferSummary {
  total_opportunities:    number;
  total_revenue_saved_lyd: number;
  transfers:              StockTransferInsight[];
}
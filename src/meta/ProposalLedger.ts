import type { EvalSuiteName } from '../eval/runners/EvalRunner.js';
import type Database from 'bun:sqlite';
import type { PolicyProposal, ProposalCategory, ProposalStatus } from './types.js';

const DEFAULT_EVAL_PLAN: EvalSuiteName[] = ['memory_recall'];
const DEFAULT_EVAL_PLAN_JSON = '["memory_recall"]';
const DEFAULT_RISK_LEVEL = 'medium';
const DEFAULT_APPLY_MODE = 'patch_only';

interface ProposalRow {
  id: string;
  proposed_at: number;
  category: ProposalCategory;
  summary: string;
  evidence: string;
  suggested_change: string;
  status: ProposalStatus;
  eval_report: string | null;
  approved_at: number | null;
  applied_at: number | null;
  rolled_back_at: number | null;
  rejected_at: number | null;
  previous_value: string | null;
  eval_plan: string | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  apply_mode: 'config' | 'patch_only' | null;
  predicted_impact: string | null;
  actual_outcome_verified_at: number | null;
  verification_result: string | null;
}

export class ProposalLedger {
  constructor(private db: Database) {}

  initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta_proposals (
        id TEXT PRIMARY KEY,
        proposed_at INTEGER NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        evidence TEXT NOT NULL,
        suggested_change TEXT NOT NULL,
        status TEXT NOT NULL,
        eval_report TEXT,
        approved_at INTEGER,
        applied_at INTEGER,
        rolled_back_at INTEGER,
        rejected_at INTEGER,
        previous_value TEXT,
        eval_plan TEXT DEFAULT '["memory_recall"]',
        risk_level TEXT DEFAULT 'medium',
        apply_mode TEXT DEFAULT 'patch_only',
        predicted_impact TEXT,
        actual_outcome_verified_at INTEGER,
        verification_result TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_meta_proposals_status
        ON meta_proposals(status, proposed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_meta_proposals_category
        ON meta_proposals(category, proposed_at DESC);
    `);

    this.ensureColumn('eval_plan', `ALTER TABLE meta_proposals ADD COLUMN eval_plan TEXT DEFAULT '${DEFAULT_EVAL_PLAN_JSON}'`);
    this.ensureColumn('risk_level', `ALTER TABLE meta_proposals ADD COLUMN risk_level TEXT DEFAULT '${DEFAULT_RISK_LEVEL}'`);
    this.ensureColumn('apply_mode', `ALTER TABLE meta_proposals ADD COLUMN apply_mode TEXT DEFAULT '${DEFAULT_APPLY_MODE}'`);
    this.ensureColumn('approved_at', 'ALTER TABLE meta_proposals ADD COLUMN approved_at INTEGER');
    this.ensureColumn('rolled_back_at', 'ALTER TABLE meta_proposals ADD COLUMN rolled_back_at INTEGER');
    this.ensureColumn('previous_value', 'ALTER TABLE meta_proposals ADD COLUMN previous_value TEXT');
    this.ensureColumn('predicted_impact', 'ALTER TABLE meta_proposals ADD COLUMN predicted_impact TEXT');
    this.ensureColumn('actual_outcome_verified_at', 'ALTER TABLE meta_proposals ADD COLUMN actual_outcome_verified_at INTEGER');
    this.ensureColumn('verification_result', 'ALTER TABLE meta_proposals ADD COLUMN verification_result TEXT');

    this.db.exec(`
      UPDATE meta_proposals
      SET eval_plan = COALESCE(eval_plan, '${DEFAULT_EVAL_PLAN_JSON}'),
          risk_level = COALESCE(risk_level, '${DEFAULT_RISK_LEVEL}'),
          apply_mode = COALESCE(apply_mode, '${DEFAULT_APPLY_MODE}')
    `);
  }

  save(proposal: PolicyProposal): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO meta_proposals (
        id,
        proposed_at,
        category,
        summary,
        evidence,
        suggested_change,
        status,
        eval_report,
        approved_at,
        applied_at,
        rolled_back_at,
        rejected_at,
        previous_value,
        eval_plan,
        risk_level,
        apply_mode,
        predicted_impact,
        actual_outcome_verified_at,
        verification_result
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposal.id,
      proposal.proposedAt,
      proposal.category,
      proposal.summary,
      JSON.stringify(proposal.evidence),
      JSON.stringify(proposal.suggestedChange),
      proposal.status,
      proposal.evalReport ?? null,
      proposal.approvedAt ?? null,
      proposal.appliedAt ?? null,
      proposal.rolledBackAt ?? null,
      proposal.rejectedAt ?? null,
      typeof proposal.previousValue === 'undefined' ? null : JSON.stringify(proposal.previousValue),
      JSON.stringify(proposal.evalPlan ?? DEFAULT_EVAL_PLAN),
      proposal.riskLevel ?? DEFAULT_RISK_LEVEL,
      proposal.applyMode ?? DEFAULT_APPLY_MODE,
      proposal.predictedImpact ? JSON.stringify(proposal.predictedImpact) : null,
      proposal.actualOutcomeVerifiedAt ?? null,
      proposal.verificationResult ? JSON.stringify(proposal.verificationResult) : null
    );
  }

  get(id: string): PolicyProposal | null {
    const row = this.db.prepare(`
      SELECT
        id,
        proposed_at,
        category,
        summary,
        evidence,
        suggested_change,
        status,
        eval_report,
        approved_at,
        applied_at,
        rolled_back_at,
        rejected_at,
        previous_value,
        eval_plan,
        risk_level,
        apply_mode,
        predicted_impact,
        actual_outcome_verified_at,
        verification_result
      FROM meta_proposals
      WHERE id = ?
    `).get(id) as ProposalRow | null;

    return row ? this.mapRow(row) : null;
  }

  list(filter: { status?: ProposalStatus; category?: ProposalCategory } = {}): PolicyProposal[] {
    const clauses: string[] = [];
    const params: Array<string> = [];

    if (filter.status) {
      clauses.push('status = ?');
      params.push(filter.status);
    }
    if (filter.category) {
      clauses.push('category = ?');
      params.push(filter.category);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db.prepare(`
      SELECT
        id,
        proposed_at,
        category,
        summary,
        evidence,
        suggested_change,
        status,
        eval_report,
        approved_at,
        applied_at,
        rolled_back_at,
        rejected_at,
        previous_value,
        eval_plan,
        risk_level,
        apply_mode,
        predicted_impact,
        actual_outcome_verified_at,
        verification_result
      FROM meta_proposals
      ${where}
      ORDER BY proposed_at DESC, id DESC
    `).all(...params) as ProposalRow[];

    return rows.map((row) => this.mapRow(row));
  }

  updateStatus(
    id: string,
    status: ProposalStatus,
    extras: {
      evalReport?: string;
      approvedAt?: number;
      appliedAt?: number;
      rolledBackAt?: number;
      rejectedAt?: number;
      previousValue?: unknown;
      predictedImpact?: PolicyProposal['predictedImpact'];
      actualOutcomeVerifiedAt?: number;
      verificationResult?: PolicyProposal['verificationResult'];
    } = {}
  ): void {
    this.db.prepare(`
      UPDATE meta_proposals
      SET status = ?,
          eval_report = COALESCE(?, eval_report),
          approved_at = COALESCE(?, approved_at),
          applied_at = COALESCE(?, applied_at),
          rolled_back_at = COALESCE(?, rolled_back_at),
          rejected_at = COALESCE(?, rejected_at),
          previous_value = COALESCE(?, previous_value),
          predicted_impact = COALESCE(?, predicted_impact),
          actual_outcome_verified_at = COALESCE(?, actual_outcome_verified_at),
          verification_result = COALESCE(?, verification_result)
      WHERE id = ?
    `).run(
      status,
      extras.evalReport ?? null,
      extras.approvedAt ?? null,
      extras.appliedAt ?? null,
      extras.rolledBackAt ?? null,
      extras.rejectedAt ?? null,
      typeof extras.previousValue === 'undefined' ? null : JSON.stringify(extras.previousValue),
      typeof extras.predictedImpact === 'undefined' ? null : JSON.stringify(extras.predictedImpact),
      extras.actualOutcomeVerifiedAt ?? null,
      typeof extras.verificationResult === 'undefined' ? null : JSON.stringify(extras.verificationResult),
      id
    );
  }

  approve(id: string): void {
    const proposal = this.requireProposal(id);
    if (proposal.status !== 'passed_eval') {
      throw new Error(`Proposal ${id} must be passed_eval before approve`);
    }

    this.updateStatus(id, 'approved', { approvedAt: Date.now() });
  }

  apply(id: string, previousValue: unknown): void {
    const proposal = this.requireProposal(id);
    if (proposal.status !== 'approved') {
      throw new Error(`Proposal ${id} must be approved before apply`);
    }

    this.updateStatus(id, 'applied', {
      appliedAt: Date.now(),
      previousValue
    });
  }

  rollback(id: string): void {
    const proposal = this.requireProposal(id);
    if (proposal.status !== 'applied') {
      throw new Error(`Proposal ${id} must be applied before rollback`);
    }

    this.updateStatus(id, 'rolled_back', { rolledBackAt: Date.now() });
  }

  reject(id: string): void {
    this.requireProposal(id);
    this.updateStatus(id, 'rejected', { rejectedAt: Date.now() });
  }

  private mapRow(row: ProposalRow): PolicyProposal {
    return {
      id: row.id,
      proposedAt: row.proposed_at,
      category: row.category,
      summary: row.summary,
      evidence: this.parseJson(row.evidence),
      suggestedChange: this.parseJson(row.suggested_change),
      status: row.status,
      evalReport: row.eval_report ?? undefined,
      approvedAt: row.approved_at ?? undefined,
      appliedAt: row.applied_at ?? undefined,
      rolledBackAt: row.rolled_back_at ?? undefined,
      rejectedAt: row.rejected_at ?? undefined,
      previousValue: row.previous_value === null ? undefined : this.parseJson(row.previous_value),
      evalPlan: this.parseEvalPlan(row.eval_plan),
      riskLevel: row.risk_level ?? DEFAULT_RISK_LEVEL,
      applyMode: row.apply_mode ?? DEFAULT_APPLY_MODE,
      predictedImpact: row.predicted_impact ? this.parseJson(row.predicted_impact) : undefined,
      actualOutcomeVerifiedAt: row.actual_outcome_verified_at ?? undefined,
      verificationResult: row.verification_result ? this.parseJson(row.verification_result) : undefined
    };
  }

  private ensureColumn(columnName: string, alterSql: string): void {
    const columns = this.db.prepare('PRAGMA table_info(meta_proposals)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === columnName)) {
      this.db.exec(alterSql);
    }
  }

  private parseEvalPlan(value: string | null): EvalSuiteName[] {
    if (!value) {
      return DEFAULT_EVAL_PLAN;
    }

    try {
      const parsed = JSON.parse(value) as EvalSuiteName[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EVAL_PLAN;
    } catch {
      return DEFAULT_EVAL_PLAN;
    }
  }

  private parseJson<T>(value: string): T {
    return JSON.parse(value) as T;
  }

  private requireProposal(id: string): PolicyProposal {
    const proposal = this.get(id);
    if (!proposal) {
      throw new Error(`Unknown proposal: ${id}`);
    }

    return proposal;
  }
}

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
export class ProposalApplier {
    ledger;
    traceWriter;
    workspaceDir;
    constructor(ledger, traceWriter, workspaceDir) {
        this.ledger = ledger;
        this.traceWriter = traceWriter;
        this.workspaceDir = workspaceDir;
    }
    async apply(proposalId) {
        const proposal = this.ledger.get(proposalId);
        if (!proposal) {
            throw new Error(`Unknown proposal: ${proposalId}`);
        }
        if (proposal.status !== 'approved') {
            throw new Error('Must be approved before apply');
        }
        if (proposal.applyMode === 'config') {
            const target = resolve(this.workspaceDir, 'agent-brain.config.json');
            const file = Bun.file(target);
            const previousValue = await file.exists()
                ? JSON.parse(await file.text())
                : {};
            const merged = {
                ...(previousValue && typeof previousValue === 'object' && !Array.isArray(previousValue) ? previousValue : {}),
                ...proposal.suggestedChange
            };
            await Bun.write(target, JSON.stringify(merged, null, 2));
            this.ledger.apply(proposalId, previousValue);
            this.traceWriter.emit({
                eventType: 'proposal.apply',
                payload: {
                    proposalId,
                    applyMode: 'config',
                    target
                }
            });
            return {
                proposalId,
                applyMode: 'config',
                target,
                previousValue,
                skippedTrace: false
            };
        }
        const target = resolve(this.workspaceDir, 'proposals', `${proposalId}.patch`);
        mkdirSync(resolve(this.workspaceDir, 'proposals'), { recursive: true });
        await Bun.write(target, JSON.stringify(proposal.suggestedChange, null, 2));
        this.ledger.apply(proposalId, null);
        return {
            proposalId,
            applyMode: 'patch_only',
            target,
            previousValue: null,
            skippedTrace: true
        };
    }
    async rollback(proposalId) {
        const proposal = this.ledger.get(proposalId);
        if (!proposal) {
            throw new Error(`Unknown proposal: ${proposalId}`);
        }
        if (proposal.status !== 'applied') {
            throw new Error(`Proposal ${proposalId} must be applied before rollback`);
        }
        if (proposal.applyMode === 'patch_only') {
            this.ledger.rollback(proposalId);
            this.traceWriter.emit({
                eventType: 'proposal.rollback',
                payload: {
                    proposalId,
                    applyMode: 'patch_only'
                }
            });
            return;
        }
        const target = resolve(this.workspaceDir, 'agent-brain.config.json');
        await Bun.write(target, JSON.stringify(proposal.previousValue ?? {}, null, 2));
        this.ledger.rollback(proposalId);
        this.traceWriter.emit({
            eventType: 'proposal.rollback',
            payload: {
                proposalId,
                applyMode: 'config',
                target
            }
        });
    }
}

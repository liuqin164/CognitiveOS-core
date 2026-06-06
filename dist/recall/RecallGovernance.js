export function isRecallableMemoryEvidence(neuron) {
    if (!neuron)
        return false;
    if (isOperationalNoiseMemoryEvidence(neuron))
        return false;
    if (isImportedSummarySupportMemoryEvidence(neuron))
        return false;
    const status = neuron.metadata.status ?? 'active';
    if (status === 'active' || status === 'cold')
        return true;
    if (status === 'suspect')
        return isRawUserUtteranceEvidence(neuron);
    return false;
}
export function recallGovernanceReasonsFor(neuron) {
    const reasons = [];
    const status = neuron.metadata.status ?? 'active';
    if (isRawUserUtteranceEvidence(neuron)) {
        reasons.push('provenance:raw_user_utterance');
        if (status === 'suspect')
            reasons.push('governance:allowed_suspect_raw_evidence');
    }
    return reasons;
}
export function recallSuppressionReasonFor(neuron) {
    if (!neuron)
        return undefined;
    if (isOperationalNoiseMemoryEvidence(neuron))
        return 'operational_noise';
    if (isImportedSummarySupportMemoryEvidence(neuron))
        return 'imported_summary_support';
    const status = neuron.metadata.status ?? 'active';
    if (status === 'active' || status === 'cold')
        return undefined;
    if (status === 'suspect' && isRawUserUtteranceEvidence(neuron))
        return undefined;
    if (status === 'archived')
        return 'archived';
    if (status === 'suspect' && neuron.metadata.sourceType === 'llm_inference')
        return 'suspect_llm_inference';
    if (status === 'suspect' && neuron.metadata.sourceType === 'external_tool')
        return 'suspect_external_tool_observation';
    if (status === 'suspect')
        return 'suspect_unverified_claim';
    return 'non_recallable_status';
}
export function isRawUserUtteranceEvidence(neuron) {
    const tags = neuron.metadata.tags || [];
    return neuron.metadata.sourceType === 'user_input'
        && tags.includes('reliability:raw_utterance')
        && tags.includes('role:user')
        && (tags.includes('record:raw_utterance') || tags.includes('record:conversation_message'));
}
export function isOperationalNoiseMemoryEvidence(neuron) {
    const tags = neuron.metadata.tags || [];
    if (tags.some((tag) => (tag === 'operational_noise'
        || tag === 'record:heartbeat'
        || tag === 'system:heartbeat'
        || tag === 'routine:heartbeat'))) {
        return true;
    }
    return isOperationalNoiseText(neuron.content);
}
export function isImportedSummarySupportMemoryEvidence(neuron) {
    const tags = neuron.metadata.tags || [];
    return tags.includes('governance:imported_summary_support')
        || (tags.includes('source_class:daily_memory')
            && tags.includes('provenance:imported_summary'));
}
export function isOperationalNoiseText(text) {
    const normalized = String(text || '').trim().toLowerCase();
    if (!normalized)
        return false;
    return [
        /\[openclaw heartbeat poll\]/i,
        /^heartbeat_ok$/i,
        /\bheartbeat_ok\b/i,
        /\bheartbeat poll\b/i,
        /please complete your identity setup/i,
        /test your telegram bot by searching for it/i,
        /\broutine system ping\b/i,
    ].some((pattern) => pattern.test(normalized));
}

export class EvidenceFusionRanker {
    rank(inputs, limit = 120) {
        const scoreByNeuron = new Map();
        const reasonsByNeuronId = new Map();
        for (const input of inputs) {
            scoreByNeuron.set(input.neuronId, (scoreByNeuron.get(input.neuronId) || 0) + input.score);
            const reasons = reasonsByNeuronId.get(input.neuronId) || [];
            reasons.push(`${input.source}:${input.reason}`);
            reasonsByNeuronId.set(input.neuronId, reasons);
        }
        const neuronIds = Array.from(scoreByNeuron.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([neuronId]) => neuronId);
        return { neuronIds, reasonsByNeuronId };
    }
}

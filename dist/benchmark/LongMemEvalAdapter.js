export class LongMemEvalAdapter {
    brain;
    constructor(brain) {
        this.brain = brain;
    }
    async runDataset(datasetPath) {
        const dataset = JSON.parse(await Bun.file(datasetPath).text());
        const results = [];
        for (const session of dataset.sessions || []) {
            results.push(...await this.runSession(session));
        }
        return this.toMetrics(results);
    }
    async runSession(session) {
        const projectId = session.projectId || `longmemeval-${session.id}`;
        for (const message of session.messages || []) {
            await this.brain.ingest({
                projectId,
                type: 'chat',
                sourceType: message.role === 'user' ? 'user_input' : 'llm_inference',
                content: `${message.role}: ${message.content}`
            });
        }
        return (session.questions || []).map((question) => {
            const startedAt = Date.now();
            const recall = this.brain.recall(question.query, { projectId, limit: 8, includeRawEvidence: true });
            const recallMs = Math.max(0, Date.now() - startedAt);
            const predicted = this.renderRecallAnswer(recall);
            return {
                questionId: question.id,
                type: question.type,
                correct: this.evaluateAnswer(predicted, question.expectedAnswer),
                recallMs
            };
        });
    }
    toMetrics(results) {
        const totalQuestions = results.length;
        const correct = results.filter((result) => result.correct).length;
        const byType = new Map();
        for (const result of results) {
            byType.set(result.type, [...(byType.get(result.type) || []), result]);
        }
        const accuracyByType = {};
        for (const [type, rows] of byType) {
            accuracyByType[type] = rows.length === 0 ? 0 : rows.filter((row) => row.correct).length / rows.length;
        }
        return {
            totalQuestions,
            correct,
            accuracy: totalQuestions === 0 ? 0 : correct / totalQuestions,
            accuracyByType,
            avgRecallMs: totalQuestions === 0 ? 0 : results.reduce((sum, result) => sum + result.recallMs, 0) / totalQuestions
        };
    }
    renderRecallAnswer(recall) {
        return [
            ...recall.compiledMemory.facts.map((fact) => [fact.subject, fact.predicateValue, fact.object].filter(Boolean).join(' ')),
            ...recall.compiledMemory.events.map((event) => event.eventType),
            ...recall.rawEvidence.map((neuron) => neuron.content),
            ...recall.fallbackSnippets.map((snippet) => snippet.text)
        ].join('\n');
    }
    evaluateAnswer(predicted, expected) {
        const expectedTokens = this.answerTokens(expected);
        const predictedTokens = this.answerTokens(predicted);
        if (expectedTokens.size === 0)
            return predictedTokens.size === 0;
        if (predictedTokens.size === 0)
            return false;
        let overlap = 0;
        for (const token of expectedTokens) {
            if (predictedTokens.has(token))
                overlap++;
        }
        const precision = overlap / predictedTokens.size;
        const recall = overlap / expectedTokens.size;
        const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
        return f1 >= 0.5;
    }
    answerTokens(text) {
        const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'and', 'or', 'what', 'did', 'user', 'about']);
        return new Set(text.toLowerCase()
            .split(/[^\p{L}\p{N}_-]+/u)
            .map((token) => token.trim())
            .filter((token) => token.length > 0 && !stopwords.has(token)));
    }
}

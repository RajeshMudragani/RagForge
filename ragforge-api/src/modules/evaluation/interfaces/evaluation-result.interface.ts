export interface EvaluationResult {
    retrievalPrecision: number;
    answerRelevance: number;
    groundedness: number;
    overallScore: number;
}
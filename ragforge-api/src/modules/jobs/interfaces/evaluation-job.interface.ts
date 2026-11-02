export interface EvaluationJobData {
    tenantId: string;
    question: string;
    expectedAnswer: string;
    topK: number;
    generatedAnswer?: string;
}
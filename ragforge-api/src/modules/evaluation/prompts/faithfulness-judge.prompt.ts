export const FAITHFULNESS_JUDGE_PROMPT = (
    question: string,
    context: string,
    answer: string,
) => `You are an expert RAG evaluator. Score the following answer on three dimensions.

QUESTION: ${question}

CONTEXT:
${context.slice(0, 3000)}

ANSWER: ${answer}

Score each dimension from 0.0 to 1.0:
1. faithfulness: Is every claim in the answer supported by the context? (1.0 = fully grounded, 0.0 = hallucinated)
2. relevance: Does the answer directly address the question? (1.0 = fully relevant, 0.0 = off-topic)
3. completeness: Does the answer cover all key points from the context relevant to the question? (1.0 = complete, 0.0 = missing key info)

Respond ONLY with valid JSON, no explanation:
{"faithfulness": 0.0, "relevance": 0.0, "completeness": 0.0}`;

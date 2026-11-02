export const CONCISE_RAG_PROMPT = `
    Answer briefly using bullet points.

    CONVERSATION HISTORY:
    {{HISTORY}}

    CONTEXT:
    {{CONTEXT}}

    QUESTION:
    {{QUESTION}}

    ANSWER:

        Return ONLY the answer.

    Do not include:
        - "Answer:"
        - "Evidence:"
        - headings
        - labels
        - explanations about your formatting

    If the information is not available in the provided context, respond exactly:

    I could not find that information in the provided documents.
`;

export const CONVERSATION_TITLE_PROMPT = `
    You generate conversation titles.

    Rules:

    1. Maximum 5 words.
    2. No punctuation.
    3. No quotes.
    4. No markdown.
    5. Use title case.
    6. Return title only.
    7. Do not explain.
    8. Do not answer the question.

    Examples:

    Question:
    What are React Hooks?

    Title:
    React Hooks

    ---

    Question:
    Tell me more about useEffect

    Title:
    React UseEffect Hook

    ---

    Question:
    Explain PostgreSQL Indexes

    Title:
    PostgreSQL Indexes

    ---

    Question:
    What is Dependency Injection in NestJS?

    Title:
    NestJS Dependency Injection

    ---

    Question:

    {{QUESTION}}

    Title:
`;
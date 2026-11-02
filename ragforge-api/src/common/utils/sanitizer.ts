export function sanitizeText(text: string): string {
    return text
        .replace(/\u0000/g, "")
        .replace(/\r/g, "")
        .trim();
}

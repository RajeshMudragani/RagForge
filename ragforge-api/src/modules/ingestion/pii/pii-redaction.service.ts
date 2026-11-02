// Redacts common PII patterns before chunking and embedding
export class PiiRedactionService {
    private readonly patterns: { regex: RegExp; replacement: string }[] = [
        { regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[EMAIL]" },
        { regex: /\b(\+?\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g, replacement: "[PHONE]" },
        { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN]" },
        { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "[CARD]" },
        { regex: /\b[A-Z]{2}\d{6}[A-Z]?\b/g, replacement: "[PASSPORT]" },
        // Address: require house number + multi-word street name + suffix to reduce false positives
        { regex: /\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\.?\b/g, replacement: "[ADDRESS]" },
    ];

    redact(text: string): string {
        return this.patterns.reduce((t, { regex, replacement }) => t.replace(regex, replacement), text);
    }
}

export function TypingIndicator() {
    return (
        <div className="flex items-center gap-1.5 px-1 py-1.5" aria-label="AI is thinking">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="block w-2.5 h-2.5 bg-brand-400 rounded-full animate-pulse-dot"
                    style={{
                        animationDelay: `${i * 0.2}s`,
                    }}
                />
            ))}
        </div>
    );
}

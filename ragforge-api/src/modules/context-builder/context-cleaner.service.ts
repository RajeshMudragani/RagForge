export class ContextCleanerService {

    clean(
        content: string,
    ): string {

        return content
            .replace(
                /-- \d+ of \d+ --/g,
                "",
            )
            .replace(
                /\n\d+\n/g,
                "\n",
            )
            .replace(
                /\s+/g,
                " ",
            )
            .trim();
    }
}
import { ContextSource } from "./context-source.interface.js";

export interface BuiltContext {
    context: string;
    sources: ContextSource[];
}
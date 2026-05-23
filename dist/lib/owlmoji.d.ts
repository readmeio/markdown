import type { Gemoji } from 'gemoji';
export declare const owlmoji: {
    emoji: string;
    names: string[];
    tags: string[];
    description: string;
    category: string;
}[];
export default class Owlmoji {
    static kind: (name: string) => "gemoji" | "fontawesome" | "owlmoji";
    static nameToEmoji: Record<string, string>;
    static owlmoji: Gemoji[];
}

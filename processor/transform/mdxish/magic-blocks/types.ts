export interface MdastNode {
  [key: string]: unknown;
  children?: MdastNode[];
  type: string;
}

/**
 * Base interface for magic block JSON data.
 */
export interface MagicBlockJson {
  [key: string]: unknown;
  sidebar?: boolean;
}

export interface CodeBlockJson extends MagicBlockJson {
  codes: { code: string; language: string; name?: string }[];
}

export interface ApiHeaderJson extends MagicBlockJson {
  level?: number;
  title?: string;
}

export interface ImageBlockJson extends MagicBlockJson {
  images: {
    align?: string;
    border?: boolean;
    caption?: string;
    image?: [string, string?, string?];
    sizing?: string;
  }[];
}

export interface CalloutJson extends MagicBlockJson {
  body?: string;
  icon?: string;
  title?: string;
  type?: string | [string, string];
}

export interface ParametersJson extends MagicBlockJson {
  align?: string[];
  cols: number;
  data: Record<string, string>;
  rows: number;
}

export interface EmbedJson extends MagicBlockJson {
  html?: boolean;
  provider?: string;
  title?: string | null;
  url: string;
}

export interface HtmlJson extends MagicBlockJson {
  html: string;
}

export interface RecipeJson extends MagicBlockJson {
  backgroundColor?: string;
  emoji?: string;
  id?: string;
  link?: string;
  slug: string;
  title: string;
}

export interface MagicBlockTransformerOptions {
  compatibilityMode?: boolean;
  safeMode?: boolean;
}

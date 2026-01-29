import type { RootContent } from 'mdast';
import type { Position } from 'unist';

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

/**
 * Magic block image node structure (output from magicBlockTransformer).
 * This is an intermediate format before conversion to ImageBlock.
 */
export interface MagicBlockImage {
  alt?: string;
  data?: {
    hProperties?: {
      align?: string;
      border?: string;
      width?: string;
    };
  };
  position?: Position;
  title?: string;
  type: 'image';
  url?: string;
}

/**
 * Magic block embed node structure (output from magicBlockTransformer).
 * This is an intermediate format before conversion to EmbedBlock.
 */
export interface MagicBlockEmbed {
  children?: RootContent[];
  data?: {
    hName?: string;
    hProperties?: {
      favicon?: string;
      href?: string;
      html?: string;
      image?: string;
      provider?: string;
      providerName?: string;
      providerUrl?: string;
      title?: string;
      url?: string;
    };
  };
  position?: Position;
  type: 'embed';
}

/**
 * Figure node that may contain an image (from magicBlockTransformer with caption).
 * This is an intermediate format before conversion to Figure.
 */
export interface MagicBlockFigure {
  children: RootContent[];
  data?: {
    hName?: string;
  };
  position?: Position;
  type: 'figure';
}

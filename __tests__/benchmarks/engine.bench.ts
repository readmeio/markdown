/* eslint-disable vitest/consistent-test-it */
import { bench, describe } from 'vitest';

import { mdast, mdx, mdxish, mix } from '../../lib';

const simpleMarkdown = `
# Hello World

This is a simple paragraph with **bold** and *italic* text.

- List item 1
- List item 2
- List item 3
`;

const codeBlockMarkdown = `
# Code Examples

Here's some JavaScript:

\`\`\`javascript
function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
\`\`\`

And some TypeScript:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const getUser = async (id: number): Promise<User> => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
};
\`\`\`
`;

const tableMarkdown = `
# Data Tables

| Feature | MDX | MDXish |
|---------|-----|--------|
| JSX Support | Full | Partial |
| Performance | Moderate | Fast |
| Bundle Size | Large | Small |
| Compatibility | High | High |

## Complex Table

| Name | Description | Status | Priority |
|------|-------------|--------|----------|
| Task 1 | Implement feature A | Done | High |
| Task 2 | Fix bug in module B | In Progress | Critical |
| Task 3 | Write documentation | Pending | Medium |
| Task 4 | Code review | Pending | Low |
`;

const calloutMarkdown = `
# Callouts Example

> 👍 Success
>
> This operation completed successfully.

> 📘 Info
>
> Here is some useful information for you.

> 🚧 Warning
>
> Please be careful with this operation.

> ❗ Error
>
> Something went wrong. Please try again.

<Callout theme="info">
This is an MDX-style callout component.
</Callout>
`;

const componentMarkdown = `
# Component Examples

<Image src="https://example.com/image.png">
  Image caption here
</Image>

<Code>
const greeting = "Hello, World!";
console.log(greeting);
</Code>

<Tabs>
  <Tab title="JavaScript">
    console.log("Hello from JS");
  </Tab>
  <Tab title="Python">
    print("Hello from Python")
  </Tab>
</Tabs>
`;

const mixedContentMarkdown = `
---
title: Mixed Content Document
category: examples
---

# Getting Started

Welcome to our documentation! This guide will help you get started.

## Installation

\`\`\`bash
npm install @readme/markdown
\`\`\`

## Basic Usage

Here's a simple example:

\`\`\`javascript
import { mdxish, renderMdxish } from '@readme/markdown';

const markdown = '# Hello World';
const hast = mdxish(markdown);
const component = renderMdxish(hast);
\`\`\`

> 📘 Note
>
> Make sure you have Node.js 18 or higher installed.

## Features

| Feature | Description |
|---------|-------------|
| Fast | Optimized for performance |
| Flexible | Supports custom components |
| TypeScript | Full type support |

## API Reference

### \`mdxish(markdown, options)\`

Processes markdown content with MDX syntax support.

**Parameters:**
- \`markdown\` (string): The markdown content to process
- \`options\` (object): Configuration options
  - \`components\`: Custom component definitions
  - \`useTailwind\`: Enable Tailwind CSS support

**Returns:** HAST tree

<Callout theme="warning">
This API is subject to change in future versions.
</Callout>

## Examples

### Simple Text

Just write plain markdown and it will be rendered.

### Code Blocks

\`\`\`typescript
interface Options {
  components?: Record<string, Component>;
  useTailwind?: boolean;
}
\`\`\`

### Lists

1. First item
2. Second item
3. Third item

- Bullet point
- Another point
  - Nested point
  - Another nested

## Conclusion

That's it! You're ready to start using the library.
`;

// Generate large document by repeating content
const generateLargeDocument = (repetitions: number): string => {
  const sections = [simpleMarkdown, codeBlockMarkdown, tableMarkdown, calloutMarkdown];
  let result = '---\ntitle: Large Document\n---\n\n';

  for (let i = 0; i < repetitions; i += 1) {
    result += `\n## Section ${i + 1}\n\n`;
    result += sections[i % sections.length];
  }

  return result;
};

const mediumDocument = generateLargeDocument(5);
const largeDocument = generateLargeDocument(20);
const extraLargeDocument = generateLargeDocument(100);
const extraExtraLargeDocument = generateLargeDocument(1000);

// ============================================================================
// Benchmark Tests - Parse-only (AST trees)
// ============================================================================

describe('Parse-only Benchmarks (AST trees)', () => {
  /**
   * Basic markdown: headings, paragraphs, emphasis, lists
   * Tests baseline parsing performance with minimal transformations.
   * Comparing: mdast() (MDAST tree) vs mdxish() (HAST tree)
   */
  describe('Simple Markdown', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(simpleMarkdown);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(simpleMarkdown);
    });
  });

  /**
   * Fenced code blocks with language hints.
   * Tests syntax highlighting metadata handling.
   */
  describe('Code Blocks', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(codeBlockMarkdown);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(codeBlockMarkdown);
    });
  });

  /**
   * GFM tables with alignment.
   * MDXish has optimized table handling vs MDX's JSX conversion.
   */
  describe('Tables', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(tableMarkdown);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(tableMarkdown);
    });
  });

  /**
   * Emoji-based callouts and MDX Callout components.
   * Tests custom block transformation pipelines.
   */
  describe('Callouts', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(calloutMarkdown);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(calloutMarkdown);
    });
  });

  /**
   * Custom JSX components (Image, Code, Tabs).
   * Tests component detection and rendering overhead.
   */
  describe('Components', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(componentMarkdown);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(componentMarkdown);
    });
  });

  /**
   * Real-world documentation: frontmatter, code, tables, callouts, lists.
   * Most representative of actual usage patterns.
   */
  describe('Mixed Content', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(mixedContentMarkdown);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(mixedContentMarkdown);
    });
  });

  /**
   * ~5 repeated sections (~2KB).
   * Tests scaling behavior with moderate document size.
   */
  describe('Medium Document (~5 sections)', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(mediumDocument);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(mediumDocument);
    });
  });

  /**
   * ~20 repeated sections (~8KB).
   * Tests performance at scale for long-form content.
   */
  describe('Large Document (~20 sections)', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(largeDocument);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(largeDocument);
    });
  });

  /**
   * ~100 repeated sections (~40KB).
   * Stress test for very large documents.
   */
  describe('Extra Large Document (~100 sections)', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(extraLargeDocument);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(extraLargeDocument);
    });
  });

  /**
   * ~1000 repeated sections (~400KB).
   * Extreme stress test for very large documents.
   */
  describe('Extra Extra Large Document (~1000 sections)', () => {
    bench('mdxish parse (HAST)', () => {
      mdxish(extraExtraLargeDocument);
    });

    bench('mdast parse (MDAST)', () => {
      mdast(extraExtraLargeDocument);
    });
  });
});

// ============================================================================
// Benchmark Tests - String Outputs
// ============================================================================

describe('String Output Benchmarks', () => {
  /**
   * Basic markdown: headings, paragraphs, emphasis, lists
   * Tests full pipeline: parse + transform + stringify
   * Comparing: mdx(mdast()) (MDX string) vs mix() (HTML string)
   */
  describe('Simple Markdown', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(simpleMarkdown);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(simpleMarkdown);
      mdx(tree);
    });
  });

  /**
   * Fenced code blocks with language hints.
   * Tests syntax highlighting metadata handling.
   */
  describe('Code Blocks', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(codeBlockMarkdown);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(codeBlockMarkdown);
      mdx(tree);
    });
  });

  /**
   * GFM tables with alignment.
   * MDXish has optimized table handling vs MDX's JSX conversion.
   */
  describe('Tables', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(tableMarkdown);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(tableMarkdown);
      mdx(tree);
    });
  });

  /**
   * Emoji-based callouts and MDX Callout components.
   * Tests custom block transformation pipelines.
   */
  describe('Callouts', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(calloutMarkdown);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(calloutMarkdown);
      mdx(tree);
    });
  });

  /**
   * Custom JSX components (Image, Code, Tabs).
   * Tests component detection and rendering overhead.
   */
  describe('Components', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(componentMarkdown);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(componentMarkdown);
      mdx(tree);
    });
  });

  /**
   * Real-world documentation: frontmatter, code, tables, callouts, lists.
   * Most representative of actual usage patterns.
   */
  describe('Mixed Content', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(mixedContentMarkdown);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(mixedContentMarkdown);
      mdx(tree);
    });
  });

  /**
   * ~5 repeated sections (~2KB).
   * Tests scaling behavior with moderate document size.
   */
  describe('Medium Document (~5 sections)', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(mediumDocument);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(mediumDocument);
      mdx(tree);
    });
  });

  /**
   * ~20 repeated sections (~8KB).
   * Tests performance at scale for long-form content.
   */
  describe('Large Document (~20 sections)', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(largeDocument);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(largeDocument);
      mdx(tree);
    });
  });

  /**
   * ~100 repeated sections (~40KB).
   * Stress test for very large documents.
   */
  describe('Extra Large Document (~100 sections)', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(extraLargeDocument);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(extraLargeDocument);
      mdx(tree);
    });
  });

  /**
   * ~1000 repeated sections (~400KB).
   * Extreme stress test for very large documents.
   */
  describe('Extra Extra Large Document (~1000 sections)', () => {
    bench('mdxish string (HTML via mix)', () => {
      mix(extraExtraLargeDocument);
    });

    bench('mdx string (MDX via mdast)', () => {
      const tree = mdast(extraExtraLargeDocument);
      mdx(tree);
    });
  });
});

/**
 * MDXish-specific option benchmarks.
 * Tests overhead of optional features like Tailwind CSS processing.
 * Note: These compare MDXish configurations, not MDX vs MDXish.
 */
describe('MDXish Configuration Benchmarks', () => {
  describe('Tailwind Impact', () => {
    bench('mdxish - with Tailwind enabled', () => {
      mdxish(mixedContentMarkdown, { useTailwind: true });
    });

    bench('mdxish - without Tailwind (default)', () => {
      mdxish(mixedContentMarkdown, {});
    });
  });
});

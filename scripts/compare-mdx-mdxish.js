// Script for comparing MDX vs MDXish performance on large documents
/* eslint-disable no-console */
const { Blob } = require('node:buffer');

const rdmd = require('..');

/**
 * Create a plain markdown document of approximately the target byte size
 * Uses safe markdown that works with both MDX and MDXish
 */
const createLargeDoc = (targetBytes) => {
  // Use only plain markdown features - no MDX expressions or JSX components
  const plainMarkdown = `
# Performance Test Document

This is a large markdown document used for performance testing of MDX and MDXish processors.

## Introduction

Markdown is a lightweight markup language that you can use to add formatting elements to plaintext text documents. Created by John Gruber in 2004, Markdown is now one of the world's most popular markup languages.

## Features

Markdown supports various formatting features:

- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- \`Inline code\` for code snippets
- [Links](https://example.com) to external resources
- Images with alt text

## Code Blocks

Here are some code examples in different languages:

\`\`\`javascript
function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("World"));
\`\`\`

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
\`\`\`

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): Promise<User> {
  return fetch(\`/api/users/\${id}\`).then(res => res.json());
}
\`\`\`

## Tables

Markdown tables are useful for displaying structured data:

| Feature | Status | Priority |
|---------|--------|----------|
| Feature A | Complete | High |
| Feature B | In Progress | Medium |
| Feature C | Planned | Low |

| Language | Year | Creator |
|----------|------|---------|
| JavaScript | 1995 | Brendan Eich |
| Python | 1991 | Guido van Rossum |
| TypeScript | 2012 | Microsoft |

## Lists

### Ordered Lists

1. First item
2. Second item
3. Third item
   1. Nested item one
   2. Nested item two
4. Fourth item

### Unordered Lists

- Item one
- Item two
  - Nested bullet
  - Another nested bullet
- Item three

## Blockquotes

> This is a blockquote. It can contain multiple paragraphs.
>
> And continue on multiple lines with proper formatting.

> Another blockquote with **bold** and *italic* text inside.

## Paragraphs

This is a paragraph with some text. It contains multiple sentences to demonstrate paragraph formatting. Each sentence adds to the overall content and helps create a realistic document structure.

Another paragraph follows with different content. This helps test how the processors handle multiple paragraphs and spacing between them.

## Headings

### Level 3 Heading

#### Level 4 Heading

##### Level 5 Heading

###### Level 6 Heading

## More Content

This section contains additional content to increase the document size. The content includes various markdown elements to test comprehensive processing capabilities.

### Subsection One

Content in subsection one with various formatting elements.

### Subsection Two

Content in subsection two with code examples and lists.

### Subsection Three

Content in subsection three with tables and blockquotes.
`;

  let doc = '';
  let repetition = 0;
  const targetSize = targetBytes;
  
  while (new Blob([doc]).size < targetSize) {
    // Add repetition number to make each section unique
    const numberedContent = plainMarkdown.replace(/# Performance Test Document/g, 
      `# Performance Test Document - Part ${repetition + 1}`);
    doc += numberedContent;
    doc += '\n\n---\n\n';
    repetition += 1;
    
    // Safety check
    if (repetition > 500) break;
  }
  
  return doc;
};

// https://stackoverflow.com/a/14919494
function humanFileSize(bytesInput, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;
  const bytes = bytesInput;

  if (Math.abs(bytes) < thresh) {
    return `${bytes} B`;
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;
  let size = bytes;

  do {
    size /= thresh;
    u += 1;
  } while (Math.round(Math.abs(size) * r) / r >= thresh && u < units.length - 1);

  return `${size.toFixed(dp)} ${units[u]}`;
}

/**
 * Benchmark a function and return timing and result info
 */
function benchmark(name, fn) {
  try {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    
    // Calculate result size
    let resultSize = 0;
    if (typeof result === 'string') {
      resultSize = new Blob([result]).size;
    } else if (result && typeof result === 'object') {
      // For HAST tree, estimate size from JSON
      try {
        resultSize = new Blob([JSON.stringify(result)]).size;
      } catch {
        // If JSON.stringify fails, estimate from object keys
        resultSize = Object.keys(result).length * 100;
      }
    }
    
    return {
      name,
      duration,
      resultSize,
      result,
      error: null,
    };
  } catch (error) {
    return {
      name,
      duration: 0,
      resultSize: 0,
      result: null,
      error: error.message || String(error),
    };
  }
}

/**
 * Format a table row
 */
function formatTableRow(columns, widths) {
  const padded = columns.map((col, i) => String(col).padEnd(widths[i]));
  return `| ${padded.join(' | ')} |`;
}

/**
 * Print a formatted table
 */
function printTable(headers, rows) {
  const widths = headers.map((h, i) => {
    const maxContent = Math.max(
      h.length,
      ...rows.map(row => String(row[i] || '').length)
    );
    return Math.max(maxContent, 10);
  });

  const separator = `|${widths.map(w => '-'.repeat(w + 2)).join('|')}|`;

  console.log(formatTableRow(headers, widths));
  console.log(separator);
  rows.forEach(row => {
    console.log(formatTableRow(row, widths));
  });
}

// Document sizes to test
const documentSizes = [
  { name: 'Large', size: 50 * 1024, description: '~50KB' },
  { name: 'Extra Large', size: 400 * 1024, description: '~400KB' },
  { name: 'Extra Extra Large', size: 4 * 1024 * 1024, description: '~4MB' },
];

/**
 * Run benchmarks for a specific document size and return results
 */
function runBenchmarkForSize(sizeConfig) {
  const { name, size, description } = sizeConfig;
  const doc = createLargeDoc(size);
  const actualSize = new Blob([doc]).size;

  // Warm up runs
  for (let i = 0; i < 3; i += 1) {
    try {
      rdmd.mdast(doc);
      rdmd.mdxish(doc);
      const tree = rdmd.mdast(doc);
      rdmd.mdx(tree);
      rdmd.mix(doc);
    } catch {
      // Ignore warm-up errors
    }
  }

  // Single run benchmarks
  const mdastParseResult = benchmark('MDAST parse', () => {
    return rdmd.mdast(doc);
  });

  const mdxishParseResult = benchmark('MDXish parse (HAST)', () => {
    return rdmd.mdxish(doc);
  });

  const mdxResult = benchmark('MDX (via mdast)', () => {
    const tree = rdmd.mdast(doc);
    return rdmd.mdx(tree);
  });

  const mdxishStringResult = benchmark('MDXish (via mix - HTML)', () => {
    return rdmd.mix(doc);
  });

  // Multiple iterations for averages
  const iterations = 10;
  const mdastParseTimes = [];
  const mdxishParseTimes = [];
  const mdxStringTimes = [];
  const mdxishStringTimes = [];

  for (let i = 0; i < iterations; i += 1) {
    const mdastParse = benchmark('MDAST parse', () => {
      return rdmd.mdast(doc);
    });
    
    const mdxishParse = benchmark('MDXish parse', () => {
      return rdmd.mdxish(doc);
    });
    
    const mdxString = benchmark('MDX string', () => {
      const tree = rdmd.mdast(doc);
      return rdmd.mdx(tree);
    });
    
    const mdxishString = benchmark('MDXish string', () => {
      return rdmd.mix(doc);
    });
    
    if (!mdastParse.error) {
      mdastParseTimes.push(mdastParse.duration);
    }
    if (!mdxishParse.error) {
      mdxishParseTimes.push(mdxishParse.duration);
    }
    if (!mdxString.error) {
      mdxStringTimes.push(mdxString.duration);
    }
    if (!mdxishString.error) {
      mdxishStringTimes.push(mdxishString.duration);
    }
  }

  // Calculate averages
  const avgMdast = mdastParseTimes.length > 0
    ? mdastParseTimes.reduce((a, b) => a + b, 0) / mdastParseTimes.length
    : 0;
  const avgMdxish = mdxishParseTimes.length > 0
    ? mdxishParseTimes.reduce((a, b) => a + b, 0) / mdxishParseTimes.length
    : 0;
  const avgMdx = mdxStringTimes.length > 0
    ? mdxStringTimes.reduce((a, b) => a + b, 0) / mdxStringTimes.length
    : 0;
  const avgMdxishString = mdxishStringTimes.length > 0
    ? mdxishStringTimes.reduce((a, b) => a + b, 0) / mdxishStringTimes.length
    : 0;

  return {
    name,
    description,
    documentSize: actualSize,
    singleRun: {
      parseOnly: {
        mdast: mdastParseResult,
        mdxish: mdxishParseResult,
      },
      stringOutput: {
        mdx: mdxResult,
        mdxish: mdxishStringResult,
      },
    },
    averages: {
      parseOnly: {
        mdast: {
          avg: avgMdast,
          min: mdastParseTimes.length > 0 ? Math.min(...mdastParseTimes) : 0,
          max: mdastParseTimes.length > 0 ? Math.max(...mdastParseTimes) : 0,
          successful: mdastParseTimes.length,
          total: iterations,
        },
        mdxish: {
          avg: avgMdxish,
          min: mdxishParseTimes.length > 0 ? Math.min(...mdxishParseTimes) : 0,
          max: mdxishParseTimes.length > 0 ? Math.max(...mdxishParseTimes) : 0,
          successful: mdxishParseTimes.length,
          total: iterations,
        },
      },
      stringOutput: {
        mdx: {
          avg: avgMdx,
          min: mdxStringTimes.length > 0 ? Math.min(...mdxStringTimes) : 0,
          max: mdxStringTimes.length > 0 ? Math.max(...mdxStringTimes) : 0,
          successful: mdxStringTimes.length,
          total: iterations,
        },
        mdxish: {
          avg: avgMdxishString,
          min: mdxishStringTimes.length > 0 ? Math.min(...mdxishStringTimes) : 0,
          max: mdxishStringTimes.length > 0 ? Math.max(...mdxishStringTimes) : 0,
          successful: mdxishStringTimes.length,
          total: iterations,
        },
      },
    },
  };
}

/**
 * Print all results in table format
 */
function printResults(allResults) {
  console.log(`\n${'='.repeat(100)}`);
  console.log('MDX vs MDXish Performance Comparison Results');
  console.log('='.repeat(100));

  // Single Run Results - Parse-only
  console.log('\n📊 Single Run Results: Parse-only (AST trees)');
  console.log('-'.repeat(100));
  const parseOnlySingleHeaders = ['Document Size', 'MDAST (ms)', 'MDXish (ms)', 'Faster', 'Speedup', 'Output Size (MDAST)', 'Output Size (MDXish)'];
  const parseOnlySingleRows = allResults.map(result => {
    const mdast = result.singleRun.parseOnly.mdast;
    const mdxish = result.singleRun.parseOnly.mdxish;
    const faster = mdast.error || mdxish.error
      ? 'N/A'
      : mdast.duration > mdxish.duration ? 'MDXish' : 'MDAST';
    const speedup = mdast.error || mdxish.error
      ? 'N/A'
      : `${(Math.max(mdast.duration, mdxish.duration) / Math.min(mdast.duration, mdxish.duration)).toFixed(2)}x`;
    
    return [
      `${result.name} (${result.description})`,
      mdast.error ? 'ERROR' : mdast.duration.toFixed(2),
      mdxish.error ? 'ERROR' : mdxish.duration.toFixed(2),
      faster,
      speedup,
      mdast.error ? 'N/A' : humanFileSize(mdast.resultSize),
      mdxish.error ? 'N/A' : humanFileSize(mdxish.resultSize),
    ];
  });
  printTable(parseOnlySingleHeaders, parseOnlySingleRows);

  // Single Run Results - String Output
  console.log('\n📊 Single Run Results: String Outputs');
  console.log('-'.repeat(100));
  const stringSingleHeaders = ['Document Size', 'MDX (ms)', 'MDXish (ms)', 'Faster', 'Speedup', 'Output Size (MDX)', 'Output Size (MDXish)'];
  const stringSingleRows = allResults.map(result => {
    const mdx = result.singleRun.stringOutput.mdx;
    const mdxish = result.singleRun.stringOutput.mdxish;
    const faster = mdx.error || mdxish.error
      ? 'N/A'
      : mdx.duration > mdxish.duration ? 'MDXish' : 'MDX';
    const speedup = mdx.error || mdxish.error
      ? 'N/A'
      : `${(Math.max(mdx.duration, mdxish.duration) / Math.min(mdx.duration, mdxish.duration)).toFixed(2)}x`;
    
    return [
      `${result.name} (${result.description})`,
      mdx.error ? 'ERROR' : mdx.duration.toFixed(2),
      mdxish.error ? 'ERROR' : mdxish.duration.toFixed(2),
      faster,
      speedup,
      mdx.error ? 'N/A' : humanFileSize(mdx.resultSize),
      mdxish.error ? 'N/A' : humanFileSize(mdxish.resultSize),
    ];
  });
  printTable(stringSingleHeaders, stringSingleRows);

  // Average Results - Parse-only
  console.log('\n📊 Average Results (10 iterations): Parse-only (AST trees)');
  console.log('-'.repeat(100));
  const parseOnlyAvgHeaders = ['Document Size', 'MDAST Avg (ms)', 'MDXish Avg (ms)', 'MDAST Min-Max', 'MDXish Min-Max', 'Faster', 'Speedup', 'Time Saved (ms)'];
  const parseOnlyAvgRows = allResults.map(result => {
    const mdast = result.averages.parseOnly.mdast;
    const mdxish = result.averages.parseOnly.mdxish;
    const faster = mdast.avg === 0 || mdxish.avg === 0
      ? 'N/A'
      : mdast.avg > mdxish.avg ? 'MDXish' : 'MDAST';
    const speedup = mdast.avg === 0 || mdxish.avg === 0
      ? 'N/A'
      : `${(Math.max(mdast.avg, mdxish.avg) / Math.min(mdast.avg, mdxish.avg)).toFixed(2)}x`;
    const timeSaved = mdast.avg === 0 || mdxish.avg === 0
      ? 'N/A'
      : Math.abs(mdast.avg - mdxish.avg).toFixed(2);
    
    return [
      `${result.name} (${result.description})`,
      mdast.avg === 0 ? 'N/A' : mdast.avg.toFixed(2),
      mdxish.avg === 0 ? 'N/A' : mdxish.avg.toFixed(2),
      mdast.avg === 0 ? 'N/A' : `${mdast.min}-${mdast.max}`,
      mdxish.avg === 0 ? 'N/A' : `${mdxish.min}-${mdxish.max}`,
      faster,
      speedup,
      timeSaved,
    ];
  });
  printTable(parseOnlyAvgHeaders, parseOnlyAvgRows);

  // Average Results - String Output
  console.log('\n📊 Average Results (10 iterations): String Outputs');
  console.log('-'.repeat(100));
  const stringAvgHeaders = ['Document Size', 'MDX Avg (ms)', 'MDXish Avg (ms)', 'MDX Min-Max', 'MDXish Min-Max', 'Faster', 'Speedup', 'Time Saved (ms)'];
  const stringAvgRows = allResults.map(result => {
    const mdx = result.averages.stringOutput.mdx;
    const mdxish = result.averages.stringOutput.mdxish;
    const faster = mdx.avg === 0 || mdxish.avg === 0
      ? 'N/A'
      : mdx.avg > mdxish.avg ? 'MDXish' : 'MDX';
    const speedup = mdx.avg === 0 || mdxish.avg === 0
      ? 'N/A'
      : `${(Math.max(mdx.avg, mdxish.avg) / Math.min(mdx.avg, mdxish.avg)).toFixed(2)}x`;
    const timeSaved = mdx.avg === 0 || mdxish.avg === 0
      ? 'N/A'
      : Math.abs(mdx.avg - mdxish.avg).toFixed(2);
    
    return [
      `${result.name} (${result.description})`,
      mdx.avg === 0 ? 'N/A' : mdx.avg.toFixed(2),
      mdxish.avg === 0 ? 'N/A' : mdxish.avg.toFixed(2),
      mdx.avg === 0 ? 'N/A' : `${mdx.min}-${mdx.max}`,
      mdxish.avg === 0 ? 'N/A' : `${mdxish.min}-${mdxish.max}`,
      faster,
      speedup,
      timeSaved,
    ];
  });
  printTable(stringAvgHeaders, stringAvgRows);

  console.log(`\n${'='.repeat(100)}`);
}

// Main execution
console.log('MDX vs MDXish Performance Comparison');
console.log('Running benchmarks... (this may take a while)');

// Run benchmarks for each document size and collect results
const allResults = documentSizes.map((sizeConfig, index) => {
  process.stdout.write(`\rProgress: ${index + 1}/${documentSizes.length} - ${sizeConfig.name}...`);
  return runBenchmarkForSize(sizeConfig);
});

process.stdout.write(`\r${' '.repeat(50)}\r`); // Clear progress line

// Print all results
printResults(allResults);


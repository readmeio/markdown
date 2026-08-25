import { walkTags } from './tables/tag-walker';
import { applyInserts, tableTags, type Insert } from './tables/utils';

/**
 * Containers whose bodies must stay byte-exact. htmlparser2 already treats
 * `<script>`/`<style>`/`<textarea>` bodies as raw text; these still emit inner tag events.
 */
const OPAQUE_CONTAINERS = new Set(['pre', 'textarea', 'htmlblock']);

/** The missing-slash typo shape: an attribute-less, non-self-closing opener. */
const BARE_OPENER_SOURCE_RE = /^<[A-Za-z]+\s*>$/;

interface OpenTable {
  end: number;
  hasStructureChild: boolean;
  isCandidate: boolean;
  name: string;
  start: number;
}

/** The opener shares its line with nothing but whitespace. */
const isAloneOnLine = (content: string, start: number, end: number): boolean => {
  const lineStart = content.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = content.indexOf('\n', end);
  return (
    content.slice(lineStart, start).trim() === '' &&
    content.slice(end, lineEnd === -1 ? content.length : lineEnd).trim() === ''
  );
};

/**
 * Rewrites a bare `<table>` that is almost certainly a missing-slash closer
 * (`</table>` typo) so `jsxTable` / `terminateHtmlFlowBlocks` see a real close.
 * Customer docs (CX-3850) close tables with a second bare opener; without this,
 * the never-terminated HTML flow block swallows the markdown that follows.
 *
 * A candidate is a bare opener alone on its line while a table is already open.
 * It is judged a typo only when its element ends implicitly (no explicit
 * `</table>`) without ever acquiring table-structure children — so genuine
 * nested tables, whatever precedes their rows, are left alone.
 */
export function repairMistakenTableClosers(content: string) {
  const stack: OpenTable[] = [];
  const edits: Insert[] = [];
  let opaqueDepth = 0;
  // Tables opened inside an opaque container: skipped, but their close events
  // still arrive (innermost-first) and must not pop real tables off the stack.
  let ignoredTables = 0;

  walkTags(content, {
    onOpen({ name, start, end }) {
      const lower = name.toLowerCase();
      if (OPAQUE_CONTAINERS.has(lower)) {
        opaqueDepth += 1;
      } else if (lower === 'table') {
        if (opaqueDepth > 0) {
          ignoredTables += 1;
          return;
        }
        const source = content.slice(start, end);
        stack.push({
          name,
          start,
          end,
          hasStructureChild: false,
          isCandidate:
            stack.length > 0 && BARE_OPENER_SOURCE_RE.test(source) && isAloneOnLine(content, start, end),
        });
      } else if (opaqueDepth === 0 && tableTags.has(lower) && stack.length > 0) {
        stack[stack.length - 1].hasStructureChild = true;
      }
    },
    onClose({ name, implicit }) {
      const lower = name.toLowerCase();
      if (OPAQUE_CONTAINERS.has(lower)) {
        opaqueDepth = Math.max(0, opaqueDepth - 1);
        return;
      }
      if (lower !== 'table') return;
      if (ignoredTables > 0) {
        ignoredTables -= 1;
        return;
      }
      const table = stack.pop();
      if (table?.isCandidate && implicit && !table.hasStructureChild) {
        edits.push({ offset: table.start, text: `</${table.name}>`, consumes: table.end - table.start });
      }
    },
  });

  return applyInserts(content, edits).value;
}

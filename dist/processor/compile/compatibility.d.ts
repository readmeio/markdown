import type { Html } from 'mdast';
import type { Figure } from 'types';
import { NodeTypes } from '../../enums';
interface EditorGlossary {
    children: [{
        type: 'text';
        value: string;
    }];
    data: {
        hName: 'Glossary';
        hProperties: {
            term: string;
        };
    };
    type: NodeTypes.glossary;
}
interface CompatEmbed {
    data: {
        hProperties: Record<string, string>;
    };
    html: string;
    type: 'embed';
}
type CompatNodes = CompatEmbed | EditorGlossary | Figure | Html | {
    data: {
        hProperties: {
            className: string[];
        };
    };
    type: 'i';
} | {
    tag: string;
    type: NodeTypes.reusableContent;
} | {
    type: 'escape';
    value: string;
} | {
    type: 'yaml';
    value: string;
};
declare const compatibility: (node: CompatNodes) => string;
export default compatibility;

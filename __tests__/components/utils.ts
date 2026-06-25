import type { MDXContent } from 'mdx/types';

import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';
import { createRehypeReactProcessor } from '../../lib/utils/mdxish/mdxish-render-utils';
import { execute } from '../helpers';

export const renderingEngines = [
  ['mdx', (md: string) => execute(md) as MDXContent] as const,
  ['mdxish', (md: string) => renderMdxish(mdxish(md)).default as MDXContent] as const,
];

/**
 * Substitutes `tagToProbe` with a Probe during mdxish render and returns the
 * props it received, useful for asserting prop shape independent of the component.
 */
export const captureMdxishProps = (md: string, tagToProbe: string): Record<string, unknown> => {
  let captured: Record<string, unknown> = {};
  const Probe: React.FC<Record<string, unknown>> = props => {
    captured = props;
    return null;
  };
  Probe.displayName = `Probe(${tagToProbe})`;

  const hast = mdxish(md);
  const processor = createRehypeReactProcessor({
    [tagToProbe]: Probe,
  } as Record<string, React.ComponentType>);
  const element = processor.stringify(hast) as React.ReactNode;
  render(React.createElement(React.Fragment, null, element));
  return captured;
};

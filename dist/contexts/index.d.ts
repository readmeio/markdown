import type { RunOpts } from '../lib/run';
import React from 'react';
type Props = Pick<RunOpts, 'baseUrl' | 'copyButtons' | 'terms' | 'theme' | 'variables'> & React.PropsWithChildren;
declare const Contexts: ({ children, terms, variables, baseUrl, theme, copyButtons }: Props) => React.ReactNode;
export default Contexts;

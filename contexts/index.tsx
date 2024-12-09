import React from 'react';
import GlossaryContext from './GlossaryTerms';
import BaseUrlContext from './BaseUrl';
import { RunOpts } from '../lib/run';

type Props = React.PropsWithChildren & Pick<RunOpts, 'baseUrl' | 'terms'>;

const Contexts = ({ children, terms = [], baseUrl = '/' }: Props) => {
  return (
    <GlossaryContext.Provider value={terms}>
      <BaseUrlContext.Provider value={baseUrl}>{children}</BaseUrlContext.Provider>
    </GlossaryContext.Provider>
  );
};

export default Contexts;

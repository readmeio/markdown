import { createContext } from 'react';

/** Opt-in rendering features, provided through one context instead of a context per flag. */
export interface RenderConfig {
  copyButtons?: boolean;
  mermaidControls?: boolean;
}

const RenderConfigContext = createContext<RenderConfig>({});

export default RenderConfigContext;

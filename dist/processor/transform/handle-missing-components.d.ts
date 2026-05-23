import type { CompileOpts } from '../../lib/compile';
import type { Transform } from 'mdast-util-from-markdown';
type HandleMissingComponentsProps = Pick<CompileOpts, 'components' | 'missingComponents'>;
declare const handleMissingComponents: ({ components, missingComponents }: HandleMissingComponentsProps) => Transform;
export default handleMissingComponents;

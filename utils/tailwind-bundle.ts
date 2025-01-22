import { createTailwindcss } from '@mhsdesign/jit-browser-tailwindcss';

const tailwindBundle = (html: string, config = {}, tailwindConfig = {}) => {
  const tailwind = createTailwindcss(tailwindConfig);

  const includes = ['@tailwind components;', '@tailwind utilities;'];

  if ('includeBase' in config && config.includeBase) {
    includes.unshift('@tailwind base;');
  }

  return tailwind.generateStylesFromContent(includes.join('\n'), [
    { content: "<div class='text-3xl'></div>", extension: 'html' },
  ]);
};

export default tailwindBundle;

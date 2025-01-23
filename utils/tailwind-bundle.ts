import tailwind from '@tailwindcss/postcss';
import postcss from 'postcss';

const tailwindBundle = (html: string, config = {}, tailwindConfig = {}) => {
  const includes = ['@tailwind components;', '@tailwind utilities;'];

  if ('includeBase' in config && config.includeBase) {
    includes.unshift('@tailwind base;');
  }

  const plugins = [tailwind({ ...tailwindConfig, content: [{ raw: html, extension: 'html' }] })];

  return postcss(plugins).process(includes.join('\n'), { from: undefined });
};

export default tailwindBundle;

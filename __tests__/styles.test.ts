import path from 'path';

import * as sass from 'sass';

import { describe, expect, it } from 'vitest';

import webpackConfig from '../webpack.config';

const sassLoader = webpackConfig[0].module.rules
  .flatMap(rule => (Array.isArray(rule.use) ? rule.use : []))
  .find(use => typeof use === 'object' && use.loader === 'sass-loader');

describe('stylesheet build', () => {
  // RM-19250: a BOM in compressed output lands mid-bundle once css-loader hoists the
  // `@import`s, turning the next selector (`.markdown-body img.img-align-right`) into a no-match.
  it('should not emit a BOM in the compressed bundle', () => {
    const { css } = sass.compile(path.join(__dirname, '../styles/main.scss'), {
      ...sassLoader.options.sassOptions,
      logger: sass.Logger.silent,
      style: 'compressed',
    });

    expect(css).toContain('img.img-align-right');
    expect(css).not.toContain('﻿');
    expect(css).not.toMatch(/@charset/i);
  }, 30_000);
});

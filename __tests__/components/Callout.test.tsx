import { render, screen } from '@testing-library/react';
import React from 'react';

import Callout from '../../components/Callout';

describe('Callout', () => {
  it('render _all_ its children', () => {
    render(
      <Callout icon="icon" theme="theme" title="Title">
        <p>Title</p>
        <p>First Paragraph</p>
        <p>Second Paragraph</p>
      </Callout>,
    );

    expect(screen.getByText('Second Paragraph')).toBeVisible();
  });

  it("doesn't render all its children if it's **empty**", () => {
    render(
      <Callout empty icon="icon" theme="theme">
        <p>Title</p>
        <p>First Paragraph</p>
        <p>Second Paragraph</p>
      </Callout>,
    );

    expect(screen.queryByText('Title')).toBeNull();
  });
});

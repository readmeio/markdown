import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { execute } from './helpers';

describe('import React', () => {
  it('allows importing react', async () => {
    const mdx = `
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>You clicked {count} times!</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  )
}

<Counter />
    `;

    const Content = await execute(mdx);
    render(<Content />);

    expect(screen.getByText('You clicked 0 times!')).toBeVisible();
    userEvent.click(screen.getByRole('button'));

    await waitFor(() => screen.getByText('You clicked 1 times!'));
  });
});

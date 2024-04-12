import React from 'react';
import { compile, run } from '../index';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

    const Content = await run(compile(mdx));
    render(<Content />);

    expect(screen.getByText('You clicked 0 times!')).toBeVisible();
    userEvent.click(screen.getByRole('button'));

    await waitFor(() => screen.getByText('You clicked 1 times!'));
  });
});

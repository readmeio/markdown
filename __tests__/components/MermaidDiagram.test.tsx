import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { vi } from 'vitest';

import { renderingEngines } from './utils';

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('MermaidDiagram', () => {
  const md = '```mermaid\ngraph TD\nA --> B\n```';

  it.each(renderingEngines)('%s: renders a plain diagram unless mermaidControls is set', (_label, renderContent) => {
    const Component = renderContent(md);
    const { container } = render(<Component />);

    expect(container.querySelector('.MermaidDiagram')).toBeNull();
    expect(container.querySelector('pre.mermaid-render.mermaid_single')).toHaveTextContent('graph TD');
    expect(screen.queryByRole('button')).toBeNull();
  });

  describe('zoom and pan', () => {
    const transformOf = (pre: HTMLElement) => pre.style.getPropertyValue('--MermaidDiagram-transform');
    // jsdom has no PointerEvent; React routes on the event type, so a MouseEvent carries the coordinates
    const pointer = (
      el: Element,
      type: string,
      x: number,
      y: number,
      { button = 0, pointerId = 1, pointerType = 'mouse' } = {},
    ) =>
      fireEvent(
        el,
        Object.assign(new MouseEvent(type, { bubbles: true, button, cancelable: true, clientX: x, clientY: y }), {
          pointerId,
          pointerType,
        }),
      );
    const click = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));

    const renderDiagram = (Component: React.ComponentType) => {
      const { container } = render(<Component />);
      const pre = container.querySelector<HTMLPreElement>('.MermaidDiagram > pre.mermaid-render')!;
      pre.setPointerCapture = vi.fn();
      // Stands in for the svg mermaid.run() inserts once the diagram renders
      pre.appendChild(document.createElementNS(SVG_NS, 'svg'));
      return pre;
    };

    it.each(renderingEngines)('%s: server-renders the diagram without controls', (_label, renderContent) => {
      const Component = renderContent(md, { mermaidControls: true });
      const html = renderToStaticMarkup(<Component />);

      expect(html).toMatch(/<div class="MermaidDiagram[^"]*"><pre class="mermaid-render mermaid_single">graph TD/);
      expect(html).not.toContain('<button');
    });

    it.each(renderingEngines)('%s: zooms in steps within bounds and resets', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));

      expect(pre.querySelector('button')).toBeNull();
      expect(screen.getByRole('button', { name: 'Reset view' })).toHaveAttribute('aria-disabled', 'true');

      click('Zoom in');
      expect(transformOf(pre)).toBe('translate(0px, 0px) scale(1.25)');

      click('Reset view');
      expect(transformOf(pre)).toBe('');

      Array.from({ length: 4 }).forEach(() => click('Zoom out'));
      expect(transformOf(pre)).toBe(`translate(0px, 0px) scale(${1.25 ** -3})`);
      expect(screen.getByRole('button', { name: 'Zoom out' })).toHaveAttribute('aria-disabled', 'true');

      click('Reset view');
      Array.from({ length: 9 }).forEach(() => click('Zoom in'));
      expect(transformOf(pre)).toBe(`translate(0px, 0px) scale(${1.25 ** 8})`);
      expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveAttribute('aria-disabled', 'true');
    });

    it.each(renderingEngines)('%s: drag-pans at any zoom and keeps zoom centred', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));

      expect(pointer(pre, 'pointerdown', 10, 10)).toBe(false); // default prevented, so no text selection starts
      pointer(pre, 'pointermove', 40, 30);
      pointer(pre, 'pointerup', 40, 30);
      pointer(pre, 'pointermove', 90, 90);
      expect(transformOf(pre)).toBe('translate(30px, 20px) scale(1)');
      expect(screen.getByRole('button', { name: 'Reset view' })).toHaveAttribute('aria-disabled', 'false');

      click('Zoom in');
      expect(transformOf(pre)).toBe('translate(37.5px, 25px) scale(1.25)');

      click('Zoom out');
      expect(transformOf(pre)).toBe('translate(30px, 20px) scale(1)');

      click('Reset view');
      expect(transformOf(pre)).toBe('');
    });

    it.each(renderingEngines)('%s: keeps a zoom made mid-drag', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));

      pointer(pre, 'pointerdown', 10, 10);
      pointer(pre, 'pointermove', 40, 30);
      click('Zoom in');
      pointer(pre, 'pointermove', 50, 40);
      expect(transformOf(pre)).toBe('translate(47.5px, 35px) scale(1.25)');
    });

    it.each(renderingEngines)('%s: pans with only the first pointer', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));

      pointer(pre, 'pointerdown', 10, 10, { pointerId: 1 });
      pointer(pre, 'pointerdown', 100, 100, { pointerId: 2 });
      pointer(pre, 'pointermove', 200, 200, { pointerId: 2 });
      pointer(pre, 'pointerup', 200, 200, { pointerId: 2 });
      pointer(pre, 'pointermove', 40, 30, { pointerId: 1 });
      expect(transformOf(pre)).toBe('translate(30px, 20px) scale(1)');
    });

    it.each(renderingEngines)('%s: leaves presses on labels and links to the browser', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));
      const svgLabel = pre.appendChild(document.createElementNS(SVG_NS, 'text'));
      const htmlLabel = pre
        .appendChild(document.createElementNS(SVG_NS, 'foreignObject'))
        .appendChild(document.createElement('span'));
      const link = pre.appendChild(document.createElement('a'));

      [svgLabel, htmlLabel, link].forEach(el => expect(pointer(el, 'pointerdown', 10, 10)).toBe(true));
      expect(pre.setPointerCapture).not.toHaveBeenCalled();
    });

    it.each(renderingEngines)('%s: frees the pan when the pointer is cancelled', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));

      pointer(pre, 'pointerdown', 10, 10, { pointerId: 1 });
      pointer(pre, 'pointercancel', 10, 10, { pointerId: 1 });
      pointer(pre, 'pointerdown', 10, 10, { pointerId: 2 });
      pointer(pre, 'pointermove', 40, 30, { pointerId: 2 });
      expect(transformOf(pre)).toBe('translate(30px, 20px) scale(1)');
    });

    it.each(renderingEngines)('%s: ignores non-primary buttons', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));

      expect(pointer(pre, 'pointerdown', 10, 10, { button: 2 })).toBe(true);
      expect(pre.setPointerCapture).not.toHaveBeenCalled();
    });

    it.each(renderingEngines)('%s: does not pan before mermaid has rendered', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));
      pre.querySelector('svg')!.remove();

      expect(pointer(pre, 'pointerdown', 10, 10)).toBe(true);
      expect(pre.setPointerCapture).not.toHaveBeenCalled();
    });

    it.each(renderingEngines)('%s: lets touch scroll the page until zoomed', (_label, renderContent) => {
      const pre = renderDiagram(renderContent(md, { mermaidControls: true }));
      const touch = { pointerType: 'touch' };

      pointer(pre, 'pointerdown', 10, 10, touch);
      pointer(pre, 'pointermove', 10, -40, touch);
      expect(transformOf(pre)).toBe('');

      click('Zoom in');
      pointer(pre, 'pointerdown', 10, 10, touch);
      pointer(pre, 'pointermove', 10, -40, touch);
      expect(transformOf(pre)).toBe('translate(0px, -50px) scale(1.25)');
    });
  });
});

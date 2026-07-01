import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import Embed from '../../components/Embed';
import { normalizeYouTubeUrlToEmbedUrl } from '../../components/Embed/normalizeYouTubeUrl';

import { renderingEngines } from './utils';

const youtubeEmbed = (url: string) => `<Embed title="" typeOfEmbed="youtube" url="${url}" />`;

describe('Embed', () => {
  describe('general component rendering', () => {
    it('renders a link embed with title, image, and provider', () => {
      const { container } = render(
        <Embed
          favicon="https://example.com/favicon.ico"
          image="https://example.com/preview.jpg"
          title="Example Article"
          url="https://example.com/article"
        />,
      );

      const link = container.querySelector('a.embed-link');
      expect(link).toHaveAttribute('href', 'https://example.com/article');
      expect(link).toHaveAttribute('target', '_blank');
      expect(container.querySelector('.embed-title')).toHaveTextContent('Example Article');
      expect(container.querySelector('.embed-img')).toHaveAttribute('src', 'https://example.com/preview.jpg');
      expect(container.querySelector('.embed-provider')).toHaveTextContent('example.com');
    });

    it('renders an iframe when iframe is true', () => {
      const { container } = render(
        <Embed iframe title="Demo" url="https://example.com/embed" />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toHaveAttribute('src', 'https://example.com/embed');
      expect(iframe).toHaveAttribute('title', 'Demo');
      expect(iframe).toHaveStyle({ height: '480px', width: '100%' });
    });

    it('normalizes a YouTube URL in the iframe path even without typeOfEmbed="youtube"', () => {
      const { container } = render(
        <Embed iframe title="Demo" url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />,
      );

      expect(container.querySelector('iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('normalizes a YouTube URL when typeOfEmbed is iframe', () => {
      const { container } = render(
        <Embed title="Demo" typeOfEmbed="iframe" url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />,
      );

      expect(container.querySelector('iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('leaves a non-YouTube URL untouched in the iframe path', () => {
      const { container } = render(
        <Embed iframe title="Demo" url="https://example.com/watch?v=dQw4w9WgXcQ" />,
      );

      expect(container.querySelector('iframe')).toHaveAttribute('src', 'https://example.com/watch?v=dQw4w9WgXcQ');
    });

    it('renders an iframe for iframe-derivable embed types without html', () => {
      const { container } = render(
        <Embed title="" typeOfEmbed="pdf" url="https://example.com/doc.pdf" />,
      );

      expect(container.querySelector('iframe')).toHaveAttribute('src', 'https://example.com/doc.pdf');
    });

    it('renders provided html inside embed-media', () => {
      const { container } = render(
        <Embed html="<iframe title='Map'></iframe>" title="Map" url="https://example.com/map" />,
      );

      expect(container.querySelector('.embed-media iframe')).toHaveAttribute('title', 'Map');
    });

    it('renders a fallback view link when the title is @embed', () => {
      const { container } = render(
        <Embed title="@embed" url="https://gist.github.com/foo/abc123" />,
      );

      expect(container.querySelector('.embed-body-url')).toHaveTextContent('https://gist.github.com/foo/abc123');
      expect(container.querySelector('.embed-title')).toBeNull();
    });

    it('renders a link for non-iframe-derivable embed types', () => {
      const { container } = render(
        <Embed title="" typeOfEmbed="github" url="https://gist.github.com/foo/abc123" />,
      );

      expect(container.querySelector('a.embed-link')).toHaveAttribute('href', 'https://gist.github.com/foo/abc123');
      expect(container.querySelector('iframe')).toBeNull();
    });
  });

  describe('YouTube', () => {
    describe('embeds a youtube url', () => {
      it.each(renderingEngines)('%s: renders an iframe for a watch URL', (_label, renderContent) => {
        const Content = renderContent(youtubeEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
        const { container } = render(<Content />);

        const iframe = container.querySelector('iframe');
        expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
      });

      it.each(renderingEngines)('%s: renders an iframe for a youtu.be short link', (_label, renderContent) => {
        const Content = renderContent(youtubeEmbed('https://youtu.be/dQw4w9WgXcQ'));
        const { container } = render(<Content />);

        const iframe = container.querySelector('iframe');
        expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
      });

      it.each(renderingEngines)('%s: renders an iframe for a shorts URL', (_label, renderContent) => {
        const Content = renderContent(youtubeEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ'));
        const { container } = render(<Content />);

        const iframe = container.querySelector('iframe');
        expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
      });

      it.each(renderingEngines)('%s: renders an iframe for an embed URL', (_label, renderContent) => {
        const Content = renderContent(youtubeEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ'));
        const { container } = render(<Content />);

        const iframe = container.querySelector('iframe');
        expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
      });
    });

    describe('normalizeYouTubeUrlToEmbedUrl', () => {
      it.each([
        ['watch URL', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        ['youtu.be short link', 'https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        ['shorts URL', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        ['already-embeddable URL', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
      ])('converts a %s', (_label, url, expected) => {
        expect(normalizeYouTubeUrlToEmbedUrl(url)).toBe(expected);
      });
    
      it.each([
        ['non-URL input', 'not a url'],
        ['YouTube URL with no video id', 'https://www.youtube.com/feed/subscriptions'],
        ['watch URL missing the v param', 'https://www.youtube.com/watch?list=RDdQw4w9WgXcQ'],
      ])('returns the %s unchanged', (_label, url) => {
        expect(normalizeYouTubeUrlToEmbedUrl(url)).toBe(url);
      });
    
      describe('timestamps', () => {
        const watch = (timestamp: string) => `https://www.youtube.com/watch?v=dQw4w9WgXcQ&${timestamp}`;
        const embed = (start: string) => `https://www.youtube.com/embed/dQw4w9WgXcQ?start=${start}`;
    
        it.each([
          ['plain seconds via t', watch('t=90'), embed('90')],
          ['hours, minutes, and seconds via t', watch('t=1h2m3s'), embed('3723')],
          ['integer seconds via start', watch('start=42'), embed('42')],
        ])('carries %s', (_label, url, expected) => {
          expect(normalizeYouTubeUrlToEmbedUrl(url)).toBe(expected);
        });
    
        it('prefers start over t when both are present', () => {
          expect(normalizeYouTubeUrlToEmbedUrl(watch('start=42&t=596s'))).toBe(embed('42'));
        });
    
        it.each([
          ['a zero timestamp', watch('t=0s')],
          ['a non-numeric timestamp', watch('t=abc')],
          ['no timestamp', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
        ])('omits start for %s', (_label, url) => {
          expect(normalizeYouTubeUrlToEmbedUrl(url)).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        });
      });
    });
  });
});

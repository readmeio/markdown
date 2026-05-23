import React from 'react';
interface EmbedProps {
    favicon?: string;
    html?: string;
    iframe?: boolean;
    image?: string;
    lazy?: boolean;
    providerName?: string;
    providerUrl?: string;
    title: string;
    typeOfEmbed?: string;
    url: string;
}
declare const Embed: ({ lazy, url, html, providerName, providerUrl, title, iframe, image, favicon, ...attrs }: EmbedProps) => React.JSX.Element;
export default Embed;

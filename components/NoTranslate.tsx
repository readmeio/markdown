import React from 'react';

/** Marks text the browser and our translations must leave as is. */
const NoTranslate = ({ children }: React.PropsWithChildren) => <span translate="no">{children}</span>;

export default NoTranslate;

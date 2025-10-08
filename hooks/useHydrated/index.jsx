const React = require('react');

/**
 * A hook that returns whether or not the component has been hydrated.
 * Useful for components that should only render in the browser, and not during SSR.
 * Waiting to render until after hydration avoids React hydration mismatches.
 */
export default function useHydrated() {
  const [isHydrated, setIsHydrated] = React.useState(false);
  React.useEffect(() => setIsHydrated(true), []);
  return isHydrated;
}
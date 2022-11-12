import { useState, useEffect } from 'react';

const useMediaQuery = query => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const matchQueryList = window.matchMedia(query);
    if (matchQueryList.matches !== matches) setMatches(matchQueryList.matches);
    const handleChange = e => setMatches(e.matches);
    matchQueryList.addEventListener('change', handleChange);
    // eslint-disable-next-line consistent-return
    return () => matchQueryList.removeEventListener('change', handleChange);
  }, [matches, query]);

  return matches;
};

export default useMediaQuery;

import { useState, useEffect } from 'react';

const useMediaQuery = query => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const matchQueryList = window.matchMedia(query);
    if (matchQueryList.matches !== matches) setMatches(matchQueryList.matches);
    const handleChange = e => setMatches(e.matches);
    matchQueryList.addEventListener('change', handleChange);
    return () => matchQueryList.removeEventListener('change', handleChange);
  }, [matches, query]);

  return matches;
};

export default useMediaQuery;

import React, { useEffect } from 'react';

interface PostmanRunButtonProps {
  action: string;
  collectionId: string;
  collectionUrl: string;
  visibility: string;
}

const PostmanRunButton = ({
  collectionId = '', // Add your collection ID here
  collectionUrl = '', // Add your collection URL here
  visibility = 'public',
  action = 'collection/fork',
}: PostmanRunButtonProps) => {
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      const scriptFunction = function noIdeaWhatThisShouldBeCalledOrDoesOne(p, o, s, t, m) {
        if (!p[s]) {
          p[s] = function noIdeaWhatThisShouldBeCalledOrDoesTwo(...args) {
            const postmanRunObject = p[t] || (p[t] = []);
            postmanRunObject.push(args);
          };
        }
        if (!o.getElementById(s + t)) {
          const scriptElement = o.createElement('script');
          scriptElement.id = s + t;
          scriptElement.async = 1;
          scriptElement.src = m;
          o.getElementsByTagName('head')[0].appendChild(scriptElement);
        }
      };

      // Execute the script function directly
      scriptFunction(window, document, '_pm', 'PostmanRunObject', 'https://run.pstmn.io/button.js');

      return () => {
        // Cleanup if needed
        const scriptElement = document.getElementById('_pmPostmanRunObject');
        if (scriptElement) document.head.removeChild(scriptElement);
      };
    }
    return undefined;
  }, []);

  return (
    <div className="my-4">
      <div
        className="postman-run-button"
        data-postman-action={action}
        data-postman-collection-url={collectionUrl}
        data-postman-var-1={collectionId}
        data-postman-visibility={visibility}
      />
    </div>
  );
};

export default PostmanRunButton;

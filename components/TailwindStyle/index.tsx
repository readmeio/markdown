import React, { useCallback, useEffect, useRef, useState } from 'react';

import { tailwindPrefix } from '../../utils/consts';
import { tailwindCompiler } from '../../utils/tailwind-compiler';

const traverse = (node: Node, callback: (element: Node) => void) => {
  callback(node);

  node.childNodes.forEach(child => {
    traverse(child, callback);
  });
};

const TailwindStyle = ({ children }: React.PropsWithChildren<unknown>) => {
  const [stylesheet, setStylesheet] = useState('');
  const classes = useRef(new Set<string>());
  const ref = useRef<HTMLDivElement>(null);

  const addClasses = useCallback((element: Node) => {
    if (!(element instanceof HTMLElement)) return;

    element.classList.forEach(className => {
      classes.current.add(className);
    });
  }, []);

  const updateStylesheet = useCallback(async () => {
    const candidates = classes.current;
    if (candidates.size === 0) return;

    const sheet = await tailwindCompiler(Array.from(candidates), { prefix: `.${tailwindPrefix}` });
    /* @note: don't insert an empty stylesheet */
    if (sheet.css.match(/^@layer utilities;/m)) return;

    setStylesheet(sheet.css);
  }, []);

  /*
   * @note: execute once on load
   */
  useEffect(() => {
    if (!ref.current) return;

    ref.current.querySelectorAll(`.${tailwindPrefix}`).forEach(child => traverse(child, addClasses));
    updateStylesheet();
  });

  /*
   * @note: observe for changes
   */
  useEffect(() => {
    if (!ref.current) return;

    const observer = new MutationObserver((records: MutationRecord[]) => {
      let shouldUpdate = false;

      records.forEach(record => {
        if (record.type === 'childList') {
          record.addedNodes.forEach(node => {
            if (!(node instanceof HTMLElement) || !node.classList.contains(tailwindPrefix)) return;

            traverse(node, addClasses);
            shouldUpdate = true;
          });
        } else if (record.type === 'attributes') {
          if (record.attributeName !== 'class' || !(record.target instanceof HTMLElement)) return;

          addClasses(record.target);
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          updateStylesheet();
        }
      });
    });

    observer.observe(ref.current, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // eslint-disable-next-line consistent-return
    return () => observer.disconnect();
  }, [addClasses, updateStylesheet]);

  return (
    <div ref={ref} style={{ display: 'contents' }}>
      <style data-tailwind-stylesheet>{stylesheet}</style>
      {children}
    </div>
  );
};

export default TailwindStyle;

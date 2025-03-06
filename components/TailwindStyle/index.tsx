import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { tailwindPrefix } from '../../utils/consts';
import { tailwindCompiler } from '../../utils/tailwind-compiler';

const traverse = (node: Node, callback: (element: Node) => void) => {
  callback(node);

  node.childNodes.forEach(child => {
    traverse(child, callback);
  });
};

const TailwindStyle = () => {
  const [stylesheet, setStylesheet] = useState('');
  const hasDom = typeof document !== 'undefined';
  const classes = useRef(new Set<string>());

  const addClasses = useCallback((element: Node) => {
    if (!(element instanceof HTMLElement)) return;

    element.classList.forEach(className => {
      classes.current.add(className);
    });
  }, []);

  const updateStylesheet = useCallback(async () => {
    const sheet = await tailwindCompiler(Array.from(classes.current), { prefix: `.${tailwindPrefix}` });
    setStylesheet(sheet.css);
  }, []);

  // Set up mutation observer to update classes
  useEffect(() => {
    if (!hasDom) return;

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

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // eslint-disable-next-line consistent-return
    return () => observer.disconnect();
  }, [addClasses, hasDom, updateStylesheet]);

  return hasDom ? (
    createPortal(<style data-tailwind-stylesheet>{stylesheet}</style>, document.head)
  ) : (
    <style data-tailwind-stylesheet>{stylesheet}</style>
  );
};

export default TailwindStyle;

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { tailwindPrefix } from '../../utils/consts';
import { tailwindCompiler } from '../../utils/tailwind-compiler';

const traverse = (node: Node, callback: (element: Node) => void) => {
  callback(node);

  node.childNodes.forEach(child => {
    traverse(child, callback);
  });
};

interface Props {
  children: React.ReactNode;
  darkModeDataAttribute?: boolean;
}

const TailwindStyle = ({ children, darkModeDataAttribute }: Props) => {
  const [stylesheet, setStylesheet] = useState('');
  const classesSet = useRef(new Set<string>());
  const ref = useRef<HTMLStyleElement>(null);
  const [classes, setClasses] = useState<string[]>([]);

  const addClasses = useCallback((element: Node) => {
    if (!(element instanceof HTMLElement)) return;

    element.classList.forEach(className => {
      classesSet.current.add(className);
    });
  }, []);

  /*
   * @note: regenerate stylesheet
   */
  useEffect(() => {
    const run = async () => {
      if (classes.length === 0) {
        setStylesheet('');
        return;
      }

      const sheet = await tailwindCompiler(classes, {
        prefix: `.${tailwindPrefix}`,
        darkModeDataAttribute,
      });
      /* @note: don't insert an empty stylesheet */
      if (sheet.css.match(/^@layer utilities;/m)) return;

      setStylesheet(sheet.css);
    };

    run();
  }, [classes, darkModeDataAttribute]);

  /*
   * @note: execute once on load
   */
  useEffect(() => {
    if (!ref.current) return;

    ref.current.parentElement.querySelectorAll(`.${tailwindPrefix}`).forEach(child => traverse(child, addClasses));
    setClasses(Array.from(classesSet.current));
  }, [addClasses]);

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
          setClasses(Array.from(classesSet.current));
        }
      });
    });

    observer.observe(ref.current.parentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // eslint-disable-next-line consistent-return
    return () => observer.disconnect();
  }, [addClasses]);

  return (
    <>
      <style ref={ref} data-tailwind-stylesheet>
        {stylesheet}
      </style>
      {children}
    </>
  );
};

export default TailwindStyle;

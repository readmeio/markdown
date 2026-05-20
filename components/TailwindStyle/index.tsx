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
  darkModeDataAttribute?: string | null;
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
            if (!(node instanceof HTMLElement)) return;

            const sizeBefore = classesSet.current.size;

            if (node.classList.contains(tailwindPrefix)) {
              // traverse visits all descendants recursively, no need to querySelectorAll
              traverse(node, addClasses);
            } else {
              // Node isn't a TailwindRoot itself — check descendants.
              // React may insert a parent wrapper during navigation whose
              // children contain TailwindRoot elements.
              node.querySelectorAll(`.${tailwindPrefix}`).forEach(child => {
                traverse(child, addClasses);
              });
            }

            if (classesSet.current.size > sizeBefore) shouldUpdate = true;
          });
        } else if (record.type === 'attributes') {
          if (record.attributeName !== 'class' || !(record.target instanceof HTMLElement)) return;

          const sizeBefore = classesSet.current.size;
          addClasses(record.target);
          if (classesSet.current.size > sizeBefore) shouldUpdate = true;
        }
      });

      if (shouldUpdate) {
        setClasses(Array.from(classesSet.current));
      }
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

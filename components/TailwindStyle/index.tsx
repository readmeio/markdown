import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { tailwindPrefix } from '../../utils/consts';
import { tailwindCompiler } from '../../utils/tailwind-compiler';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const traverse = (node: Node, callback: (element: Node) => void) => {
  callback(node);

  node.childNodes.forEach(child => {
    traverse(child, callback);
  });
};

interface Props {
  children: React.ReactNode;
  darkModeDataAttribute?: string | null;
  /** See the matching param on `tailwindCompiler` in `utils/tailwind-compiler.ts`. */
  darkModeRootSelector?: string | null;
}

const TailwindStyle = ({ children, darkModeDataAttribute, darkModeRootSelector }: Props) => {
  const classesSet = useRef(new Set<string>());
  const ref = useRef<HTMLStyleElement>(null);

  const addClasses = useCallback((element: Node) => {
    if (!(element instanceof HTMLElement)) return;

    element.classList.forEach(className => {
      classesSet.current.add(className);
    });
  }, []);

  /*
   * @note: a layout effect writes the sheet before the content first paints, so its utilities don't transition in
   */
  useIsomorphicLayoutEffect(() => {
    const run = async () => {
      if (classesSet.current.size === 0) return;

      const sheet = await tailwindCompiler(Array.from(classesSet.current), {
        prefix: `.${tailwindPrefix}`,
        darkModeDataAttribute,
        darkModeRootSelector,
      });
      /* @note: don't insert an empty stylesheet */
      if (sheet.css.match(/^@layer utilities;/m) || !ref.current) return;

      ref.current.textContent = sheet.css;
    };

    if (!ref.current) return;

    ref.current.parentElement.querySelectorAll(`.${tailwindPrefix}`).forEach(child => traverse(child, addClasses));
    run();

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
        run();
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
  }, [addClasses, darkModeDataAttribute, darkModeRootSelector]);

  return (
    <>
      <style ref={ref} data-tailwind-stylesheet />
      {children}
    </>
  );
};

export default TailwindStyle;

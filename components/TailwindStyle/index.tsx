import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { tailwindPrefix } from '../../utils/consts';
import { tailwindCompiler } from '../../utils/tailwind-compiler';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const FREEZE_ATTRIBUTE = 'data-tailwind-freeze';
const FREEZE_RULE = `:is([${FREEZE_ATTRIBUTE}] ~ *, [${FREEZE_ATTRIBUTE}] ~ * *):is(.${tailwindPrefix}, .${tailwindPrefix} *) { transition: none !important; }`;

const traverse = (node: Node, callback: (element: Node) => void) => {
  callback(node);

  node.childNodes.forEach(child => {
    traverse(child, callback);
  });
};

/** With `freeze`, restyles the content under a transitions-off rule first, so utilities it lacked don't animate in. */
const writeSheet = (style: HTMLStyleElement, css: string, freeze: boolean) => {
  if (style.textContent === css) return;
  if (freeze) {
    style.setAttribute(FREEZE_ATTRIBUTE, '');
    style.textContent = `${css}\n${FREEZE_RULE}`;
    style.parentElement?.getBoundingClientRect(); // forces the restyle while frozen
    style.removeAttribute(FREEZE_ATTRIBUTE);
  }
  style.textContent = css;
};

interface Props {
  /** Writes the sheet before the content first paints, without animating the utilities in. */
  beforePaint?: boolean;
  children: React.ReactNode;
  darkModeDataAttribute?: string | null;
  /** See the matching param on `tailwindCompiler` in `utils/tailwind-compiler.ts`. */
  darkModeRootSelector?: string | null;
}

const TailwindStyle = ({ beforePaint = false, children, darkModeDataAttribute, darkModeRootSelector }: Props) => {
  const classesSet = useRef(new Set<string>());
  const ref = useRef<HTMLStyleElement>(null);

  const addClasses = useCallback((element: Node) => {
    if (!(element instanceof HTMLElement)) return;

    element.classList.forEach(className => {
      classesSet.current.add(className);
    });
  }, []);

  /*
   * @note: regenerate stylesheet
   */
  const watch = useCallback(() => {
    const run = async (freeze: boolean) => {
      if (classesSet.current.size === 0) return;

      const sheet = await tailwindCompiler(Array.from(classesSet.current), {
        prefix: `.${tailwindPrefix}`,
        darkModeDataAttribute,
        darkModeRootSelector,
      });
      /* @note: don't insert an empty stylesheet */
      if (sheet.css.match(/^@layer utilities;/m) || !ref.current) return;

      writeSheet(ref.current, sheet.css, beforePaint && freeze);
    };

    if (!ref.current) return;

    ref.current.parentElement.querySelectorAll(`.${tailwindPrefix}`).forEach(child => traverse(child, addClasses));
    run(true);

    const observer = new MutationObserver((records: MutationRecord[]) => {
      let shouldUpdate = false;
      let hasNewContent = false;

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

            if (classesSet.current.size > sizeBefore) hasNewContent = true;
          });
        } else if (record.type === 'attributes') {
          if (record.attributeName !== 'class' || !(record.target instanceof HTMLElement)) return;

          const sizeBefore = classesSet.current.size;
          addClasses(record.target);
          if (classesSet.current.size > sizeBefore) shouldUpdate = true;
        }
      });

      if (shouldUpdate || hasNewContent) {
        run(hasNewContent);
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
  }, [addClasses, beforePaint, darkModeDataAttribute, darkModeRootSelector]);

  useIsomorphicLayoutEffect(() => (beforePaint ? watch() : undefined), [beforePaint, watch]);
  useEffect(() => (beforePaint ? undefined : watch()), [beforePaint, watch]);

  return (
    <>
      <style ref={ref} data-tailwind-stylesheet />
      {children}
    </>
  );
};

export default TailwindStyle;

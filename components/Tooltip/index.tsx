import Tippy from '@tippyjs/react';
import React, { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';

type TooltipProps = ComponentProps<typeof Tippy>;

/**
 * A custom wrapper around `@tippyjs/react` that attaches a MutationObserver to
 * listen for changes of the trigger element's DOM tree.
 * 
 * This is necessary for features like translation, where we initially render a
 * Glossary term in English but then replace it with the translated term, which
 * creates a stale Tippy reference.
 */ 
export default function Tooltip({ children, ...rest }: TooltipProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const [triggerTarget, setTriggerTarget] = useState<HTMLElement|null>(null);

  const triggerId = useMemo(() => {
    return `tooltip-trigger-${crypto.randomUUID()}`;
  }, []);

  useEffect(() => {
    if (!triggerRef.current?.parentElement) return () => {};

    const observer = new MutationObserver((records: MutationRecord[]) => {
      records.forEach(record => {
        // was the node tree changed?
        if (record.type === 'childList') {
          record.addedNodes.forEach(node => {
            // was the node for the tooltip trigger replaced?
            if(node instanceof HTMLElement && node.id === triggerId)  {
              // if it was, update our reference to it
              setTriggerTarget(node);
            }
          });
        } 
      });
    });

    observer.observe(triggerRef.current.parentElement, {
      subtree: true,
      childList: true,
    });

    return () => observer.disconnect();
  }, [setTriggerTarget, triggerId, triggerTarget]);

  const getReferenceClientRect = useMemo(() => {
    return triggerTarget ? () => triggerTarget.getBoundingClientRect() : undefined;
  }, [triggerTarget]);

  return (
    <Tippy 
      getReferenceClientRect={getReferenceClientRect}
      triggerTarget={triggerTarget}
      {...rest}
    >
      <span ref={triggerRef} id={triggerId}>{children}</span>
    </Tippy>
  );
}

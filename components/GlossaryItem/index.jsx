const Tooltip = require('@tippyjs/react').default;
const PropTypes = require('prop-types');
const React = require('react');

const GlossaryContext = require('../../contexts/GlossaryTerms');

const { compareNodeListSignatures } = require('./utils');

// https://github.com/readmeio/api-explorer/blob/0dedafcf71102feedaa4145040d3f57d79d95752/packages/api-explorer/src/lib/replace-vars.js#L8
function GlossaryItem({ term, terms }) {
  const triggerRef = React.useRef(null);
  const [triggerTarget, setTriggerTarget] = React.useState(null);

  /**
   * Attach MutationObserver to listen for changes of the Tippy trigger element's DOM tree.
   * This is necessary for features like translation, where we initially render a Glossary
   * term in English but then replace it with the translated term, which creates a stale
   * Tippy reference.
   */
  React.useEffect(() => {
    if (typeof window === 'undefined' || !triggerRef.current?.parentElement) return () => {};
    // Track the index of the trigger element in the parent so we can update our reference
    // if it's replaced in the DOM.
    const triggerIndex = Array.prototype.indexOf.call(triggerRef.current.parentElement.childNodes, triggerRef.current);

    const observer = new MutationObserver(records => {
      records.forEach(record => {
        // was the node tree changed?
        if (record.type === 'childList') {
          // check if the previous and updated children have the same signatures to determine if the mutation is
          // a text-only shuffle inside equivalent structure. This helps ensure we're re-assigning the
          // Tippy reference to the correct element.
          const isMutationStable = compareNodeListSignatures(record.addedNodes, record.removedNodes);
          if (!isMutationStable) {
            return;
          }

          record.addedNodes.forEach((node, index) => {
            // was the node for the tooltip trigger replaced?
            if (
              node instanceof HTMLElement &&
              index === triggerIndex &&
              node.classList.contains('GlossaryItem-trigger')
            ) {
              // if it was, update our reference to it
              setTriggerTarget(node);
            }
          });
        }
      });
    });

    observer.observe(triggerRef.current.parentElement, { subtree: true, childList: true });

    return () => observer.disconnect();
  }, [setTriggerTarget, triggerRef, triggerTarget]);

  // If the trigger element is updated, we need to recalculate its position
  // by providing a new boundingClientRect reference to Tippy
  const getReferenceClientRect = React.useMemo(() => {
    return triggerTarget ? () => triggerTarget.getBoundingClientRect() : undefined;
  }, [triggerTarget]);

  const foundTerm = terms.find(i => term.toLowerCase() === i.term.toLowerCase());

  if (!foundTerm) return <span>{term}</span>;

  return (
    <Tooltip
      content={
        <div className="GlossaryItem-tooltip-content">
          <strong className="GlossaryItem-term">{foundTerm.term}</strong> - {foundTerm.definition}
        </div>
      }
      getReferenceClientRect={getReferenceClientRect}
      offset={[-5, 5]}
      placement="bottom-start"
      triggerTarget={triggerTarget}
    >
      <span ref={triggerRef} className="GlossaryItem-trigger">
        {term}
      </span>
    </Tooltip>
  );
}

GlossaryItem.propTypes = {
  term: PropTypes.string.isRequired,
  terms: PropTypes.arrayOf(
    PropTypes.shape({ definition: PropTypes.string.isRequired, term: PropTypes.string.isRequired }),
  ).isRequired,
};

// eslint-disable-next-line react/display-name
module.exports = props => (
  <GlossaryContext.Consumer>{terms => terms && <GlossaryItem {...props} terms={terms} />}</GlossaryContext.Consumer>
);

module.exports.GlossaryItem = GlossaryItem;
module.exports.GlossaryContext = GlossaryContext;

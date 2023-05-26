const { default: mermaid } = require('mermaid/dist/mermaid.esm.mjs');
const PropTypes = require('prop-types');
const React = require('react');

mermaid.initialize({ startOnLoad: false });

const Mermaid = ({ value }) => {
  const [content, setContent] = React.useState(value);

  React.useEffect(() => {
    const render = async () => {
      const { svg } = await mermaid.render('graph', value);
      setContent(svg);
    };

    render();
  }, [value]);

  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: content }} />;
};

Mermaid.propTypes = {
  value: PropTypes.string,
};

Mermaid.sanitize = sanitizeSchema => {
  sanitizeSchema.attributes.mermaid = ['value'];

  return sanitizeSchema;
};

module.exports = Mermaid;

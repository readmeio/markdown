/* eslint-disable no-param-reassign, react/jsx-props-no-spreading, no-fallthrough */

const PropTypes = require('prop-types');
const React = require('react');

class Image extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      lightbox: false,
    };

    this.toggle = this.toggle.bind(this);
    this.handleKey = this.handleKey.bind(this);

    this.isEmoji = props.className === 'emoji';
  }

  toggle(toState) {
    if (this.props.className === 'emoji') return;

    if (typeof toState === 'undefined') toState = !this.state.lightbox;

    this.setState({ lightbox: toState });
  }

  handleKey(e) {
    let { key, metaKey: cmd } = e;

    cmd = cmd ? 'cmd+' : '';
    key = `${cmd}${key.toLowerCase()}`;

    switch (key) {
      case 'cmd+.':
      case 'escape':
        // CLOSE
        this.toggle(false);
        break;
      case ' ':
      case 'enter':
        // OPEN
        if (!this.state.open) this.toggle(true);
        e.preventDefault();
      default:
    }
  }

  render() {
    const { props } = this;
    const { alt, lazy = true, ...otherProps } = props;

    if (this.isEmoji) {
      return <img alt={alt} loading={lazy ? 'lazy' : ''} {...otherProps} />;
    }

    return (
      <span
        aria-label={alt}
        className={`img lightbox ${this.state.lightbox ? 'open' : 'closed'}`}
        onClick={() => this.toggle()}
        onKeyDown={this.handleKey}
        role={'button'}
        tabIndex={0}
      >
        <span className="lightbox-inner">
          <img alt={alt} loading={lazy ? 'lazy' : ''} {...otherProps} />
        </span>
      </span>
    );
  }
}

Image.propTypes = {
  align: PropTypes.string,
  alt: PropTypes.string,
  caption: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lazy: PropTypes.bool,
  src: PropTypes.string.isRequired,
  title: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

Image.defaultProps = {
  align: '',
  alt: '',
  caption: '',
  height: 'auto',
  src: '',
  title: '',
  width: 'auto',
};

Image.sanitize = sanitizeSchema => {
  sanitizeSchema.attributes.img = ['className', 'title', 'alt', 'width', 'height', 'align', 'src', 'longDesc'];

  return sanitizeSchema;
};

const CreateImage =
  ({ lazyImages }) =>
  // eslint-disable-next-line react/display-name
  props => <Image lazy={lazyImages} {...props} />;

module.exports = CreateImage;

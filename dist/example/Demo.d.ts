export default Demo;
declare function Demo({ opts }: {
    opts: any;
}): JSX.Element;
declare namespace Demo {
    namespace propTypes {
        const opts: PropTypes.Requireable<object>;
    }
}
import PropTypes from 'prop-types';

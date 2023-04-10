export = Callout;
declare function Callout(props: any): JSX.Element;
declare namespace Callout {
    namespace propTypes {
        const attributes: PropTypes.Requireable<PropTypes.InferProps<{}>>;
        const calloutStyle: PropTypes.Requireable<string>;
        const children: PropTypes.Validator<any[]>;
        const icon: PropTypes.Requireable<string>;
        const node: PropTypes.Requireable<PropTypes.InferProps<PropTypes.ValidationMap<any>>>;
        const theme: PropTypes.Requireable<string>;
        const title: PropTypes.Requireable<string>;
    }
    namespace defaultProps {
        const attributes_1: null;
        export { attributes_1 as attributes };
        const calloutStyle_1: string;
        export { calloutStyle_1 as calloutStyle };
        const node_1: null;
        export { node_1 as node };
    }
    function sanitize(sanitizeSchema: any): any;
}
import PropTypes = require("prop-types");

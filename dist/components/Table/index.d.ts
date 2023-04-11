export = Table;
declare function Table(props: any): JSX.Element;
declare namespace Table {
    namespace propTypes {
        const children: PropTypes.Validator<PropTypes.ReactNodeLike[]>;
    }
}
import PropTypes = require("prop-types");

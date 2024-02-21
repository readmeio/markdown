export = TableOfContents;
declare function TableOfContents({ children }: {
    children: any;
}): JSX.Element;
declare namespace TableOfContents {
    namespace propTypes {
        const children: PropTypes.Requireable<PropTypes.ReactElementLike>;
    }
}
import PropTypes = require("prop-types");

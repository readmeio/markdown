declare function _exports(props: any): JSX.Element;
declare namespace _exports {
    export { GlossaryItem };
    export { GlossaryContext };
}
export = _exports;
declare function GlossaryItem({ term, terms }: {
    term: any;
    terms: any;
}): JSX.Element;
declare namespace GlossaryItem {
    namespace propTypes {
        const term: PropTypes.Validator<string>;
        const terms: PropTypes.Validator<(PropTypes.InferProps<{
            definition: PropTypes.Validator<string>;
            term: PropTypes.Validator<string>;
        }> | null | undefined)[]>;
    }
}
import GlossaryContext = require("../../contexts/GlossaryTerms");
import PropTypes = require("prop-types");

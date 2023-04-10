export = CreateCodeTabs;
declare function CreateCodeTabs({ theme }: {
    theme: any;
}): (props: any) => JSX.Element;
declare namespace CreateCodeTabs {
    export { CodeTabs };
}
declare function CodeTabs(props: any): JSX.Element;
declare namespace CodeTabs {
    namespace propTypes {
        const children: PropTypes.Validator<any[]>;
        const theme: PropTypes.Requireable<string>;
    }
}
import PropTypes = require("prop-types");

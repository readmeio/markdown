export default Fixtures;
declare function Fixtures({ lazyImages, render, safeMode, selected, getRoute, setQuery }: {
    lazyImages: any;
    render: any;
    safeMode: any;
    selected: any;
    getRoute: any;
    setQuery: any;
}): any;
declare namespace Fixtures {
    namespace propTypes {
        const getRoute: PropTypes.Validator<(...args: any[]) => any>;
        const render: PropTypes.Validator<(...args: any[]) => any>;
        const selected: PropTypes.Requireable<string>;
    }
}
import PropTypes from 'prop-types';

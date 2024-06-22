import { Variable } from '../../types';

const variable = (node: Variable) => `{user.${node.data.hProperties.name}}`;

export default variable;

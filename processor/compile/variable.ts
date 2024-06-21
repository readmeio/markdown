import { Variable } from '../../types';

const variable = (node: Variable) => `{user.${node.name}}`;

export default variable;

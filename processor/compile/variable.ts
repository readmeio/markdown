import { Variable } from '../../types';

const variable = (node: Variable) => {
  // @note: coming from RDMD, it's set as `variable`. But when mdx is parsed,
  // it's set as `name`
  const name = node.data.hProperties.variable || node.data.hProperties.name;
  return name.toString().match(/ /) ? `{user[${JSON.stringify(name)}]}` : `{user.${name}}`;
};

export default variable;

interface VariableNode {
  data: {
    hProperties: {
      name?: string;
    };
  };
  type: 'readme-variable';
}

const variable = (node: VariableNode) => `{user.${node.data?.hProperties?.name || ''}}`;

export default variable;

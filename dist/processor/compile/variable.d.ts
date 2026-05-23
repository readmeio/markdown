interface VariableNode {
    data: {
        hProperties: {
            name?: string;
        };
    };
    type: 'readme-variable';
}
declare const variable: (node: VariableNode) => string;
export default variable;

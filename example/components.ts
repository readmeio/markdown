const components = {
  Demo: `
## This is a Demo Component!

> 📘 It can render JSX components!
`,
  Test: `
export const Test = ({ color = 'thistle' } = {}) => {
  return <div style={{ backgroundColor: color }}>
    Hello, World!
  </div>;
};

export default Test;
  `,
  MultipleExports: `
export const One = () => "One";

export const Two = () => "Two";
  `,
  TailwindRootTest: `
export const StyledComponent = () => {
  return <div className="bg-blue-500 text-white p-4">
    Hello, World!
  </div>;
}
  `,
};

export default components;

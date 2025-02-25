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
export const One = () => <div>"One"</div>;

export const Two = () => "Two";
  `,
  TailwindRootTest: `
export const StyledComponent = () => {
  return <div className="bg-blue-500 text-white p-4">
    Hello, World!
  </div>;
}
  `,
  Steps: `
export const Step = ({ children }) => {
  return (
    <div className="flex items-center h-full w-full">
      <div className="bg-gray-800 rounded-md p-6 m-6">
        {children}
      </div>
    </div>
  );
};

<div className="bg-gray-500 rounded-md p-3 m-3">
  {props.children}
</div>
  `,
};

export default components;

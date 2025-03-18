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

  DarkMode: `
import { useState } from 'react';

export const DarkMode = () => {
  const [mode, setMode] = useState('dark');

  return (
    <div data-theme={mode}>
      <button
        className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center mb-2 dark:bg-yellow-300 dark:hover:bg-yellow-400 dark:focus:ring-yellow-900 dark:text-black"
        onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
        style={{ border: 'none' }}
      >
        Toggle Mode
      </button>
      <div
        className="bg-gray-200 dark:bg-gray-900 text-black dark:text-white p-5 rounded-xl"
        style={{ textTransform: 'capitalize' }}
      >
        {mode} Mode Component
      </div>
    </div>
  )
}
`,
};

export default components;

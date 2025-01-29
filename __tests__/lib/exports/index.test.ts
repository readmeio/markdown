import singleExportMdx from './input/singleExport.mdx?raw';
import multipleExportsMdx from './input/multipleExports.mdx?raw';
import weirdExportsMdx from './input/weirdExports.mdx?raw';
import { exports } from '../../../lib';

describe('export tags', () => {
  it('returns a single export name', () => {

    expect(exports(singleExportMdx)).toStrictEqual(['Foo']);
  });
  it('returns multiple export names', () => {
  
    expect(exports(multipleExportsMdx)).toStrictEqual(['Foo', 'Bar']);
  });
  it('returns different types of export names', () => { 

    expect(exports(weirdExportsMdx)).toStrictEqual(['Foo', 'bar', 'doSomethingFunction', 'YELLING', 'SingleNewlinesAreAnnoying', 'x', 'MyClass']);
  });
});
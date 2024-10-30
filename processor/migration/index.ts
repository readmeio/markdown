import emphasisTransformer from './emphasis';
import imagesTransformer from './images';
import linkReferenceTransformer from './linkReference';
import tableCellTransformer from './table-cell';

const transformers = [
  emphasisTransformer,
  imagesTransformer,
  linkReferenceTransformer,
  tableCellTransformer,
];

export default transformers


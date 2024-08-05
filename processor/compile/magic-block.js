const magicBlock = (type, data, parent) => {
  return parent.type === 'root'
    ? `[block:${type}]\n${JSON.stringify(data, null, 2)}\n[/block]\n`
    : `[block:${type}]${JSON.stringify(data)}[/block]`;
};

export default magicBlock;

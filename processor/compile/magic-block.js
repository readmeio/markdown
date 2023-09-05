const magicBlock = (type, data) => `[block:${type}]${JSON.stringify(data)}[/block]`;

export default magicBlock;

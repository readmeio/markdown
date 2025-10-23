const React = require('react');

const registerCustomComponents = require('../../lib/registerCustomComponents');
const createSchema = require('../../sanitize.schema');

const hastPrefix = 'prefix';
const customComponents = {
  a() {
    return <span>I should not be renamed so that I can override the default link tag!</span>;
  },
  oneword() {
    return <span>I will be registered as “x-oneword”</span>;
  },
  twoWords() {
    return <span>I should be registered as “two-words”</span>;
  },
};

describe('Custom Component Registrar', () => {
  let registered;
  let sanitize;

  beforeEach(() => {
    sanitize = createSchema();
    registered = registerCustomComponents(customComponents, sanitize, hastPrefix);
  });

  it('should take a hash of React components and transform it for use in the RDMD rehype engine', () => {
    expect(Object.keys(registered)).toHaveLength(Object.keys(customComponents).length);
    expect(Object.values(registered)).toStrictEqual(Object.values(customComponents));
  });

  describe('Tag Registration', () => {
    it('should transform and safelist keys as valid HAST tag names', () => {
      /* Tag names must be kebab-cased and longer than one word.
       */
      expect(sanitize.tagNames).toContain(`${hastPrefix}-oneword`);
      expect(sanitize.tagNames).toContain('two-words');
    });

    it('should allow you to customize the HAST-safe prefix', () => {
      /* Overrides the default `x-` prefix.
       */
      expect(Object.keys(registered)).toContain(`${hastPrefix}-oneword`);
    });

    it('should not modify tag keys that match core element names', () => {
      /* Some native tags are single words, like <a> or <i>.
       * We need to make sure we don't prefix these keys so they
       * can be overriden. (Or else <a> would be safelisted as <x-a>!)
       */
      expect(Object.keys(registered)).toContain('a');
      expect(sanitize.tagNames).not.toContain(`${hastPrefix}-a`);
    });
  });

  describe('Attribute Registration', () => {
    it('should add propTypes to the HAST attribute safelist', () => {
      expect(Object.keys(sanitize.attributes)).toContain('two-words');
      expect(sanitize.attributes['two-words']).toContain('attrToBeSafelisted');
    });

    it('should append attributes to existing safelist', () => {
      /* We need to make sure we don't overwrite the defaults here!
       */
      expect(sanitize.attributes.a).toContain('attrToConcatToSafelist');
    });
  });
});

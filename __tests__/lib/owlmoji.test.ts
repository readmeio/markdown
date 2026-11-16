import { nameToEmoji } from 'gemoji';

import Owlmoji from '../../lib/owlmoji';
import { owlmojiDetails } from '../../lib/owlmoji-details';

describe('Owlmoji', () => {
  describe('kind', () => {
    it('returns "gemoji" for a gemoji name', () => {
      expect(Owlmoji.kind('smile')).toBe('gemoji');
    });

    it('returns "fontawesome" for a fa- name', () => {
      expect(Owlmoji.kind('fa-owl')).toBe('fontawesome');
    });

    it('returns "owlmoji" for an owlmoji name', () => {
      expect(Owlmoji.kind('owlbert')).toBe('owlmoji');
      expect(Owlmoji.kind('owlbert-books')).toBe('owlmoji');
    });

    it('returns null for an unknown name', () => {
      expect(Owlmoji.kind('notarealmoji')).toBeNull();
    });
  });

  it('exposes nameToEmoji from gemoji', () => {
    expect(Owlmoji.nameToEmoji).toBe(nameToEmoji);
    expect(Owlmoji.nameToEmoji.smile).toBe('😄');
  });

  it('owlmoji collection matches the snapshot', () => {
    expect(owlmojiDetails).toMatchSnapshot();
  });
});

import { describe, it, expect } from 'vitest';
import { isEmail, isStrongEnough, passwordScore } from '../src/utils/validators.js';

describe('validators', () => {
  it('validates emails', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('nope')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
  });
  it('checks password strength rules', () => {
    expect(isStrongEnough('abc12345')).toBe(true);
    expect(isStrongEnough('short1')).toBe(false);
    expect(isStrongEnough('onlyletters')).toBe(false);
  });
  it('scores passwords between 0 and 4', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('Abcdefgh1234!')).toBe(4);
  });
});
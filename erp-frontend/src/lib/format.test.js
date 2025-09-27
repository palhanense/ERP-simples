import { describe, it, expect } from 'vitest';
import { digitsFromString, formatFromDigits, numberFromDigits, digitsFromValue } from './format';

describe('format utilities', () => {
  it('digitsFromString strips non-digits', () => {
    expect(digitsFromString('R$ 12,34')).toBe('1234');
    expect(digitsFromString('1.234,56')).toBe('123456');
    expect(digitsFromString('abc')).toBe('');
    expect(digitsFromString('')).toBe('');
  });

  it('digitsFromValue converts numbers and strings to digits buffer', () => {
    expect(digitsFromValue(12.34)).toBe('1234');
    expect(digitsFromValue('12.34')).toBe('1234');
    expect(digitsFromValue('R$ 1.234,56')).toBe('123456');
    expect(digitsFromValue('')).toBe('');
  });

  it('formatFromDigits produces locale currency strings', () => {
    expect(formatFromDigits('1234', 'pt-BR', 'BRL')).toMatch(/R\$\s*12,34/);
    expect(formatFromDigits('', 'pt-BR', 'BRL')).toMatch(/R\$\s*0,00/);
  });

  it('numberFromDigits converts digits buffer to numeric value', () => {
    expect(numberFromDigits('1234')).toBeCloseTo(12.34);
    expect(numberFromDigits('')).toBe(0);
  });
});
import { describe, it, expect } from 'vitest'
import { digitsFromString, formatFromDigits, numberFromDigits, digitsFromValue } from './format'

describe('format utilities', () => {
  it('digitsFromString removes nondigits', () => {
    expect(digitsFromString('R$ 12,34')).toBe('1234')
    expect(digitsFromString('00123')).toBe('00123')
    expect(digitsFromString('abc')).toBe('')
  })

  it('digitsFromValue handles numbers and formatted strings', () => {
    expect(digitsFromValue(12.34)).toBe('1234')
    expect(digitsFromValue('1.234,56')).toBe('123456')
    expect(digitsFromValue('R$ 9,90')).toBe('990')
    expect(digitsFromValue('')).toBe('')
  })

  it('formatFromDigits and numberFromDigits roundtrip', () => {
    const digits = '12345' // 123.45
    const formatted = formatFromDigits(digits, 'pt-BR', 'BRL')
    expect(formatted).toMatch(/R\$/)
    const num = numberFromDigits(digits)
    expect(num).toBeCloseTo(123.45)
  })
})

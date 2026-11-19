import { it, expect } from 'vitest';
import { validateProductDetails } from './validateDetails';
import { getProduct } from './products';
it('rejects whitespace, negative and non-finite numbers before progressing', () => {
  for (const vehiclesCount of [' ', '-1', 'Infinity', 'NaN', true]) expect(validateProductDetails(getProduct('auto'), { vehiclesCount })).not.toBeNull();
  expect(validateProductDetails(getProduct('auto'), { vehiclesCount: '2', currentlyInsured: false })).toBeNull();
});
it('validates catalog choices without rejecting explicit false or zero values', () => {
  expect(validateProductDetails(getProduct('home'), { ownership: 'Own', roofAge: '0', currentlyInsured: false })).toBeNull();
  expect(validateProductDetails(getProduct('home'), { ownership: 'invalid' })).toContain('available option');
  expect(validateProductDetails(undefined, {})).toContain('product');
});

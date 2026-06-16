import { describe, expect, it } from 'vitest';
import { SubmitAccountCancellationByCodeBodySchema } from '@fastgpt/global/openapi/support/user/account/cancellation/api';

describe('SubmitAccountCancellationByCodeBodySchema', () => {
  it('only accepts 6-digit account cancellation codes', () => {
    expect(SubmitAccountCancellationByCodeBodySchema.parse({ code: ' 123456 ' })).toEqual({
      code: '123456'
    });

    for (const code of ['.*', '12345', '1234567', 'abcdef']) {
      expect(() => SubmitAccountCancellationByCodeBodySchema.parse({ code })).toThrow();
    }
  });
});

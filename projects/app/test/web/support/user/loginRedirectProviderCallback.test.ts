import { afterEach, describe, expect, it, vi } from 'vitest';

describe('OAuth provider callback url', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses root login provider path when base path is empty', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');
    vi.resetModules();

    const { getOAuthProviderCallbackUrl } =
      await import('../../../../src/web/support/user/loginRedirect/url');

    expect(getOAuthProviderCallbackUrl('https://fastgpt.example.com')).toBe(
      'https://fastgpt.example.com/login/provider'
    );
  });

  it('includes NEXT_PUBLIC_BASE_URL in the callback path', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '/fastgpt');
    vi.resetModules();

    const { getOAuthProviderCallbackUrl } =
      await import('../../../../src/web/support/user/loginRedirect/url');

    expect(getOAuthProviderCallbackUrl('https://fastgpt.example.com')).toBe(
      'https://fastgpt.example.com/fastgpt/login/provider'
    );
  });
});

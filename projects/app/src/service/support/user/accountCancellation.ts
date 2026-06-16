import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import {
  buildAccountSecurityOAuthUrl,
  getAccountSecurityOAuthCallbackUrl
} from '@fastgpt/service/support/user/accountSecurity';
import type { ApiRequestProps } from '@fastgpt/service/type/next';

/**
 * 从请求中提取账户注销流程需要透传的头部信息。
 * 主要用于在内部转发请求时保留用户身份标识（Cookie/Token）及客户端网络特征。
 */
export const pickAccountCancellationForwardHeaders = (req: ApiRequestProps) => {
  const headers: Record<string, string> = {};
  const allowList = [
    'cookie',
    'token',
    'authorization',
    'x-forwarded-for',
    'x-real-ip',
    'user-agent'
  ];

  for (const key of allowList) {
    const value = req.headers?.[key];
    if (value) {
      // Next.js headers 可能是数组，统一转换为字符串
      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }

  return headers;
};

/**
 * 获取账户注销的 OAuth 回调地址。
 * 复用现有的 `/login/provider` 路径，避免在 GitHub/Google 等第三方平台额外配置专用的注销回调地址。
 * 优先使用 `origin` 头，其次通过代理头组合构建完整 URL。
 */
export const getAccountCancellationCallbackUrl = (req: ApiRequestProps) => {
  return getAccountSecurityOAuthCallbackUrl(req);
};

/**
 * 构建指向第三方 OAuth 提供商的账户注销授权 URL。
 * 根据提供商类型生成对应的授权端点链接，携带必要的 scope 和 state。
 * @returns 返回授权 URL 字符串，若提供商不支持则返回 undefined；若配置缺失则返回 rejected Promise。
 */
export const buildAccountCancellationOAuthUrl = ({
  provider,
  state,
  callbackUrl
}: {
  provider: `${OAuthEnum}`;
  state: string;
  callbackUrl: string;
}) => {
  if (
    provider === OAuthEnum.google ||
    provider === OAuthEnum.github ||
    provider === OAuthEnum.microsoft
  ) {
    return buildAccountSecurityOAuthUrl({
      provider: provider as OAuthEnum,
      state,
      callbackUrl
    });
  }

  return undefined;
};

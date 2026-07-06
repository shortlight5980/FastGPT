import type { NextApiResponse } from 'next';
import type { ApiRequestProps } from '../../type/next';
import { jsonRes } from '../response';

export type ApiRequestMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

type RejectUnsupportedMethodProps = {
  req: ApiRequestProps;
  res: NextApiResponse;
  methods: ApiRequestMethod | ApiRequestMethod[];
};

const normalizeMethods = (methods: ApiRequestMethod | ApiRequestMethod[]) =>
  Array.isArray(methods) ? methods : [methods];

/**
 * 校验 API 请求是否命中允许的 HTTP method，失败时直接返回 405。
 *
 * 该函数用于 API 边界的协议校验，避免错误 method 继续进入鉴权、外部服务调用或状态变更逻辑。
 */
export function rejectUnsupportedMethod({
  req,
  res,
  methods
}: RejectUnsupportedMethodProps): boolean {
  const allowedMethods = normalizeMethods(methods);
  const requestMethod = req.method?.toUpperCase();

  if (requestMethod && allowedMethods.includes(requestMethod as ApiRequestMethod)) {
    return false;
  }

  res.setHeader('Allow', allowedMethods.join(', '));
  jsonRes(res, { code: 405, error: 'Method not allowed' });
  return true;
}

/**
 * NextAPI 前置中间件：只允许指定 HTTP method 继续执行后续 handler。
 */
export const useAllowedMethods =
  (methods: ApiRequestMethod | ApiRequestMethod[]) =>
  async (req: ApiRequestProps, res: NextApiResponse) => {
    rejectUnsupportedMethod({ req, res, methods });
  };

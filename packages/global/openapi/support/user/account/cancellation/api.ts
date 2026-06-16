import { z } from 'zod';
import { OAuthEnum } from '../../../../../support/user/constant';
import {
  AccountDeletionStatusEnum,
  AccountDeletionVerifyMethodEnum
} from '../../../../../support/user/accountDeletion/constants';

/* ============================================================================
 * API: 获取账号注销状态
 * Route: GET /api/support/user/account/cancellation/status
 * Method: GET
 * Description: 获取当前登录账号的注销等待期状态与可用验证方式
 * Tags: ['User', 'AccountCancellation', 'Read']
 * ============================================================================ */

const AccountCancellationAvailableVerifyMethodSchema = z.enum(AccountDeletionVerifyMethodEnum);

export const AccountCancellationStatusResponseSchema = z.object({
  status: z
    .enum(['none', AccountDeletionStatusEnum.pending, AccountDeletionStatusEnum.finalizing])
    .meta({
      example: 'pending',
      description:
        '注销状态。none 表示未申请注销，pending 表示处于 15 天等待期，finalizing 表示正在执行最终资源清理。'
    }),
  requestedAt: z.coerce.date().optional().meta({
    example: '2026-06-01T00:00:00.000Z',
    description: '注销申请时间'
  }),
  scheduledDeleteAt: z.coerce.date().optional().meta({
    example: '2026-06-16T00:00:00.000Z',
    description: '预计最终注销时间'
  }),
  canRequestCancellation: z.boolean().meta({
    example: true,
    description: '当前账号是否允许发起新的注销申请'
  }),
  availableVerifyMethods: z.array(AccountCancellationAvailableVerifyMethodSchema).meta({
    example: [AccountDeletionVerifyMethodEnum.code, AccountDeletionVerifyMethodEnum.wechat],
    description: '当前账号可用的身份验证方式'
  }),
  oauthProvider: z.enum(OAuthEnum).optional().meta({
    example: OAuthEnum.github,
    description: '第三方账号注销验证对应的 OAuth 服务商，仅当验证方式为 oauth 时返回'
  }),
  maskedAccount: z.string().optional().meta({
    example: '138****3911',
    description: '脱敏后的当前账号'
  }),
  authAccount: z.string().optional().meta({
    example: '13800003911',
    description: '当前账号图形验证码 key，仅用于当前登录态页面获取图形验证码'
  })
});
export type AccountCancellationStatusResponseType = z.infer<
  typeof AccountCancellationStatusResponseSchema
>;

/* ============================================================================
 * API: 发送账号注销验证码
 * Route: POST /api/support/user/account/cancellation/sendCode
 * Method: POST
 * Description: 向当前登录账号发送注销确认验证码
 * Tags: ['User', 'AccountCancellation', 'Write']
 * ============================================================================ */

export const SendAccountCancellationCodeBodySchema = z.object({
  captcha: z.string().trim().min(1).meta({
    example: 'a1b2c3',
    description: '图形验证码'
  }),
  googleToken: z.string().trim().meta({
    example: 'google-recaptcha-token',
    description: 'Google reCAPTCHA token'
  })
});
export type SendAccountCancellationCodeBodyType = z.infer<
  typeof SendAccountCancellationCodeBodySchema
>;

export const SendAccountCancellationCodeResponseSchema = z.object({
  message: z.string().meta({
    example: '发送验证码成功',
    description: '发送结果'
  })
});
export type SendAccountCancellationCodeResponseType = z.infer<
  typeof SendAccountCancellationCodeResponseSchema
>;

/* ============================================================================
 * API: 通过验证码提交账号注销
 * Route: POST /api/support/user/account/cancellation/submitByCode
 * Method: POST
 * Description: 校验验证码后将当前账号置为注销等待期
 * Tags: ['User', 'AccountCancellation', 'Write']
 * ============================================================================ */

export const SubmitAccountCancellationByCodeBodySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .meta({
      example: '123456',
      description: '6 位数字注销确认验证码'
    })
});
export type SubmitAccountCancellationByCodeBodyType = z.infer<
  typeof SubmitAccountCancellationByCodeBodySchema
>;

export const AccountCancellationActiveResponseSchema = z.object({
  status: z.enum([AccountDeletionStatusEnum.pending, AccountDeletionStatusEnum.finalizing]).meta({
    example: AccountDeletionStatusEnum.pending,
    description: '注销处理中状态'
  }),
  requestedAt: z.coerce.date().meta({
    example: '2026-06-01T00:00:00.000Z',
    description: '注销申请时间'
  }),
  scheduledDeleteAt: z.coerce.date().meta({
    example: '2026-06-16T00:00:00.000Z',
    description: '预计最终注销时间'
  })
});

export const AccountCancellationPendingResponseSchema =
  AccountCancellationActiveResponseSchema.extend({
    status: z.literal(AccountDeletionStatusEnum.pending).meta({
      example: AccountDeletionStatusEnum.pending,
      description: '注销等待期状态'
    })
  });
export type AccountCancellationActiveResponseType = z.infer<
  typeof AccountCancellationActiveResponseSchema
>;
export type AccountCancellationPendingResponseType = z.infer<
  typeof AccountCancellationPendingResponseSchema
>;

/* ============================================================================
 * API: 获取账号注销微信二维码
 * Route: POST /api/support/user/account/cancellation/wechat/getQR
 * Method: POST
 * Description: 获取用于账号注销身份验证的微信扫码二维码
 * Tags: ['User', 'AccountCancellation', 'Write']
 * ============================================================================ */

export const GetAccountCancellationWechatQRResponseSchema = z.object({
  code: z.string().meta({ example: 'wx-auth-code', description: '二维码轮询 code' }),
  codeUrl: z.string().meta({ example: 'https://example.com/qrcode', description: '二维码 URL' })
});
export type GetAccountCancellationWechatQRResponseType = z.infer<
  typeof GetAccountCancellationWechatQRResponseSchema
>;

/* ============================================================================
 * API: 轮询账号注销微信验证
 * Route: POST /api/support/user/account/cancellation/wechat/check
 * Method: POST
 * Description: 检查微信扫码结果并提交账号注销
 * Tags: ['User', 'AccountCancellation', 'Write']
 * ============================================================================ */

export const CheckAccountCancellationWechatBodySchema = z.object({
  code: z.string().trim().min(1).meta({ example: 'wx-auth-code', description: '二维码 code' })
});
export type CheckAccountCancellationWechatBodyType = z.infer<
  typeof CheckAccountCancellationWechatBodySchema
>;

export const CheckAccountCancellationWechatResponseSchema =
  AccountCancellationPendingResponseSchema.nullable();
export type CheckAccountCancellationWechatResponseType = z.infer<
  typeof CheckAccountCancellationWechatResponseSchema
>;

/* ============================================================================
 * API: 开始账号注销 OAuth 验证
 * Route: POST /api/support/user/account/cancellation/oauth/start
 * Method: POST
 * Description: 创建注销 OAuth 验证 state 并返回跳转 URL
 * Tags: ['User', 'AccountCancellation', 'Write']
 * ============================================================================ */

export const StartAccountCancellationOAuthBodySchema = z.object({
  provider: z.enum(OAuthEnum).meta({
    example: OAuthEnum.github,
    description: 'OAuth 服务商'
  })
});
export type StartAccountCancellationOAuthBodyType = z.infer<
  typeof StartAccountCancellationOAuthBodySchema
>;

export const StartAccountCancellationOAuthResponseSchema = z.object({
  url: z.string().meta({
    example: 'https://github.com/login/oauth/authorize?...',
    description: '第三方 OAuth 跳转地址'
  }),
  state: z.string().meta({
    example: 'oauth-state',
    description: '本次 OAuth 验证 state，前端用于回调页校验登录态中的发起请求'
  })
});
export type StartAccountCancellationOAuthResponseType = z.infer<
  typeof StartAccountCancellationOAuthResponseSchema
>;

/* ============================================================================
 * API: 确认账号注销 OAuth 验证
 * Route: POST /api/support/user/account/cancellation/oauth/confirm
 * Method: POST
 * Description: 使用第三方 OAuth 回调参数复核当前账号身份并提交注销
 * Tags: ['User', 'AccountCancellation', 'Write']
 * ============================================================================ */

export const ConfirmAccountCancellationOAuthBodySchema = z.object({
  provider: z.enum(OAuthEnum).meta({
    example: OAuthEnum.github,
    description: 'OAuth 服务商'
  }),
  state: z.string().trim().min(1).meta({
    example: 'oauth-state',
    description: 'OAuth 回调 state'
  }),
  callbackUrl: z.string().trim().min(1).meta({
    example: 'https://fastgpt.example.com/login/provider',
    description: 'OAuth 回调地址'
  }),
  props: z.record(z.string(), z.string()).meta({
    example: { code: 'oauth-code' },
    description: '第三方 OAuth 回调参数'
  })
});
export type ConfirmAccountCancellationOAuthBodyType = z.infer<
  typeof ConfirmAccountCancellationOAuthBodySchema
>;

/* ============================================================================
 * API: 取消账号注销
 * Route: DELETE /api/support/user/account/cancellation/cancel
 * Method: DELETE
 * Description: 取消当前登录账号的注销等待期
 * Tags: ['User', 'AccountCancellation', 'Delete']
 * ============================================================================ */

export const CancelAccountCancellationResponseSchema = z.object({
  success: z.boolean().meta({
    example: true,
    description: '是否已取消注销'
  })
});
export type CancelAccountCancellationResponseType = z.infer<
  typeof CancelAccountCancellationResponseSchema
>;

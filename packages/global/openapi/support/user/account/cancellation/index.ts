import type { OpenAPIPath } from '../../../../type';
import { DevApiTagsMap } from '../../../../tag';
import {
  AccountCancellationPendingResponseSchema,
  AccountCancellationStatusResponseSchema,
  CancelAccountCancellationResponseSchema,
  CheckAccountCancellationWechatBodySchema,
  CheckAccountCancellationWechatResponseSchema,
  ConfirmAccountCancellationOAuthBodySchema,
  GetAccountCancellationWechatQRResponseSchema,
  SendAccountCancellationCodeBodySchema,
  SendAccountCancellationCodeResponseSchema,
  StartAccountCancellationOAuthBodySchema,
  StartAccountCancellationOAuthResponseSchema,
  SubmitAccountCancellationByCodeBodySchema
} from './api';

export const AccountCancellationPath: OpenAPIPath = {
  '/support/user/account/cancellation/status': {
    get: {
      summary: '获取账号注销状态',
      description: '获取当前登录账号的注销等待期状态与可用验证方式',
      tags: [DevApiTagsMap.userLogin],
      responses: {
        200: {
          description: '注销状态',
          content: {
            'application/json': {
              schema: AccountCancellationStatusResponseSchema
            }
          }
        }
      }
    }
  },
  '/support/user/account/cancellation/sendCode': {
    post: {
      summary: '发送账号注销验证码',
      description: '向当前登录账号发送注销确认验证码',
      tags: [DevApiTagsMap.userLogin],
      requestBody: {
        content: {
          'application/json': {
            schema: SendAccountCancellationCodeBodySchema
          }
        }
      },
      responses: {
        200: {
          description: '发送成功',
          content: {
            'application/json': {
              schema: SendAccountCancellationCodeResponseSchema
            }
          }
        }
      }
    }
  },
  '/support/user/account/cancellation/submitByCode': {
    post: {
      summary: '通过验证码提交账号注销',
      description: '校验当前账号收到的验证码后进入 15 天注销等待期',
      tags: [DevApiTagsMap.userLogin],
      requestBody: {
        content: {
          'application/json': {
            schema: SubmitAccountCancellationByCodeBodySchema
          }
        }
      },
      responses: {
        200: {
          description: '验证码确认成功后返回注销等待期信息',
          content: {
            'application/json': {
              schema: AccountCancellationPendingResponseSchema
            }
          }
        }
      }
    }
  },
  '/support/user/account/cancellation/wechat/getQR': {
    post: {
      summary: '获取注销微信二维码',
      description: '获取当前账号注销验证所需的微信二维码',
      tags: [DevApiTagsMap.userLogin],
      responses: {
        200: {
          description: '二维码信息',
          content: {
            'application/json': {
              schema: GetAccountCancellationWechatQRResponseSchema
            }
          }
        }
      }
    }
  },
  '/support/user/account/cancellation/wechat/check': {
    post: {
      summary: '轮询注销微信验证',
      description: '检查微信扫码结果并在身份一致时进入注销等待期',
      tags: [DevApiTagsMap.userLogin],
      requestBody: {
        content: {
          'application/json': {
            schema: CheckAccountCancellationWechatBodySchema
          }
        }
      },
      responses: {
        200: {
          description: '已进入注销等待期',
          content: {
            'application/json': {
              schema: CheckAccountCancellationWechatResponseSchema
            }
          }
        }
      }
    }
  },
  '/support/user/account/cancellation/oauth/start': {
    post: {
      summary: '开始注销 OAuth 验证',
      description: '生成第三方 OAuth 身份复核链接',
      tags: [DevApiTagsMap.userLogin],
      requestBody: {
        content: {
          'application/json': {
            schema: StartAccountCancellationOAuthBodySchema
          }
        }
      },
      responses: {
        200: {
          description: 'OAuth 跳转地址',
          content: {
            'application/json': {
              schema: StartAccountCancellationOAuthResponseSchema
            }
          }
        }
      }
    }
  },
  '/support/user/account/cancellation/oauth/confirm': {
    post: {
      summary: '确认注销 OAuth 验证',
      description: '校验第三方 OAuth 回调身份并在身份一致时进入注销等待期',
      tags: [DevApiTagsMap.userLogin],
      requestBody: {
        content: {
          'application/json': {
            schema: ConfirmAccountCancellationOAuthBodySchema
          }
        }
      },
      responses: {
        200: {
          description: '已进入注销等待期',
          content: {
            'application/json': {
              schema: AccountCancellationPendingResponseSchema
            }
          }
        }
      }
    }
  },
  '/support/user/account/cancellation/cancel': {
    delete: {
      summary: '取消账号注销',
      description: '取消当前账号的注销等待期',
      tags: [DevApiTagsMap.userLogin],
      responses: {
        200: {
          description: '取消成功',
          content: {
            'application/json': {
              schema: CancelAccountCancellationResponseSchema
            }
          }
        }
      }
    }
  }
};

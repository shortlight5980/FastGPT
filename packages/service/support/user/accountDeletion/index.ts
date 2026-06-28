import { addDays } from 'date-fns';
import { UserErrEnum } from '@fastgpt/global/common/error/code/user';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';
import {
  accountDeletionWaitDays,
  AccountDeletionStatusEnum,
  AccountDeletionVerifyModeEnum,
  AccountDeletionVerifyMethodEnum
} from '@fastgpt/global/support/user/accountDeletion/constants';
import type {
  AccountDeletionSchemaType,
  AccountDeletionVerifyMethodType,
  AccountDeletionUserState,
  TeamAccountDeletionState
} from '@fastgpt/global/support/user/accountDeletion/type';
import { customNanoid } from '@fastgpt/global/common/string/tools';
import { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import { authCode, addAuthCode } from '../auth/controller';
import { MongoUser } from '../schema';
import { delUserAllSession } from '../session';
import { MongoTeam } from '../team/teamSchema';
import { MongoAccountDeletion } from './schema';
import { checkTimerLock } from '../../../common/system/timerLock/utils';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import {
  resolveAccountCancellation,
  maskUserAccount,
  type AccountCancellationResolveResult
} from '@fastgpt/global/support/user/auth/account';
import {
  assertAccountSecurityOAuthStateOwner,
  consumeAccountSecurityOAuthState,
  createAccountSecurityOAuthState
} from '../accountSecurity';

const pendingAccountDeletionStatuses = [
  AccountDeletionStatusEnum.pending,
  AccountDeletionStatusEnum.finalizing
] as const;
const pendingAccountDeletionStatusFilter = {
  $in: pendingAccountDeletionStatuses
};
const isPendingAccountDeletionStatus = (status?: string) =>
  pendingAccountDeletionStatuses.some((pendingStatus) => pendingStatus === status);

export const getAccountDeletionAuthKey = (userId: string) => `accountDeletion:${userId}`;

export const maskAccount = (account?: string) => maskUserAccount(account);

/**
 * 将数据库中的账号注销记录格式化为前端展示所需的待注销状态。
 * 该函数会校验必要的时间字段，并根据当前状态映射为标准的 pending 或 finalizing 状态。
 */
export const formatAccountDeletionPendingResponse = (
  record: Pick<AccountDeletionSchemaType, 'status' | 'requestedAt' | 'scheduledDeleteAt'>
): AccountDeletionUserState => {
  if (!record.requestedAt || !record.scheduledDeleteAt) {
    throw new Error('Invalid account deletion pending record');
  }

  return {
    status:
      record.status === AccountDeletionStatusEnum.finalizing
        ? AccountDeletionStatusEnum.finalizing
        : AccountDeletionStatusEnum.pending,
    requestedAt: record.requestedAt,
    scheduledDeleteAt: record.scheduledDeleteAt
  };
};

/**
 * 将 owner 团队停服记录格式化为前端可识别的 teamAccountDeletion 状态。
 * ownerUserId 用于区分“当前待注销 owner 本人”与“受影响的普通成员”。
 */
export const formatTeamAccountDeletionPendingResponse = (
  record: Pick<AccountDeletionSchemaType, 'userId' | 'status' | 'requestedAt' | 'scheduledDeleteAt'>
): TeamAccountDeletionState => ({
  ...formatAccountDeletionPendingResponse(record),
  ownerUserId: String(record.userId)
});

/**
 * 根据用户 ID 查询处于待注销或最终确认状态的注销记录。
 * 用于判断用户当前是否处于注销流程中，以及获取相关的注销时间信息。
 */
export const getPendingAccountDeletionByUserId = (userId?: string) => {
  if (!userId) return null;
  return MongoAccountDeletion.findOne({
    userId,
    status: pendingAccountDeletionStatusFilter
  }).lean();
};

export const getPendingAccountDeletionByTeamId = (teamId?: string) => {
  if (!teamId) return null;
  return MongoAccountDeletion.findOne({
    ownerTeamIds: teamId,
    status: pendingAccountDeletionStatusFilter
  }).lean();
};

/**
 * 将全局配置和用户账号信息合并为注销验证策略。
 * 所有注销入口都必须使用该函数，保证按钮展示、发送验证码和最终提交的判断一致。
 */
export const getAccountCancellationEligibility = ({
  username
}: {
  username?: string;
}): AccountCancellationResolveResult =>
  resolveAccountCancellation({
    username,
    enabled: global.feConfigs?.accountCancellation?.enabled === true,
    isGithubOAuthEnabled: !!global.feConfigs?.oauth?.github,
    isGoogleOAuthEnabled: !!global.feConfigs?.oauth?.google,
    isMicrosoftOAuthEnabled: !!global.feConfigs?.oauth?.microsoft?.clientId,
    isInternalWecomEnabled: global.feConfigs?.oauth?.wecom === true,
    isSsoEnabled: !!global.feConfigs?.sso?.url
  });

const getUnsupportedAccountCancellationMessage = () => '当前账号不支持自助注销';

/**
 * 校验账号注销验证方式是否与当前账号支持的策略一致。
 * 用于在发起注销请求前，确保前端传入的验证模式（验证码/OAuth/微信等）符合服务端推导的结果，
 * 防止绕过安全校验或使用错误的 OAuth 提供商进行注销。
 */
const assertAccountCancellationMethod = (
  eligibility: AccountCancellationResolveResult,
  {
    verifyMode,
    provider
  }: {
    verifyMode: AccountDeletionVerifyModeEnum;
    provider?: `${OAuthEnum}`;
  }
) => {
  if (eligibility.verifyMode !== verifyMode) {
    throw getUnsupportedAccountCancellationMessage();
  }
  if (
    verifyMode === AccountDeletionVerifyModeEnum.oauth &&
    eligibility.oauthProvider !== provider
  ) {
    throw 'OAuth provider mismatch';
  }
};

/**
 * 为注销 OAuth 身份复核创建一次性 state。state 仅绑定当前 userId/provider，
 * 回调确认时消费后删除，避免第三方回调参数被复用到其他账号。
 */
export const createAccountDeletionOAuthState = async ({
  userId,
  provider
}: {
  userId: string;
  provider: `${OAuthEnum}`;
}) => {
  const user = await MongoUser.findById(userId, {
    username: 1,
    contact: 1
  }).lean();
  if (!user) {
    return Promise.reject(UserErrEnum.notUser);
  }

  assertAccountCancellationMethod(getAccountCancellationEligibility(user), {
    verifyMode: AccountDeletionVerifyModeEnum.oauth,
    provider
  });

  return createAccountSecurityOAuthState({
    userId,
    provider: provider as OAuthEnum,
    purpose: UserAuthTypeEnum.accountDeletion
  });
};

/**
 * 消费注销 OAuth state 并校验归属。消费成功或失败都会删除记录，
 * 让第三方回调天然具备一次性语义。
 */
export const consumeAccountDeletionOAuthState = async ({
  state,
  userId,
  provider
}: {
  state: string;
  userId: string;
  provider: `${OAuthEnum}`;
}) => {
  await consumeAccountSecurityOAuthState({
    state,
    userId,
    provider: provider as OAuthEnum,
    purpose: UserAuthTypeEnum.accountDeletion
  });
};

/**
 * 仅校验注销 OAuth state 的 user/provider 归属，不删除 state。
 * OAuth 回调确认会先用它挡住跨账号/跨 provider 回调，再在第三方身份通过后消费 state。
 */
export const assertAccountDeletionOAuthStateOwner = async ({
  state,
  userId,
  provider
}: {
  state: string;
  userId: string;
  provider: `${OAuthEnum}`;
}) => {
  await assertAccountSecurityOAuthStateOwner({
    state,
    userId,
    provider: provider as OAuthEnum,
    purpose: UserAuthTypeEnum.accountDeletion
  });
};

/**
 * 查询当前账号注销状态。可用验证方式只由服务端根据当前账号推导，
 * 避免前端传入任意账号触发验证码或第三方身份复核。
 */
export const getAccountCancellationStatus = async ({ userId }: { userId: string }) => {
  const user = await MongoUser.findById(userId, {
    username: 1,
    contact: 1
  }).lean();

  if (!user) {
    return Promise.reject(UserErrEnum.notUser);
  }

  const pendingRecord = await getPendingAccountDeletionByUserId(userId);
  const eligibility = getAccountCancellationEligibility(user);
  const authAccount = eligibility.authAccount;
  const canRequestCancellation =
    !pendingRecord && eligibility.verifyMode !== AccountDeletionVerifyModeEnum.unsupported;
  const verifyStatus = {
    canRequestCancellation,
    availableVerifyMethods: eligibility.availableVerifyMethods,
    ...(eligibility.oauthProvider ? { oauthProvider: eligibility.oauthProvider } : {}),
    maskedAccount: maskAccount(authAccount),
    ...(authAccount ? { authAccount } : {})
  };

  if (pendingRecord) {
    return {
      ...formatAccountDeletionPendingResponse(pendingRecord),
      ...verifyStatus
    };
  }

  return {
    status: 'none' as const,
    ...verifyStatus
  };
};

/**
 * 创建账号注销验证码。图形验证码按当前登录账号校验，短信/邮件验证码按 userId 存储，
 * 这样即使前端篡改账号字段，也无法把注销验证码绑定到其他用户。
 */
export const createAccountDeletionCode = async ({
  userId,
  captcha,
  beforeCreateCode
}: {
  userId: string;
  captcha: string;
  beforeCreateCode?: (props: {
    target: string;
    name: string;
    lang: string;
  }) => void | Promise<void>;
}) => {
  const user = await MongoUser.findById(userId, {
    username: 1,
    contact: 1,
    language: 1
  }).lean();
  if (!user) {
    return Promise.reject(UserErrEnum.notUser);
  }

  const pendingRecord = await getPendingAccountDeletionByUserId(userId);
  if (pendingRecord) {
    // 注销已进入等待期/最终清理阶段后，不再重复触发验证码发送副作用。
    return Promise.reject(UserErrEnum.accountDeletionPending);
  }

  const eligibility = getAccountCancellationEligibility(user);
  assertAccountCancellationMethod(eligibility, {
    verifyMode: AccountDeletionVerifyModeEnum.code
  });
  const target = eligibility.authAccount;
  if (!target) return Promise.reject(getUnsupportedAccountCancellationMessage());

  await authCode({
    key: target,
    type: UserAuthTypeEnum.captcha,
    // 图形验证码生成时统一存小写；这里保留用户输入大小写不敏感的体验。
    code: captcha.toLowerCase()
  });

  await beforeCreateCode?.({
    target,
    name: user.username,
    lang: user.language || 'zh-CN'
  });

  if (
    !(await checkTimerLock({
      timerId: `auth--${userId}--${UserAuthTypeEnum.accountDeletion}`,
      lockMinuted: 1
    }))
  ) {
    return Promise.reject('common:error.send_auth_code_too_frequently');
  }

  const code = customNanoid('123456789', 6);
  await addAuthCode({
    key: getAccountDeletionAuthKey(userId),
    type: UserAuthTypeEnum.accountDeletion,
    code
  });

  return {
    code,
    target,
    name: user.username,
    lang: user.language || 'zh-CN'
  };
};

/**
 * 将账号正式置入注销等待期。该函数保持幂等：已 pending 的账号会返回原记录，
 * 未 pending 的账号会记录当前 owner 团队快照并踢出全部登录态。
 */
export const submitAccountDeletion = async ({
  userId,
  verifyMethod,
  verifyProvider
}: {
  userId: string;
  verifyMethod: AccountDeletionVerifyMethodType;
  verifyProvider?: string;
}) => {
  const user = await MongoUser.findById(userId);
  if (!user) {
    return Promise.reject(UserErrEnum.notUser);
  }
  if (user.username === 'root') {
    return Promise.reject('Root account can not be deleted');
  }
  if (user.status === UserStatusEnum.forbidden) {
    return Promise.reject('Invalid account');
  }

  const existed = await MongoAccountDeletion.findOne({
    userId,
    status: pendingAccountDeletionStatusFilter
  });
  if (existed) {
    await delUserAllSession(userId);
    return formatAccountDeletionPendingResponse(existed);
  }

  const eligibility = getAccountCancellationEligibility({
    username: user.username
  });
  assertAccountCancellationMethod(eligibility, {
    verifyMode: verifyMethod as AccountDeletionVerifyModeEnum,
    provider: verifyProvider as `${OAuthEnum}` | undefined
  });

  const ownerTeams = await MongoTeam.find({ ownerId: userId }, '_id').lean();
  const requestedAt = new Date();
  const scheduledDeleteAt = addDays(requestedAt, accountDeletionWaitDays);
  // userId 有唯一索引，用 $setOnInsert 原子创建，避免并发提交在 create 阶段抛 E11000。
  const record = await MongoAccountDeletion.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        usernameSnapshot: user.username,
        contactSnapshot: user.contact,
        status: AccountDeletionStatusEnum.pending,
        verifyMethod,
        verifyProvider,
        requestedAt,
        scheduledDeleteAt,
        ownerTeamIds: ownerTeams.map((team) => team._id),
        updateTime: requestedAt
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
  if (!record || !isPendingAccountDeletionStatus(record.status)) {
    return Promise.reject('Invalid account deletion status');
  }

  const pending = formatAccountDeletionPendingResponse(record);

  await delUserAllSession(userId);

  return pending;
};

export const submitAccountDeletionByCode = async ({
  userId,
  code
}: {
  userId: string;
  code: string;
}) => {
  await authCode({
    key: getAccountDeletionAuthKey(userId),
    type: UserAuthTypeEnum.accountDeletion,
    code
  });

  return submitAccountDeletion({
    userId,
    verifyMethod: AccountDeletionVerifyMethodEnum.code
  });
};

export const submitAccountDeletionByWechat = async ({
  userId,
  username
}: {
  userId: string;
  username: string;
}) => {
  const user = await MongoUser.findById(userId, { username: 1 }).lean();
  if (!user) {
    return Promise.reject(UserErrEnum.notUser);
  }
  if (user.username !== username) {
    return Promise.reject('Wechat account mismatch');
  }
  assertAccountCancellationMethod(getAccountCancellationEligibility(user), {
    verifyMode: AccountDeletionVerifyModeEnum.wechat
  });

  return submitAccountDeletion({
    userId,
    verifyMethod: AccountDeletionVerifyMethodEnum.wechat,
    verifyProvider: OAuthEnum.wechat
  });
};

export const submitAccountDeletionByOAuth = async ({
  userId,
  username,
  provider
}: {
  userId: string;
  username: string;
  provider: `${OAuthEnum}`;
}) => {
  const user = await MongoUser.findById(userId, { username: 1, contact: 1 }).lean();
  if (!user) {
    return Promise.reject(UserErrEnum.notUser);
  }
  if (user.username !== username) {
    return Promise.reject('OAuth account mismatch');
  }
  assertAccountCancellationMethod(getAccountCancellationEligibility(user), {
    verifyMode: AccountDeletionVerifyModeEnum.oauth,
    provider
  });

  return submitAccountDeletion({
    userId,
    verifyMethod: AccountDeletionVerifyMethodEnum.oauth,
    verifyProvider: provider
  });
};

/**
 * 取消注销等待期。取消只删除 pending 记录，不恢复历史 session；
 * 用户当前重新登录的 session 保持有效，账号后续按普通状态使用。
 */
export const cancelAccountDeletion = async ({ userId }: { userId: string }) => {
  const { deletedCount } = await MongoAccountDeletion.deleteOne({
    userId,
    status: AccountDeletionStatusEnum.pending
  });

  if (deletedCount === 0) {
    const record = await MongoAccountDeletion.findOne(
      { userId, status: AccountDeletionStatusEnum.finalizing },
      { _id: 1 }
    ).lean();

    if (record) {
      return Promise.reject('账号已进入资源清理阶段，无法取消注销');
    }

    return Promise.reject('未找到待取消的注销申请');
  }

  return { success: true };
};

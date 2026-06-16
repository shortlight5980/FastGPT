export const accountDeletionWaitDays = 15;
export const accountDeletionDeletedUsernameReg = /-[a-z][a-zA-Z0-9]{7}-deleted$/;

/**
 * 判断用户名是否为系统账号注销流程生成的匿名用户名。
 * 只匹配 buildDeletedUsername 生成的 nanoid 后缀，避免误伤普通用户名以 deleted 结尾的账号。
 */
export const isAccountDeletionDeletedUsername = (username: string) =>
  accountDeletionDeletedUsernameReg.test(username);

export enum AccountDeletionStatusEnum {
  verifying = 'verifying',
  pending = 'pending',
  finalizing = 'finalizing',
  completed = 'completed'
}

export const accountDeletionStatusMap = {
  [AccountDeletionStatusEnum.verifying]: {
    label: 'Verifying'
  },
  [AccountDeletionStatusEnum.pending]: {
    label: 'Pending'
  },
  [AccountDeletionStatusEnum.finalizing]: {
    label: 'Finalizing'
  },
  [AccountDeletionStatusEnum.completed]: {
    label: 'Completed'
  }
};

export enum AccountDeletionVerifyMethodEnum {
  code = 'code',
  wechat = 'wechat',
  oauth = 'oauth',
  admin = 'admin'
}

export enum AccountDeletionVerifyModeEnum {
  code = 'code',
  wechat = 'wechat',
  oauth = 'oauth',
  unsupported = 'unsupported'
}

export enum AccountDeletionReminderEnum {
  sevenDays = '7d',
  oneDay = '1d',
  today = 'today'
}

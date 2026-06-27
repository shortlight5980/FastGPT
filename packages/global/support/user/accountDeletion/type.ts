import type { OAuthEnum } from '../constant';
import type {
  AccountDeletionReminderEnum,
  AccountDeletionStatusEnum,
  AccountDeletionVerifyMethodEnum
} from './constants';

export type AccountDeletionStatusType = `${AccountDeletionStatusEnum}`;
export type AccountDeletionVerifyMethodType = `${AccountDeletionVerifyMethodEnum}`;
export type AccountDeletionReminderType = `${AccountDeletionReminderEnum}`;

export type AccountDeletionSchemaType = {
  _id: string;
  userId: string;
  usernameSnapshot: string;
  contactSnapshot?: string;
  status: AccountDeletionStatusType;
  verifyMethod?: AccountDeletionVerifyMethodType;
  verifyProvider?: `${OAuthEnum}`;
  requestedAt?: Date;
  scheduledDeleteAt?: Date;
  finalizedAt?: Date;
  ownerTeamIds: string[];
  finalizeRetryCount?: number;
  finalizeLastError?: string;
  finalizeLastErrorAt?: Date;
  sentReminders?: AccountDeletionReminderType[];
  createTime: Date;
  updateTime?: Date;
};

export type AccountDeletionUserState = {
  status: AccountDeletionStatusEnum.pending | AccountDeletionStatusEnum.finalizing;
  requestedAt: Date;
  scheduledDeleteAt: Date;
};

export type TeamAccountDeletionState = AccountDeletionUserState & {
  ownerUserId: string;
};

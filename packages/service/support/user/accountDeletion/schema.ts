import { connectionMongo, getMongoModel } from '../../../common/mongo';
import type { AccountDeletionSchemaType } from '@fastgpt/global/support/user/accountDeletion/type';
import {
  accountDeletionStatusMap,
  AccountDeletionReminderEnum,
  AccountDeletionStatusEnum,
  AccountDeletionVerifyMethodEnum
} from '@fastgpt/global/support/user/accountDeletion/constants';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import { userCollectionName } from '../schema';
import { TeamCollectionName } from '@fastgpt/global/support/user/team/constant';
import { getLogger, LogCategories } from '../../../common/logger';

const { Schema } = connectionMongo;
export const accountDeletionCollectionName = 'account_deletions';

const AccountDeletionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: userCollectionName,
    required: true,
    unique: true
  },
  usernameSnapshot: {
    type: String,
    required: true
  },
  contactSnapshot: String,
  status: {
    type: String,
    enum: Object.keys(accountDeletionStatusMap),
    default: AccountDeletionStatusEnum.verifying,
    required: true
  },
  verifyMethod: {
    type: String,
    enum: Object.values(AccountDeletionVerifyMethodEnum)
  },
  verifyProvider: {
    type: String,
    enum: Object.values(OAuthEnum)
  },
  requestedAt: Date,
  scheduledDeleteAt: Date,
  finalizedAt: Date,
  ownerTeamIds: [
    {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName
    }
  ],
  finalizeRetryCount: {
    type: Number,
    default: 0
  },
  finalizeLastError: String,
  finalizeLastErrorAt: Date,
  sentReminders: {
    type: [String],
    enum: Object.values(AccountDeletionReminderEnum),
    default: []
  },
  createTime: {
    type: Date,
    default: () => new Date()
  },
  updateTime: Date
});

try {
  AccountDeletionSchema.index({ status: 1, scheduledDeleteAt: 1 });
  AccountDeletionSchema.index({ ownerTeamIds: 1, status: 1 });
  AccountDeletionSchema.index({ userId: 1, status: 1 });
} catch (error) {
  const logger = getLogger(LogCategories.INFRA.MONGO);
  logger.error('Failed to build account deletion indexes', { error });
  throw error;
}

export const MongoAccountDeletion = getMongoModel<AccountDeletionSchemaType>(
  accountDeletionCollectionName,
  AccountDeletionSchema
);

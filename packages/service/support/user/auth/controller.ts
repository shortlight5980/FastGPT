import { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import { MongoUserAuth } from './schema';
import { i18nT } from '@fastgpt/global/common/i18n/utils';
import { mongoSessionRun } from '../../../common/mongo/sessionRun';
import { UserError } from '@fastgpt/global/common/error/utils';
import { z } from 'zod';
import { addMinutes } from 'date-fns';

export const addAuthCode = async ({
  key,
  code,
  openid,
  type,
  expiredTime
}: {
  key: string;
  code?: string;
  openid?: string;
  type: `${UserAuthTypeEnum}`;
  expiredTime?: Date;
}) => {
  const resolvedExpiredTime = expiredTime ?? addMinutes(new Date(), 5);

  return MongoUserAuth.updateOne(
    {
      key,
      type
    },
    {
      code,
      openid,
      expiredTime: resolvedExpiredTime
    },
    {
      upsert: true
    }
  );
};

const authCodeSchema = z.object({
  key: z.string(),
  type: z.enum(UserAuthTypeEnum),
  code: z.string()
});
export const authCode = async (props: z.infer<typeof authCodeSchema>) => {
  const { key, type, code } = authCodeSchema.parse(props);
  return mongoSessionRun(async (session) => {
    const result = await MongoUserAuth.findOne(
      {
        key,
        type,
        code,
        expiredTime: { $gt: new Date() }
      },
      undefined,
      { session }
    );

    if (!result) {
      return Promise.reject(new UserError(i18nT('common:error.code_error')));
    }

    await result.deleteOne();

    return 'SUCCESS';
  });
};

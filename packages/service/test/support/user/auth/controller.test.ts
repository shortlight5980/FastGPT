import { beforeAll, describe, expect, it, vi } from 'vitest';
import { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import { MongoUserAuth } from '../../../../support/user/auth/schema';

let addAuthCode: typeof import('../../../../support/user/auth/controller').addAuthCode;
let authCode: typeof import('../../../../support/user/auth/controller').authCode;

describe('support/user/auth/controller', () => {
  beforeAll(async () => {
    const controller = await vi.importActual<
      typeof import('../../../../support/user/auth/controller')
    >('../../../../support/user/auth/controller');
    addAuthCode = controller.addAuthCode;
    authCode = controller.authCode;
  });

  describe('authCode', () => {
    it('matches auth codes by exact value and consumes the record', async () => {
      await addAuthCode({
        key: 'accountDeletion:user1',
        type: UserAuthTypeEnum.accountDeletion,
        code: '123456'
      });

      await expect(
        authCode({
          key: 'accountDeletion:user1',
          type: UserAuthTypeEnum.accountDeletion,
          code: '123456'
        })
      ).resolves.toBe('SUCCESS');

      await expect(
        MongoUserAuth.findOne({
          key: 'accountDeletion:user1',
          type: UserAuthTypeEnum.accountDeletion
        })
      ).resolves.toBeNull();
    });

    it('does not treat user input as a regular expression', async () => {
      await addAuthCode({
        key: 'accountDeletion:user2',
        type: UserAuthTypeEnum.accountDeletion,
        code: '654321'
      });

      await expect(
        authCode({
          key: 'accountDeletion:user2',
          type: UserAuthTypeEnum.accountDeletion,
          code: '.*'
        })
      ).rejects.toBeInstanceOf(UserError);

      await expect(
        MongoUserAuth.findOne({
          key: 'accountDeletion:user2',
          type: UserAuthTypeEnum.accountDeletion
        }).lean()
      ).resolves.toMatchObject({
        code: '654321'
      });
    });

    it('rejects expired auth codes that are still waiting for TTL cleanup', async () => {
      await addAuthCode({
        key: 'accountDeletion:user3',
        type: UserAuthTypeEnum.accountDeletion,
        code: '111222',
        expiredTime: new Date(Date.now() - 60_000)
      });

      await expect(
        authCode({
          key: 'accountDeletion:user3',
          type: UserAuthTypeEnum.accountDeletion,
          code: '111222'
        })
      ).rejects.toBeInstanceOf(UserError);

      await expect(
        MongoUserAuth.findOne({
          key: 'accountDeletion:user3',
          type: UserAuthTypeEnum.accountDeletion
        }).lean()
      ).resolves.toMatchObject({
        code: '111222'
      });
    });
  });
});

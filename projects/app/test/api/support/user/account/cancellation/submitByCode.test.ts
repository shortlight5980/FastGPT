import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as submitByCodeApi from '@/pages/api/support/user/account/cancellation/submitByCode';
import { AccountDeletionStatusEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { Call } from '@test/utils/request';

const authCertMock = vi.hoisted(() => vi.fn());
const submitAccountDeletionByCodeMock = vi.hoisted(() => vi.fn());

vi.mock('@fastgpt/service/support/permission/auth/common', () => ({
  authCert: authCertMock
}));

vi.mock('@fastgpt/service/support/user/accountDeletion', () => ({
  submitAccountDeletionByCode: submitAccountDeletionByCodeMock
}));

describe('account cancellation submitByCode API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCertMock.mockResolvedValue({
      userId: 'user-1',
      teamId: 'team-1',
      tmbId: 'tmb-1',
      isRoot: false
    });
    submitAccountDeletionByCodeMock.mockResolvedValue({
      status: AccountDeletionStatusEnum.pending,
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z')
    });
  });

  it('passes pending allow flags to authCert and forwards the code', async () => {
    const res = await Call(submitByCodeApi.default, {
      auth: {
        userId: 'user-1',
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      body: {
        code: '123456'
      }
    });

    expect(res.code).toBe(200);
    expect(authCertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authToken: true,
        allowUserAccountDeletionPending: true,
        allowCurrentUserOwnedTeamAccountDeletionPending: true
      })
    );
    expect(submitAccountDeletionByCodeMock).toHaveBeenCalledWith({
      userId: 'user-1',
      code: '123456'
    });
  });

  it('rejects invalid request body before calling the service', async () => {
    const res = await Call(submitByCodeApi.default, {
      auth: {
        userId: 'user-1',
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      body: {
        code: 'abc'
      }
    });

    expect(res.code).toBe(500);
    expect(submitAccountDeletionByCodeMock).not.toHaveBeenCalled();
  });
});

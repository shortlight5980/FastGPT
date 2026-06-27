import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../support/user/team/teamSchema', () => ({
  MongoTeam: {
    findById: vi.fn()
  }
}));
vi.mock('../../../../core/dataset/delete/processor', () => ({
  deleteTeamAllDatasets: vi.fn()
}));
vi.mock('../../../../support/user/team/delete/utils', () => ({
  onDelAllApp: vi.fn()
}));
vi.mock('../../../../core/app/evaluation/evalSchema', () => ({
  MongoEvaluation: {
    find: vi.fn(),
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../core/app/evaluation/evalItemSchema', () => ({
  MongoEvalItem: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../common/file/image/schema', () => ({
  MongoImage: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/openapi/schema', () => ({
  MongoOpenApi: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/permission/memberGroup/groupMemberSchema', () => ({
  MongoGroupMemberModel: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/permission/memberGroup/memberGroupSchema', () => ({
  MongoMemberGroupModel: {
    find: vi.fn(),
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/permission/org/orgMemberSchema', () => ({
  MongoOrgMemberModel: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/permission/org/orgSchema', () => ({
  MongoOrgModel: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/permission/schema', () => ({
  MongoResourcePermission: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/user/session', () => ({
  delUserAllSession: vi.fn()
}));
vi.mock('../../../../support/user/team/teamMemberSchema', () => ({
  MongoTeamMember: {
    find: vi.fn(),
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/user/team/teamTagsSchema', () => ({
  MongoTeamTags: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/mcp/schema', () => ({
  MongoMcpKey: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../core/chat/setting/schema', () => ({
  MongoChatSetting: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../core/chat/favouriteApp/schema', () => ({
  MongoChatFavouriteApp: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/wallet/discountCoupon/schema', () => ({
  MongoDiscountCoupon: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/user/audit/schema', () => ({
  MongoTeamAudit: {
    deleteMany: vi.fn()
  }
}));
vi.mock('../../../../support/wallet/sub/schema', () => ({
  MongoTeamSub: {
    deleteMany: vi.fn()
  }
}));

const { teamDeleteProcessor } = await import('../../../../support/user/team/delete/processor');
const { MongoTeam } = await import('../../../../support/user/team/teamSchema');
const { MongoEvaluation } = await import('../../../../core/app/evaluation/evalSchema');
const { MongoEvalItem } = await import('../../../../core/app/evaluation/evalItemSchema');
const { MongoTeamMember } = await import('../../../../support/user/team/teamMemberSchema');
const { MongoMemberGroupModel } =
  await import('../../../../support/permission/memberGroup/memberGroupSchema');

describe('teamDeleteProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(MongoTeam.findById).mockResolvedValue({
      notificationAccount: 'notify',
      openaiAccount: { key: 'k' },
      externalWorkflowVariables: { foo: 'bar' },
      meta: { foo: 'bar' },
      save: vi.fn().mockResolvedValue(undefined)
    } as any);
    vi.mocked(MongoEvaluation.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'eval-1' }, { _id: 'eval-2' }])
    } as any);
    vi.mocked(MongoTeamMember.find).mockResolvedValue([]);
    vi.mocked(MongoMemberGroupModel.find).mockResolvedValue([]);
    vi.mocked(MongoEvaluation.deleteMany).mockResolvedValue({ acknowledged: true } as any);
    vi.mocked(MongoEvalItem.deleteMany).mockResolvedValue({ acknowledged: true } as any);
  });

  it('deletes eval items by evalId instead of teamId during team cleanup', async () => {
    await teamDeleteProcessor({
      data: {
        teamId: 'team-1'
      }
    } as any);

    expect(MongoEvaluation.find).toHaveBeenCalledWith({ teamId: 'team-1' }, '_id');
    expect(MongoEvalItem.deleteMany).toHaveBeenCalledWith({
      evalId: {
        $in: ['eval-1', 'eval-2']
      }
    });
    expect(MongoEvaluation.deleteMany).toHaveBeenCalledWith({ teamId: 'team-1' });
  });
});

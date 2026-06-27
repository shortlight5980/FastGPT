import type { Processor } from 'bullmq';
import { type TeamDeleteJobData } from './index';
import { MongoImage } from '../../../../common/file/image/schema';
import { MongoOpenApi } from '../../../openapi/schema';
import { MongoGroupMemberModel } from '../../../permission/memberGroup/groupMemberSchema';
import { MongoMemberGroupModel } from '../../../permission/memberGroup/memberGroupSchema';
import { MongoOrgMemberModel } from '../../../permission/org/orgMemberSchema';
import { MongoOrgModel } from '../../../permission/org/orgSchema';
import { MongoResourcePermission } from '../../../permission/schema';
import { MongoTeamMember } from '../teamMemberSchema';
import { MongoTeam } from '../teamSchema';
import { MongoMcpKey } from '../../../mcp/schema';
import { MongoChatSetting } from '../../../../core/chat/setting/schema';
import { MongoChatFavouriteApp } from '../../../../core/chat/favouriteApp/schema';
import { MongoDiscountCoupon } from '../../../wallet/discountCoupon/schema';
import { MongoTeamAudit } from '../../audit/schema';
import { deleteTeamAllDatasets } from '../../../../core/dataset/delete/processor';
import { onDelAllApp } from './utils';
import { MongoEvaluation } from '../../../../core/app/evaluation/evalSchema';
import { MongoEvalItem } from '../../../../core/app/evaluation/evalItemSchema';
import { MongoTeamSub } from '../../../../support/wallet/sub/schema';
import { getLogger, LogCategories } from '../../../../common/logger';
import { MongoUser } from '../../schema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { delUserTeamSessions, replaceUserTeamSessions } from '../../session';

const logger = getLogger(LogCategories.MODULE.USER.TEAM);

export const teamDeleteProcessor: Processor<TeamDeleteJobData> = async (job) => {
  const { teamId } = job.data;
  const startTime = Date.now();

  logger.info('Team delete started', { teamId });

  try {
    // 1. 检查团队是否存在
    const team = await MongoTeam.findById(teamId);
    if (!team) {
      logger.warn('Team not found for deletion', { teamId });
      return;
    }

    // 2. 先删除知识库和应用（它们内部有自己的队列）
    await deleteTeamAllDatasets(teamId);
    await onDelAllApp(teamId);
    // 评估项不带 teamId，需要先按团队拿到评估 ID 再级联删除。
    const evaluations = await MongoEvaluation.find({ teamId }, '_id').lean();
    const evaluationIds = evaluations.map((item) => item._id);

    // 删除评估项
    if (evaluationIds.length > 0) {
      await MongoEvalItem.deleteMany({
        evalId: {
          $in: evaluationIds
        }
      });
    }
    // 删除评估
    await MongoEvaluation.deleteMany({
      teamId
    });

    // 删除图片(旧的了)
    await MongoImage.deleteMany({
      teamId: teamId
    });

    // 3. 删除门户
    await MongoChatSetting.deleteMany({
      teamId
    });
    await MongoChatFavouriteApp.deleteMany({
      teamId
    });

    // 4. 删除独立资源
    // 删除 API key
    await MongoOpenApi.deleteMany({
      teamId
    });
    // 删除 MCP
    await MongoMcpKey.deleteMany({
      teamId
    });
    // 审计日志
    await MongoTeamAudit.deleteMany({
      teamId
    });

    // 5. 删除财务相关
    // 删除优惠券
    await MongoDiscountCoupon.deleteMany({
      teamId
    });

    await MongoTeamSub.deleteMany({
      teamId
    });
    // 删除使用记录（不删除，等待自动过期）
    // 充值记录不删除

    // 6. 删除团队信息
    // 删除权限
    await MongoResourcePermission.deleteMany({
      teamId
    });

    // 删除群组
    const groups = await MongoMemberGroupModel.find({ teamId });
    await MongoGroupMemberModel.deleteMany({
      groupId: { $in: groups.map((item) => item._id) }
    });
    await MongoMemberGroupModel.deleteMany({
      teamId
    });

    // 删除组织
    await MongoOrgModel.deleteMany({
      teamId
    });
    await MongoOrgMemberModel.deleteMany({
      teamId
    });

    // 7. 删除成员 session 和成员信息
    const members = await MongoTeamMember.find({
      teamId
    });

    const fallbackMembers = (await MongoTeamMember.find({
      userId: {
        $in: members.map((member) => member.userId)
      },
      teamId: {
        $ne: teamId
      },
      status: TeamMemberStatusEnum.active
    })
      .populate<{ team: { _id: string } | null }>('team', '_id')
      .sort({ createTime: 1 })
      .lean()) as Array<{
      _id: string;
      userId: string;
      teamId: string;
      team?: { _id: string } | null;
    }>;

    const fallbackMemberMap = new Map<string, (typeof fallbackMembers)[number]>();
    for (const fallbackMember of fallbackMembers) {
      const userId = String(fallbackMember.userId);
      if (!fallbackMember.team || fallbackMemberMap.has(userId)) continue;
      fallbackMemberMap.set(userId, fallbackMember);
    }

    await Promise.all(
      members.map(async (member) => {
        const fallbackMember = fallbackMemberMap.get(String(member.userId));

        if (fallbackMember) {
          await Promise.all([
            replaceUserTeamSessions({
              userId: String(member.userId),
              fromTeamId: String(teamId),
              fromTmbId: String(member._id),
              toTeamId: String(fallbackMember.teamId),
              toTmbId: String(fallbackMember._id)
            }),
            MongoUser.updateOne(
              {
                _id: member.userId,
                lastLoginTmbId: member._id
              },
              {
                lastLoginTmbId: fallbackMember._id
              }
            )
          ]);
          return;
        }

        await Promise.all([
          delUserTeamSessions({
            userId: String(member.userId),
            teamId: String(teamId),
            tmbId: String(member._id)
          }),
          MongoUser.updateOne(
            {
              _id: member.userId,
              lastLoginTmbId: member._id
            },
            {
              $unset: {
                lastLoginTmbId: 1
              }
            }
          )
        ]);
      })
    );

    await MongoTeamMember.deleteMany({
      teamId
    });

    // 8. 清理团队敏感信息
    team.notificationAccount = '';
    team.openaiAccount = undefined;
    team.externalWorkflowVariables = undefined;
    team.meta = undefined;
    await team.save();

    logger.info('Team delete completed', {
      teamId,
      durationMs: Date.now() - startTime
    });
  } catch (error: any) {
    logger.error('Team delete failed', { teamId, error });
    throw error;
  }
};

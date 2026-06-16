import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { UserErrEnum } from '@fastgpt/global/common/error/code/user';
import { MongoTeamMember } from '../team/teamMemberSchema';
import { getPendingAccountDeletionByTeamId, getPendingAccountDeletionByUserId } from './index';

export type AssertAccountUsableProps = {
  userId?: string;
  teamId?: string;
  tmbId?: string;
  /** 仅跳过"用户本人 pending"检查；仍会检查 teamId/ownerTeamIds 是否因 owner 注销而停服。 */
  allowUserAccountDeletionPending?: boolean;
  /** 仅跳过 team/ownerTeamIds 的 pending 检查；仍会检查 userId 是否本人 pending。 */
  allowTeamAccountDeletionPending?: boolean;
  /**
   * 仅允许当前请求上下文里“已登录所在团队”因为 owner 注销而 pending。
   * 典型场景是 team list / switch 等逃生接口：当前团队可带着 session 访问，
   * 但后续显式校验的目标团队仍必须走正常 pending 判断。
   */
  allowCurrentSessionTeamAccountDeletionPending?: boolean;
  /**
   * 仅允许“当前用户本人发起注销，且其 owner team 因同一条注销记录进入 pending”这一种场景。
   * 用于注销提醒页、tokenLogin 等仍需让待注销本人继续访问的白名单接口，不放开其他成员。
   */
  allowCurrentUserOwnedTeamAccountDeletionPending?: boolean;
};

/**
 * 统一校验账号与 owner 团队是否处于注销等待期。
 * - allowUserAccountDeletionPending: 注销状态页、取消注销、tokenLogin 等"本人 pending 仍需操作"的白名单接口使用。
 * - allowTeamAccountDeletionPending: 原则上不应使用；owner 注销团队停服期间所有成员都应被拒绝。
 * 两个 flag 互相独立——只跳过各自维度的检查，不会联动放行。
 */
export const assertAccountUsable = async ({
  userId,
  teamId,
  tmbId,
  allowUserAccountDeletionPending = false,
  allowTeamAccountDeletionPending = false,
  allowCurrentSessionTeamAccountDeletionPending = false,
  allowCurrentUserOwnedTeamAccountDeletionPending = false
}: AssertAccountUsableProps) => {
  const tmb = tmbId && (!teamId || !userId) ? await MongoTeamMember.findById(tmbId).lean() : null;
  const checkUserId = userId || (tmb?.userId ? String(tmb.userId) : undefined);
  const checkTeamId = teamId || (tmb?.teamId ? String(tmb.teamId) : undefined);

  const [pendingUser, pendingTeam] = await Promise.all([
    allowUserAccountDeletionPending ? null : getPendingAccountDeletionByUserId(checkUserId),
    allowTeamAccountDeletionPending ? null : getPendingAccountDeletionByTeamId(checkTeamId)
  ]);

  const isCurrentUserOwnedTeamPendingAllowed =
    allowCurrentUserOwnedTeamAccountDeletionPending &&
    !!pendingTeam &&
    !!checkUserId &&
    String(pendingTeam.userId) === checkUserId;
  const isCurrentSessionTeamPendingAllowed =
    allowCurrentSessionTeamAccountDeletionPending && !!pendingTeam;

  if (pendingUser) {
    return Promise.reject(UserErrEnum.accountDeletionPending);
  }
  if (pendingTeam && !isCurrentUserOwnedTeamPendingAllowed && !isCurrentSessionTeamPendingAllowed) {
    return Promise.reject(TeamErrEnum.accountDeletionPending);
  }
};

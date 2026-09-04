import type { ApiRequestProps } from '@fastgpt/next/type';
import { NextAPI } from '@/service/middleware/entry';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import {
  ManagePermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';
import { resumeInheritPermission } from '@fastgpt/service/support/permission/inheritPermission';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import {
  ResumeDatasetInheritPermissionBodySchema,
  type ResumeDatasetInheritPermissionBody
} from '@fastgpt/global/openapi/core/dataset/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { addAuditLog } from '@fastgpt/service/support/user/audit/util';
import { AuditEventEnum } from '@fastgpt/global/support/user/audit/constants';
import { getLogger, LogCategories } from '@fastgpt/service/common/logger';

const logger = getLogger(LogCategories.MODULE.DATASET);

async function handler(req: ApiRequestProps<ResumeDatasetInheritPermissionBody>) {
  const { datasetId } = parseApiInput({
    req,
    bodySchema: ResumeDatasetInheritPermissionBodySchema
  }).body;
  const { dataset } = await authDataset({
    datasetId,
    req,
    authToken: true,
    per: ManagePermissionVal
  });
  const parentDataset = dataset.parentId
    ? await MongoDataset.findById(dataset.parentId, 'name').lean()
    : undefined;

  const affectedResourceCount = dataset.parentId
    ? (
        await resumeInheritPermission({
          resource: dataset,
          folderTypeList: [DatasetTypeEnum.folder],
          resourceType: PerResourceTypeEnum.dataset,
          resourceModel: MongoDataset
        })
      )?.affectedResourceCount
    : await MongoDataset.updateOne(
        {
          _id: datasetId
        },
        {
          inheritPermission: true
        }
      ).then(() => 1);

  void addAuditLog({
    teamId: dataset.teamId,
    tmbId: dataset.tmbId,
    scope: 'member',
    event: AuditEventEnum.RESUME_INHERIT_PERMISSION,
    params: {
      datasetName: dataset.name,
      parentDatasetName: parentDataset?.name ?? '-',
      affectedResourceCount: affectedResourceCount ?? 1
    }
  }).catch((error) => {
    logger.error('Failed to write resume inherit permission audit log', {
      error,
      datasetId
    });
  });
}
export default NextAPI(handler);

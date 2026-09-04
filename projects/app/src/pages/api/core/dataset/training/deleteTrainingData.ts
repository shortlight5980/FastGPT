import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { MongoDatasetTraining } from '@fastgpt/service/core/dataset/training/schema';
import { MongoDatasetData } from '@fastgpt/service/core/dataset/data/schema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { authDatasetCollection } from '@fastgpt/service/support/permission/dataset/auth';
import { NextAPI } from '@/service/middleware/entry';
import { type ApiRequestProps } from '@fastgpt/next/type';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { addAuditLog } from '@fastgpt/service/support/user/audit/util';
import { AuditEventEnum } from '@fastgpt/global/support/user/audit/constants';
import { isDatasetSynonymEnabled } from '@fastgpt/service/core/dataset/synonym/entity';
import {
  DeleteTrainingDataBodySchema,
  DeleteTrainingDataResponseSchema,
  type DeleteTrainingDataResponse
} from '@fastgpt/global/openapi/core/dataset/training/api';

async function handler(req: ApiRequestProps): Promise<DeleteTrainingDataResponse> {
  const { collectionId, dataId } = parseApiInput({
    req,
    bodySchema: DeleteTrainingDataBodySchema
  }).body;

  const { collection, tmbId } = await authDatasetCollection({
    req,
    authToken: true,
    authApiKey: true,
    collectionId,
    per: ManagePermissionVal
  });

  const trainingMatch = {
    teamId: collection.teamId,
    datasetId: collection.datasetId,
    collectionId: collection._id,
    _id: dataId
  };
  const dataset = await MongoDataset.findById(collection.datasetId).select('name').lean();
  let deletedCount = 0;

  if (!isDatasetSynonymEnabled()) {
    const result = await MongoDatasetTraining.deleteOne(trainingMatch);
    deletedCount = result.deletedCount;
  } else {
    await mongoSessionRun(async (session) => {
      const training = await MongoDatasetTraining.findOne(trainingMatch).session(session);
      if (training?.dataId && training.synonymVersion) {
        await MongoDatasetData.updateOne(
          {
            _id: training.dataId,
            synonymRebuildingVersion: training.synonymVersion
          },
          { $unset: { synonymRebuildingVersion: '' } },
          { session }
        );
      }
      const result = await MongoDatasetTraining.deleteOne(trainingMatch, { session });
      deletedCount = result.deletedCount;
    });
  }

  void addAuditLog({
    teamId: String(collection.teamId),
    tmbId,
    event: AuditEventEnum.CLEAN_TRAINING_RECORD,
    params: {
      datasetName: dataset?.name ?? String(collection.datasetId),
      collectionName: collection.name,
      count: String(deletedCount),
      result: 'success'
    }
  }).catch(() => undefined);

  return DeleteTrainingDataResponseSchema.parse(undefined);
}

export default NextAPI(handler);
export type deleteTrainingDataBody =
  import('@fastgpt/global/openapi/core/dataset/training/api').DeleteTrainingDataBody;
export type deleteTrainingDataResponse = DeleteTrainingDataResponse;

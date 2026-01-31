import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { UnauthorizedException } from '../utils/app-error';
import { KEY_TYPE, KeyType } from '../utils/key';
import ApiKeyModel from '../models/apiKeys.model';
import { findByIdUserService } from '../services/user.service';
import WorkspaceModel from '../models/workspace.model';

export const apiKeyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'API key required. Use Authoriation Bearer <API_KEY>',
      );
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) throw new UnauthorizedException('API key missing');

    if (!apiKey.startsWith('sk_') || apiKey.length < 20) {
      throw new UnauthorizedException('Invalid Api key format');
    }

    const parts = apiKey.split('_');
    if (parts.length < 3 || parts[0] !== 'sk') {
      throw new UnauthorizedException('Invalid Api key format');
    }

    const keyType = parts[1]; // 'live'

    if (!Object.values(KEY_TYPE).includes(keyType as KeyType)) {
      throw new UnauthorizedException('Invalid Api key type');
    }

    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const apiKeyDoc = await ApiKeyModel.findOne({
      hashedKey,
    })
      .select('+hashedKey')
      .lean();

    if (!apiKeyDoc) {
      throw new UnauthorizedException('Invalid API key');
    }

    const user = await findByIdUserService(apiKeyDoc.userId.toString());

    if (!user) {
      throw new UnauthorizedException('User not found for this API key');
    }

    ApiKeyModel.updateLastUsedAt(hashedKey);

    req.user = user;

    console.log(user, 63);

    try {
      const workspace = await WorkspaceModel.findOne({
        userId: user._id,
      })
        .select('_id')
        .lean();

      console.log(workspace);

      if (workspace) {
        req.user._wid = workspace._id;
      }

      console.log(req.user._wid);
    } catch (err) {
      console.error('Failed to lookup workspace for user', err);
    }

    console.info('API KEY Used', apiKeyDoc.displayKey);

    next();
  } catch (error) {
    throw error;
  }
};

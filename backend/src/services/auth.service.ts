import mongoose from 'mongoose';
import {
  LoginSchemaType,
  RegisterSchemaType,
} from '../validators/auth.validator';
import UserModel from '../models/user.model';
import { NotFoundException, UnauthorizedException } from '../utils/app-error';
import StorageModel from '../models/storage.model';
import WorkspaceModel from '../models/workspace.model';
import { v4 as uuidv4 } from 'uuid';
import { signJwtToken } from '../utils/jwt';

export const registerService = async (body: RegisterSchemaType) => {
  const { email } = body;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const existingUser = await UserModel.findOne({ email }).session(session);
      if (existingUser) throw new UnauthorizedException('User already exists');

      const newUser = new UserModel({
        ...body,
        profilePicture: body.profilePicture || null,
      });

      await newUser.save({ session });

      // create workspace for the user if provided
      if ((body as any).workspaceName) {
        const workspaceUuid = uuidv4();
        const workspace = new WorkspaceModel({
          name: (body as any).workspaceName,
          uuid: workspaceUuid,
          displayName: `${(body as any).workspaceName}-${workspaceUuid}`,
          userId: newUser._id,
        });

        await workspace.save({ session });
      }

      const storage = new StorageModel({
        userId: newUser._id,
      });

      await storage.save({ session });

      return { user: newUser.omitPassword() };
    });
  } catch (error) {
    console.error('Error registering user', error);
    throw error;
  } finally {
    await session.endSession();
  }
};

export const loginService = async (body: LoginSchemaType) => {
  const { email, password } = body;
  const user = await UserModel.findOne({ email });
  if (!user) throw new NotFoundException('Email/Password not found');

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid)
    throw new UnauthorizedException('Email/Password is incorrect');

  const { token, expiresAt } = signJwtToken({
    userId: user.id,
  });

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
  };
};

import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
} from 'passport-jwt';
import passport from 'passport';
import WorkspaceModel from '../models/workspace.model';
import { Env } from './env.config';
import { findByIdUserService } from '../services/user.service';

interface JwtPayload {
  userId: string;
}

const options: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: Env.JWT_SECRET,
  audience: ['user'],
  algorithms: ['HS256'],
};

passport.use(
  new JwtStrategy(options, async (payload: JwtPayload, done) => {
    try {
      if (!payload.userId) {
        return done(null, false);
      }

      const user = await findByIdUserService(payload.userId);
      if (!user) {
        return done(null, false);
      }
      try {
        const workspace = await WorkspaceModel.findOne({
          userId: user._id,
        })
          .select('_id')
          .lean();

        if (workspace) {
          (user as any)._wid = workspace._id;
        }
      } catch (err) {
        console.error(
          'Failed to lookup workspace for user in passport strategy',
          err,
        );
      }

      return done(null, user);
    } catch (error) {
      return done(null, false);
    }
  }),
);

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export const passportAuthenticateJwt = passport.authenticate('jwt', {
  session: false,
});

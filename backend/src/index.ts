import 'dotenv/config';
import './config/passport.config';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { Env } from './config/env.config';
import cors, { CorsOptions } from 'cors';
import { UnauthorizedException } from './utils/app-error';
import { asyncHandler } from './middlewares/asyncHander.middleware';
import { HTTPSTATUS } from './config/http.config';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { connectDatabase, disconnectDatabase } from './config/database.config';
import internalRoutes from './routes/internal';
import passport from 'passport';
import publicRoutes from './routes/public';
import StorageService from './storage/StorageService';

const app = express();

const allowedOrigins = Env.ALLOWED_ORIGINS?.split(',');

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const errorMsg = `CORS error: Origin ${origin} is not allowed`;
      callback(new UnauthorizedException(errorMsg), false);
    }
  },
};

app.use(cors(corsOptions));
app.get('/files/download', downloadController);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(passport.initialize());

app.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    res.status(HTTPSTATUS.OK).json({
      message: 'Hello Subscribe to the channel',
    });
  }),
);

app.use(`${Env.BASE_PATH}`, internalRoutes);
app.use(publicRoutes);

app.use(errorHandler);

export async function downloadController(req:Request, res:Response) {
  try {
    const { key, exp, sig, type } = req.query;

    console.log({ key, exp, sig, type })

    const storage = StorageService.getInstance

    // expiry check
    if (Date.now() / 1000 > Number(exp)) {
      return res.status(403).send('Expired');
    }

    // signature check
    const expected = storage['sign'](`${key}:${exp}`);
    if (expected !== sig) {
      return res.status(403).send('Invalid signature');
    }

    // read stream
    const stream = await storage.getFileReadStream(key as string);

    // image should open in browser
    if (type) {
      res.setHeader('Content-Type', type as string);
    }

    res.setHeader('Content-Disposition', 'inline');

    stream.pipe(res);
  } catch (err) {
    res.status(404).send('File not found');
  }
}

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(Env.PORT, () => {
      console.log('server is running');
    });

    const shutdownSignals = ['SIGTERM', 'SIGINT'];

    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        try {
          server.close(() => {});
          //disconnect db
          await disconnectDatabase();
          process.exit(0);
        } catch (error) {
          console.log(error);
          // console.error(`Error occured during shutting down`, error);
          // process.exit(1);
        }
      });
    });
  } catch (error) {
    console.error(`Failed to star/t server`, error);
    // process.exit(1);
  }
}

startServer();

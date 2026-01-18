import mongoose from 'mongoose';
import { Env } from './env.config';

const connectDatabase = async () => {
  try {
    await mongoose.connect(Env.MONGO_URI);
  } catch (error) {
    console.log(error);

    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export { connectDatabase, disconnectDatabase };

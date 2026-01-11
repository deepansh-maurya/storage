import { UserDocument } from '../models/user.model';

declare global {
  namespace Express {
    interface User extends UserDocument {
      _id?: any;
      password?: any;
      _wid?: any; // workspace id assigned by middleware
    }
  }
}

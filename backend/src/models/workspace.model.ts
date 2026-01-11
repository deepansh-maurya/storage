import mongoose, { Document, Schema, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface WorkspaceDocument extends Document {
  _id: Types.ObjectId;
  name: string; // original provided name
  uuid: string; // generated uuid
  displayName: string; // name appended with uuid
  userId: Types.ObjectId; // owner
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<WorkspaceDocument>(
  {
    name: { type: String, required: true, trim: true },
    uuid: { type: String, required: true, unique: true },
    displayName: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  },
);

WorkspaceSchema.pre('validate', function (next) {
  if (!this.uuid) this.uuid = uuidv4();
  if (!this.displayName) this.displayName = `${this.name}-${this.uuid}`;
  next();
});

const WorkspaceModel = mongoose.model<WorkspaceDocument>(
  'Workspace',
  WorkspaceSchema,
);

export default WorkspaceModel;

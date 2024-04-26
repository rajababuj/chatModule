import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from "mongoose";
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'syncinfo' })
export class SyncInfo extends Document {

  @Prop({})
  from: mongoose.Schema.Types.ObjectId;

  @Prop({})
  to: mongoose.Schema.Types.ObjectId;

  @Prop({})
  type: number;

  @Prop({ required: true, type: mongoose.Schema.Types.Mixed })
  data: object;
}

export const SyncInfoSchema = SchemaFactory.createForClass(SyncInfo);
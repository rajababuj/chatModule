import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from "mongoose";
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Inbox extends Document {

  @Prop({ required: true })
  from: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  to: mongoose.Schema.Types.ObjectId;

  @Prop({})
  lastMessageId: mongoose.Schema.Types.ObjectId

  @Prop({ default: 1 }) // 1 = One to one, 2 = Group, 3 = Broadcast
  conv_type: number;

  @Prop({default: 0 })
  isDeleted: number;

  @Prop({})
  modifiedAt: Date;

  @Prop({})
  clearedAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const InboxSchema = SchemaFactory.createForClass(Inbox);

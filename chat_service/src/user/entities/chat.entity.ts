import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from "mongoose";
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Chat extends Document {

  @Prop({ required: true })
  from: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  to: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.Mixed })
  messageData: object;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  read: object;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  deliver: object;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  deleted: object;

  // @Prop({ type: mongoose.Schema.Types.Mixed })
  // deletedAt: Date;

  @Prop({})
  deleteType: number; // 1 = delete for me, 2 = delete for everyone

  @Prop({ type: mongoose.Schema.Types.Mixed })
  editedAt: object;

  @Prop({})
  reply: mongoose.Schema.Types.ObjectId; // ID of self table incase of reply to message

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);

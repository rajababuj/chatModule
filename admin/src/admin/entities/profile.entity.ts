import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from "mongoose";
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Profile extends Document {

  @Prop({}) 
  user_id: mongoose.Schema.Types.ObjectId

  @Prop({type: Object})
  data: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop({ default: true })
  kyc: Boolean;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from "mongoose";
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Profile extends Document {

  @Prop({ required: true })
  user_id: mongoose.Schema.Types.ObjectId

  @Prop({ required: true })
  full_name: string;

  @Prop({})
  birthdate: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

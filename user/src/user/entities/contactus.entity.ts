import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from "mongoose";
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ContactUs extends Document {

  @Prop({ required: true })
  user_id: mongoose.Schema.Types.ObjectId

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  country_code: string;

  @Prop({ required: true })
  mobile: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ContactUsSchema = SchemaFactory.createForClass(ContactUs);

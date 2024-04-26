import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Olduser extends Document {

  // @Prop({ required: true })
  // username: string;

  @Prop({ required: true })
  mobile: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  country_code: string;

  @Prop({})
  otp: number;

  @Prop({ default: 0 })
  email_verify: number;

  @Prop({ default: 0 })
  mobile_verify: number;

  @Prop({ default: 'user', enum: ['user', 'admin'] }) // Default role is 'user'
  role: string;

  @Prop({})
  image: string;

  @Prop({ default: 1 }) // 0 = exist, 1 = deleted
  is_delete: number;

  @Prop({})
  publicKey: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const OlduserSchema = SchemaFactory.createForClass(Olduser);

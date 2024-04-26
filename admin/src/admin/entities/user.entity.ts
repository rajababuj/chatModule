import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Document } from 'mongoose';
import * as config from 'config';
import { Expose } from 'class-transformer';

@Schema({ timestamps: true })
export class User extends Document {

  @Prop()
  name: string;

  @Prop()
  username: string;

  @Prop()
  mobile: string;

  @Prop()
  email: string;

  @Prop()
  password: string;

  @Prop()
  country_code: string;

  @Prop({})
  otp: number;

  @Prop({})
  status: number;

  @Prop({ default: 0 })
  email_verify: number;

  @Prop({ default: 0 })
  mobile_verify: number;

  @Prop({ default: 'user', enum: ['user', 'admin'] }) // Default role is 'user'
  role: string;

  @Prop({})
  image: string;
  
  @Prop({default: 1})   // 0 = delete, 1 = exist
  is_delete: number;
  
  @Prop({})
  publicKey: string;
  
  @Prop({})
  uuid: string;

  @Prop({})
  authtoken: string;

  @Prop({})
  reference: string;

  @Prop({})
  basketid: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

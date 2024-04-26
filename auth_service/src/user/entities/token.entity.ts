import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import mongoose,{ HydratedDocument } from 'mongoose';
import { User } from './user.entity';
export type TokenDocument = HydratedDocument<Token>;

@Schema({ timestamps: true })
export class Token {

  @Prop({ required: true,unique:false})
  userId: mongoose.Schema.Types.ObjectId

  @Prop({})
  otp: number;

  @Prop({ default: 0 })
  email_verify: number;

  @Prop({ default: 0 })
  mobile_verify: number;

  @Prop() 
  token: string;

  @Prop()
  isVerified:Boolean

  @Prop()
  end_time:Date

  @Prop()
  fa_token:String

  @Prop({ default: null })
  profile_qr:String
  
  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);

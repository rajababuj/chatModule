import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {

  @Prop({ required: false, unique: true })
  user_id: number;

  @Prop({ default: null })
  username: string;

  @Prop({ default: null })
  mobile: string;

  @Prop({ default: null })
  email: string;

  @Prop({ default: null })
  password: string;

  @Prop({ default: null })
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

  @Prop({ default: 0 }) // 0 = exist, 1 = deleted
  is_delete: number;

  @Prop({default: true})
  status: Boolean;

  @Prop({ default: false })
  is_2fa_enable: Boolean

  @Prop({ default: null })
  google_auth_secret: String

  @Prop({ default:false })
  is_enabled_status:Boolean

  @Prop({ default: null })
  profile_qr:String

  @Prop({ default: null })
  fa_token:String

  @Prop({ default: [] })
  twofa_trust_devices: {  }[]

  @Prop({ default:false })
  is_timeout:Boolean

  @Prop({ default:null })
  timeoutDate:Date

  @Prop({ default: null, lowercase: true })
  walletPublicAddress: string

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

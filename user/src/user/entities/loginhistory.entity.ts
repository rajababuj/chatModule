import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class LoginHistory {

  @Prop({ required: true })
  userId: mongoose.Schema.Types.ObjectId

  @Prop({ default: null })
  sessionId: string;

  @Prop({ default: null })
  IPAddress: string;

  @Prop({})
  publicKey: string;

}

export const LoginHistorySchema = SchemaFactory.createForClass(LoginHistory);

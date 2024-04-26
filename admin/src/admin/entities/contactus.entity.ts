import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ContactUs extends Document {
  // @Prop()
  // user_id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  mobile: number;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  password: string;
  
  @Prop({ required: true })
  profileImage: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ContactUsSchema = SchemaFactory.createForClass(ContactUs);

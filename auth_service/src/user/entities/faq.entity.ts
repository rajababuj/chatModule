import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';
export type FaqDocument = HydratedDocument<Faq>;
@Schema({ timestamps: true })
export class Faq {

  @Prop({})
  title: string;

  @Prop({ type: [{ question: String, answer: String }], default: [] })
  data: { question: string, answer: string }[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
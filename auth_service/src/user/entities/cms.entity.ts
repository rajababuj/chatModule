import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';
export type CmsDocument = HydratedDocument<Cms>;

@Schema({ timestamps: true })
export class Cms{

  @Prop({})
  slug: string;

  @Prop({})
  title: string;

  @Prop({})
  tr_title: string;

  @Prop({ })
  content: string;

  @Prop({ })
  tr_content: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CmsSchema = SchemaFactory.createForClass(Cms);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Country extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  phonecode: string;

  @Prop({ required: true, default: 1 })
  status: number;
}

export const CountrySchema = SchemaFactory.createForClass(Country);
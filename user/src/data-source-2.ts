
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/chatdb', {
      //   useUnifiedTopology: true,
      // Other options...
    }),
    // Other modules...
  ],
  controllers: [],
  providers: [],
})
export class Config2 { }





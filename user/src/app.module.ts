import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { Config } from './data-source';
import { Config2 } from './data-source-2';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import * as config from 'config';
import { ScheduleModule } from '@nestjs/schedule';


@Module({  
  imports: [
    // TypeOrmModule.forRoot(Config),
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
      },
    }),    
    UserModule,
    // MongooseModule.forRoot('mongodb+srv://jenishm:z5CuTNY5gvBA8HxF@boston.xeoexuy.mongodb.net/authdb', {
    //   connectionName: 'authdb',
    // }),
    // MongooseModule.forRoot('mongodb+srv://jenishm:z5CuTNY5gvBA8HxF@boston.xeoexuy.mongodb.net/chatdb', {
    //   connectionName: 'chatdb',
    // }),
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "authdb"}`, {
      connectionName: 'authdb',
    }),
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "/chatdb"}`, {
      connectionName: 'chatdb',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }


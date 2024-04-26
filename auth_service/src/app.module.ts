import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { Config } from './data-source';
import { Config2 } from './data-source-2';
import { MongooseModule } from '@nestjs/mongoose';
import * as config from 'config';

@Module({
  imports: [
    UserModule,
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "/authdb"}`, {
      connectionName: 'authdb',
    }),
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "/chatdb"}`, {
      connectionName: 'chatdb',
    }),
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "/supportdb"}`, {
      connectionName: 'supportdb',
    }),
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "/commondb"}`, {
      connectionName: 'commondb',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }


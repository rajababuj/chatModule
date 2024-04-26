import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import * as config from 'config';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
      },
    }),
    UserModule,
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "authdb"}`, {
      connectionName: 'authdb',
    }),
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "chatdb"}`, {
      connectionName: 'chatdb',
    }),
    MongooseModule.forRoot(`${config.get('DB_CONN_STRING') + "supportdb"}`, {
      connectionName: 'supportdb',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
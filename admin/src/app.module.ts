import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    AdminModule,
    MongooseModule.forRoot('mongodb+srv://rajababuj:1TixzxphgUALs1Um@cluster0.nursyvk.mongodb.net/authdb', {
      connectionName: 'authdb',
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

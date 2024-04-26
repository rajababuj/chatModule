import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
 import {adminController} from './admin.controller';
import { SocketGateway } from './socket.gateway';
import { ChatGateway } from './chat.gateway';
import { SupportController } from './support.controller';
import { UserController } from './user.controller';


@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_MICROSERVICE',
        transport: Transport.TCP,
        options: { port: 9020 },
      },      
      {
        name: 'ADMIN_MICROSERVICE',
        transport: Transport.TCP,
        options: { port: 3001 },
      },
      {
        name: 'USER_MICROSERVICE',
        transport: Transport.TCP,
        options: { port: 9023 },
      },
      {
        name: 'SUPPORT_MICROSERVICE',
        transport: Transport.TCP,
        options: { port: 9026 },
      },
      {
        name: 'CHAT_MICROSERVICE',
        transport: Transport.TCP,
        options: { port: 9025 },
      },
      {
        name: 'COMMON_MICROSERVICE',
        transport: Transport.TCP,
        options: { port: 9029 },
      },
    ]),
      
    
  ],
  controllers: [AppController, adminController, UserController, SupportController],
  providers: [AppService,SocketGateway, ChatGateway,]
})
export class AppModule {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
// import { SocketGateway } from './user/socket.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      port: 9025,
    },
  });

  await app.startAllMicroservices();
  // await app.listen(9025);

  // const wsApp = await NestFactory.create(SocketGateway);
  // // This WebSocket server will run independently on a different port
  // await wsApp.listen(9025);

}
bootstrap();

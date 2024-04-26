import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      port: 9024,
    },
  });
  await app.startAllMicroservices();
  // app.use(cookieParser());
  // await app.listen(9022);
}
bootstrap();

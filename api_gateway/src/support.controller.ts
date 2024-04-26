import { Controller, Post, Body, Inject, Req, Res, Get, Headers, Patch, HttpException, HttpStatus, Param, Query, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { ClientProxy, EventPattern, MessagePattern } from '@nestjs/microservices';
// import { OnEvent } from '@nestjs/event-emitter';
import { Request, Response } from '@nestjs/common';
import * as log4js from 'log4js';
import { catchError, throwError } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import * as path from 'path';
import { diskStorage } from 'multer'
const logger = log4js.getLogger();

@Controller('support')
export class SupportController {

  constructor(
    // @Inject('USER_MICROSERVICE') private readonly userClient: ClientProxy,
    // @Inject('AUTH_MICROSERVICE') private readonly authClient: ClientProxy,
    @Inject('SUPPORT_MICROSERVICE') private readonly supportClient: ClientProxy,
  ) { }

  @Post('create-ticket')
  async createTicket(@Body() body: any, @Headers() headers: any) {
    try {
      const authorizationHeader = headers['authorization'];

      if (!authorizationHeader) {
        // throw new HttpException('No token provided', 403);
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];

      // userData.token = token;
      // console.log("userData,token",body,token);

      const result = await this.supportClient.send({ cmd: 'create_ticket' }, { body, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;
    } catch (error) {
      logger.info("api-gateway register-user");
      logger.info(error);
      throw error;
    }
  }

  @Post('support-image-upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: path.join(__dirname, '..', '..', '..', 'support_ticket', 'src', 'uploads'),
      filename: (req, file, cb) => {
        // Generating a 32 random chars long string
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
        //Calling the callback passing the random name generated with the original extension name
        cb(null, `${randomName}${extname(file.originalname)}`)
      }
    })
  }))
  
  async supportImageUpload(@UploadedFile() file, @Headers() headers: any) {
    try {

      const authorizationHeader = headers['authorization'];
      
      if (!authorizationHeader) {
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      
      const token = authorizationHeader.split('Bearer ')[1];
      console.log(file);
      
      return this.supportClient.send({ cmd: 'support_image_upload' }, { file, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway support-image-upload");
      logger.info(error);
      throw error;
    }
  }

  @Get('get-ticket')
  async getTicket(@Query() query: any, @Body() userData: any, @Headers() headers: any) {
    try {
      const page = query.page
      const limit = query.limit
      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];

      const result = await this.supportClient.send({ cmd: 'get_ticket' }, { token, page, limit, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;
    } catch (error) {
      logger.info("api-gateway get_ticket");
      logger.info(error);
      throw error;
    }
  }

  

  @Get('get-ticket-chat')
  async getTicketChat(@Query() query: any, @Headers() headers: any) {
    try {
      const ticket_id = query.ticket_id
      const page = query.page
      const limit = query.limit

      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];

      const result = await this.supportClient.send({ cmd: 'get_ticket_chat' }, { ticket_id, page, limit, headers, token })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;
    } catch (error) {
      logger.info("api-gateway get-ticket-chat");
      logger.info(error);
      throw error;
    }
  }

  @Get('get-chat')
  async getChat(@Query() query: any, @Headers() headers: any) {
    try {

      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        // throw new HttpException('No token provided', 403);
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];
      console.log("token", token);

      const page = query.page
      const limit = query.limit
      const result = await this.supportClient.send({ cmd: 'get_chat' }, { token, page, limit })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;
    } catch (error) {
      logger.info("api-gateway get-ticket-chat");
      logger.info(error);
      throw error;
    }
  }

  @Get('get-offline-chat')
  async getOfflineChat(@Query() query: any, @Headers() headers: any) {
    try {

      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        // throw new HttpException('No token provided', 403);
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];
      console.log("token", token);

      const page = query.page
      const limit = query.limit
      const result = await this.supportClient.send({ cmd: 'get_offline_chat' }, { token, page, limit })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;
    } catch (error) {
      logger.info("api-gateway get-ticket-chat");
      logger.info(error);
      throw error;
    }
  }

  @Get('hello')
  async getHello() {
    console.log("support api called")
    try {
      return this.supportClient.send({ cmd: 'hello' }, {});
    } catch (error) {
      logger.info("api-gateway logout");
      logger.info(error);
      throw error;
    }
  }


  @EventPattern('notify_new_product')
  notify_new_product() {
    console.log("support api called notify_new_product")
    try {
      return this.supportClient.send({ cmd: 'hello' }, {});
    } catch (error) {
      logger.info("api-gateway logout");
      logger.info(error);
      throw error;
    }
  }
}
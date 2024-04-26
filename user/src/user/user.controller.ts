import { Controller, Req, Res, UseGuards, UseFilters, Body, SetMetadata,BadRequestException  } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import redisClient from "../utils/redisHelper";
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as config from 'config';
import * as jwt from 'jsonwebtoken';
import { MiddlewareBuilder } from '@nestjs/core';
import { AuthGuard } from '../middleware/verifyToken.middleware';
import { ExceptionFilter } from './rpc-exception.filter';
import * as log4js from 'log4js';
import { Roles } from './role.decorator';
import { Role } from './role.enum';
import { RolesGuard } from './role.guard';
import encryptData from '../middleware/encryptData.middleware'
import { join } from 'path';
import { DecryptDataGuard } from 'src/middleware/decryptData.middleware';
import PublicEncryptData from 'src/middleware/publicEncryptData.middleware';
import { PublicDecryptDataGuard } from 'src/middleware/publicDecryptData.middleware';
import { validationPipe } from 'src/exceptions/validation.exception';
import { UpdateUserDto } from './dto/update-user.dto';
import mongoose from 'mongoose';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

const logger = log4js.getLogger();

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }
  
 
  
  @Cron('* * * * * *')
  async scheduleCronJob() {
    try {
      console.log("Test");
    } catch (err) {
      console.log(err);
    }
  }


  @MessagePattern({ cmd: 'get_profile' })
  @UseGuards(AuthGuard)
  async getProfile(@Body() Body,req: Request, res: Response) {
      let login_id: any = Body.userId;

    let userId = new mongoose.Types.ObjectId(login_id)
    try {
      const createdUserD: any = await this.userService.getProfile(userId);
      const publicKey: any = await this.userService.getPublicKey(Body.headers.session);
      
      let encData = await PublicEncryptData.PublicEncryptedData(Body, res, createdUserD);
      return encData;

      // let encData = await encryptData.EncryptedData(
      //   Body,
      //   res,
      //   createdUserD,
      //   publicKey
      // );

      // return encData;
    } catch (error) {
      logger.info("user get_profile");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'image_upload' })
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  @Roles(Role.User)
  async imageUpload(@Payload() message: any, req: Request, res: Response) {
    //  console.log('message here',message);

    try {
      let login_id: any = message.userId;
      let userId = new mongoose.Types.ObjectId(login_id)

      const createdUserD: any = await this.userService.getProfile(userId);

      let encData = await encryptData.EncryptedData(
        message,
        res,
        { 'image_name': message.file.filename, "path": config.get("BASE_URL") + "/public/" + message.file.filename },
        createdUserD?.publicKey
      );
      return encData
    } catch (error) {
      logger.info("user image_upload");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_profile' })
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  @Roles(Role.User)
  async updateProfile(@Payload() message: any, req: Request, res: Response) {
    // console.log('message',message);

    let login_id: any = message.userId;
    let userId = new mongoose.Types.ObjectId(login_id)

    const data: UpdateUserDto = await validationPipe.transform(message.body, {
      metatype: UpdateUserDto,
      type: 'body',
    });

    try {
      let errors: any = {}
      const check: any = await this.userService.checkUnique(userId, { mobile: data.mobile, });
      if (check !== null) { errors.mobile = 'Mobile should be unique'; }

      const check2: any = await this.userService.checkPassword(userId, { password: data.current_password, });
      if (!check2) { errors.current_password = 'Invalid Current password'; }

      if (Object.keys(errors).length > 0) { throw new RpcException({ errors }); }

      const updateUserD: any = await this.userService.updateProfile(userId, data);
      if (updateUserD) {
        const publicKey: any = await this.userService.getPublicKey(message.headers.session);
        const user: any = await this.userService.getProfile(userId);

        let encData = await encryptData.EncryptedData(
          message,
          res,
          { message: 'Profile updated successfully.', data : user },
          publicKey
        );
        return encData;
      }

    } catch (error) {
      logger.info("user update_profile");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'update_password' })
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  @Roles(Role.User)
  async updatePassword(@Body() Body, req: Request, res: Response) {
    let login_id: any = Body.userId;
    let userId = new mongoose.Types.ObjectId(login_id)

    const data: UpdatePasswordDto = await validationPipe.transform(Body.body, {
      metatype: UpdatePasswordDto,
      type: 'body',
    });

    try {
      const updateUserD: any = await this.userService.updatePassword(userId, data);

      let errors: any = {}

      if (updateUserD.status == false) {
        // errors.new_password = updateUserD.error;
        // throw new RpcException({ errors });
        throw new RpcException({ errors: updateUserD.error });
      }
      if (updateUserD) {
        const publicKey: any = await this.userService.getPublicKey(Body.headers.session);

        let encData = await encryptData.EncryptedData(
          Body,
          res,
          { message: 'Password updated successfully.' },
          publicKey
        );
        return encData;
      } else {
        errors.current_password = 'Current password is wrong';
        throw new RpcException({ errors });
      }

    } catch (error) {
      logger.info("user update_password");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'contact_us' })
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  @Roles(Role.User)
  async contactUs(@Body() Body, req: Request, res: Response) {

    try {

      let errors: any = {}
      const fullNameRegex = /^[a-zA-Z\s]+$/;

      if (!Body.body.name || Body.body.name == null || Body.body.name == undefined) {
        errors.name = 'Name is required';

      } else if (!fullNameRegex.test(Body.body.name)) {
        errors.name = 'Name should contain only alphabetic characters';
      }

      if (!Body.body.email.toLowerCase() || Body.body.email.toLowerCase() == null || Body.body.email.toLowerCase() == undefined) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(Body.body.email.toLowerCase())) {
        errors.email = 'Invalid email format';
      }

      if (!Body.body.country_code || Body.body.country_code == null || Body.body.country_code == undefined) {
        errors.country_code = 'Country code is required';
      }

      if (!Body.body.comment || Body.body.comment == null || Body.body.comment == undefined) {
        errors.comment = 'Comment is required';
      }

      if (!Body.body.mobile || Body.body.mobile == null || Body.body.mobile == undefined) {
        errors.mobile = 'Mobile is required';

      } else if (!/^\d+$/.test(Body.body.mobile)) {
        errors.mobile = 'Mobile should contain only numbers';
      }

      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }

      let login_id: any = Body.userId;

      let userId = new mongoose.Types.ObjectId(login_id)

      const contactUs: any = await this.userService.storeContactUs(Body);
      if (contactUs) {
        await this.userService.EmailSend(config.get("TO_EMAIL"), 'Contact Us', Body.body)

        const createdUserD: any = await this.userService.getProfile(userId);

        let encData = await encryptData.EncryptedData(
          Body,
          res,
          { message: 'Contact added successfully.' },
          createdUserD?.publicKey
        );
        return encData;
      } else {
        let errors: any = {};
        errors.email = 'Current password is wrong';
        throw new RpcException({ errors });
      }

    } catch (error) {
      logger.info("user contact_us");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'generate_2faqr' })    
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  async generate2FaQrCode(@Body() Body, req: Request, res: Response) {
    try {
      const userId = Body.userId;
      // let userId = new mongoose.Types.ObjectId(userId)
      const createdUserD: any = await this.userService.getProfile(userId);

      const user_id = createdUserD.user_id      
      const qrCodeData = await this.userService.generate2FaQrCode(Body,user_id);

      const publicKey: any = await this.userService.getPublicKey(Body.headers.session);      
      let encData = await PublicEncryptData.PublicEncryptedData(Body, res, qrCodeData);
      return encData;
          
      // return qrCodeData
            
    } catch (error) {
      logger.info('auth generate_2faqr');
      throw error;
    }
  }
  
  @MessagePattern({ cmd: 'verify_2fa' })    
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  async verify2faOTP(@Body() Body, req: Request, res: Response) {
    try {
      
      let errors: any = {}
      
      const qrCodeData: any = await this.userService.verify2faOTP(Body);
      if (qrCodeData.status == false) {
        errors.code = qrCodeData.message;
        throw new RpcException({ errors });
      }
      
      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }

      return qrCodeData
                  
    } catch (error) {
      logger.info('auth verify_2fa');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'enabled_status' })
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  @Roles(Role.User)
  async enabledStatus(@Body() Body, req: Request, res: Response) {

    try {
      let errors: any = {}
      const updateUserD: any = await this.userService.enabledStatus(Body);

      if (updateUserD.status == false) {
        throw new RpcException({ errors });
      }

      return updateUserD
      // if (updateUserD) {

      //   const publicKey: any = await this.userService.getPublicKey(Body.headers.session);

      //   let encData = await encryptData.EncryptedData(
      //     Body,
      //     res,
      //     { message: 'Password updated successfully.' },
      //     publicKey
      //   );
      //   return encData;
      // } else {

      //   let errors: any = {};
      //   errors.current_password = 'Current password is wrong';
      //   throw new RpcException({ errors });
      // }

    } catch (error) {
      logger.info("user update_password");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'disabled_status' })
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  @Roles(Role.User)
  async disabledStatus(@Body() Body, req: Request, res: Response) {

    try {
      let errors: any = {}

      let login_id: any = Body.userId;
      
            
      const updateUserD: any = await this.userService.disabledStatus(Body); 
      if (updateUserD.success == false) {
        errors.password = 'Invalid Current password'
        throw new RpcException({ errors });
      }
    
      return updateUserD      
    } catch (error) {
      logger.info("user disabled_status");
      logger.info(error);
      throw error;
    }
  }


  @MessagePattern({ cmd: 'user_timeout' })
  @UseGuards(AuthGuard, RolesGuard, DecryptDataGuard)
  @Roles(Role.User)
  async userTimeout(@Body() Body, req: Request, res: Response) {
    try {
      let errors: any = {}
      let login_id: any = Body.userId;      
            
      const updateUserD: any = await this.userService.userTimeout(Body);       
    
      return updateUserD      
    } catch (error) {
      logger.info("user user_timeout");
      logger.info(error);
      throw error;
    }
  }

}

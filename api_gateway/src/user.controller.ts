import { Controller, Post, Body, Inject, Req, Res, Get, Headers, Patch, HttpException, HttpStatus, UploadedFile, UseInterceptors, UnauthorizedException, Delete, Ip, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer'
import { extname } from 'path'
import * as path from 'path';

import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import * as log4js from 'log4js';
import { catchError, throwError } from 'rxjs';
const logger = log4js.getLogger();

@Controller('user')
export class UserController {

  constructor(
    @Inject('USER_MICROSERVICE') private readonly userClient: ClientProxy,
    @Inject('AUTH_MICROSERVICE') private readonly authClient: ClientProxy,
  ) { }

  @Post('register-user')
  async registerUser(@Body() body: any, @Headers() headers: any) {
    // console.log(body);
    
    try {
      const result = await this.authClient.send({ cmd: 'register_user' }, { body, headers })
      
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));
        console.log(body);
      return result;
    } catch (error) {
      logger.info("api-gateway register-user");
      logger.info(error);
      throw error;
    }
  }

  @Post('verify-user')
  async verifyUser(@Body() body: any, @Headers() headers: any, @Ip() ip: any) {
    try {
      const result = await this.authClient.send({ cmd: 'verify_user' }, { body, headers, ip })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;
    } catch (error) {
      logger.info("api-gateway verify-user");
      logger.info(error);
      throw error
    }
  }

  @Post('login')
  async login(@Body() body: any, @Headers() headers: any, @Ip() ip: any) {
    try {
      const result = await this.authClient.send({ cmd: 'login' }, { body, headers, ip })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;
    } catch (error) {
      logger.info("api-gateway login");
      logger.info(error);
      throw error;
    }
  }

  @Get('get-profile')
  async getProfile(@Headers() headers: any) {
    try {

      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];
      let role = 'user';
      return this.userClient.send({ cmd: 'get_profile' }, { token, role, headers }).pipe(catchError((errors) => {
        if (errors.statusCode == 401) {
          throw new HttpException({ message: 'UNAUTHORIZED', errors }, HttpStatus.UNAUTHORIZED);
        } else {
          return throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY));
        }
      }),
      );

    } catch (error) {
      logger.info("api-gateway get-profile");
      logger.info(error);
      throw error;
    }
  }

  @Patch('logout')
  async logout(@Headers() headers: any) {
    try {
      const authorizationHeader = headers['authorization'];
      const token = authorizationHeader.split('Bearer ')[1];

      return this.authClient.send({ cmd: 'logout' }, { token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway logout");
      logger.info(error);
      throw error;
    }
  }

  @Get('refresh-token')
  async refreshToken(@Headers() headers: any) {
    try {
      const authorizationHeader = headers['authorization'];
      const token = authorizationHeader.split('Bearer ')[1];

      return this.authClient.send({ cmd: 'refresh_token' }, { token, headers })
        .pipe(catchError(error => throwError(() => new HttpException({ message: 'Input data validation failed', error }, HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway refresh-token");
      logger.info(error);
    }
  }

  @Get('faq-list')
  async faqList(@Body() body: any, @Headers() headers: any) {
    try {
      return this.authClient.send({ cmd: 'faq_list' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway user faq-list");
      logger.info(error);
    }
  }

  @Post('send-otp')
  async sendOTP(@Body() body: any, @Headers() headers: any) {
    try {
      const { email, mobile, type, token } = body;

      let errors: any = {}

      if (type === 1 && email != undefined) { // 1 email, 2 mobile 
        return this.authClient.send({ cmd: 'send_OTP' }, { body, headers })
          .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

      } else if (type === 2 && mobile != undefined) {
        return this.authClient.send({ cmd: 'send_Mobile_OTP' }, { body, headers })
          .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));
      } else {
        return this.authClient.send({ cmd: 'send_OTP' }, { body, headers })
          .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));
      }

    } catch (error) {
      logger.info("api-gateway send-otp");
      logger.info(error);
      throw error;
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: any, @Headers() headers: any) {

    try {
      return this.authClient.send({ cmd: 'forgot_password' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway forgot-password");
      logger.info(error);
      throw error;
    }
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: any, @Headers() headers: any) {
    try {
      return this.authClient.send({ cmd: 'verify_email' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway send-otp");
      logger.info(error);
      throw error;
    }
  }

  @Post('update-profile')
  async updateProfile(@Body() body: any, @Headers() headers: any) {
    try {
      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];

      return this.userClient.send({ cmd: 'update_profile' }, { body, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway update-profile");
      logger.info(error);
      throw error;
    }
  }

  @Post('change-password')
  async changePassword(@Body() body: any, @Headers() headers: any) {
    try {

      return this.authClient.send({ cmd: 'change_password' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway change-password");
      logger.info(error);
      throw error;
    }
  }

  @Post('email-mobile-check')
  async emailMobileCheck(@Body() body: any, @Headers() headers: any) {
    try {
      return this.authClient.send({ cmd: 'email_mobile_check' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway email-mobile-check");
      logger.info(error);
      throw error;
    }
  }

  @Post('contact-us')
  async contactUs(@Body() body: any, @Headers() headers: any) {
    try {
      return this.authClient.send({ cmd: 'contact_us' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway contact-us");
      logger.info(error);
      throw error;
    }
  }

  @Post('update-password')
  async updatePassword(@Body() body: any, @Headers() headers: any) {
    try {
      const { current_password, new_password } = body;

      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];

      return this.userClient.send({ cmd: 'update_password' }, { body, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway update-password");
      logger.info(error);
      throw error;
    }
  }

  @Post('image-upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: path.join(__dirname, '..', '..', '..', 'user', 'src', 'uploads'),
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
        cb(null, `${randomName}${extname(file.originalname)}`)
      }
    })
  }))
  async imageUpload(@UploadedFile() file, @Headers() headers: any) {
    try {

      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];
      return this.userClient.send({ cmd: 'image_upload' }, { file, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway image-upload");
      logger.info(error);
      throw error;
    }
  }

  @Post('delete-user')
  async deleteUser(@Body() adminData: any, @Headers() headers: any) {
    try {
      const authorizationHeader = headers['authorization'];
      if (!authorizationHeader) {
        let errors: any = { token: 'No token provided' }
        throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const token = authorizationHeader.split('Bearer ')[1];

      const result = await this.authClient.send({ cmd: 'delete_user' }, { token })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;
    } catch (error) {
      logger.info("api-gateway register-user");
      logger.info(error);
      throw error;
    }
  }

  @Post('username-check')
  async usernameCheck(@Body() body: any, @Headers() headers: any) {
    try {
      return this.authClient.send({ cmd: 'username_check' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway username-check");
      logger.info(error);
      throw error;
    }
  }

  @Post('country-seeder')
  async countrySeeder(@Body() body: any, @Headers() headers: any) {
    try {
      return this.authClient.send({ cmd: 'country_seeder' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("country-seeder");
      logger.info(error);
      throw error;
    }
  }
  @Get('country-list')
  async countryList(@Body() body: any, @Headers() headers: any) {
    try {
      return this.authClient.send({ cmd: 'country_list' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("country-list");
      logger.info(error);
      throw error;
    }
  }

  @Post('resend-otp')
  async resendOTP(@Body() body: any, @Headers() headers: any) {

    try {
      return this.authClient.send({ cmd: 'resend_otp' }, { body, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway resend-otp");
      logger.info(error);
      throw error;
    }
  }


  @Get('generate-2fa')
  async generate2Fa(@Body() body: any, @Headers() headers: any) {
    const authorizationHeader = headers['authorization'];
    if (!authorizationHeader) {
      let errors: any = { token: 'No token provided' }
      throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const token = authorizationHeader.split('Bearer ')[1];

    try {
      return this.userClient.send({ cmd: 'generate_2faqr' }, { body, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway generate-2fa");
      logger.info(error);
      throw error;
    }
  }


  @Post('verify-2fa')
  async verify2faOTP(@Body() body: any, @Headers() headers: any) {
    const authorizationHeader = headers['authorization'];
    if (!authorizationHeader) {
      let errors: any = { token: 'No token provided' }
      throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const token = authorizationHeader.split('Bearer ')[1];
    try {
      return this.userClient.send({ cmd: 'verify_2fa' }, { body, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway resend-otp");
      logger.info(error);
      throw error;
    }
  }

  @Post('enabled-status')
  async enabledStatus(@Body() body: any, @Headers() headers: any) {
    const authorizationHeader = headers['authorization'];
    if (!authorizationHeader) {
      let errors: any = { token: 'No token provided' }
      throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const token = authorizationHeader.split('Bearer ')[1];
    try {
      return this.userClient.send({ cmd: 'enabled_status' }, { body, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {

      logger.info("api-gateway enabled-status");
      logger.info(error);
      throw error;
    }
  }

  //Disable status for 2FA auth
  @Post('disabled-status')
  async diabledStatus(@Body() body: any, @Headers() headers: any) {
    const authorizationHeader = headers['authorization'];
    if (!authorizationHeader) {
      let errors: any = { token: 'No token provided' }
      throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const token = authorizationHeader.split('Bearer ')[1];
    try {
      return this.userClient.send({ cmd: 'disabled_status' }, { body, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {

      logger.info("api-gateway disabled-status");
      logger.info(error);
      throw error;
    }
  }

  @Post('verify-login-2fa')
  async verifyLogin2faOTP(@Body() body: any, @Headers() headers: any,@Ip() ip: any){
    try {
      return this.authClient.send({ cmd: 'verify_2fa_login' }, { body,headers,ip })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("api-gateway verify-login-2fa");
      logger.info(error);
      throw error;
    }
  }

  @Get('cms-content/:slug')
  async getPageContent(@Param('slug') slug: string, @Headers() headers: any) {
    try {
      const slug_ = slug
      return this.authClient.send({ cmd: 'cms_page_content' }, { slug_, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {
      logger.info("user cms-content");
      logger.info(error);
      throw error;
    }
  }

  @Post('user-timeout')
  async userTimeout(@Body() body: any, @Headers() headers: any) {

    const authorizationHeader = headers['authorization'];
    console.log(authorizationHeader);
    
    if (!authorizationHeader) {
      let errors: any = { token: 'No token provided' }
      throw new HttpException({ message: 'Input data validation failed', errors }, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const token = authorizationHeader.split('Bearer ')[1];
    try {
      return this.userClient.send({ cmd: 'user_timeout' }, { body, token, headers })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

    } catch (error) {

      logger.info("api-gateway disabled-status");
      logger.info(error);
      throw error;
    }
  }
 
}

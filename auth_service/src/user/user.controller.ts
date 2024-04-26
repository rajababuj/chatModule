import { Controller, Req, Res, UseGuards, UseFilters, HttpException, HttpStatus, NotFoundException, UnprocessableEntityException, SetMetadata } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import redisClient from '../utils/redisHelper';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as config from 'config';
import * as jwt from 'jsonwebtoken';
import { AuthGuard } from '../middleware/verifyToken.middleware';
import { RpcException } from '@nestjs/microservices';
import * as log4js from 'log4js';
import { RolesGuard } from './role.guard';
import { Roles } from './role.decorator';
import { Role } from './role.enum';
import PublicEncryptData from 'src/middleware/publicEncryptData.middleware';
import { PublicDecryptDataGuard } from 'src/middleware/publicDecryptData.middleware';
import { JwtPayload } from 'jsonwebtoken';

import EncryptData from 'src/middleware/encryptData.middleware';
import { DecryptDataGuard } from 'src/middleware/decryptData.middleware';
import { CreateUserDto } from './dto/create-user.dto';
import { validationPipe } from 'src/exceptions/validation.exception';
import { ContactUsDto } from './dto/contact-us.dto';

const logger = log4js.getLogger();

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @MessagePattern({ cmd: 'register_user' })
  // @UseGuards(PublicDecryptDataGuard)
  async registerUser(@Payload() message: any, req: Request, res: Response) {
    const saltRounds = 10;
    // let data: any = message.body;
    const data: CreateUserDto = await validationPipe.transform(message.body, {
      metatype: CreateUserDto,
      type: 'body',
    });

    try {
      let errors: any = {};

      const check: any = await this.userService.checkUnique({ email: data.email.toLowerCase() });
      const check2: any = await this.userService.checkUnique({ mobile: data.mobile });

      if (check !== null) { errors.email = 'Email should be unique'; }
      if (check2 !== null) { errors.mobile = 'Mobile should be unique'; }

      if (Object.entries(errors).length !== 0) {
        throw new RpcException({ errors });
      }

      const captcha = message.body.recaptcha;

      // const isValid = await this.userService.verifyCaptcha(captcha);
      // if (!isValid) {
      //   throw new RpcException({ message: 'reCAPTCHA verification failed. Try again after sometime' });
      // }

      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      // let m_OTP = Math.floor(1000 + Math.random() * 9000);
      let e_OTP = 1111; //Math.floor(1000 + Math.random() * 9000);
      // console.log({ m_OTP });
      console.log({ e_OTP });

      const payload = { data, e_OTP };
      const payloadString = JSON.stringify(payload);
      const token_data = { [payloadString]: new Date().toISOString() };

      const token = jwt.sign(
        { userId: token_data },
        config.get('JWT_ACCESS_SECRET'),
        { expiresIn: config.get('JWT_ACCESS_TIME') },
      );

      await redisClient.set('auth_token', token, (err: any, reply: any) => {
        if (err) {
          console.error(err);
        } else {
          console.log('Token stored in Redis:', reply);
        }
      });

      let email = data.email.toLowerCase();
      let country_code = data.country_code;
      let mobile = data.mobile;
      let obj: any = { token, country_code, mobile, email };
      let encData = await PublicEncryptData.PublicEncryptedData(message, res, obj);      
      return encData;

    } catch (e) {
      console.log('CATCH', e);
      logger.info('auth registerUser', [e.error]);
      throw new RpcException(e.error);
    }
  }

  @MessagePattern({ cmd: 'verify_user' })
  @UseGuards(PublicDecryptDataGuard)
  async verifyUser(@Payload() message: any, req: Request, @Res() res: Response) {
    const saltRounds = 10;

    try {
      let errors: any = {};
      if (!message.body.e_otp || message.body.e_otp == null || message.body.e_otp == undefined) {
        errors.email_otp = 'Email OTP is required';
      }
      // if (!message.body.m_otp || message.body.m_otp == null || message.body.m_otp == undefined) {
      //   errors.mobile_otp = 'Mobile OTP is required';
      // }
      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }
      const e_token = message.body?.e_token;
      // const m_token = message.body?.m_token;
      const e_otp = message.body?.e_otp;
      // const m_otp = message.body?.m_otp;

      var e_decoded = jwt.verify(e_token, config.get('JWT_ACCESS_SECRET'));
      const e_decodedPayload: any = JSON.parse(Object.keys(e_decoded.userId)[0]);

      // var m_decoded = jwt.verify(m_token, config.get('JWT_ACCESS_SECRET'));
      // const m_decodedPayload: any = JSON.parse(Object.keys(m_decoded.userId)[0]);

      const tokenTimestamp = new Date(e_decoded[Object.keys(e_decoded.userId)[0]]).getTime();

      const currentTimestamp = new Date().getTime();
      const timeDifference = currentTimestamp - tokenTimestamp;
      const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
      const salt = await bcrypt.genSalt(saltRounds);

      if (timeDifference > fiveMinutesInMs) {
        throw new RpcException({ message: 'Timeout please register again.' });
      } else {
        let e_verifyType: string | undefined;
        let e_verifyValue: number | undefined;
        // let m_verifyType: string | undefined;
        // let m_verifyValue: number | undefined;

        if (e_decodedPayload && e_decodedPayload.e_OTP == e_otp) {
          e_verifyType = 'email';
          e_verifyValue = 1;
        } else {
          throw new RpcException({ message: 'Invalid Email Otp' });
        }
        // if (
        //   m_decodedPayload &&
        //   m_otp == 1111 /*(m_decodedPayload.m_OTP == m_otp)*/
        // ) {
        //   m_verifyType = 'mobile';
        //   m_verifyValue = 1;
        // } else {
        //   throw new RpcException({ errors: 'Invalid Mobile Otp' });
        // }

        const user = {
          username: e_decodedPayload.data.username.trim().toLowerCase() ?? null,
          mobile: e_decodedPayload.data.mobile.trim() ?? null,
          email: e_decodedPayload.data.email.trim().toLowerCase() ?? null,
          password: await bcrypt.hash(e_decodedPayload.data.password, salt),
          country_code: e_decodedPayload.data.country_code ?? null,
          otp: null,
          email_verify: e_verifyType === 'email' ? e_verifyValue : 0,
          // mobile_verify: m_verifyType === 'mobile' ? m_verifyValue : 0,
          ip: message?.ip
        };

        const user_data: any = e_decodedPayload.data.data;

        const check: any = await this.userService.checkUnique({
          email: user.email.trim().toLowerCase(),
        });
        if (check) {
          throw new RpcException({ message: 'User already registered' });
        }

        const createdUserD = await this.userService.create(user, user_data);

        const access_token = jwt.sign({ userId: createdUserD.data._id, userRole: 'user' }, config.get('JWT_ACCESS_SECRET'), { expiresIn: config.get('JWT_ACCESS_TIME') });
        const refresh_token = jwt.sign({ userId: createdUserD.data._id, userRole: 'user' }, config.get('JWT_REFRESH_SECRET'), { expiresIn: config.get('JWT_REFRESH_TIME') });

        await redisClient.lpush('BL_' + createdUserD.data._id.toString(), access_token);

        const data = {
          accessToken: access_token,
          refreshToken: refresh_token,
          loginTime: new Date().toUTCString(),
          oldValue: false,
        };
        await redisClient.set('m_' + createdUserD.data._id.toString(), JSON.stringify(data),);

        const responseData = {
          message: 'User verify successfully',
          ...createdUserD,
          // data: {
          //   user_id: createdUserD.user_id,
          //   username: e_decodedPayload.data.username,
          //   email: e_decodedPayload.data.email,
          //   // password: e_decodedPayload.data.password,
          //   mobile: e_decodedPayload.data.mobile,
          //   country_code: e_decodedPayload.data.country_code,
          //   // ...e_decodedPayload.data.data, // Spread the properties of data.data directly into data
          // },
          // privateKey: createdUserD.privateKeyPem,
          access_token,
          refresh_token,
        };

        // res.cookie("accessToken", access_token, {
        //   httpOnly: true,
        // });
        // res.cookie("refreshToken", refresh_token, {
        //   httpOnly: true,
        // });

        let encData = await PublicEncryptData.PublicEncryptedData(message, res, responseData);
        return encData;
      }
    } catch (error) {
      logger.info('auth verify_user');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'login' })
  // @UseGuards(PublicDecryptDataGuard)
  async login(@Payload() message: any, req: Request, res: Response) {
    try {
      const errors: any = {};
      if (message.body.type == 1) { // 1 = email or username
        if (!message.body.email || !message.body.email.toLowerCase()) {
          errors.email = 'Email is required';
        }
      } else {
        errors.type = 'Invalid type'
      }

      if (!message.body.password || message.body.password == null || message.body.password == undefined) {
        errors.password = 'Password is required';
      }

      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }

      const createdUserD: any = await this.userService.login(req, res, { ...message.body, ip: message.ip });

      if (createdUserD.status == false) {
        throw new RpcException({ message: createdUserD.error });
      }

      let encData = await PublicEncryptData.PublicEncryptedData(message, res, createdUserD);
      return encData;

    } catch (error) {
      logger.info('auth login');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'logout' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User)
  async logout(@Payload() message: any, req: Request, res: Response) {
    let token: any = message.token;
    let session: any = message.headers.session;

    try {
      const createdUserD: any = await this.userService.logout(req, res, token, session);
      return createdUserD;
      // let encData = await EncryptData.EncryptedData(message, res, createdUserD);
      // return encData
    } catch (error) {
      logger.info('auth logout');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'refresh_token' })
  async refreshToken(@Payload() message: any, req: Request, res: Response) {
    let token: any = message.token;

    try {

      const createdUserD: any = await this.userService.refreshToken(
        req,
        res,
        token,
      );

      // let encData = await EncryptData.EncryptedData(message, res, createdUserD);
      return createdUserD;
    } catch (error) {
      logger.info('auth refresh_token');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'send_OTP' })
  @UseGuards(PublicDecryptDataGuard)
  async sendOTP(@Payload() message: any, req: Request, res: Response) {
    let errors: any = {};

    try {

      if ((message.body.type == 1 && message.body.email == undefined) || (message.body.type == 2 && message.body.mobile == undefined && message.body.country_code == undefined)) {
        errors.type = 'Invalid type';
      }

      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }

      var decoded = jwt.verify(
        message.body.token,
        config.get('JWT_ACCESS_SECRET'),
      );

      const firstKey = Object.keys(decoded.userId)[0];

      const innerObject = JSON.parse(firstKey);
      const email = innerObject.data.email;

      if (innerObject.send_otp == true && innerObject.send_otp !== undefined) {
        errors.user = 'Please enter register Token';
        throw new RpcException({ errors });
      }
      if (email.toLowerCase() !== message.body.email.toLowerCase()) {
        errors.user = 'Please enter register email';
        throw new RpcException({ errors });
      }

      let e_OTP = Math.floor(1000 + Math.random() * 9000);
      const tokenData = JSON.parse(Object.keys(decoded.userId)[0]);
      tokenData.e_OTP = e_OTP;
      tokenData.send_otp = true;

      const newToken = jwt.sign(
        { userId: { [JSON.stringify(tokenData)]: new Date().toISOString() } },
        config.get('JWT_ACCESS_SECRET'),
        { expiresIn: '1h' },
      );

      await this.userService.EmailSend(
        message.body.email.toLowerCase(),
        'User Verification',
        e_OTP,
      );
      // return await this.userService.sendSuccess(req, res, { token: newToken });
      let encData = await PublicEncryptData.PublicEncryptedData(message, res, { token: newToken });
      return encData;
    } catch (error) {
      logger.info('auth send_OTP');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'send_Mobile_OTP' })
  @UseGuards(PublicDecryptDataGuard)
  async sendMobileOTP(@Payload() message: any, req: Request, res: Response) {
    let errors: any = {};

    try {
      var decoded = jwt.verify(
        message.body.token,
        config.get('JWT_ACCESS_SECRET'),
      );

      const firstKey = Object.keys(decoded.userId)[0];

      const innerObject = JSON.parse(firstKey);
      const mobile = innerObject.data.mobile;
      const country_code = innerObject.data.country_code;

      if (innerObject.send_otp == true && innerObject.send_otp !== undefined) {
        errors.user = 'Please enter register Token';
        throw new RpcException({ errors });
      }

      if (mobile !== message.body.mobile) {
        errors.user = 'Please enter register mobile';
        throw new RpcException({ errors });
      }
      if (country_code !== message.body.country_code) {
        errors.user = 'Please enter register country code';
        throw new RpcException({ errors });
      }

      let m_OTP = Math.floor(1000 + Math.random() * 9000);

      const tokenData = JSON.parse(Object.keys(decoded.userId)[0]);
      tokenData.m_OTP = m_OTP;

      tokenData.send_otp = true;

      const newToken = jwt.sign({ userId: { [JSON.stringify(tokenData)]: new Date().toISOString() } }, config.get("JWT_ACCESS_SECRET"), { expiresIn: '1h' });

      // await this.userService.EmailSend(message.userData.email, 'User Verification', m_OTP)
      // return await this.userService.sendSuccess(req, res, {token:newToken});
      let encData = await PublicEncryptData.PublicEncryptedData(message, res, { token: newToken });
      return encData;
    } catch (error) {
      logger.info('auth send_Mobile_OTP');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'forgot_password' })
  @UseGuards(PublicDecryptDataGuard)
  async forgotPassword(@Payload() message: any, req: Request, res: Response) {

    try {
      let errors: any = {}
      if (!message.body.email.toLowerCase() || message.body.email.toLowerCase() == null || message.body.email.toLowerCase() == undefined) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(message.body.email.toLowerCase())) {
        errors.email = 'Invalid email format';
      }

      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }

      // let OTP = Math.floor(1000 + Math.random() * 9000);
      let OTP = 1111;
      const check: any = await this.userService.checkUnique({
        email: message.body.email.toLowerCase(),
        // is_delete: 0,
      });

      if (check == null) {
        errors.email = 'Please enter register email.';
        throw new RpcException({ errors });
      }

      await this.userService.EmailSend(
        message.body.email.toLowerCase(),
        'Email Verification',
        OTP,
      );

      check.otp = OTP;
      // setTimeout(async () => {
      //   check.otp = '';  
      //   await this.userService.update(check);
      // }, 30000);  
      const createdUserD = await this.userService.update(check);

      const token = jwt.sign(
        { userId: check._id },
        config.get('JWT_ACCESS_SECRET'),
        { expiresIn: config.get('JWT_ACCESS_TIME') },
      );

      // await redisClient.set('auth_token', token, (err: any, reply: any) => {
      //   if (err) {
      //     console.error(err);
      //   } else {
      //     console.log('OTP stored in Redis:', reply);
      //   }
      // });

      const data = {
        accessToken: token,
        loginTime: new Date().toUTCString(),
        oldValue: false,
      };
      // return await this.userService.sendSuccess(req, res, {
      //   message: 'OTP sent successfully.',
      //   token,
      // });
      let encData = await PublicEncryptData.PublicEncryptedData(message, res, {
        message: 'OTP sent successfully.',
        token,
      });
      return encData;
    } catch (error) {
      logger.info('auth forgot_password');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'email_mobile_check' })
  @UseGuards(PublicDecryptDataGuard)
  async emailMobileCheck(@Payload() message: any, req: Request, res: Response) {
    let errors: any = {};
    let type = message.body.type;
    try {
      if (type == 1) {
        const check: any = await this.userService.checkUnique({
          email: message.body.email.toLowerCase(),
          // is_delete: 0,
        });
        if (check !== null) {
          errors.email = 'Already in use';
          throw new RpcException({ errors });
        }
      }
      if (type == 2) {
        const check2: any = await this.userService.checkUnique({
          email: message.body.mobile,
          // is_delete: 0,
        });

        if (check2 !== null) {
          errors.email = 'Already in use';
          throw new RpcException({ errors });
        }
      }
      // return await this.userService.sendSuccess(req, res, {message:'Not in use, it is acceptable.'});
      return await PublicEncryptData.PublicEncryptedData(message, res, { message: 'Not in use, it is acceptable.' });
    } catch (error) {
      logger.info('auth forgot_password');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'verify_email' })
  @UseGuards(PublicDecryptDataGuard)
  async verifyEmail(@Payload() message: any, req: Request, res: Response) {

    try {

      let errors: any = {};
      if (!message.body.otp || message.body.otp == null || message.body.otp == undefined) {
        errors.otp = 'otp is required';
      }

      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }

      var decoded = jwt.verify(
        message.body.token,
        config.get('JWT_ACCESS_SECRET'),
      );

      const check: any = await this.userService.verifyEmailOtp(message);

      if (!check) {
        errors.email = 'Invalid Otp';
        throw new RpcException({ errors });
      } else {
        const userData: any = await this.userService.getUserData({
          _id: decoded.userId,
        });
        const token = jwt.sign(
          { userId: userData._id },
          config.get('JWT_ACCESS_SECRET'),
          { expiresIn: config.get('JWT_ACCESS_TIME') },
        );
        // return await this.userService.sendSuccess(req, res, {
        //   message: 'Verified Successfully',
        //   token,
        // });
        return await PublicEncryptData.PublicEncryptedData(message, res, {
          message: 'Verified Successfully',
          token,
        });
      }
    } catch (error) {
      logger.info('auth verify_email');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'change_password' })
  @UseGuards(PublicDecryptDataGuard)
  async changePassword(@Payload() message: any, req: Request, res: Response) {
    try {

      let errors: any = {}

      if (!message.body.new_password || message.body.new_password == null || message.body.new_password == undefined) {
        errors.new_password = 'New password is required';
      } else if (message.body.new_password.length < 8) {
        errors.new_password = 'Password should be at least 8 characters long';
      } else if (!/\d/.test(message.body.new_password) || !/[a-zA-Z]/.test(message.body.new_password) || !/[!@#$%^&*]/.test(message.body.new_password)) {
        errors.new_password = 'Password should contain at least one letter, one number, and one special character (!@#$%^&*)';
      }

      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }

      const check: any = await this.userService.updatePassword(message);

      if (check) {
        // return await this.userService.sendSuccess(req, res, {
        //   message: 'Password update Successfully',
        // });
        return await PublicEncryptData.PublicEncryptedData(message, res, {
          message: 'Password update Successfully',
        });
      }
    } catch (error) {
      logger.info('auth change_password');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'delete_user' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User)
  async deleteUser(@Payload() message: any, req: Request, res: Response) {
    try {

      const check: any = await this.userService.deleteUser(message);

      if (check) {
        return await this.userService.sendSuccess(req, res, {
          message: 'User deleted successfully',
        });

      }
    } catch (error) {
      logger.info('auth change_password');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'username_check' })
  @UseGuards(PublicDecryptDataGuard)
  async usernameCheck(@Payload() message: any, req: Request, res: Response) {
    let errors: any = {};
    try {
      const check: any = await this.userService.checkUnique({
        username: message.body.username.toLowerCase().trim()
      });
      if (check !== null) {
        errors.username = 'Username is already in use';
        throw new RpcException({ errors });
      }
      // return await this.userService.sendSuccess(req, res, {message:'Not in use, it is acceptable.'});
      return await PublicEncryptData.PublicEncryptedData(message, res, { message: 'Not in use, it is acceptable.' });
    } catch (error) {
      logger.info('auth forgot_password');
      logger.info(error);
      throw error;
    }
  }

  async validateUserData(userData: any): Promise<any> {

    const { username, email, password, mobile, country_code } = userData;
    const errors: any = {};
    const fullNameRegex = /^[a-zA-Z\s]+$/;

    if (!email.toLowerCase() || email.toLowerCase() == null || email.toLowerCase() == undefined) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.toLowerCase())) {
      errors.email = 'Invalid email format';
    }

    if (!username.toLowerCase() || username.toLowerCase() == null || username.toLowerCase() == undefined) {
      errors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9]+$/.test(username.toLowerCase())) {
      errors.username = 'Only numbers and letters are allowed';
    }

    if (!password || password == null || password == undefined) {
      errors.password = 'Password is required';

    } else if (password.length < 8) {
      errors.password = 'Password should be at least 8 characters long';

    } else if (!/\d/.test(password) || !/[a-zA-Z]/.test(password) || !/[!@#$%^&*]/.test(password)) {
      errors.password = 'Password should contain at least one letter, one number, and one special character (!@#$%^&*)';
    }

    if (!mobile || mobile == null || mobile == undefined) {
      errors.mobile = 'Mobile is required';

    } else if (!/^\d+$/.test(mobile)) {
      errors.mobile = 'Mobile should contain only numbers';
    }

    if (!userData.data.first_name || userData.data.first_name == null || userData.data.first_name == undefined) {
      errors.first_name = 'Name is required';

    } else if (!fullNameRegex.test(userData.data.first_name)) {
      errors.first_name = 'Name should contain only alphabetic characters';
    }

    if (!userData.data.last_name || userData.data.last_name == null || userData.data.last_name == undefined) {
      errors.last_name = 'Surname is required';

    } else if (!fullNameRegex.test(userData.data.last_name)) {
      errors.last_name = 'Surname should contain only alphabetic characters';
    }

    // if (!country_code || country_code == null || country_code == undefined) {
    //   errors.country_code = 'Country code is required';
    // }

    if (!userData.data.passport_id || userData.data.passport_id == null || userData.data.passport_id == undefined) {
      errors.passport_id = 'Passport / ID is required';
    } else if (!/^[0-9]+$/.test(userData.data.passport_id)) {
      errors.passport_id = 'Passport / ID should contain only digits';
    }

    // if (!userData.data.birthdate || userData.data.birthdate == null || userData.data.birthdate == undefined) {
    //   errors.birthdate = 'Birthdate is required';
    // }
    // if (userData.data.birthdate) {
    //   const birthdate = new Date(userData.data.birthdate);
    //   const currentDate = new Date();

    //   if (birthdate >= currentDate) {
    //     errors.birthdate = 'Invalid birthdate. Must be a date in the past or today.';
    //   }
    // }

    return errors;
  }

  @MessagePattern({ cmd: 'country_seeder' })
  async countrySeeder(@Payload() message: any, req: Request, res: Response) {

    try {

      let result = await this.userService.createCountryList();
      return await this.userService.sendSuccess(message, res, { message: "country seeder run successfullly." });
    } catch (error) {
      logger.info('auth country_seeder');
      logger.info(error);
      return await this.userService.sendError(message, res, { message: "Something went wrong!" });
    }
  }

  @MessagePattern({ cmd: 'country_list' })
  @UseGuards(PublicDecryptDataGuard)
  async countryList(@Payload() message: any, req: Request, res: Response) {
    try {
      let data = await this.userService.countries();
      return await PublicEncryptData.PublicEncryptedData(message, res, data);
    } catch (error) {
      logger.info('auth country_list');
      logger.info(error);
      throw error;
    }
  }


  @MessagePattern({ cmd: 'resend_otp' })
  @UseGuards(PublicDecryptDataGuard)
  async resendOTP(@Payload() message: any, req: Request, res: Response) {
    try {
      let errors: any = {};

      const verifyToken = () => {
        return new Promise<JwtPayload>((resolve, reject) => {
          jwt.verify(message.body.token, config.get("JWT_ACCESS_SECRET"), (error: any, payload: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(payload);
            }
          });
        });
      };

      const OTP = 1111;
      const payload = await verifyToken();
      if (payload.userId) {
        console.log('User ID:', payload.userId);
      }

      console.log('Payload:', JSON.parse(Object.keys(payload.userId)[0]));

      let encData = await PublicEncryptData.PublicEncryptedData(message, res, {
        message: 'OTP sent successfully.',
        OTP: OTP
      });
      return encData;
    } catch (error) {
      logger.info('auth forgot_password');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'contact_us' })
  @UseGuards(PublicDecryptDataGuard)
  async contactUs(@Payload() message, req: Request, res: Response) {

    const data: ContactUsDto = await validationPipe.transform(message.body, {
      metatype: ContactUsDto,
      type: 'body',
    });

    try {
      const contactUs: any = await this.userService.storeContactUs(data);
      if (contactUs) {
        // await this.userService.EmailSend(config.get("TO_EMAIL"), 'Contact Us', data)

        let encData = await PublicEncryptData.PublicEncryptedData(
          message,
          res,
          { message: 'Contact added successfully.' },
        );
        return encData;
      }
    } catch (error) {
      logger.info("auth contact_us");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'verify_2fa_login' })
  @UseGuards(PublicDecryptDataGuard)
  async verify2faOTP(@Payload() Body, req: Request, res: Response) {
    try {
      let errors: any = {}
      const qrCodeData: any = await this.userService.verifyLogin2faOTP(Body);
      if (qrCodeData.status == false) {
        errors.code = qrCodeData.message;
        throw new RpcException({ errors });
      }

      if (Object.keys(errors).length > 0) {
        throw new RpcException({ errors });
      }
      return qrCodeData
    } catch (error) {
      logger.info('auth verify_2fa_login');
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'cms_page_content' })
  async getPageContent(@Payload() message: any, req: Request, res: Response) {
    try {
      let slug = message.slug_
      let data = await this.userService.getCmsPageContent(slug);
      return await PublicEncryptData.PublicEncryptedData(message, res, data);
    } catch (error) {
      logger.info('auth cms_page_content');
      logger.info(error);
      throw error;
    }
  }


  @MessagePattern({ cmd: 'faq_list' })
  @UseGuards(PublicDecryptDataGuard)
  async faqList(@Payload() message: any, req: Request, res: Response) {
    try {
      const faq: any = await this.userService.getFaq();
      return await PublicEncryptData.PublicEncryptedData(message, res, faq);
    } catch (error) {
      logger.info("auth faq_list");
      logger.info(error);
      throw error;
    }
  }

}

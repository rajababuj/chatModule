// import { Controller,  Request, Response, UseGuards, UseFilters, Body, SetMetadata, HttpException, HttpStatus, Header } from '@nestjs/common';
// // import { Request, Response } from 'express';
// import { AdminService } from './admin.service';
// import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
// import { User } from './entities/user.entity';
// import * as config from 'config';
// import * as jwt from 'jsonwebtoken';
// import * as log4js from 'log4js';
// import redisClient from 'src/utils/redisHelper';
// import * as bcrypt from 'bcrypt';


// const logger = log4js.getLogger();

// @Controller('user')
// export class AuthController {
//   constructor(private readonly adminService: AdminService) {

//   }

//   @MessagePattern({ cmd: 'register_admin' })
//   async registerAdmin(@Payload() message: any, @Request() req: Request, @Response() res: Response) {
   
    
//     try {

//       const saltRounds = 10;
//       let data: any = message.body
//     //   console.log(message.body);

//       let errors: any = {};
//     //   errors = await this.validateUserData(data);

//       const check: any = await this.adminService.checkUnique({ email: data.email.toLowerCase() });
//       const check2: any = await this.adminService.checkUnique({ mobile: data.mobile });

//       // let errors: any = {};
//       if (check !== null) {
//         errors.email = 'Email should be unique';
//       }
//       if (check2 !== null) {
//         errors.mobile = 'Mobile should be unique';
//       }

//       if (Object.entries(errors).length !== 0) {
//         throw new RpcException(errors);
//       }

//       const salt = await bcrypt.genSalt(saltRounds);
//       const hashedPassword = await bcrypt.hash(message.body.password, salt);
//       let m_OTP = Math.floor(1000 + Math.random() * 9000);
//       let e_OTP = Math.floor(1000 + Math.random() * 9000);
//       const payload = { data, m_OTP, e_OTP };
//       const payloadString = JSON.stringify(payload);
//       const token_data = { [payloadString]: new Date().toISOString() };

//       const token = jwt.sign({ userId: token_data }, config.get("JWT_ACCESS_SECRET"), { expiresIn: config.get("JWT_ACCESS_TIME") });

//       await redisClient.set("auth_token", token, (err: any, reply: any) => {
//         if (err) {
//           console.error(err);
//         } else {
//           console.log('Token stored in Redis:', reply);
//         }
//       })

//       let email = data.email.toLowerCase();
//       let country_code = data.country_code
//       let mobile = data.mobile;
//       let obj: any = { token, country_code, mobile, email };

//       const user = {
     
        
//         username: data.username,
//         name:data.name,
//         mobile: data.mobile ?? null,
//         email: data.email.toLowerCase() ?? null,
//         password: await bcrypt.hash(data.password, salt),
//         country_code: data.country_code ?? null,
//         otp: null,
//         email_verify: 1,
//         mobile_verify: 1,
//       };

//       const user_data: any = data.data;

//       const createdAdminD = await this.adminService.adminCreate(user, user_data);
//       const getAdminD = await this.adminService.getUserData(createdAdminD._id);

//       return this.adminService.sendSuccess(req, res, getAdminD);

//     } catch (e) {
//       console.log("CATCH", e);

//       logger.info("auth registerAdmin");
//       logger.info(e);
//       throw new RpcException(e.error);
//     }
//   }

// //   async validateUserData(userData: any): Promise<any> {

// //     const { email, password, mobile, country_code } = userData;
// //     const errors: any = {};
// //     const fullNameRegex = /^[a-zA-Z\s]+$/;

// //     if (!email.toLowerCase() || email.toLowerCase() == null || email.toLowerCase() == undefined) {
// //       errors.email = 'Email is required';
// //     } else if (!/\S+@\S+\.\S+/.test(email.toLowerCase())) {
// //       errors.email = 'Invalid email format';
// //     }

// //     if (!password || password == null || password == undefined) {
// //       errors.password = 'Password is required';

// //     } else if (password.length < 8) {
// //       errors.password = 'Password should be at least 8 characters long';

// //     } else if (!/\d/.test(password) || !/[a-zA-Z]/.test(password) || !/[!@#$%^&*]/.test(password)) {
// //       errors.password = 'Password should contain at least one letter, one number, and one special character (!@#$%^&*)';
// //     }

// //     if (!mobile || mobile == null || mobile == undefined) {
// //       errors.mobile = 'Mobile is required';

// //     } else if (!/^\d+$/.test(mobile)) {
// //       errors.mobile = 'Mobile should contain only numbers';
// //     }

// //     if (!userData.data.first_name || userData.data.first_name == null || userData.data.first_name == undefined) {
// //       errors.first_name = 'First name is required';

// //     } else if (!fullNameRegex.test(userData.data.first_name)) {
// //       errors.first_name = 'First name should contain only alphabetic characters';
// //     }

// //     if (!userData.data.last_name || userData.data.last_name == null || userData.data.last_name == undefined) {
// //       errors.last_name = 'Last name is required';

// //     } else if (!fullNameRegex.test(userData.data.last_name)) {
// //       errors.last_name = 'Last name should contain only alphabetic characters';
// //     }

// //     if (!country_code || country_code == null || country_code == undefined) {
// //       errors.country_code = 'Country code is required';
// //     }

// //     if (!userData.data.birthdate || userData.data.birthdate == null || userData.data.birthdate == undefined) {
// //       errors.birthdate = 'Birthdate is required';
// //     }
// //     if (userData.data.birthdate) {
// //       const birthdate = new Date(userData.data.birthdate);
// //       const currentDate = new Date();

// //       if (birthdate >= currentDate) {
// //         errors.birthdate = 'Invalid birthdate. Must be a date in the past or today.';
// //       }
// //     }

// //     return errors;
// //   }



  
// }

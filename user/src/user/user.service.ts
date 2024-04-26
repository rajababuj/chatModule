import { Injectable, Res, SerializeOptions, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './entities/user.entity';
import { Controller, Get, HttpStatus } from '@nestjs/common';
import mongoose, { ObjectId } from "mongoose";
import { Response, Request } from 'express';
import redisClient from "../utils/redisHelper";
import { RpcException } from '@nestjs/microservices';
import * as config from 'config';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Profile } from './entities/profile.entity';
import { ContactUs } from './entities/contactus.entity';
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { Token } from "./entities/token.entity"
import { LoginHistory } from './entities/loginhistory.entity';
import { Cron } from '@nestjs/schedule';
const nodemailer = require('nodemailer');
import { CronJob } from 'cron';
import * as moment from 'moment';


@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name, 'authdb') private readonly userModel: Model<User>,
    @InjectModel(Profile.name, 'chatdb') private readonly Profile: Model<Profile>,
    @InjectModel(ContactUs.name, 'chatdb') private readonly ContactUs: Model<ContactUs>,
    @InjectModel(Token.name, 'chatdb') private readonly tokenModel: Model<Token>,
    @InjectModel(LoginHistory.name, 'chatdb') private readonly loginHistoryModel: Model<LoginHistory>,
  ) {
    const job = new CronJob('* * * * * *', async () => {
      const users = await this.userModel.find();
      const currentTime = moment().utc().format("YYYY-MM-DD HH:mm:ss");
      users.map(async (user: any) => {
        if (user.timeoutDate) {
          let newDate = moment(user.timeoutDate, "YYYY-MM-DD HH:mm:ss").utc().format("YYYY-MM-DD HH:mm:ss");
          if (newDate == currentTime) {
            await this.userModel.findByIdAndUpdate(user._id, { timeoutDate: null, is_timeout: false });
            console.log(`Updated timeoutDate to null for user ${user._id}`);
          }
        }
      })
    });
    job.start();
  }

  // @Cron('* * * * * *')
  // async scheduleCronJob() {
  //   try {
  //     console.log("Test",45445454);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }

  async checkUnique(id: any, data: any) {
    const data1 = await this.userModel.findOne({ $and: [{ _id: { $ne: id } }, { mobile: data.mobile }] })
    return data1;
  }

  async checkPassword(id: any, data: any) {
    const data1 = await this.userModel.findById(id)
    let compare = await bcrypt.compare(data.password, data1.password)
    return compare;
  }

  async EmailSend(email, sub, data) {
    try {
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        pool: false,
        auth: {
          user: config.get("EMAIL"),
          pass: config.get("PASSWORD")
        }
      });

      let mailOptions = {
        from: '"Playage"',
        to: config.get("TO_EMAIL"),
        subject: sub,
        html: "<h5>Name : " + data.name + "</h5><h5>Email : " + data.email + "</h5><h5>Phone : " + data.mobile + "</h5>" +
          "<h5>Message : " + data.comment + "</h5>", // html body
      };

      transporter.sendMail(mailOptions, function (error: any, info: any) {
        if (error) {
          console.log('mail send error ==== ', error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    }
    catch (error) {
      console.log("ERROR", error);
    }
  }

  async getProfile(userId) {

    const data1 = await this.userModel
      .findOne({ _id: userId })
      .lean()
      // .select('email mobile _id role country_code email_verify mobile_verify is_enabled_status profile_qr publicKey createdAt updatedAt');
      .select('user_id username email mobile _id country_code email_verify mobile_verify is_enabled_status profile_qr fa_token publicKey is_2fa_enable google_auth_secret twofa_trust_devices createdAt updatedAt');
    // .select('email mobile _id role country_code email_verify mobile_verify publicKey createdAt updatedAt');
    if (data1 && data1.image) {
      data1.image = config.get("BASE_URL") + "/public/" + data1.image
    } else {
      data1.image = ''
    }

    const user_data: any = await this.Profile.findOne({ _id: userId });
    const { data, ...userDataWithoutData } = user_data.toObject();

    const final: any = {
      ...data1,
      ...userDataWithoutData,
      ...data,
    };

    return final;
  }

  async getPublicKey(sessionId) {
    const data1 = await this.loginHistoryModel
      .findOne({ sessionId: sessionId })
      .lean()
      .select('publicKey');

    return data1.publicKey;
  }

  async uploadImage(userId, message) {

    const upload = await this.userModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          image: message.file.filename,
        }
      },
      { new: true },
    );

    return upload
  }

  async updateProfile(userId, Body) {
    // console.log('body here',Body);

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          // email: Body.body.email.toLowerCase(),
          country_code: Body.country_code,
          mobile: Body.mobile,
          // image: Body.body.image
        }
      },
      { new: true },
    );

    const updatedUser2 = await this.Profile.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          // 'data.first_name': Body.body.first_name,
          // 'data.last_name': Body.body.last_name,
          'data.birthdate': Body.birthdate,
          'data.address': Body.address,
          'data.city': Body.city,
          'data.country': Body.country,
          internal_message: Body.internal_message,
          push_notification: Body.push_notification,
          phone_call: Body.phone_call,
          e_mail: Body.e_mail,
          sms: Body.sms,
        }
      },
      { new: true },
    );

    return true
  }

  async updatePassword(userId,Body) {
    const data1 = await this.userModel.findOne({ _id: userId })

    let old_pass = await bcrypt.compare(Body.new_password, data1.password)
    let result = await bcrypt.compare(Body.current_password, data1.password)

    if (!result) {
      return false;
    }
    if (old_pass) {
      return { status: false, error: "New password should be different than current password" };
    }
    
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          password: await bcrypt.hash(Body.new_password, salt)
        }
      },
      { new: true },
    );
    return true
  }

  async storeContactUs(contact_us_data) {
    // console.log('contact_us_data',contact_us_data.body);

    let data: any = {
      name: contact_us_data.body.name,
      email: contact_us_data.body.email.toLowerCase(),
      country_code: contact_us_data.body.country_code,
      mobile: contact_us_data.body.mobile,
      comment: contact_us_data.body.comment,
      user_id: new mongoose.Types.ObjectId(contact_us_data.body.headers)
    }
    const contact_us = new this.ContactUs(data);
    let contact: any = await contact_us.save();

    return contact;
  }

  async sendSuccess(req: Request, @Res() res: Response, data: any) {
    return data;
  }

  async sendError(req: Request, @Res() res: Response, data: any) {
    return data;
  }

  // async generate2FaQrCode(Body,user_id) {        
  //   return new Promise(async (resolve, reject) => {
  //     const userId = Body.userId
  //       try {
  //           const data1 = await this.userModel.findOne({ _id: userId });    
  //           const secret = speakeasy.generateSecret({ length: 20 });

  //           const otpauthUrl = speakeasy.otpauthURL({
  //             secret: secret.base32,
  //             label:String(user_id)              
  //           });

  //           QRCode.toDataURL(otpauthUrl, async (err: any, data_url: any) => {                            
  //               if (err) {
  //                   console.error('QR Code generation error:', err);
  //                   reject('QR Code generation error');
  //               } else {
  //                   var d = new Date();
  //                   d.setSeconds(d.getSeconds() + 120);
                    
  //                   let findT = await this.userModel.findOne({ userId: data1._id });
  //                   if (findT) {
  //                       findT.fa_token = secret.base32
  //                       // findT.end_time = d
  //                       await findT.save();
  //                     } else {
  //                       let aa = await this.userModel.create({
  //                         // userId: data1 ? data1._id : null,
  //                         fa_token: secret.base32,
  //                         // end_time: d,
  //                         // otp: 111111,                            
  //                         profile_qr:data_url
  //                       });
                      
  //                   }
  //                   // const a = await this.userModel.findByIdAndUpdate(
  //                   //   userId,
  //                   //   { $set: { is_enabled_status: true,
  //                   //     profile_qr:data_url,
  //                   //     fa_token:secret.base32 }
  //                   //   }                      
  //                   //   );
  //                 resolve({ secret: secret.base32, data_url,data1 });
  //               }
  //           });
  //       } catch (error) {
  //           reject(error);
  //       }
  //   });
  // }

  async generate2FaQrCode(Body, user_id) {
    return new Promise(async (resolve, reject) => {
        const userId = Body.userId;
        try {
            const data1 = await this.userModel.findOne({ _id: userId });
                        
            const secret = speakeasy.generateSecret({ length: 20 });
            // const secret = speakeasy.generateSecret();
                        
            const otpauthUrl = speakeasy.otpauthURL({
                secret: secret.ascii,
                label: String(user_id)
            });                        

            // QRCode.toDataURL(secret.otpauth_url, async (err, data_url) => { // if label not use then this line
            QRCode.toDataURL(otpauthUrl, async (err, data_url) => {
                if (err) {
                    console.error('QR Code generation error:', err);
                    reject('QR Code generation error');
                } else {
                    var d = new Date();
                    d.setSeconds(d.getSeconds() + 120);
                    // Update user model with QR code and secret
                    const updatedUser = await this.userModel.findByIdAndUpdate(
                        userId,
                        {
                            $set: {
                                is_enabled_status: true,
                                profile_qr: data_url,
                                fa_token: secret.base32
                            }
                        },
                        { new: true } 
                    );

                    resolve({ secret: secret.base32, data_url, data1: updatedUser });
                }
            });
        } catch (error) {
            reject(error);
        }
    });
  }


  async  common2FAVerification( token: any, secret: any) {                
      try {
        const verified = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 6          
        });

        if (verified) { 
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false; 
    }   
  }

  async verify2faOTP(Body) {       
    const userId = Body.userId        
    const { token, secret } = Body.body;
    const status = await this.common2FAVerification(token, secret); 

    if (status == true) {

      await this.userModel.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(userId) },
        {
        $set:{
          is_2fa_enable:true,
          // profile_qr:dataUrl,
          // fa_token:findToken.fa_token
        }      
      });        
      return { status:true, message: 'Verification successfully' };
    } else {
        return {status:false, message: 'Invalid Code' };
    }
  }

  async enabledStatus(Body) {
    const data1 = await this.userModel.findOne({ _id: new mongoose.Types.ObjectId(Body.userId) })

    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(Body.userId),
      {
        $set: {
          is_enabled_status: true  
        }
      },
      { new: true },
      );
        if (updatedUser) {
          return { success: true, message: "Updated successfully",is_enabled_status: updatedUser.is_enabled_status };
      } else {
          return { success: false, message: "Failed to update user status" };
      }
  }

  async disabledStatus(Body) {
    const data1 = await this.userModel.findOne({ _id: new mongoose.Types.ObjectId(Body.userId) })

    let password = await bcrypt.compare(Body.body.password, data1.password)
    if (!password) {
      return { success: false, message: "Failed to update user status" };
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(Body.userId),
      { $set: { is_enabled_status: false, is_2fa_enable: false, twofa_trust_devices: [], profile_qr: null } },
      { new: true },
    );
    if (updatedUser) {
      return { success: true, message: "Updated successfully", updatedUser, is_enabled_status: false };
    } else {
      return { success: false, message: "Failed to update user status" };
    }
  }

  async userTimeout(Body) {
    const data1 = await this.userModel.findOne({ _id: new mongoose.Types.ObjectId(Body.userId) })    
    const { timeoutDate } = Body.body;     

    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(Body.userId),
      { $set: {is_timeout: true,timeoutDate:timeoutDate }},
      { new: true },
      );
        if (updatedUser) {
          return { success: true, message: "Updated successfully" };
      } else {
          return { success: false, message: "Failed to update user status" };
      }
  }

  
}



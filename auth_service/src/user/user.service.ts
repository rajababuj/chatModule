import { Injectable, Res } from '@nestjs/common';
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
import { Olduser } from './entities/olduser.entity';
const nodemailer = require('nodemailer');
import * as forge from 'node-forge';
import axios, { AxiosRequestConfig } from 'axios';
import { countryData } from "./countryData"
import { Country } from './entities/country.entity';
import { LoginHistory } from './entities/loginhistory.entity';
import { randomUUID } from "crypto";
import { bufferToHex } from 'ethereumjs-util';
import { recoverPersonalSignature } from 'eth-sig-util';
import { ContactUs } from '../user/entities/contactus.entity';
import { Token } from './entities/token.entity';
import * as speakeasy from "speakeasy";
import  * as QRCode  from "qrcode";
import { Cms } from './entities/cms.entity';
import { Faq } from './entities/faq.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name, 'authdb') private readonly userModel: Model<User>,
    @InjectModel(Country.name, 'chatdb') private readonly countryModel: Model<Country>,
    @InjectModel(Olduser.name, 'authdb') private readonly olduserModel: Model<Olduser>,
    @InjectModel(Profile.name, 'chatdb') private readonly Profile: Model<Profile>,
    @InjectModel(LoginHistory.name, 'chatdb') private readonly loginHistoryModel: Model<LoginHistory>,
    @InjectModel(ContactUs.name, 'chatdb') private readonly contactUsModel: Model<ContactUs>,
    @InjectModel(Token.name, 'chatdb') private readonly tokenModel: Model<Token>,
    @InjectModel(Cms.name, 'commondb') private readonly cmsModel: Model<Cms>,
    @InjectModel(Faq.name, 'commondb') private readonly faqModel: Model<Faq>,

  ) { }

  async create(createUserDto, user_data) {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);

    const sessionId = randomUUID();
    const getLastUserId = await this.userModel.findOne({}).select('user_id').sort({ createdAt: -1 }).limit(1)

    if (getLastUserId && getLastUserId.user_id) {
      createUserDto.user_id = getLastUserId.user_id + 1;
    } else {
      createUserDto.user_id = 10000000;
    }

    const createdUser = new this.userModel({ ...createUserDto, publicKey: publicKeyPem });
    createdUser.role = 'user';
    let userData: any = await createdUser.save();
console.log("userData",userData);
console.log("user_data",user_data);


    const createdUser2 = new this.Profile({ _id: new mongoose.Types.ObjectId(userData._id), data: user_data });
    await createdUser2.save();

    await this.userLoginHistory(
      userData._id,
      createUserDto.ip,
      sessionId,
      publicKeyPem
    );

    const user = await this.getUserData(userData._id);

    let response = { data: user, sessionId, privateKey: privateKeyPem }

    return response
  }

  async update(createUserDto) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      createUserDto._id,
      { $set: { otp: createUserDto.otp } },
      { new: true }, // Return the modified document
    );
    return updatedUser;
  }

  async checkUnique(data: any) {
    return await this.userModel.findOne(data);
  }

  async deleteUser(data: any) {
    let user_id = data.userId
    const update_field = await this.userModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(user_id) }, // Filter condition
      { $set: { is_delete: 1 } }, // Update to be performed
      { new: true } // Return the updated document
    );

    const selectedFields = {
      mobile: update_field.mobile,
      email: update_field.email,
      password: update_field.password,
      country_code: update_field.country_code,
      otp: update_field.otp,
      email_verify: update_field.email_verify,
      mobile_verify: update_field.mobile_verify,
      role: update_field.role,
      is_delete: update_field.is_delete,
      __v: update_field.__v
    };

    const createdUser = new this.olduserModel(selectedFields);
    let userData: any = await createdUser.save();
    // return userData;

    let delete_user = await this.userModel.deleteOne({ _id: new mongoose.Types.ObjectId(user_id) });
    return update_field;
  }

  async updatePassword(data: any) {
    var decoded = jwt.verify(data.body.token, config.get("JWT_ACCESS_SECRET"));
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    let pass = await bcrypt.hash(data.body.new_password, salt)

    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(decoded.userId),
      { $set: { password: pass } },
      { new: true }, // Return the modified document
    );

    return updatedUser;
  }

  async getUserData(data_: any) {
    const data1 = await this.userModel.findOne(data_).select('user_id first_name last_name username email mobile _id country_code email_verify mobile_verify is_2fa_enable is_enabled_status google_auth_secret fa_token profile_qr twofa_trust_devices createdAt updatedAt')
    const user_data: any = await this.Profile.findOne({ _id: new mongoose.Types.ObjectId(data1._id) })

    const { data, ...userDataWithoutData } = user_data.toObject();
    const final: any = {
      ...data1.toObject(),
      ...userDataWithoutData, // Spread the properties of user_data without 'data' into the final object
      ...data, // Spread the properties of 'data' directly into the final object
    };

    return final;
  }

  async verifyEmailOtp(data: any) {

    var decoded = jwt.verify(data.body.token, config.get("JWT_ACCESS_SECRET"));
    // console.log('decoded',decoded);

    let response: any = '';
    const data1 = await this.userModel.findOne({ _id: new mongoose.Types.ObjectId(decoded.userId) })
    if (data1.otp == null) {
      response = false
    }
    if (data1.otp == data.body.otp) {
      await this.userModel.findByIdAndUpdate(
        data1._id,
        { $set: { otp: null } },
        { new: true }, // Return the modified document
      );
      response = true
    } else {
      response = false
    }

    return response;

  }

  async EmailSend(email, sub, otp) {
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
        to: email.toLowerCase(),
        subject: sub,
        html: `<div style="padding: 20px; margin: 20px; background-color: #f5f5f5;">
          <h3 style="margin-bottom: 20px;">Verification</h3>
          <p>You are receiving this email because we have received a verification request from the Team.</p>
          <p>Please enter the below code to verify.</p>
          <p style="font-size: 15px; font-weight: bold;">Your One Time Password (OTP) is: ${otp}</p>
          <p>If you have not make a request, kindly ignore this email and do not share your OTP/Password with anyone.</p>
          <p>Regards,<br>Playage Team</p>
        </div>`
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
    const data1 = await this.userModel.findOne({ _id: new mongoose.Types.ObjectId(userId) })
    const data2: any = await this.Profile.findOne({ _id: new mongoose.Types.ObjectId(userId) })

    // const final: any = {
    //   ...data1.toObject(), // Convert data1 to a plain JavaScript object for spreading
    //   full_name: data2.full_name // Access the specific property 'full_name' from data2
    // };
    // return final

    const { data, ...userDataWithoutData } = data2.toObject();
    const final: any = {
      ...data1.toObject(),
      ...userDataWithoutData, // Spread the properties of user_data without 'data' into the final object
      ...data, // Spread the properties of 'data' directly into the final object
    };
    return final;
  }

  async login(req, res, userData) {
    const whereConditions: any = [];
    const sessionId = randomUUID();
    
    if (userData.type == 1) { // 1 email or username, 2 mobile
      const emailOrUsername = userData.email.toLowerCase().trim();
      whereConditions.push({ username: emailOrUsername }, { email: emailOrUsername });
    } else if (userData.type == 2) {
      if (userData.email != undefined) {
        whereConditions.push({ mobile: userData.email, country_code: userData.country_code });
      }
    } else {
      return { status: false, error: "Invalid type" };
    }

    const check = await this.userModel.findOne({
      $or: whereConditions.length > 0 ? whereConditions : [{ _id: null }] // Dummy condition to prevent an empty OR array
    }).lean().exec();    

    if (!check) {
      return { status: false, error: "User does not exist" };
    }

    let result = bcrypt.compareSync(userData.password, check.password)

    if (!result) {
      return { status: false, error: "Invalid Password" };
    }

    if (Number(check.is_delete) === 1) {
      return { status: false, error: "Your account is deleted" };
    }

    if (check.status === false) {
      return { status: false, error: "Your account is blocked by admin." };
    } 
    
    if(check.is_timeout == true){
      return { status: false, error: "Temporary you take reset from website for chosen period." };
    }    
        
    const access_token = jwt.sign({ userId: check._id, userRole: 'user' }, config.get("JWT_ACCESS_SECRET"), { expiresIn: config.get("JWT_ACCESS_TIME") });    
            
    if(check.is_enabled_status === true)
    {
      const google2fa_device = (check?.twofa_trust_devices && check?.twofa_trust_devices?.length > 0) ? (check?.twofa_trust_devices.find(device => (device as any).device_token === userData.trusted_device) ?? {} ) : {};
      
      if(google2fa_device){
        const is_trust_google2fa = (google2fa_device as any).is_trusted ?? false;
        const time_period = (google2fa_device as any).time_period ?? null;
        const currentTime = new Date();
  
        if (is_trust_google2fa === false || (is_trust_google2fa === true && time_period <= currentTime)) {
          const user = await this.getUserData(check._id);
          const is_trust_status = false;            
          const { is_enabled_status, is_2fa_enable, fa_token,profile_qr } = user;
          let findT = await this.userModel.findOne({ _id: user._id });
          const response = { is_enabled_status, is_2fa_enable,profile_qr, fa_token,access_token,findT,is_trust_status };
          return response
        }
      }
    }
    // const access_token = jwt.sign({ userId: check._id, userRole: 'user' }, config.get("JWT_ACCESS_SECRET"), { expiresIn: config.get("JWT_ACCESS_TIME") });
    const refresh_token = jwt.sign({ userId: check._id, userRole: 'user' }, config.get("JWT_REFRESH_SECRET"), { expiresIn: config.get("JWT_REFRESH_TIME") });

    await redisClient.lpush('BL_' + check._id.toString(), access_token);

    let data = { accessToken: access_token, refreshToken: refresh_token, loginTime: new Date().toUTCString(), oldValue: false }

    await redisClient.set("m_" + check._id.toString(), JSON.stringify(data))

    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);

    await this.userLoginHistory(
      check._id,
      userData.ip,
      sessionId,
      publicKeyPem
    );

    // res.cookie("accessToken", access_token, {
    //   httpOnly: true,
    // });
    // res.cookie("refreshToken", refresh_token, {
    //   httpOnly: true,
    // });

    const user = await this.getUserData(check._id);
    user.is_trust_status = true;
    let response = { access_token, refresh_token, data: user, sessionId, privateKey: privateKeyPem }

    return response
  }

  async logout(req: Request, @Res() res: Response, token: any, sessionId: any) {
    try {
      const decode: any = jwt.verify(token, config.get('JWT_ACCESS_SECRET'));
      const userId = decode.userId.toString();
      const oldValue = await redisClient.get('m_' + userId);

      if (oldValue) {
        const parsedOldValue = JSON.parse(oldValue);
        const exists = parsedOldValue.accessToken === token;

        if (exists) {
          await redisClient.lpush('BL_' + userId, parsedOldValue.accessToken);
        }
        await redisClient.del('m_' + userId);

        await this.loginHistoryModel.deleteOne({
          sessionId: sessionId,
        });
      }
      return this.sendSuccess(req, res, { message: 'Logout Successfully' })

    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred during logout.' });
    }
  }

  async refreshToken(req: Request, @Res() res: Response, data: any) {
    try {

      const result = await this.getAccessTokenPromise(data);
      const { refreshToken, accessToken } = result;

      const decode = jwt.verify(accessToken, config.get('JWT_ACCESS_SECRET'));

      return this.sendSuccess(req, res, { data: accessToken });
    } catch (err) {
      return this.sendError(req, res, { message: err?.error });
    }
  }

  async getAccessTokenPromise(oldToken: any): Promise<any> {
    return new Promise((resolve, reject) => {

      jwt.verify(oldToken, config.get('JWT_REFRESH_SECRET'), async (err: any, user: any) => {
        if (err) {
          return reject({ status: HttpStatus.UNAUTHORIZED });
        } else {

          const accessToken = jwt.sign({ userId: user.userId }, config.get('JWT_ACCESS_SECRET'), {
            expiresIn: config.get('JWT_ACCESS_TIME'),
          });

          const refreshToken = await this.generateRefreshToken(user.userId);

          let data = { accessToken: accessToken, refreshToken: refreshToken, loginTime: new Date().toUTCString(), oldValue: false };
          const oldValue = await redisClient.get('m_' + user.userId.toString());

          if (oldValue) {
            data.oldValue = true;
            await redisClient.lpush('BL_' + user.userId.toString(), JSON.parse(oldValue).accessToken);
          }

          await redisClient.set('m_' + user.userId.toString(), JSON.stringify(data));
          return resolve(data);
        }
      });
    });
  }


  async generateRefreshToken(data: any) {
    return jwt.sign({ userId: data }, config.get('JWT_REFRESH_SECRET'), {
      expiresIn: config.get('JWT_REFRESH_TIME'),
    });
  }

  async sendSuccess(req: Request, @Res() res: Response, data: any) {
    return data;
  }

  async sendError(req: Request, @Res() res: Response, data: any) {
    return data;
  }

  async createCountryList(): Promise<boolean> {
    try {
      await this.countryModel.deleteMany({});
      await this.countryModel.insertMany(countryData);
      return true;

    } catch (error) {
      console.log(error)
      return false;
    }

  }
  async countries(): Promise<any> {
    try {
      let data = await this.countryModel.aggregate([
        { $sort: { name : 1 } },
        {
          $project: {
            "value": "$_id",
            "label": "$name",
            "key": "$code",
            "country_code": "$phonecode",
          }
        }
      ]);
      return data;
    } catch (error) {
      console.log('error in countries service ' + error)
      return { status: false, error: "Something went wrong! Please try again" };
    }
  }

  async userLoginHistory(userId: any, IPAddress: any, sessionId: any, publicKey: any) {
    try {
      const record = await this.loginHistoryModel.create({
        userId,
        IPAddress,
        sessionId,
        publicKey
      });

      return record;
    } catch (error) {
      return { status: false, error: "History not created." };
    }
  }

  async storeContactUs(contact_us_data) {
    // console.log('contact_us_data',contact_us_data.body);
    const contact_us = new this.contactUsModel(contact_us_data);
    let contact: any = await contact_us.save();
    return contact;
  }
  
  async  common2FAVerification( token: any, secret: any) {     
    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window:6,
    });
        
    return verified    
  }

  async verifyLogin2faOTP(Body:any):Promise<any> {       
    const { token,secret, is_trust_status, trusted_device, time_period } = Body.body; 
    const status = await this.common2FAVerification(token,secret);    
    
    const sessionId = randomUUID();

    var decoded = jwt.verify(Body.body.accessToken, config.get("JWT_ACCESS_SECRET"));
    const setuserId = decoded.userId;

    const access_token = jwt.sign({ userId: setuserId, userRole: 'user' }, config.get("JWT_ACCESS_SECRET"), { expiresIn: config.get("JWT_ACCESS_TIME") });
    const refresh_token = jwt.sign({ userId: setuserId, userRole: 'user' }, config.get("JWT_REFRESH_SECRET"), { expiresIn: config.get("JWT_REFRESH_TIME") });

    await redisClient.lpush('BL_' + setuserId, access_token);

    let data = { accessToken: access_token, refreshToken: refresh_token, loginTime: new Date().toUTCString(), oldValue: false }

    await redisClient.set("m_" + setuserId.toString(), JSON.stringify(data))

    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);

    await this.userLoginHistory(
      setuserId,
      Body.ip,
      sessionId,
      publicKeyPem
    );
    
    if (status == true) {

      await this.userModel.findByIdAndUpdate({ _id: new mongoose.Types.ObjectId(setuserId) },{
        $set:{
          is_2fa_enable:true,
        }
      });

      const deviceExists = await this.userModel.exists({
        _id: setuserId,
        'twofa_trust_devices.device_token': trusted_device
      });

      const timePeriod = is_trust_status ? await this.getTimePeriod(time_period) : null;
      if (deviceExists) {
        await this.userModel.findByIdAndUpdate(
          setuserId,
          {
            $set: {
              'twofa_trust_devices.$[elem].time_period': timePeriod,
              'twofa_trust_devices.$[elem].is_trusted': is_trust_status
            }
          },
          { arrayFilters: [{ 'elem.device_token': trusted_device }], new: true }
        );
      } else {
        await this.userModel.findByIdAndUpdate(
          setuserId,
          {
            $push:
              { twofa_trust_devices: 
                { 
                  device_token: trusted_device, 
                  time_period: timePeriod, 
                  is_trusted: is_trust_status 
                } 
              }
          },
          { new: true }
        );
      }

      const user = await this.getUserData({ _id: new mongoose.Types.ObjectId(setuserId)});

      // return { status:true, message: 'Verification successfully' };
      let response = { access_token, refresh_token, data: user, sessionId, privateKey: privateKeyPem }
      return response
    } else {
        return {status:false, message: 'Invalid code' };
    }
  }

  async getCmsPageContent(slug:any): Promise<any> {
    try {
      const slug__ = slug.replaceAll("-", "_")
      let data = await this.cmsModel.findOne({ slug: slug__ });
      return data;
    } catch (error) {
      console.log('error in getCmsPageContent service ' + error)
      return { status: false, error: "Something went wrong! Please try again" };
    }
  }

  async getFaq() {
    try {
      const data1 = await this.faqModel.find({}).select('-_id title data.question data.answer');
      return data1;
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return [];
    }
  }

  async getTimePeriod(selectedTimeOption: string) {
    const currentTime = new Date();
    let futureTime: Date;

    switch (selectedTimeOption) {
      case '30 Days':
        futureTime = new Date(currentTime.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case '7 Days':
        futureTime = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case '24 Hours':
        // futureTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
        futureTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
        break;
      default:
        throw new Error('Invalid time option');
    }

    return futureTime
  }

  async verifyCaptcha(token: string): Promise<boolean> {
    const secretKey = config.get("RECAPTCHA_SECRET_KEY");
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    try {
      const response = await axios.post(url);
      const { success } = response.data;
      return success;
    } catch (error) {
      console.error('Error verifying reCAPTCHA:', error);
      return false;
    }
  }
}


import { Injectable, Req, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {  ContactUs } from './entities/contactus.entity'; 
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { UpdateUserDto } from '../admin/dto/contactus.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(ContactUs.name, 'authdb') private readonly ContactUsModel: Model<ContactUs>,
    @InjectModel(User.name, 'authdb') private readonly UserModel: Model<User>,
    @InjectModel(Profile.name, 'authdb') private readonly Profile: Model<Profile>,

  ) {}

  async userAdd(body:any) { 
    try {
      const message = new this.ContactUsModel({
        name: body.body.name,
        email: body.body.email,
        mobile: body.body.mobile,
        address: body.body.address,
        password: body.body.password,
        profileImage: body.body.profileImage
      });
      await message.save();
  
      return message;
    } catch (error) {
      
      throw error;
    }
  }

  async UserList(): Promise<any[]> {
    try {
      const userList = await this.ContactUsModel.find().exec();
      return userList;
    } catch (error) {
      throw error;
    }
  }
  
  async userUpdate(userId: string, updateData: any): Promise<ContactUs | null> {
    try {
      const existingUser = await this.ContactUsModel.findById(userId);
      if (!existingUser) {
        return null; 
      }
      const updatedUser = await this.ContactUsModel.findByIdAndUpdate(userId, updateData, { new: true });
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async userDelete(userId: string): Promise<ContactUs | null> {
    try {
      const deletedUser = await this.ContactUsModel.findByIdAndDelete(userId);
      return deletedUser;
    } catch (error) {
      throw error;
    }
  }

  async adminRegister(userData: any): Promise<User | null> {
    try {
      const newUser = await this.UserModel.create(userData);
      return newUser;
    } catch (error) {
      throw error;
    }
  }

  // async checkUnique(data: any) {
  //   // console.log(data);
    

  //   const data1 = await this.UserModel.findOne(data)
  //   return data1;
  // }

  // async adminCreate(createUserDto, user_data) {
  //   console.log(user_data);
  //   const createdUser = new this.UserModel(createUserDto);
  
  //   createdUser.role = 'admin';
  //   let userData: any = await createdUser.save();

  //   const createdUser2 = new this.Profile({ _id: new mongoose.Types.ObjectId(userData._id), data: user_data });
  //   await createdUser2.save();

  //   return userData;
  // }

  // async getUserData(data_: any) {
  //   const data1 = await this.UserModel.findOne(data_).select('email mobile _id authtoken reference basketid country_code email_verify mobile_verify createdAt updatedAt')
  //   const user_data: any = await this.Profile.findOne({ _id: new mongoose.Types.ObjectId(data1._id) })
  //   return data1
  //   const { data, ...userDataWithoutData } = user_data.toObject();
  //   const final: any = {
  //     ...data1.toObject(),
  //     ...userDataWithoutData, // Spread the properties of user_data without 'data' into the final object
  //     ...data, // Spread the properties of 'data' directly into the final object
  //   };

  //   return final;
  // }

  async sendSuccess(@Req() req: Request, @Res() res: Response, data: any) {
    return data;
  }
}


import { Controller, Post, Body, HttpStatus, HttpException, Res, Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { AdminService } from './admin.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContactUs } from './entities/contactus.entity';
import * as jwt from 'jsonwebtoken';
import { UpdateUserDto } from '../admin/dto/contactus.dto';


@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    
  ) { }

  @MessagePattern({ cmd: 'user_add' })
  @UsePipes(new ValidationPipe({ transform: true })) 
  async userAdd(@Payload() message: any) {

    try {
      const createdUser = await this.adminService.userAdd(message);

      return { message: 'User added successfully', createdUser, };
    } catch (error) {

    }
  }

  @MessagePattern({ cmd: 'user_list' })
  async UserList(): Promise<any[]> {
    try {
      const userList = await this.adminService.UserList();
      return userList;
    } catch (error) {
      throw new HttpException('Failed to fetch user list', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @MessagePattern({ cmd: 'user_update' })
  async userUpdate(@Payload() data: { id: string; data: any }): Promise<any> {
    
    const { id, data: updateData } = data;
    try {
      const updatedUser = await this.adminService.userUpdate(id, updateData);
      return { user: updatedUser };
    } catch (error) {
      Logger.error(`Error while updating user with ID ${id}:`, error);
      throw new HttpException('User not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }



  @MessagePattern({ cmd: 'user_delete' })
  async userDelete(@Payload() userId: string): Promise<any> {
    try {
      const deletedUser = await this.adminService.userDelete(userId);
      if (!deletedUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return { message: 'User deleted successfully', user: deletedUser };
    } catch (error) {
      Logger.error('Error while deleting user:', error);
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @MessagePattern({ cmd: 'register_admin' })
  async adminregister(@Payload() userId: string): Promise<any> {
    try {
      const adminRegister = await this.adminService.adminRegister(userId);

      // Generate JWT token
      const token = jwt.sign({ userId: adminRegister._id }, 'your_secret_key', { expiresIn: '1h' });

      return { message: 'Admin registered successfully', user: adminRegister, token };
    } catch (error) {
      Logger.error('Error while registering admin:', error);
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}




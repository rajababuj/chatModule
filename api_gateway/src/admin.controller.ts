import { Controller, Post, Body, HttpStatus, HttpException, Inject, Get, Logger, Patch, Param, Delete, UploadedFile, UseInterceptors, Headers, } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { catchError, throwError } from 'rxjs';
import { diskStorage } from 'multer';
import path, { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('admin')
export class adminController {
  private readonly logger = new Logger(adminController.name);
  constructor(
    @Inject('ADMIN_MICROSERVICE') private readonly adminClient: ClientProxy,
    @Inject('AUTH_MICROSERVICE') private readonly authClient: ClientProxy
  ) { }

  @Post('user-add')
  async userAdd(@Body() body) {
    console.log({ body });
    try {
      const result = await this.adminClient.send({ cmd: 'user_add' }, { body })
        .pipe(catchError(errors => throwError(() => new HttpException({ message: errors.message ?? 'Input data validation failed', errors: errors.errors ?? null }, errors.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY))));

      return result;

    } catch (error) {
      // console.log('hello', error);

      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user-list')
  async UserList(): Promise<any> {
    try {
      const result = await this.adminClient.send({ cmd: 'user_list' }, {}).toPromise();
      return result;
    } catch (error) {
      if (error.statusCode === 401) {
        throw new HttpException({ message: 'UNAUTHORIZED', error }, HttpStatus.UNAUTHORIZED);
      } else {
        throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Patch('user-update/:id')
  async updateUser(@Param('id') userId: string, @Body() userData: any): Promise<any> {
    
    try {
      const result = await this.adminClient.send({ cmd: 'user_update' }, { id: userId, data: userData }).toPromise();
      return { message: 'User updated successfully' };
    } catch (error) {
      Logger.error('Error while updating user:', error);
      throw new HttpException('User not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  

  @Delete('user-delete/:Id')
  async deleteUser(@Param('Id') userId: string): Promise<any> {
    // console.log(userId);

    try {
      const result = await this.adminClient.send({ cmd: 'user_delete' }, userId).toPromise();
      return { message: 'User deleted successfully' };
    } catch (error) {
      Logger.error('Error while deleting user:', error);
      throw new HttpException('User not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Post('image-upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(__dirname, '..', '..', 'admin', 'src', 'uploads');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))

  async imageUpload(@UploadedFile() file) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      const fileName = file.filename;
      const Path = file.path;
      this.logger.log('File uploaded successfully');
      return {
        message: 'File uploaded successfully',
        image_Name: fileName,
        Path: Path
      };
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      throw new HttpException('Failed to upload file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // @Post('admin-register')
  // async adminRegister(@Body() body: any) {
  //   try {
  //     const { name, username, email, password, mobile, country_code } = body;

  //     const result = await this.adminClient.send({ cmd: 'register_admin' }, body).toPromise();
      
  //     // Assuming the microservice returns a response like { message: string, user: any }
  //     return result;
  //   } catch (error) {
  //     this.logger.error('Error in adminRegister:', error.message);
  //     throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  @Post('admin-register')
  async adminRegister(@Body() body: any) {
    try {
      const { username, email, password, mobile, country_code } = body;
      
      // Send a message to adminService to register the admin
      const result = await this.adminClient.send({ cmd: 'register_admin' }, { body }).toPromise();

      return result; // Return the result from adminService
    } catch (error) {
      throw new HttpException(error.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}





import { Injectable, CanActivate, ExecutionContext,HttpException,HttpStatus } from '@nestjs/common';
import redisClient from "../utils/redisHelper";
import * as config from 'config';
import * as jwt from 'jsonwebtoken';
import { AdminService } from '../admin/admin.service';
import { RpcException } from '@nestjs/microservices';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly adminService: AdminService ) {
  
  }
  async canActivate(context: ExecutionContext): Promise<any> {
  
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const token = request.token;

    if (!token) {
      throw new RpcException({ statusCode: 403, message: 'No Token Provided' });
    }

    try {
      const decodedToken:any = jwt.verify(token, config.get("JWT_ACCESS_SECRET")) as { userId: string };

      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      if (decodedToken.exp && decodedToken.exp < currentTimestamp) {
        throw new RpcException({ statusCode: 401, message: 'Token has expired' });
      }

      const oldValue = await redisClient.get("m_" + decodedToken.userId);

      if (!oldValue || oldValue === null) {
        // throw new HttpException('Login First', HttpStatus.UNAUTHORIZED);
        throw new RpcException({ statusCode: 403, message: 'Login First' });
      }
      // request.headers = decodedToken.userId;
      request.userId = decodedToken.userId;
      return true;
    } catch (error) {
      throw new RpcException({ statusCode: 401, errors: error.message });
    }
  }
}

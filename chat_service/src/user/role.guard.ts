import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum';
import { RpcException } from '@nestjs/microservices';
import { User } from "./entities/user.entity";
import { ROLES_KEY, Roles } from './role.decorator';
import * as config from 'config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const decodedToken:any = jwt.verify(context.switchToHttp().getRequest().token, config.get("JWT_ACCESS_SECRET"))
    
    return requiredRoles.some((role) => {
      if(decodedToken.userRole?.includes(role)){
        return true;
      }
      throw new RpcException({ errors: 'Unauthorized' });
    });
  }
}
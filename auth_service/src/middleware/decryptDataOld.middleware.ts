import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as forge from 'node-forge';
import * as config from 'config';
import { RpcException } from '@nestjs/microservices';
const API_KEY_DEC = config.get("API_KEY_DEC")
const API_DECRYPT_IV_KEY = config.get("API_DECRYPT_IV_KEY")
// const crypto = require("crypto");
import * as crypto from 'crypto';

@Injectable()
export class DecryptDataGuardOld implements CanActivate {
  private readonly API_SECRATE_KEY: string = config.get('API_SECRATE_KEY');
  private readonly AUTH_API_IV_KEY: string = config.get('AUTH_API_IV_KEY');

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();
    // console.log('nayan', req);

    // try {
    if (req.headers.env && req.headers.env === 'test') {
      return true; // Allow the request to proceed
    }
    else if (req.body && JSON.stringify(req.body) === '{}') {
      return true; // Allow the request to proceed
    }
    else {
      // Call DecryptedDataResponse if conditions are not met
      return await this.DecryptedDataResponse(req, res);
    }
    // } catch (e) {
    //     throw new RpcException({
    //       statusCode: 500,
    //       message: 'Error processing decrypted data',
    //       errors: e.message,
    //     });
    //   // return false;
    // }
  }

  private async DecryptedDataResponse(req: Request, res: Response): Promise<boolean> {

    try {
      // console.log('inside',req.body);

      const decipher = await crypto.createDecipheriv("aes-256-cbc", API_KEY_DEC, API_DECRYPT_IV_KEY);

      if (req.body && req.body.value && req.body.value !== "") {
        let encryptedData = req.body.value;

        let decryptedData = decipher.update(encryptedData, "base64", "utf-8");
        decryptedData += decipher.final("utf-8");
        req.body = JSON.parse(decryptedData);
        return true;
      } else {
        throw new RpcException({
          statusCode: 403,
          message: 'DECRYPT_DATA_IS_REQUIRED',
        });
      }
    } catch (e) {
      throw new RpcException({
        statusCode: 500,
        message: 'Error processing decrypted data',
        errors: e.message,
      });
    }
  }
}


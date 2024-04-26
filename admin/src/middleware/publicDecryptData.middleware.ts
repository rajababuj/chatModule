import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as forge from 'node-forge';
import * as config from 'config';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class PublicDecryptDataGuard implements CanActivate {
  private readonly API_SECRATE_KEY: string = config.get('PUBLIC_API_SECRATE_KEY');
  private readonly API_IV_KEY: string = config.get('PUBLIC_API_IV_KEY');

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();

    // try {
      if (req.headers.env && req.headers.env === 'test') {
        return true; // Allow the request to proceed
      } else if (req.body && JSON.stringify(req.body) === '{}') {
        return true; // Allow the request to proceed
      } else {
        return await this.PublicDecryptedDataResponse(req, res);
      }
    // } catch (e) {
    //   throw new RpcException({
    //     statusCode: 500,
    //     message: 'Error processing decrypted data',
    //     errors: e.message,
    //   });
    // }
  }

  private async PublicDecryptedDataResponse(req: Request, res: Response): Promise<boolean> {
    try {
      if (req.body && req.body.value && req.body.mac) {
        const privateKey = forge.pki.privateKeyFromPem(this.API_SECRATE_KEY);
        const decryptedSymmetricKey = privateKey.decrypt(forge.util.decode64(req.body.mac), 'RSA-OAEP');
        const decipher = forge.cipher.createDecipher('AES-CBC', decryptedSymmetricKey);
        decipher.start({ iv: this.API_IV_KEY });
        decipher.update(forge.util.createBuffer(forge.util.decode64(req.body.value)));
        decipher.finish();
        req.body = JSON.parse(decipher.output.toString('utf8'));
        return true; // Allow the request to proceed
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


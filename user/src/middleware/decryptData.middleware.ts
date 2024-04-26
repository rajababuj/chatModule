import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import * as forge from 'node-forge';
import * as config from 'config';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class DecryptDataGuard implements CanActivate {
  private readonly API_SECRATE_KEY: string = config.get('API_SECRATE_KEY');
  private readonly AUTH_API_IV_KEY: string = config.get('AUTH_API_IV_KEY');

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();

    // try {
    if (req.headers.env && req.headers.env === 'test') {
      return true; // Allow the request to proceed without decrypt
    } else if (req.body && JSON.stringify(req.body) === '{}') {
      return true; // Allow the request to proceed without decrypt
    } else {
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
      if (req.body && req.body.value && req.body.mac) {
        const privateKey = forge.pki.privateKeyFromPem(this.API_SECRATE_KEY);
        const decryptedSymmetricKey = privateKey.decrypt(forge.util.decode64(req.body.mac), 'RSA-OAEP');
        const decipher = forge.cipher.createDecipher('AES-CBC', decryptedSymmetricKey);
        decipher.start({ iv: this.AUTH_API_IV_KEY });
        decipher.update(forge.util.createBuffer(forge.util.decode64(req.body.value)));
        decipher.finish();
        req.body = JSON.parse(decipher.output.toString('utf8'));
        return true; // Proceed the request with decrypted data
      } else {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Decrypt data is required.',
        });
      }
    } catch (e) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Error processing decrypted data'
      });
    }
  }
}


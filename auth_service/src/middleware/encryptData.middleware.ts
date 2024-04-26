import { Request, Response } from "express";
const config = require("config");
import * as forge from 'node-forge';
const AUTH_API_IV_KEY = config.get("AUTH_API_IV_KEY");

async function encryptedDataResponse(data: any, key: any) {
  const symmetricKey = forge.random.getBytesSync(16);
  const cipher = forge.cipher.createCipher("AES-CBC", symmetricKey);
  cipher.start({ iv: AUTH_API_IV_KEY });
  cipher.update(forge.util.createBuffer(JSON.stringify(data), "utf8"));
  cipher.finish();
  const encryptedData = cipher.output.getBytes();
  const publicKey = forge.pki.publicKeyFromPem(key);
  const encryptedSymmetricKey = publicKey.encrypt(symmetricKey, "RSA-OAEP");

  return {
    mac: forge.util.encode64(encryptedSymmetricKey),
    value: forge.util.encode64(encryptedData),
  };
}

async function EncryptData(req: Request, res: Response, data: any, key: any) {
  if (req.headers.env && req.headers.env === "test") {
    return data;
  } else {
    return await encryptedDataResponse(data, key);
  }
}

export default {
  EncryptedData: EncryptData,
};

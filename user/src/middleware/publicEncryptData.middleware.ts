import { Request, Response } from "express";
const config = require("config");
import * as forge from 'node-forge';
const API_PUBLIC_KEY = config.get("PUBLIC_API_PUBLIC_KEY");
const API_IV_KEY = config.get("PUBLIC_API_IV_KEY");

async function publicEncryptedDataResponse(data: any) {
  const symmetricKey = forge.random.getBytesSync(16);
  const cipher = forge.cipher.createCipher("AES-CBC", symmetricKey);
  cipher.start({ iv: API_IV_KEY });
  cipher.update(forge.util.createBuffer(JSON.stringify(data), "utf8"));
  cipher.finish();
  const encryptedData = cipher.output.getBytes();
  const publicKey = forge.pki.publicKeyFromPem(API_PUBLIC_KEY);
  const encryptedSymmetricKey = publicKey.encrypt(symmetricKey, "RSA-OAEP");

  return {
    mac: forge.util.encode64(encryptedSymmetricKey),
    value: forge.util.encode64(encryptedData),
  };
}

async function PublicEncryptData(req: Request, res: Response, data: any) {
  if (req.headers.env && req.headers.env === "test") {
    return data;
  } else {
    return await publicEncryptedDataResponse(data);
  }
}

export default {
  PublicEncryptedData: PublicEncryptData,
};
import crypto from 'crypto';

// 生成 ZEGO Token
export function generateToken(
  appId: number,
  userId: string,
  secret: string,
  effectiveTimeInSeconds: number
): string {
  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: Math.floor(Math.random() * (Math.pow(2, 31) - 1 - (-Math.pow(2, 31))) + (-Math.pow(2, 31))),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: ''
  };

  const plainText = JSON.stringify(tokenInfo);
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secret, nonce);
  cipher.setAutoPadding(true);
  const encrypted = cipher.update(plainText, 'utf8');
  const encryptBuf = Buffer.concat([encrypted, cipher.final(), cipher.getAuthTag()]);

  const b1 = Buffer.alloc(8);
  b1.writeBigInt64BE(BigInt(tokenInfo.expire), 0);
  const b2 = Buffer.alloc(2);
  b2.writeUInt16BE(nonce.byteLength, 0);
  const b3 = Buffer.alloc(2);
  b3.writeUInt16BE(encryptBuf.byteLength, 0);
  const b4 = Buffer.alloc(1);
  b4.writeUInt8(1, 0); // GCM mode

  const buf = Buffer.concat([b1, b2, nonce, b3, encryptBuf, b4]);
  return '04' + buf.toString('base64');
}

// 生成 ZEGO API 签名
export function generateSignature(
  appId: number,
  signatureNonce: string,
  serverSecret: string,
  timestamp: number
): string {
  const str = appId.toString() + signatureNonce + serverSecret + timestamp.toString();
  return crypto.createHash('md5').update(str).digest('hex');
}

// 发送 ZEGO AI Agent API 请求
export async function sendZegoRequest<T>(action: string, body: object): Promise<T> {
  const appId = parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID || '0');
  const serverSecret = process.env.ZEGO_SERVER_SECRET || '';
  const signatureNonce = crypto.randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(appId, signatureNonce, serverSecret, timestamp);

  const url = new URL('https://aigc-aiagent-api.zegotech.cn');
  url.searchParams.set('Action', action);
  url.searchParams.set('AppId', appId.toString());
  url.searchParams.set('SignatureNonce', signatureNonce);
  url.searchParams.set('Timestamp', timestamp.toString());
  url.searchParams.set('Signature', signature);
  url.searchParams.set('SignatureVersion', '2.0');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (result.Code !== 0) {
    throw new Error(`ZEGO API Error: ${result.Message || 'Unknown error'} (Code: ${result.Code})`);
  }
  return result.Data as T;
}


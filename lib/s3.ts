import AWS from 'aws-sdk';
import axios from 'axios';
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const s3 = new AWS.S3({
  region: process.env.AWS_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
});

const BUCKET = process.env.S3_BUCKET_NAME!;

export const uploadToS3 = async (buffer: Buffer, key: string, acl: 'private' | 'public-read' = 'private') => {
  const params = {
    Bucket: BUCKET,
    Key: key,
    ACL: acl,
    Body: buffer,
  };

  await s3.upload(params).promise();
  return true;
};

export const deleteFromS3 = async (keys: { Key: string }[]) => {
  await s3
    .deleteObjects({
      Bucket: BUCKET,
      Delete: { Objects: keys },
    })
    .promise();
};

export const getSignedUrl = async (key: string, expires = 60): Promise<string> => {
  const params = { Bucket: BUCKET, Key: key, Expires: expires };
  return s3.getSignedUrlPromise('getObject', params);
};

export const downloadBufferFromS3 = async (key: string): Promise<Buffer> => {
  const data = await s3
    .getObject({ Bucket: BUCKET, Key: key })
    .promise();

  return data.Body as Buffer;
};

export const downloadS3ViaSignedUrl = async (key: string): Promise<Buffer> => {
  const url = await getSignedUrl(key, 30);
  const res = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'ipnow' },
  });

  return Buffer.from(res.data);
};

export const downloadFromUrl = async (url: string): Promise<Buffer> => {
  await new Promise((res) => setTimeout(res, 1000));
  const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
};

export const downloadFromUrlWithRetry = async (url: string): Promise<Buffer> => {
  while (true) {
    try {
      await new Promise((res) => setTimeout(res, 1000));
      const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
      return Buffer.from(res.data);
    } catch (e) {
      console.log('Retrying URL download...', url);
    }
  }
};

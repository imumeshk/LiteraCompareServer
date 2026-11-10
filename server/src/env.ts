import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB_PATH: process.env.DB_PATH || path.join(process.cwd(), 'server/data/app.db'),
  SESSION_SECRET: process.env.SESSION_SECRET || 'litera-compare-server-default-secret-key-12345',
  APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || '3000'}`,
  NODE_ENV: process.env.NODE_ENV || 'development',
  USE_NATIVE_SSL: process.env.USE_NATIVE_SSL === 'true',
  SSL_CERT_PATH: process.env.SSL_CERT_PATH || '',
  SSL_KEY_PATH: process.env.SSL_KEY_PATH || '',
};

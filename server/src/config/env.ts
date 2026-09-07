import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing. The application cannot start without a secure JWT secret.');
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET.trim(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};


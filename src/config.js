import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'dev-records-access-session-secret-key-32chars',
  get dbPath() {
    return process.env.DB_PATH || './records.db';
  },
};

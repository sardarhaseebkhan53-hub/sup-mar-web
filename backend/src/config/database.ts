import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.info('[database] MONGODB_URI is not set; using ephemeral development identity storage and public defaults.');
    return false;
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production',
    serverSelectionTimeoutMS: 8000,
  });
  console.info('[database] MongoDB connection established.');
  return true;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

export function databaseStatus() {
  const names = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return names[mongoose.connection.readyState] || 'unknown';
}

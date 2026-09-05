import mongoose from "mongoose";
import { MONGODB_URI } from "./config";

export async function connectDB(): Promise<void> {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
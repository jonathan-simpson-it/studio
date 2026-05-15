import mongoose from 'mongoose';

declare global {
  var _mongooseConnection: typeof mongoose | undefined;
}

export async function connect() {
  if (global._mongooseConnection && mongoose.connection.readyState === 1) {
    return global._mongooseConnection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  const conn = await mongoose.connect(uri);
  global._mongooseConnection = conn;
  return conn;
}

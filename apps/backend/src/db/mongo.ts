import mongoose from "mongoose";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export async function connectMongo(): Promise<void> {
  try {
    mongoose.connection.on("error", (err) => {
      logger.error(err, "MongoDB connection error");
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB connection disconnected");
    });

    if (process.env["NODE_ENV"] !== "production") {
      mongoose.set("debug", (collectionName, method, query, doc) => {
        logger.debug(
          { collectionName, method, query: JSON.stringify(query), doc: JSON.stringify(doc) },
          "Mongoose query"
        );
      });
    }

    await mongoose.connect(config.DATABASE_URL);
    logger.info("Connected to MongoDB database");
  } catch (err) {
    logger.error(err, "Failed to connect to MongoDB");
    throw err;
  }
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  logger.info("Disconnected from MongoDB");
}

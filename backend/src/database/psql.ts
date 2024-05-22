import { Pool } from "pg";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { logger } from "../logger";
import { DbConfig } from ".";

const pgSessionStore = pgSession(session);

let pool: Pool;

function createPool(config: DbConfig) {
    pool = new Pool({
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        database: config.database
    });
}

async function testDatabaseConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
        pool.connect((error, client, release) => {
            if (error)
                logger.logObject(error);

            if (error || !client) {
                reject(new Error("Failed to connect to the database"));
            }

            release();
            resolve();
        })
    });
}

export { pgSessionStore, pool, testDatabaseConnection, createPool }

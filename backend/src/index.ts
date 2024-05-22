import express from "express";
import session from "express-session";
import { passport } from "./auth/passport";
import * as dotenv from "dotenv";
import { authRouter } from "./auth/routes";
import { DbConfig, pgSessionStore, pool, runMigrations, testDatabaseConnection } from "./database";
import { logger } from "./logger/";
import { Server } from "http";
import { createPool } from "./database/psql";

dotenv.config();

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface User {
            id: string;
        }
    }
}

const PORT = parseInt(process.env.PORT as string, 10) || 8080;

const app = express();

let server: Server;
async function setupServer(dbConfig?: DbConfig) {
    if (server)
        return;

    if (!dbConfig) {
        dbConfig = {
            user: process.env.DATABASE_USER ?? "",
            password: process.env.DATABASE_PASSWORD ?? "",
            host: process.env.DATABASE_HOST ?? "",
            port: parseInt(process.env.DATABASE_PORT ?? "") || 5432,
            database: process.env.DATABASE_NAME ?? ""
        };
    }

    createPool(dbConfig);

    try {
        await testDatabaseConnection();
        logger.info("Established connection to the database");
        await runMigrations();
    } catch (e) {
        logger.error(`Failed to establish database connection`);
        logger.error(e as string);
        return;
    }

    app.use(session({
        store: new pgSessionStore({
            pool,
            tableName: 'user_sessions'
        }),
        secret: (process.env.SESSION_SECRET as string),
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(express.json());

    app.use("/auth", authRouter);

    app.get("/hello-world", (_req, res) => {
        res.send({ message: "Hello, World!" });
    });

    server = app.listen(PORT, () => {
        logger.info(`Server started listening on port ${PORT}`);
    });

    server.on('close', async () => {
        await pool.end();
    });
}

// The test fixture should start the server itself
if (process.env.NODE_ENV !== "test")
    setupServer();

export { app, server, setupServer };

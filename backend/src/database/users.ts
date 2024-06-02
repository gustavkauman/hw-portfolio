import bcrypt from "bcrypt";
import { logger } from "../logger";
import { pool } from ".";

const SALT_ROUNDS = 12;

type CreateUser = {
    email: string;
    name: string;
    password: string;
}

type DatabaseUser = {
    id: string;
    email: string;
    name: string;
    created_at: Date;
    modified_at: Date;
}

type DatabaseUserWithPasswordHash = {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    created_at: Date;
    modified_at: Date;
}

async function insertUser(user: CreateUser): Promise<DatabaseUser | null> {
    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

    try {
        const result = 
            await pool.query(
                "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *",
                [ user.email, user.name, passwordHash ]
        );

        if (result.rows.length <= 0)
            return null;

        return result.rows[0] as DatabaseUser;
    } catch (e) {
        logger.error(`Failed to create user due to a database error`);
        logger.logObject(e);

        return null;
    }
}

async function getUserByEmail(email: string): Promise<DatabaseUserWithPasswordHash | null> {
    try {
        const result =
            await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length <= 0)
            return null;

        return result.rows[0];
    } catch (e) {
        logger.logObject(e);
    }

    return null;
}

async function getUserById(id: string): Promise<DatabaseUser | null> {
    try {
        const result =
            await pool.query("SELECT id, email, name, created_at, modified_at FROM users WHERE id = $1", [id]);

        if (result.rows.length <= 0)
            return null;

        return result.rows[0];
    } catch (e) {
        // TODO: Actually handle errors...
    }

    return null;
}

async function getAllUsers(): Promise<DatabaseUser[]> {
    const result = await pool.query("SELECT * FROM users");
    return result.rows;
}

export { CreateUser as User, insertUser, getAllUsers, getUserById, getUserByEmail }

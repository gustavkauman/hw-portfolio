import request from "supertest";
import * as dotenv from "dotenv";

import { app, server, setupServer } from "./../../src";
import { Client } from "pg";
import { DbConfig, insertUser, pool } from "../../src/database";

dotenv.config();

const DB_NAME = "automatedtests";

const localClient = new Client({
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT ?? "") || 5432
});

beforeAll(async () => {
    await localClient.connect();
    await localClient.query(`create database "${DB_NAME}"`);

    const dbConfig: DbConfig = {
        user: process.env.DATABASE_USER ?? "",
        password: process.env.DATABASE_PASSWORD ?? "",
        host: process.env.DATABASE_HOST ?? "",
        port: parseInt(process.env.DATABASE_PORT ?? "") || 5432,
        database: DB_NAME
    };

    await setupServer(dbConfig);
});

describe('Basic server tests', () => {
    it('can start the application', async () => {
        const res = await request(app).get("/hello-world");
        expect(res.body).toEqual({ message: "Hello, World!" });
    });
});

describe('Authentication tests', () => {
    beforeEach(async () => {
        await pool.query('truncate "users"');
        await pool.query('truncate "user_sessions"');
    });

    describe('Authentication HTTP tests', () => {
        it('can create a new user', async () => {
            const body = {
                email: "test@example.com",
                name: "Test",
                password: "password",
                passwordConfirmation: "password"
            };

            await request(app)
            .post('/auth/register')
            .send(body)
            .expect(201);

            const rows = await pool.query("select * from users");
            expect(rows.rowCount).toStrictEqual(1);
        });

        it('ensures that password and confirmation matches', async () => {
            const body = {
                email: "test@example.com",
                name: "Test",
                password: "password",
                passwordConfirmation: "doesnotmatch"
            };

            await request(app)
            .post('/auth/register')
            .send(body)
            .expect(401);
        });

        it('can log in an existing user', async () => {
            await insertUser({
                email: 'test@example.com',
                name: 'test',
                password: 'password'
            });

            const body = {
                email: "test@example.com",
                password: "password"
            };

            const res = await request(app)
            .post('/auth/login')
            .send(body)
            .expect(200);

            expect(res.headers['set-cookie']).toBeTruthy();
            expect(res.body).toEqual({ message: "Logged in successfully" });
        });

        it('can log out an user', async () => {
            await insertUser({
                email: 'test@example.com',
                name: 'test',
                password: 'password'
            });

            const loginBody = {
                email: 'test@example.com',
                password: 'password'
            };

            const authRes = await request(app)
            .post('/auth/login')
            .send(loginBody)
            .expect(200);

            const cookie = authRes.headers['set-cookie'];
            expect(cookie).toBeTruthy();
            let dbResult = await pool.query('select * from user_sessions');
            expect(dbResult.rowCount).toStrictEqual(1);

            await request(app)
            .post('/auth/logout')
            .set('Cookie', cookie)
            .send({})
            .expect(200);
        });
    });

    describe('Authentication database tests', () => {
        it('can insert a new user', async () => {
            const rowCount = (await pool.query("select * from users")).rowCount || 0;

            await insertUser({
                email: 'test@example.com',
                name: 'test',
                password: 'password'
            });

            const newRowCount = (await pool.query("select * from users")).rowCount;

            expect(newRowCount).toBe(rowCount + 1);
        });

        it('can handle multiple users being inserted', async () => {
            const rowCount = (await pool.query("select * from users")).rowCount || 0;

            expect(rowCount).toBe(0);

            await insertUser({
                email: 'test@example.com',
                name: 'test',
                password: 'password'
            });

            let newRowCount = (await pool.query("select * from users")).rowCount;
            expect(newRowCount).toBe(rowCount + 1);

            await insertUser({
                email: 'other@example.com',
                name: 'other user',
                password: 'password'
            });

            newRowCount = (await pool.query("select * from users")).rowCount;
            expect(newRowCount).toBe(rowCount + 2);
        });

        it('fails if same e-mail is attempted to be entered', async () => {
            await insertUser({
                email: 'test@example.com',
                name: 'test',
                password: 'password'
            });

            const rowCount = (await pool.query("select * from users")).rowCount;
            expect(rowCount).toBe(1);

            try {
                await insertUser({
                    email: 'test@example.com',
                    name: 'other user',
                    password: 'password'
                });
            } catch (e) {
                expect(e).toBeTruthy();
            }

            // To ensure that the catch was actually done
            expect.assertions(2);

            const newRowCount = (await pool.query("select * from users")).rowCount;
            expect(newRowCount).toBe(1);
        });
    });
});

afterAll(async () => {
    server?.close();

    await localClient.query(`drop database "${DB_NAME}"`);
    await localClient.end();
});

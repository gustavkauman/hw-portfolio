import request from "supertest";
import * as dotenv from "dotenv";

import { Client } from "pg";
import { DbConfig, insertDevice, insertUser, pool } from "../../src/database";
import { app, server, setupServer } from "../../src";
import { deleteDeviceById } from "../../src/database/devices";

dotenv.config();

const DB_NAME = "deviceautomatedtests";
const SHARED_STATE: any = {};

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

    await setupServer(dbConfig, 8081);

    SHARED_STATE.user = await insertUser({
        email: "test@example.com",
        name: "Test user",
        password: "password"
    });

    SHARED_STATE.other_user = await insertUser({
        email: "test-2@example.com",
        name: "Test user 2",
        password: "password"
    });

    const loginBody = {
        email: SHARED_STATE.user.email,
        password: "password"
    };

    const response = await request(app)
        .post('/auth/login')
        .send(loginBody);

    SHARED_STATE.token = response.headers['set-cookie'];
});

describe('Device tests', () => {
    describe('Device database tests', () => {
        beforeEach(async () => {
            await pool.query("truncate devices cascade");
        });

        it('can create a new device for a user', async () => {
            const device = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            expect(device).toBeTruthy();
            expect(device?.id).toBeTruthy();
            expect(device?.serial_no).toBeFalsy();

            const newRowCount = (await pool.query("select * from devices")).rowCount || 0;
            expect(newRowCount).toBe(1);
        });

        it('can create a new device with a serial number', async () => {
            const device = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: "TEST"
            });

            expect(device).toBeTruthy();
            expect(device?.id).toBeTruthy();
            expect(device?.serial_no).toBe("TEST");

            const newRowCount = (await pool.query("select * from devices")).rowCount || 0;
            expect(newRowCount).toBe(1);
        });

        it('can create multiple devices for the same user', async () => {
            const device_1 = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: "TEST"
            });

            const device_2 = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device 2",
                serial_no: "OTHER SERIAL"
            });

            expect(device_1?.id).not.toBe(device_2?.id);

            const rowCount = (await pool.query("select * from devices")).rowCount || 0;
            expect(rowCount).toBe(2);
        });

        it('can have devices for different users', async () => {
            const device_1 = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: "TEST"
            });

            const device_2 = await insertDevice({
                owner: SHARED_STATE.other_user.id,
                name: "Test device 2",
                serial_no: "OTHER SERIAL"
            });

            expect(device_1?.owner).not.toBe(device_2?.owner);
            expect(device_1?.id).not.toBe(device_2?.id);

            const rowCount = (await pool.query("select * from devices")).rowCount || 0;
            expect(rowCount).toBe(2);
        });

        it('can delete a device', async () => {
            const device = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: "TEST"
            });

            expect(device).toBeTruthy();

            const rowCount = (await pool.query("select * from devices")).rowCount || 0;
            expect(rowCount).toBe(1);

            // @ts-ignore
            await deleteDeviceById(device.id);

            const newRowCount = (await pool.query("select * from devices")).rows.length || 0;
            expect(newRowCount).toBe(0);
        });
    });

    describe('Device REST tests', () => {
        beforeEach(async () => {
            await pool.query("truncate devices cascade");
        });

        it('can create a new device for a logged in user', async () => {
            const reqBody = {
                name: "Test device"
            };

            const response = await request(app)
                .post('/devices')
                .set('Cookie', SHARED_STATE.token)
                .send(reqBody)
                .expect(201);

            const body = response.body;
            expect(body.id).toBeTruthy();
            expect(body.name).toBe("Test device");
            expect(body.serial_no).toBeNull();
        });

        it('can create a new device with a serial for a logged in user', async () => {
            const reqBody = {
                name: "Test device",
                serial_no: "TEST"
            };

            const response = await request(app)
                .post('/devices')
                .set('Cookie', SHARED_STATE.token)
                .send(reqBody)
                .expect(201);

            const body = response.body;
            expect(body.id).toBeTruthy();
            expect(body.name).toBe("Test device");
            expect(body.serial_no).toBe("TEST");
        });

        it('can fetch all devices belonging to a user', async () => {
            const device_1 = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            const device_2 = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            const response = await request(app)
                .get('/devices')
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(200);

            const body = response.body;
            expect(body.length).toBeTruthy();
            expect(body.length).toBe(2);

            const responseDevice1 = body[0];
            expect(responseDevice1.id).toBe(device_1?.id);

            const responseDevice2 = body[1];
            expect(responseDevice2.id).toBe(device_2?.id);
        });

        it('can fetch a specific device belonging to a user', async () => {
            const device_1 = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            const response = await request(app)
                .get(`/devices/${device_1?.id}`)
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(200);

            const body = response.body;
            expect(body.id).toBe(device_1?.id);
            expect(body.name).toBe(device_1?.name);
        });

        it('can delete a specific device belonging to a user', async () => {
            const deviceToBeDeleted = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            const device_2 = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device 2",
                serial_no: ""
            });

            await request(app)
                .delete(`/devices/${deviceToBeDeleted?.id}`)
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(204);

            const rowCount = (await pool.query("select * from devices")).rows.length;
            expect(rowCount).toBe(1);

            await request(app)
                .get(`/devices/${device_2?.id}`)
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(200);
        });

        it('ensures that the endpoints are protected', async () => {
            let response = await request(app)
                .get('/devices')
                .send()
                .expect(401);

            expect(response.status).toBe(401);

            response = await request(app)
                .post('/devices')
                // the content of the body shouldn't matter,
                // and if it did, we should receive a 400
                .send({}) 
                .expect(401);

            expect(response.status).toBe(401);
        });

        it('ensures that the logged in users is the owner when deleting a device', async () => {
            const device_1 = await insertDevice({
                owner: SHARED_STATE.other_user.id,
                name: "Test device",
                serial_no: ""
            });

            await request(app)
                .delete(`/devices/${device_1?.id}`)
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(404);
        });

        it('ensures that a user only sees their own devices', async () => {
            const device_1 = await insertDevice({
                owner: SHARED_STATE.other_user.id,
                name: "Test device",
                serial_no: ""
            });

            expect(device_1).toBeTruthy();

            let response = await request(app)
                .get('/devices')
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(200);

            expect(response.body.length).toBe(0);
        });
    });
});

afterAll(async () => {
    server.close();

    await localClient.query(`drop database "${DB_NAME}"`);
    await localClient.end();
});

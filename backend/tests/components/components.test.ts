import request from "supertest";
import * as dotenv from "dotenv";

import { Client } from "pg";
import { DbConfig, insertDevice, insertUser, pool } from "../../src/database";
import { app, server, setupServer } from "../../src";
import { Component, DeviceType, getComponentById, getComponentsByDevice, getComponentsByOwner, insertComponent, updateComponentById } from "../../src/database/components";
import { deleteDeviceById } from "../../src/database/devices";

dotenv.config();

const DB_NAME = "compenentautomatedtests";
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

    await setupServer(dbConfig, 8082);

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

describe('Component tests', () => {
    describe('Component database tests', () => {
        beforeEach(async () => {
            await pool.query("truncate components cascade");
        });

        it('can create a component for a device', async () => {
            const device = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            expect(device).toBeTruthy();

            const component = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
                device_id: device?.id
            });

            expect(component).toBeTruthy();
            expect(component?.name).toBe("Test drive");
            expect(component?.device_type).toBe(DeviceType.DISK);
            expect(component?.owner).toBe(SHARED_STATE.user.id);
            expect(component?.device_id).toBe(device?.id);

            const rowCount = (await pool.query("select * from components")).rows.length;
            expect(rowCount).toBe(1);
        });

        it('can create an unassigned component for a user', async () => {
            const component = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            expect(component).toBeTruthy();
            expect(component?.name).toBe("Test drive");
            expect(component?.device_type).toBe(DeviceType.DISK);
            expect(component?.owner).toBe(SHARED_STATE.user.id);
            expect(component?.device_id).toBeNull();

            const rowCount = (await pool.query("select * from components")).rows.length;
            expect(rowCount).toBe(1);
        });

        it('can update a component', async () => {
            const component = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const rowCount = (await pool.query("select * from components")).rows.length;
            expect(rowCount).toBe(1);

            const updatedComponent = await updateComponentById(component?.id ?? "", {
                name: "Updated test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id
            });

            const updatedRowCount = (await pool.query("select * from components")).rows.length;
            expect(updatedRowCount).toBe(1);

            expect(updatedComponent?.device_type).toBe(component?.device_type);
            expect(updatedComponent?.name).toBe("Updated test drive");
            expect(updatedComponent?.owner).toBe(SHARED_STATE.user.id);
        });

        it('can create multiple components for the same user', async () => {
            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const component_2 = await insertComponent({
                name: "Test drive 2",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const rowCount = (await pool.query("select * from components")).rows.length;
            expect(rowCount).toBe(2);

            expect(component_1?.id).not.toBe(component_2?.id);
        });

        it('can create multiple components for the same device', async () => {
            const device = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
                device_id: device?.id
            });

            const component_2 = await insertComponent({
                name: "Test drive 2",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
                device_id: device?.id
            });

            const rowCount = (await pool.query("select * from components")).rows.length;
            expect(rowCount).toBe(2);

            expect(component_1?.id).not.toBe(component_2?.id);
            expect(component_1?.device_id).toBe(component_2?.device_id);
        });

        it('can get a component by id', async () => {
            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const test_component = await getComponentById(component_1?.id ?? "");
            
            expect(test_component).toStrictEqual(component_1);
        });

        it('can get components belonging to a device', async () => {
            const device = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
                device_id: device?.id
            });

            const component_2 = await insertComponent({
                name: "Test drive 2",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
                device_id: device?.id
            });

            const other_component = await insertComponent({
                name: "Other component",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const rowCount = (await pool.query("select * from components")).rows.length;
            expect(rowCount).toBe(3);

            const components = await getComponentsByDevice(device?.id ?? "");
            expect(components?.length).toBe(2);
        });

        it('can get components by owner', async () => {
            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const component_2 = await insertComponent({
                name: "Test drive 2",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.other_user.id
            });

            const rowCount = (await pool.query("select * from components")).rows.length;
            expect(rowCount).toBe(2);

            const components = await getComponentsByOwner(SHARED_STATE.user.id);
            expect(components?.length).toBe(1);
        });

        it('ensures that when a device is deleted, the components are unassigned', async () => {
            const device = await insertDevice({
                owner: SHARED_STATE.user.id,
                name: "Test device",
                serial_no: ""
            });

            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
                device_id: device?.id
            });

            expect(component_1?.device_id).toBe(device?.id);

            await deleteDeviceById(device?.id ?? "");

            const updatedComponent = await getComponentById(component_1?.id ?? "");
            expect(updatedComponent?.device_id).toBeNull();
        });
    });

    describe('Component REST tests', () => {
        beforeEach(async () => {
            await pool.query("truncate components cascade");
        });

        it('can create a new component for a logged in user', async () => {
            const reqBody = {
                device_type: "disk",
                name: "Test component"
            };

            const response = await request(app)
                .post('/components')
                .set('Cookie', SHARED_STATE.token)
                .send(reqBody)
                .expect(201);

            const responseBody = response.body;
            expect(responseBody.id).toBeTruthy();
        });

        it('can get a component by id', async () => {
            const component = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const response = await request(app)
                .get(`/components/${component?.id}`)
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(200);

            expect(response.body.id).toBe(component?.id);
        });

        it('can get a list of components for a user', async () => {
            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const component_2 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.other_user.id,
            });

            const response = await request(app)
                .get('/components')
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(200);

            const componentList = response.body as Array<Component>;
            expect(componentList.length).toBe(1);
            expect(componentList.filter((comp) => comp.id === component_2?.id).length).toBe(0);
            expect(componentList.filter((comp) => comp.id === component_1?.id).length).toBe(1);
        });

        it('can update a component for a user', async () => {
            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.user.id,
            });

            const rowCount = (await pool.query("select * from components")).rows.length;
            expect(rowCount).toBe(1);

            const reqBody = {
                name: "Updated test drive",
                device_type: "disk"
            };

            const response = await request(app)
                .put(`/components/${component_1?.id}`)
                .set('Cookie', SHARED_STATE.token)
                .send(reqBody)
                .expect(200);

            expect(response.body.name).toBe("Updated test drive");

            const updatedRowCount = (await pool.query("select * from components")).rows.length;
            expect(updatedRowCount).toBe(1);
        });

        it('ensures that the user is logged in', async () => {
            await request(app)
                .post('/components')
                .send({})
                .expect(401);
        });

        it('ensures that only the owner can see the component', async () => {
            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.other_user.id,
            });

            await request(app)
                .get(`/components/${component_1?.id}`)
                .set('Cookie', SHARED_STATE.token)
                .send()
                .expect(404);
        });

        it('ensures that only the owner can update the component', async () => {
            const component_1 = await insertComponent({
                name: "Test drive",
                device_type: DeviceType.DISK,
                owner: SHARED_STATE.other_user.id,
            });

            const reqBody = {
                name: "Updated test drive",
                device_type: "disk"
            };

            await request(app)
                .put(`/components/${component_1?.id}`)
                .set('Cookie', SHARED_STATE.token)
                .send(reqBody)
                .expect(404);

            const updatedComponent = await getComponentById(component_1?.id ?? "");
            expect(updatedComponent?.name).toBe(component_1?.name);
        });
    });
});

afterAll(async () => {
    server.close();

    await localClient.query(`drop database "${DB_NAME}"`);
    await localClient.end();
});

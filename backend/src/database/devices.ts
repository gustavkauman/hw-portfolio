import { pool } from "./psql";

type CreateDevice = {
    name: string;
    owner: string;
    serial_no: string;
}

type Device = {
    id: string;
    name: string;
    serial_no?: string;
    owner: string;
    created_at: Date;
    modified_at: Date;
}

async function insertDevice(request: CreateDevice): Promise<Device | null> {
    let device: Device;
    const client = await pool.connect();
    try {
        await client.query('begin');
        const result =
            await client.query("insert into devices (name, owner, serial_no) values ($1, $2, $3) returning id, name, serial_no, owner, created_at, modified_at", 
                [ request.name, request.owner, request.serial_no ]);

        if (result.rows.length <= 0)
            throw new Error("Failed to create device");

        await client.query('commit');

        device = result.rows[0] as Device;
    } catch (err) {
        console.log(err);
        await client.query('rollback');
        return null;
    } finally {
        client.release();
    }

    return device;
}

async function getDevicesByAccount(ownerId: string): Promise<Device[] | null> {
    let devices: Device[] = [];
    try {
        const result =
            await pool.query("select id, name, serial_no, owner, created_at, modified_at from devices where owner = $1", [ ownerId ]);

        devices = result.rows as Device[];
    } catch (err) {
        return null;
    }

    return devices;
}

async function getDeviceById(deviceId: string): Promise<Device | null | undefined> {
    try {
        const result =
            await pool.query("select id, name, serial_no, owner, created_at, modified_at from devices where id = $1",
                [ deviceId ]);

        if (result.rows.length <= 0)
            return null;

        return result.rows[0] as Device;
    } catch (err) {
        return undefined;
    }
}

async function deleteDeviceById(deviceId: string): Promise<boolean> {
    try {
        await pool.query("delete from devices where id = $1", [ deviceId ]);
        return true;
    } catch (err) {
        return false;
    }
}

export { 
    CreateDevice,
    Device,
    insertDevice,
    getDevicesByAccount,
    getDeviceById,
    deleteDeviceById
};

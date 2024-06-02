import { pool } from ".";

enum DeviceType {
    DISK = "disk",
    NETWORK_ADAPTER = "network_adapter",
    MOTHERBOARD = "motherboard",
    CPU = "cpu",
    GPU = "gpu",
    PSU = "psu",
    CABINET = "cabinet",

    UNDEFINED = "undefined"
};

type CreateComponent = {
    device_id?: string;
    device_type: DeviceType;
    name: string;
    part_no?: string;
    serial_no?: string;
    owner: string;
};

type Component = {
    id: string;
    device_id?: string;
    device_type: DeviceType;
    name: string;
    part_no?: string;
    serial_no?: string;
    owner: string;
    created_at: Date;
    modified_at: Date;
};

async function getComponentById(componentId: string): Promise<Component | null | undefined> {
    try {
        const result =
            await pool.query(
                `select id, device_id, device_type, name, part_no, serial_no, owner, created_at, modified_at from components where id = $1`,
                [ componentId ]
            );

        if (result.rows.length <= 0)
            return null;

        return result.rows[0] as Component;
    } catch (err) {
        return undefined;
    }
}

async function getComponentsByOwner(ownerId: string): Promise<Component[] | null> {
    try {
        const result =
            await pool.query(
                `select id, device_id, device_type, name, part_no, serial_no, owner, created_at, modified_at from components where owner = $1`,
                [ ownerId ]
            );

        return result.rows as Component[];
    } catch (err) {
        return null;
    }
}

async function getComponentsByDevice(deviceId: string): Promise<Component[] | null> {
    try {
        const result =
            await pool.query(
                `select id, device_id, device_type, name, part_no, serial_no, owner, created_at, modified_at from components where device_id = $1`,
                [ deviceId ]
            );

        return result.rows as Component[];
    } catch (err) {
        return null;
    }
}

async function insertComponent(request: CreateComponent): Promise<Component | null> {
    const client = await pool.connect();
    try {
        await client.query('begin');

        const result =
            await client.query(`insert into components (device_id, device_type, name, part_no, serial_no, owner)
values ($1, $2, $3, $4, $5, $6)
returning id, device_id, device_type, name, part_no, serial_no, owner, created_at, modified_at`,
                [ request.device_id, request.device_type, request.name, request.part_no, request.serial_no, request.owner]
            );

        if (result.rows.length <= 0)
            throw new Error("Failed to create component");

        await client.query('commit');

        return result.rows[0] as Component;
    } catch (err) {
        await client.query('rollback');
        return null;
    } finally {
        client.release();
    }
}

async function updateComponentById(componentId: string, request: CreateComponent): Promise<Component | null> {
    const client = await pool.connect();
    try {
        await client.query('begin');

        const result =
            await client.query(`update components set 
device_id = $1, device_type = $2, name = $3, part_no = $4, serial_no = $5, owner = $6
where id = $7
returning id, device_id, device_type, name, part_no, serial_no, owner, created_at, modified_at`,
                [ request.device_id, request.device_type, request.name, request.part_no, request.serial_no, request.owner, componentId]
            );

        if (result.rows.length <= 0)
            throw new Error("Failed to update component. Maybe it was deleted?");

        return result.rows[0] as Component;
    } catch (err) {
        await client.query('rollback');
        return null;
    } finally {
        client.release();
    }
}

export {
    DeviceType,
    CreateComponent,
    Component,
    getComponentById,
    getComponentsByOwner,
    getComponentsByDevice,
    insertComponent,
    updateComponentById
};

import { Request, Response, Router } from "express";
import { ensureAuthenticated } from "../auth/helpers";
import { CreateDevice, insertDevice } from "../database";
import { deleteDeviceById, getDeviceById, getDevicesByAccount } from "../database/devices";
import { validate as validateUuid } from "uuid";
import { getComponentsByDevice } from "../database/components";

const router = Router();

router.get("/", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();

    const devices = await getDevicesByAccount(req.user.id);
    if (devices === null)
        return res.status(500).send();

    return res.status(200).send(devices);
});

router.post("/", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();

    const deviceRequest = req.body as CreateDevice;
    deviceRequest.owner = req.user.id;

    const result = await insertDevice(deviceRequest);
    if (!result)
        return res.status(500).send();

    return res.status(201).send(result);
});

router.get("/:deviceId", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();
    if (!req.params.deviceId || !validateUuid(req.params.deviceId))
        return res.status(400).send();

    const device = await getDeviceById(req.params.deviceId);
    if (device === undefined)
        return res.status(500).send();
    if (device === null || device.owner !== req.user.id)
        return res.status(404).send({ message: "Device could not be found" });

    return res.status(200).send(device);
});

router.get("/:deviceId/components", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();
    if (!req.params.deviceId || !validateUuid(req.params.deviceId))
        return res.status(400).send();

    const device = await getDeviceById(req.params.deviceId);
    if (device === undefined)
        return res.status(500).send();
    if (device === null || device.owner !== req.user.id)
        return res.status(404).send({ message: "Device could not be found" });

    const components = await getComponentsByDevice(req.params.deviceId);
    if (!components)
        return res.status(500).send();

    return res.status(200).send(components);
});

router.delete("/:deviceId", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();
    if (!req.params.deviceId || !validateUuid(req.params.deviceId))
        return res.status(400).send();

    const device = await getDeviceById(req.params.deviceId);
    if (device === undefined)
        return res.status(500).send();
    if (device === null)
        return res.status(204).send();
    if (device.owner !== req.user.id)
        return res.status(404).send({ message: "Device could not be found" });

    const success = await deleteDeviceById(req.params.deviceId);
    if (!success)
        return res.status(500).send();

    return res.status(204).send();
});

export { router as deviceRouter };

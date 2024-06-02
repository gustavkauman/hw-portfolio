import { Router, Request, Response } from "express";
import { ensureAuthenticated } from "../auth/helpers";
import { CreateComponent, getComponentById, getComponentsByOwner, insertComponent, updateComponentById } from "../database/components";
import { validate as validateUuid } from "uuid";

const router = Router();

router.get("/", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();

    const components = await getComponentsByOwner(req.user.id);
    if (!components)
        return res.status(500).send();

    return res.status(200).send(components);
});

router.get("/:componentId", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();
    if (!req.params.componentId || !validateUuid(req.params.componentId))
        return res.status(400).send();

    const component = await getComponentById(req.params.componentId);
    if (component === undefined)
        return res.status(500).send();
    if (component === null || component.owner !== req.user.id)
        return res.status(404).send({ message: "Component not found" });

    return res.status(200).send(component);
});

router.post("/", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();

    const createComponent = req.body as CreateComponent;
    createComponent.owner = req.user.id;

    const component = await insertComponent(createComponent);
    if (!component)
        return res.status(500).send();

    return res.status(201).send(component);
});

router.put("/:componentId", ensureAuthenticated, async (req: Request, res: Response) => {
    if (!req.user)
        return res.status(401).send();
    if (!req.params.componentId)
        return res.status(400).send();

    const previousComponent = await getComponentById(req.params.componentId);
    switch (previousComponent) {
        case undefined:
            return res.status(500).send();
        default: {
            if (!previousComponent || previousComponent.owner !== req.user.id)
                return res.status(404).send();
        }
    }

    const updateComponent = req.body as CreateComponent;
    updateComponent.owner = req.user.id;

    const component = await updateComponentById(req.params.componentId, updateComponent);
    if (!component)
        return res.status(500).send();

    return res.status(200).send(component);
});

export { router as componentRouter };

import { NextFunction, Request, Response, Router } from "express";
import { User, insertUser } from "../database";
import passport from "passport";
import { ensureAuthenticated } from "./helpers";
import { getUserById } from "../database/users";
import { logger } from "../logger";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
    try {
        if (req.body.password !== req.body.passwordConfirmation) {
            res.status(401).send({
                message: "Passwords to not match"
            });
            return;
        }

        const success = await insertUser(req.body as User);
        
        if (!success)
            return res.status(500).send({message: "Failed to create user"});

        return res.status(201).send({
            message: "User was created"
        });
    } catch (e) {
        return res.status(500).send({
            message: "Error during user registration",
            error: e
        });
    }
});

router.post("/login", passport.authenticate('local'), (_req: Request, res: Response) => {
    res.send({message: "Logged in successfully" });
});

router.post("/logout", ensureAuthenticated, (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
        if (err) return next(err);
        res.status(200).send({ message: "User successfully logged out"});
    });
});

router.get("/me", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
        if (!req.user)
            return res.status(401).send({ message: "Need to be authorized to get info on current user" });

        const user = await getUserById(req.user?.id);

        if (!user) {
            logger.debug("Somehow managed to authenticate with out the user existing...");
            return res.status(404).send({ message: "User was not found" });
        }

        return res.status(200).send(user);
    } catch (e) {
        return res.status(500).send({
            message: "Error while fetching user",
            error: e
        });
    }
});

export { router as authRouter }

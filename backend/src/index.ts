import express from "express";
import session from "express-session";
import { passport } from "./auth/passport";
import { ensureAuthenticated } from "./auth/helpers";
import * as dotenv from "dotenv";

dotenv.config();

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface User {
            id: number;
        }
    }
}

const PORT = parseInt(process.env.PORT as string, 10) || 8080;

const app = express();

app.use(session({
    secret: (process.env.SESSION_SECRET as string),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());

app.get("/", (req, res) => {
    res.send({ message: "Hello, World!" });
});

app.get("/secret", ensureAuthenticated, (req, res) => res.send("very secret"));

app.listen(PORT, () => {
    console.log(`Server started listening on port ${PORT}`);
});

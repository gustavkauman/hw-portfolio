import passport from "passport";
import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import { getUserByEmail, getUserById } from "../../database/users";
import { logger } from "../../logger";

passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email: string, password: string, done) => {
        const user = await authenticateUserByEmail(email, password);
        if (!user)
            return done(null);

        logger.log("AUTH", `Authenticated a user with e-mail "${email}"`);
        return done(null, (user as Express.User));
    }
));

passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    const user = await deserializeUserById(id);
    if (!user)
        return done(null, null);

    done(null, user);
});

async function authenticateUserByEmail(email: string, password: string): Promise<Express.User | null> {
    const dbUser = await getUserByEmail(email);
    if (!dbUser)
        return null;

    const match = bcrypt.compare(password, dbUser.password_hash);
    
    if (!match)
        return null;

    return {
        id: dbUser.id
    };
}

async function deserializeUserById(id: string): Promise<Express.User | null> {
    const user = await getUserById(id);

    if (!user)
        return null;

    return {
        id: user.id
    };
}

export { passport };

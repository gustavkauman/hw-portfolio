import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

passport.use(new LocalStrategy(function verify(username, password, cb) {
    return cb(null, false);
}));

passport.serializeUser((user, cb) => {
    return cb(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
    done(null, null);
});

export { passport };

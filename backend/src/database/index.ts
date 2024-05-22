export { User, insertUser } from "./users";
export { pgSessionStore, pool, testDatabaseConnection } from "./psql"
export { runMigrations } from "./migration";

export type DbConfig = {
    user: string;
    password: string;
    host: string;
    port: number;
    database: string;
}

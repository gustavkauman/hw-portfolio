import { migrate } from "postgres-migrations";
import { pool } from ".";
import path from "path";

async function runMigrations() {
    await migrate({ client: pool }, path.join(process.cwd(), "migrations"));
}

export { runMigrations };

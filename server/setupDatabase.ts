import "dotenv/config";
import { database } from "./database.js";

console.log(`PostgreSQL database is ready at ${process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/doctor_com"}.`);
await database.close();
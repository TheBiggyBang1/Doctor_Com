import "dotenv/config";
import { database } from "./database.js";

console.log(`SQLite database is ready at ${process.env.DATABASE_PATH ?? "data/doctor_com.sqlite"}.`);
database.close();
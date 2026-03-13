import * as SQLite from 'expo-sqlite';

const DB_NAME = 'wordmaster.db';

// Single shared database connection for the entire app.
// This avoids finalizeAsync conflicts caused by multiple
// openDatabaseSync calls on the same database file.
const db = SQLite.openDatabaseSync(DB_NAME);

export default db;

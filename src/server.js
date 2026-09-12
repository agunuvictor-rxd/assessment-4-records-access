import { createApp } from './app.js';
import { config } from './config.js';
import { getDatabase } from './db.js';

// Initialize database
getDatabase(config.dbPath);

const app = createApp();

app.listen(config.port, () => {
  console.log(`[RECORDS SLICE] Server listening at http://localhost:${config.port}`);
  console.log(`[RECORDS SLICE] Environment: ${config.nodeEnv}`);
});

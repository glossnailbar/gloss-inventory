/**
 * PostgreSQL Connection Pool
 *
 * Railway connection notes:
 * - Railway provides DATABASE_URL with TCP proxy
 * - For Node.js pg library, use ssl: { rejectUnauthorized: false }
 * - Don't add query params to URL, configure SSL separately
 */
import { Pool } from 'pg';
declare const pool: Pool;
export { pool };
//# sourceMappingURL=pool.d.ts.map
// migrate-deploy.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from './shared/schema.js';
import 'dotenv/config';
console.log('Iniciando script de migração no deploy...');
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL não definida nas variáveis de ambiente');
    console.error('Por favor, defina DATABASE_URL no seu arquivo .env ou nas variáveis de ambiente');
    console.error('Exemplo: DATABASE_URL="postgresql://username:password@localhost:5432/database_name"');
    throw new Error('DATABASE_URL não definida nas variáveis de ambiente');
}
const sql = neon(dbUrl);
const db = drizzle(sql, { schema, logger: false });
async function runMigrations() {
    try {
        console.log('Conectado ao banco de dados. Aplicando migrações...');
        await migrate(db, { migrationsFolder: './migrations' });
        console.log('Migrações concluídas com sucesso.');
        console.log('Conexão com o banco de dados fechada.');
    }
    catch (error) {
        console.error('Erro durante a migração:', error);
        process.exit(1);
    }
}
runMigrations();
//# sourceMappingURL=migrate-deploy.js.map
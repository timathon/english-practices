import { connect } from '@tidbcloud/serverless';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.dev.vars') });

const conn = connect({
  host: process.env.TIDB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  username: process.env.TIDB_USER || '2CC8Ufd3t88uAwh.admin',
  password: process.env.TIDB_PASSWORD || 'Aiqiyouyouyuan0811!',
});

async function main() {
  console.log('🚀 Connecting to TiDB Cloud Serverless via HTTP driver...');
  
  // 1. Create table
  console.log('📦 Ensuring `practice` table exists in TiDB...');
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS practice (
      id VARCHAR(255) PRIMARY KEY,
      textbook VARCHAR(255) NOT NULL,
      unit VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Table `practice` created/verified.');

  // 2. Fetch sample practices from D1 endpoint to seed TiDB
  console.log('📥 Fetching catalog practices from local Worker D1...');
  try {
    const res = await fetch('http://localhost:8787/api/practices', {
      headers: { Cookie: 'better-auth.session_token=test_token' } // Or fetch directly
    });
    console.log('Worker D1 response status:', res.status);
  } catch (e: any) {
    console.log('Local worker notice:', e.message);
  }

  // 3. Seed test practice unit JSON
  const testPractice = {
    id: 'test_b-think1-u10_vocab_master',
    textbook: 'B-Think1',
    unit: 'Unit 10',
    type: 'vocab-master',
    title: 'Unit 10 Vocab Master Test',
    content: JSON.stringify({
      level: 'B-Think1 Unit 10',
      challenges: [
        {
          id: 'c1',
          title: 'Challenge 1',
          questions: Array.from({ length: 10 }).map((_, i) => ({
            id: `q${i}`,
            word: `word_${i}`,
            meaning: `含义_${i}`,
            prompt: `Sample question prompt number ${i} for testing latency comparison.`,
            options: ['Opt A', 'Opt B', 'Opt C', 'Opt D', 'Opt E', 'Opt F'],
            answer: 0
          }))
        }
      ]
    })
  };

  console.log('🌱 Seeding practice item into TiDB...');
  await conn.execute(
    `INSERT INTO practice (id, textbook, unit, type, title, content)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content), updatedAt = CURRENT_TIMESTAMP`,
    [testPractice.id, testPractice.textbook, testPractice.unit, testPractice.type, testPractice.title, testPractice.content]
  );
  console.log('✅ Seeding complete!');

  // 4. Benchmark read performance
  console.log('\n⏱️ --- BENCHMARKING READ PERFORMANCE ---');
  const iterations = 10;
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result: any = await conn.execute(
      `SELECT id, textbook, unit, type, title, content FROM practice WHERE id = ?`,
      [testPractice.id]
    );
    const end = performance.now();
    const duration = end - start;
    latencies.push(duration);
    const rows = Array.isArray(result) ? result : (result?.rows || []);
    console.log(`Fetch #${i + 1}: ${duration.toFixed(2)} ms (rows: ${rows.length})`);
  }

  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  console.log(`\n📊 TiDB Fetch Latency Results:`);
  console.log(`   - Min: ${min.toFixed(2)} ms`);
  console.log(`   - Max: ${max.toFixed(2)} ms`);
  console.log(`   - Avg: ${avg.toFixed(2)} ms`);
}

main().catch(err => {
  console.error('❌ Benchmark error:', err);
});

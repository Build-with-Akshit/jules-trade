const { createClient } = require('@libsql/client');

const client = createClient({
  url: 'libsql://jules-tarde-build-with-akshit.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkxODY5NzIsImlkIjoiMDE5ZTNmY2UtMmIwMS03NWY1LTg0NWMtZWJhYTBjMzhlZmIzIiwicmlkIjoiMjcwOGE0ZDUtZWNkOC00Zjk3LTlhZWItNTE4NzBkNDhjMTAwIn0.hh6trDCgbkjPx3iFm6mAyIPi0TslUKTX6aXNino4ldhEj7QWJO-9C0fmRsyYWTGhCQa_pa_5H6LHf3Egufa-DQ'
});

async function main() {
  console.log('=== USERS ===');
  const users = await client.execute('SELECT * FROM users');
  console.log(users.rows);

  console.log('\n=== PORTFOLIO ===');
  const portfolio = await client.execute('SELECT * FROM portfolio');
  console.log(portfolio.rows);

  console.log('\n=== PENDING ORDERS ===');
  const pending = await client.execute('SELECT * FROM pending_orders');
  console.log(pending.rows);

  console.log('\n=== TRANSACTIONS ===');
  const txs = await client.execute('SELECT * FROM transactions');
  console.log(txs.rows);
}

main().catch(console.error);

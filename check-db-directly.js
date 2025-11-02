const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

console.log('📊 Checking database file:', dbPath);

// Check if database file exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
  console.log('❌ Database file does not exist!');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// Check all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    return;
  }
  
  console.log('\n📋 Tables found:');
  tables.forEach(table => console.log('   -', table.name));
  
  // Check each table for data
  const checkTable = (tableName) => {
    return new Promise((resolve) => {
      db.all(`SELECT COUNT(*) as count FROM "${tableName}"`, (err, result) => {
        if (err) {
          console.log(`   ${tableName}: Error - ${err.message}`);
          resolve();
          return;
        }
        console.log(`   ${tableName}: ${result[0].count} rows`);
        resolve();
      });
    });
  };
  
  // Check each table sequentially
  const checkAllTables = async () => {
    for (const table of tables) {
      await checkTable(table.name);
    }
    
    // Show actual data from key tables
    console.log('\n👥 User data:');
    db.all('SELECT id, email, firstName, lastName, role FROM User', (err, users) => {
      if (err) console.error('Error getting users:', err);
      else users.forEach(user => console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`));
      
      console.log('\n📁 PreConsultationFile data:');
      db.all('SELECT id, filename, fileUrl, preConsultationId FROM PreConsultationFile', (err, files) => {
        if (err) console.error('Error getting files:', err);
        else files.forEach(file => console.log(`   - ${file.filename} -> ${file.fileUrl}`));
        
        db.close();
      });
    });
  };
  
  checkAllTables();
});

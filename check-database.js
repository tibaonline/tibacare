const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

console.log('📊 Checking database file:', dbPath);

// Check if database file exists
if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file does not exist!');
    console.log('Run: npx prisma db push');
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
        db.close();
        return;
    }
    
    console.log('\n📋 Tables found:');
    tables.forEach(table => console.log('   -', table.name));
    
    // Check each table for data
    const checkTable = (tableName, callback) => {
        db.get(`SELECT COUNT(*) as count FROM "${tableName}"`, (err, result) => {
            if (err) {
                console.log(`   ${tableName}: Error - ${err.message}`);
                callback();
                return;
            }
            console.log(`   ${tableName}: ${result.count} rows`);
            callback();
        });
    };
    
    // Check tables sequentially
    let index = 0;
    const checkNextTable = () => {
        if (index < tables.length) {
            checkTable(tables[index].name, checkNextTable);
            index++;
        } else {
            // Show sample data from key tables
            console.log('\n👥 Sample user data:');
            db.all('SELECT id, email, firstName, lastName, role FROM User LIMIT 5', (err, users) => {
                if (err) {
                    console.error('Error getting users:', err);
                } else {
                    users.forEach(user => console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`));
                }
                
                console.log('\n📁 Sample file data:');
                db.all('SELECT id, filename, fileUrl FROM PreConsultationFile LIMIT 5', (err, files) => {
                    if (err) {
                        console.error('Error getting files:', err);
                    } else {
                        files.forEach(file => console.log(`   - ${file.filename} -> ${file.fileUrl}`));
                    }
                    
                    db.close();
                    console.log('\n🔍 Database check completed');
                });
            });
        }
    };
    
    checkNextTable();
});

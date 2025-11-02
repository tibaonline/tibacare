const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Fixing database setup...');

try {
    // 1. Check if Prisma is installed
    console.log('1. Checking Prisma installation...');
    try {
        execSync('npx prisma --version', { stdio: 'inherit' });
    } catch {
        console.log('   Installing Prisma...');
        execSync('npm install prisma @prisma/client', { stdio: 'inherit' });
    }

    // 2. Remove existing database
    console.log('2. Cleaning up old database...');
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('   Removed old database file');
    }

    // 3. Generate Prisma client
    console.log('3. Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // 4. Create new database
    console.log('4. Creating new database...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    // 5. Add sample data
    console.log('5. Adding sample data...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    async function addSampleData() {
        // Create provider
        const provider = await prisma.user.create({
            data: {
                email: 'doctor@tibacare.com',
                firstName: 'John',
                lastName: 'Smith',
                role: 'PROVIDER',
                phone: '+254700000001',
                firebaseUid: 'provider-001'
            }
        });

        // Create patient
        const patient = await prisma.user.create({
            data: {
                email: 'patient@example.com',
                firstName: 'Mary',
                lastName: 'Johnson',
                role: 'PATIENT',
                phone: '+254711111111',
                firebaseUid: 'patient-001'
            }
        });

        // Create pre-consultation with files
        await prisma.preConsultation.create({
            data: {
                patientId: patient.id,
                providerId: provider.id,
                status: 'SUBMITTED',
                symptoms: 'Headache and fever',
                files: {
                    create: [
                        {
                            uploadedById: patient.id,
                            filename: 'medical-history.pdf',
                            fileUrl: '/uploads/medical/patient-001/history.pdf',
                            fileType: 'application/pdf',
                            fileSize: 2500000,
                            description: 'Medical history form'
                        },
                        {
                            uploadedById: patient.id,
                            filename: 'id-card.jpg',
                            fileUrl: '/uploads/medical/patient-001/id.jpg',
                            fileType: 'image/jpeg',
                            fileSize: 1200000,
                            description: 'ID card photo'
                        }
                    ]
                }
            }
        });

        console.log('   ✅ Sample data added successfully!');
    }

    addSampleData().catch(console.error).finally(() => prisma.$disconnect());

    console.log('\n🎉 Database setup completed!');
    console.log('🌐 Start your server: npm run dev');
    console.log('📁 Check files: http://localhost:3000/api/provider/preconsultation-files');

} catch (error) {
    console.error('❌ Setup failed:', error);
}

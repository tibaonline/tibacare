import prisma from './src/lib/prisma.js';

async function checkData() {
  try {
    console.log('🔍 Checking database content...\n');
    
    // Check all users
    const users = await prisma.user.findMany();
    console.log('👥 Users:', users.length);
    users.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    });
    
    console.log('\n📋 Pre-Consultations:');
    const preConsults = await prisma.preConsultation.findMany({
      include: {
        patient: true,
        provider: true,
        files: true
      }
    });
    console.log('   Count:', preConsults.length);
    preConsults.forEach(pc => {
      console.log(`   - ID: ${pc.id}, Status: ${pc.status}`);
      console.log(`     Patient: ${pc.patient.firstName} ${pc.patient.lastName}`);
      console.log(`     Provider: ${pc.provider.firstName} ${pc.provider.lastName}`);
      console.log(`     Files: ${pc.files.length}`);
    });
    
    console.log('\n📁 All Files:');
    const allFiles = await prisma.preConsultationFile.findMany({
      include: {
        preConsultation: {
          include: {
            patient: true,
            provider: true
          }
        }
      }
    });
    console.log('   Total files:', allFiles.length);
    allFiles.forEach(file => {
      console.log(`   - ${file.filename} (${file.fileType})`);
      console.log(`     Patient: ${file.preConsultation.patient.firstName}`);
      console.log(`     Provider: ${file.preConsultation.provider.firstName}`);
      console.log(`     URL: ${file.fileUrl}`);
    });
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();

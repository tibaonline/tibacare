import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create sample provider
  const provider = await prisma.user.upsert({
    where: { email: 'provider@tibacare.com' },
    update: {},
    create: {
      email: 'provider@tibacare.com',
      firstName: 'Dr. Jane',
      lastName: 'Smith',
      role: 'PROVIDER',
      phone: '+1234567890',
    },
  })

  // Create sample patients
  const patient1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'PATIENT',
      phone: '+1234567891',
    },
  })

  const patient2 = await prisma.user.upsert({
    where: { email: 'sarah.wilson@example.com' },
    update: {},
    create: {
      email: 'sarah.wilson@example.com',
      firstName: 'Sarah',
      lastName: 'Wilson',
      role: 'PATIENT',
      phone: '+1234567892',
    },
  })

  // Create pre-consultation with files
  const preConsultation = await prisma.preConsultation.create({
    data: {
      patientId: patient1.id,
      providerId: provider.id,
      status: 'SUBMITTED',
      symptoms: 'Fever and cough',
      files: {
        create: [
          {
            uploadedById: patient1.id,
            filename: 'medical-report.pdf',
            fileUrl: '/uploads/medical-report-123.pdf',
            fileType: 'application/pdf',
            fileSize: 2048000,
            description: 'Medical history document',
          },
          {
            uploadedById: patient1.id,
            filename: 'lab-results.png',
            fileUrl: '/uploads/lab-results-456.png',
            fileType: 'image/png',
            fileSize: 1024000,
            description: 'Blood test results',
          }
        ]
      }
    }
  })

  console.log('Seed completed successfully!')
  console.log('Provider:', provider.email)
  console.log('Patient:', patient1.email)
  console.log('Pre-consultation created with ID:', preConsultation.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

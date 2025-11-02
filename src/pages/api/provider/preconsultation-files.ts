import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('📦 Fetching all pre-consultation files...');

    // Fetch all files (remove provider filter for now)
    const files = await prisma.preConsultationFile.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        preConsultation: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    console.log('✅ Files found:', files.length);

    // Transform the data
    const transformedFiles = files.map(file => ({
      id: file.id,
      filename: file.filename,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileSize: file.fileSize,
      uploadDate: file.uploadedAt.toISOString(),
      description: file.description,
      patientName: `${file.preConsultation.patient.firstName} ${file.preConsultation.patient.lastName}`,
      patientId: file.preConsultation.patient.id,
      patientEmail: file.preConsultation.patient.email,
      preConsultationId: file.preConsultation.id,
      status: file.preConsultation.status,
    }));

    res.status(200).json({ 
      files: transformedFiles,
      message: transformedFiles.length === 0 
        ? 'No pre-consultation files found.' 
        : `${transformedFiles.length} files retrieved successfully`
    });

  } catch (error) {
    console.error('❌ Error fetching pre-consultation files:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
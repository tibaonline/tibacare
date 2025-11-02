import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set response type to JSON
  res.setHeader('Content-Type', 'application/json');

  console.log('Upload API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ multiples: true });
    
    form.parse(req, async (err, fields, files: any) => {
      if (err) {
        console.error('Form parsing error:', err);
        return res.status(500).json({ error: 'Error parsing form data' });
      }

      try {
        // Check if files exist
        if (!files.file) {
          console.log('No files uploaded');
          return res.status(200).json({ urls: [] });
        }

        // Handle single file or multiple files
        const fileArray = Array.isArray(files.file) ? files.file : [files.file];
        const uploadedUrls: string[] = [];

        console.log(`Processing ${fileArray.length} files`);

        // Upload each file to Cloudinary
        for (const file of fileArray) {
          try {
            console.log('Uploading file:', file.originalFilename);
            
            const result = await cloudinary.uploader.upload(file.filepath, {
              folder: 'preconsultations',
              resource_type: 'auto', // Automatically detect file type
            });
            
            uploadedUrls.push(result.secure_url);
            console.log('File uploaded successfully:', result.secure_url);
          } catch (fileError) {
            console.error('Error uploading single file:', fileError);
            // Continue with other files even if one fails
          }
        }

        console.log('All files processed. URLs:', uploadedUrls);
        return res.status(200).json({ urls: uploadedUrls });

      } catch (uploadError) {
        console.error('Upload processing error:', uploadError);
        return res.status(500).json({ error: 'File upload processing failed' });
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
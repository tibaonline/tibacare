// src/pages/api/whatsapp.ts - UPDATED VERSION
import type { NextApiRequest, NextApiResponse } from 'next';

// Load environment variables
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;

// Define approved message templates
const APPROVED_TEMPLATES = {
  appointment_reminder: 'appointment_reminder',
  consultation_summary: 'consultation_summary',
  general_message: 'general_message'
} as const;

type TemplateName = keyof typeof APPROVED_TEMPLATES;

interface WhatsAppRequest {
  to: string;
  message: string;
  templateName?: TemplateName;
  parameters?: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error('Missing WhatsApp environment variables');
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'WhatsApp credentials not configured'
    });
  }

  const { to, message, templateName, parameters }: WhatsAppRequest = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Missing recipient phone number' });
  }

  // Clean phone number
  const cleanTo = to.replace(/\D/g, '');
  const formattedTo = cleanTo.startsWith('0') ? `254${cleanTo.substring(1)}` : cleanTo;

  try {
    let requestBody: any;

    if (templateName && APPROVED_TEMPLATES[templateName]) {
      // Use template message (recommended for business accounts)
      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: parameters && parameters.length > 0 ? [
            {
              type: 'body',
              parameters: parameters.map(param => ({ type: 'text', text: param }))
            }
          ] : undefined
        }
      };
    } else {
      // Use text message (may not work for all business accounts)
      if (!message) {
        return res.status(400).json({ error: 'Message content required when not using templates' });
      }
      
      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'text',
        text: { body: message },
      };
    }

    console.log('Sending WhatsApp request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('WhatsApp API Error Response:', data);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send message';
      if (data.error && data.error.message) {
        errorMessage = data.error.message;
        
        // Handle specific error cases
        if (data.error.error_data && data.error.error_data.details) {
          errorMessage += `: ${data.error.error_data.details}`;
        }
      }
      
      return res.status(response.status).json({ 
        error: errorMessage,
        details: data 
      });
    }

    console.log('WhatsApp message sent successfully:', data);
    return res.status(200).json({ success: true, data });

  } catch (error: any) {
    console.error('WhatsApp API Unexpected Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
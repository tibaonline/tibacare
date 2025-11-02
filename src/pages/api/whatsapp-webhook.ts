// Updated WhatsApp helper functions for your frontend
const postToWhatsappApi = async (to: string, message: string, templateName?: string, parameters?: string[]) => {
  try {
    const resp = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        to: to.replace(/\D/g, ''), 
        message,
        templateName,
        parameters 
      }),
    });
    
    const data = await resp.json();
    
    if (!resp.ok) {
      throw new Error(data.error || 'Failed to send via WhatsApp API');
    }
    
    return data;
  } catch (err) {
    console.error('postToWhatsappApi error', err);
    throw err;
  }
};

// Updated consultation summary function
const sendConsultationSummary = async (patient: PreConsult, clerkingData: ClerkingData) => {
  if (!patient.phone) {
    toast.error('Patient phone number not available');
    return;
  }

  try {
    const parameters = [
      patient.patientName,
      patient.service || 'General Consultation',
      clerkingData.impression || 'No specific diagnosis',
      clerkingData.plan || 'Follow up as needed'
    ];

    await postToWhatsappApi(
      patient.phone, 
      '', // Empty message when using template
      'consultation_summary',
      parameters
    );
    
    toast.success('Consultation summary sent via WhatsApp');
  } catch (error: any) {
    console.error('Failed to send consultation summary:', error);
    toast.error(error.message || 'Failed to send summary');
  }
};

// Updated appointment reminder function
const sendAppointmentReminder = async (patient: PreConsult) => {
  if (!patient.phone) {
    toast.error('Patient phone number not available');
    return;
  }
  
  try {
    const appointmentDate = fmtDate(patient.preferredDate);
    const parameters = [
      patient.patientName,
      appointmentDate,
      patient.preferredTime || 'the scheduled time'
    ];

    await postToWhatsappApi(
      patient.phone, 
      '',
      'appointment_reminder',
      parameters
    );
    
    toast.success('Appointment reminder sent via WhatsApp');
  } catch (err: any) {
    console.error(err);
    toast.error(err.message || 'Failed to send reminder');
  }
};
'use client';

import { useParams } from 'next/navigation';
import ConsultationDetail from '../post/page';

export default function ViewConsultationPage() {
  const params = useParams();
  const consultationId = params.id as string;

  return <ConsultationDetail consultationId={consultationId} readOnly={true} />;
}
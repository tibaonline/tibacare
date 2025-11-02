import Link from "next/link";

export default function AdminToolsPage() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold mb-4">Medical Tools</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Prescription</h3>
          <p className="mb-2 text-gray-600">Create and manage prescriptions for patients.</p>
          <Link href="/admin/tools/prescription" className="text-blue-600 hover:underline">
            Open Prescription Tool
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Lab Request</h3>
          <p className="mb-2 text-gray-600">Request lab tests and view results.</p>
          <Link href="/admin/tools/lab-request" className="text-blue-600 hover:underline">
            Open Lab Request Tool
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Imaging Request</h3>
          <p className="mb-2 text-gray-600">Order imaging studies like X-rays and CT scans.</p>
          <Link href="/admin/tools/imaging-request" className="text-blue-600 hover:underline">
            Open Imaging Tool
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Sick Note</h3>
          <p className="mb-2 text-gray-600">Issue sick notes to patients.</p>
          <Link href="/admin/tools/sick-note" className="text-blue-600 hover:underline">
            Open Sick Note Tool
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Referral</h3>
          <p className="mb-2 text-gray-600">Refer patients to other specialists or clinics.</p>
          <Link href="/admin/tools/referral" className="text-blue-600 hover:underline">
            Open Referral Tool
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Medical Report</h3>
          <p className="mb-2 text-gray-600">Generate detailed medical reports for patient records.</p>
          <Link href="/admin/tools/medical-report" className="text-blue-600 hover:underline">
            Open Medical Report Tool
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FlaskConical, FileText, Pill, Stethoscope, Thermometer } from "lucide-react";

export function ToolsNavigation() {
  const pathname = usePathname();
  
  const tools = [
    {
      name: "Imaging",
      href: "/provider/tools/imaging-request",
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      name: "Lab",
      href: "/provider/tools/lab-request",
      icon: <FlaskConical className="h-5 w-5" />,
    },
    {
      name: "Reports",
      href: "/provider/tools/medical-report",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      name: "Prescription",
      href: "/provider/tools/prescription",
      icon: <Pill className="h-5 w-5" />,
    },
    {
      name: "Referral",
      href: "/provider/tools/referral",
      icon: <Stethoscope className="h-5 w-5" />,
    },
    {
      name: "Sick Note",
      href: "/provider/tools/sick-note",
      icon: <Thermometer className="h-5 w-5" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 min-w-0">
      {tools.map((tool) => (
        <Link
          key={tool.name}
          href={tool.href}
          className={`flex flex-col items-center p-4 rounded-lg transition-colors min-w-0 ${
            pathname.startsWith(tool.href)
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-50"
          }`}
        >
          <div className="p-3 rounded-full bg-blue-50 text-blue-600 mb-2">
            {tool.icon}
          </div>
          <span className="font-medium truncate w-full">{tool.name}</span>
        </Link>
      ))}
    </div>
  );
}
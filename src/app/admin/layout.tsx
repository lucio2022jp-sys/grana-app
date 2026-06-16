import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-purple-50/30 to-white min-h-screen">
      {children}
    </div>
  );
}

import { redirect } from 'next/navigation';
import { isAdminServerComponent } from '@/lib/admin-auth';

export default function AdminPage() {
  if (!isAdminServerComponent()) {
    redirect('/admin/login');
  }
  redirect('/admin/funil');
}

import { ClientShell } from '@/components/layout/ClientShell';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}


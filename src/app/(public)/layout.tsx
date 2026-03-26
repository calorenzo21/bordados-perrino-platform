export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900">{children}</div>;
}

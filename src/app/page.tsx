import { redirect } from 'next/navigation';

/**
 * Root page - redirects to login
 * 
 * Note: The middleware handles all route protection and redirections.
 * This page acts as a fallback and should rarely be reached directly.
 * 
 * - Unauthenticated users → /login
 * - Authenticated ADMIN users → /admin/dashboard  
 * - Authenticated CLIENT users → /client/panel
 */
export default function Home() {
  // Redirect to login - middleware will handle the rest
  redirect('/login');
}

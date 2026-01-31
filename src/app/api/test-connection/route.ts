import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API route to test Supabase connection
 * Visit: http://localhost:3000/api/test-connection
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    envVars: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
    },
  };

  try {
    const supabase = await createClient();
    
    // Test auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    results.auth = {
      connected: !authError,
      user: authData?.user?.email || null,
      error: authError?.message || null,
    };

    // Test database - try to query clients table
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .limit(3);

    results.database = {
      connected: !clientsError,
      clientsCount: clientsData?.length || 0,
      sampleClients: clientsData?.map(c => c.name) || [],
      error: clientsError?.message || null,
    };

    // Test profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(3);

    results.profiles = {
      connected: !profilesError,
      count: profilesData?.length || 0,
      sample: profilesData || [],
      error: profilesError?.message || null,
    };

    // Test orders table
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status')
      .limit(3);

    results.orders = {
      connected: !ordersError,
      count: ordersData?.length || 0,
      sample: ordersData || [],
      error: ordersError?.message || null,
    };

  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(results, { status: 200 });
}

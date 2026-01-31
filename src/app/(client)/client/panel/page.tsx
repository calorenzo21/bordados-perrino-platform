import Link from 'next/link';

import { Calendar, Clock, DollarSign, Package, TrendingUp } from 'lucide-react';

import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatus } from '@/lib/utils/status';

// Placeholder data
const recentOrders = [
  {
    id: 'ORD-001',
    description: 'Bordado logo empresa 50 unidades',
    status: OrderStatus.CONFECCION,
    date: 'Hace 2 días',
    estimatedDate: '20 Ene 2025',
    total: 12500,
    paid: 8000,
  },
  {
    id: 'ORD-002',
    description: 'Uniformes escolares 20 unidades',
    status: OrderStatus.RECIBIDO,
    date: 'Hace 1 día',
    estimatedDate: '22 Ene 2025',
    total: 8000,
    paid: 0,
  },
];

const stats = [
  {
    title: 'Pedidos activos',
    value: '2',
    icon: Package,
    color: 'blue',
  },
  {
    title: 'Tiempo estimado',
    value: '3-5 días',
    icon: Clock,
    color: 'emerald',
  },
  {
    title: 'Completados',
    value: '15',
    icon: TrendingUp,
    color: 'purple',
  },
];

const colorStyles = {
  blue: 'bg-blue-50 text-blue-500',
  emerald: 'bg-emerald-50 text-emerald-500',
  purple: 'bg-purple-50 text-purple-500',
};

export default function ClientPanelPage() {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-200 lg:p-8">
        <h1 className="text-2xl font-bold lg:text-3xl">¡Bienvenido!</h1>
        <p className="mt-2 text-blue-100">
          Aquí puedes ver el estado de tus pedidos y toda tu información.
        </p>
        <Button className="mt-4 rounded-full bg-white text-blue-600 hover:bg-blue-50">
          Nuevo pedido
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-xl p-3 ${colorStyles[stat.color as keyof typeof colorStyles]}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Tus Pedidos Recientes
          </CardTitle>
          <Button variant="ghost" size="sm" className="rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-600">
            Ver todos
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentOrders.map((order) => {
            const remaining = order.total - order.paid;
            const progress = (order.paid / order.total) * 100;
            
            return (
              <div
                key={order.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-700">
                        {order.id}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{order.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {order.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Est: {order.estimatedDate}
                      </span>
                    </div>
                  </div>
                  <Link href={`/client/orders/${order.id}`}>
                    <Button variant="ghost" size="sm" className="rounded-lg text-slate-500 hover:bg-white hover:text-slate-700">
                      Ver detalles
                    </Button>
                  </Link>
                </div>
                
                {/* Resumen de pago */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1 text-slate-500">
                      <DollarSign className="h-3 w-3" />
                      Pago: ${order.paid.toLocaleString()} / ${order.total.toLocaleString()}
                    </span>
                    <span className={`font-medium ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {remaining > 0 ? `Resta: $${remaining.toLocaleString()}` : 'Pagado'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Contact info */}
      <Card className="rounded-2xl border-0 bg-slate-100 shadow-sm">
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold text-slate-900">¿Tienes alguna pregunta?</h3>
          <p className="mt-2 text-sm text-slate-600">
            Contáctanos por WhatsApp o visítanos en nuestro local
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button variant="outline" className="rounded-full border-slate-200 text-slate-700 hover:bg-white">
              📞 +54 9 XXX XXX-XXXX
            </Button>
            <Button variant="outline" className="rounded-full border-slate-200 text-slate-700 hover:bg-white">
              💬 WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, money, dateLabel, useCarga } from '../../components/cuenta';
import { Card, PersonalPage, useAccion } from '../../components/personal';
import { agotarItem, colaPedidos, menuPersonal, verificarPersonal } from '../../lib/api/personal';
import { suscribirPersonal } from '../../lib/tiempo-real';
import { estadoPedidoLabel } from '../../lib/api/pedidos';

export default function RoomServicePersonal() {
  const carga = useCarga(useCallback(async () => ({ pedidos: await colaPedidos(), menu: await menuPersonal() }), []));
  const accion = useAccion(carga.reload);
  const [tab, setTab] = useState<'pedidos' | 'menu'>('pedidos');
  const [enVivo, setEnVivo] = useState(false);
  useFocusEffect(useCallback(() => {
    let disposed = false, cleanup = () => {};
    void verificarPersonal().then(e => { if (!disposed) cleanup = suscribirPersonal(e, carga.reload, setEnVivo); }).catch(() => undefined);
    return () => { disposed = true; cleanup(); };
  }, [carga.reload]));
  return <PersonalPage title="Room Service" error={accion.error || carga.error} refreshing={carga.refreshing} reload={carga.reload}>
    <Text className="text-muted">{enVivo ? 'Actualización en vivo conectada' : 'Actualiza para consultar el estado más reciente'}</Text>
    <View className="flex-row gap-3"><Action label="Pedidos" secondary={tab !== 'pedidos'} onPress={() => setTab('pedidos')} /><Action label="Menú" secondary={tab !== 'menu'} onPress={() => setTab('menu')} /></View>
    {tab === 'pedidos' ? <>
      {carga.data?.pedidos.length === 0 && <Text className="text-navy">No hay pedidos activos.</Text>}
      {carga.data?.pedidos.map(p => <Card key={p.id}>
        <Text className="text-xl font-semibold text-navy">Pedido #{p.id} · Hab. {p.habitacion.numero}</Text>
        <Text className="text-muted">Piso {p.habitacion.piso} · {dateLabel(p.creadoEn)}</Text>
        <Text className="text-navy">{p.nombreHuesped} · {estadoPedidoLabel[p.estado]}</Text>
        {p.notas ? <Text className="font-semibold text-navy">Notas: {p.notas}</Text> : null}
        <Text className="text-navy">{money(p.total)}</Text>
        <Action label="Ver pedido" secondary onPress={() => router.push({ pathname: '/personal/pedido', params: { id: p.id } })} />
      </Card>)}
    </> : <>
      {carga.data?.menu.items.length === 0 && <Text className="text-navy">El menú no tiene productos.</Text>}
      {carga.data?.menu.items.map(item => <Card key={item.id}>
        <Text className="text-xl text-navy">{item.nombre} · {money(item.precio)}</Text>
        <Text className="text-muted">{item.descripcion}</Text>
        <Text className="font-semibold text-navy">{item.disponibilidad === 'AGOTADO' ? 'Agotado · Administración debe reactivarlo' : 'Disponible'}</Text>
        {item.disponibilidad === 'DISPONIBLE' && <Action label="Marcar agotado" secondary disabled={accion.busy || carga.refreshing || !!carga.error} onPress={() => { void accion.run(() => agotarItem(item.id)); }} />}
      </Card>)}
    </>}
  </PersonalPage>;
}

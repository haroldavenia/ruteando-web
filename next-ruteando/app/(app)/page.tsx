import { HomeScreen } from '@/components/home/home-screen';
import { areaLinksFor } from '@/lib/nav-items';
import { OPERATIONS_ROLES } from '@/lib/roles';
import { readSession } from '@/lib/session';

/**
 * Inicio. Como en la aplicación Angular: cabecera con el saludo y las acciones de quien opera (planificar una jornada, importar
 * paquetes), el anillo de «Paquetes atendidos», las últimas jornadas y el aviso de un rol sin áreas. NO repite el menú con tarjetas de cada
 * área (ya está en el riel y en la búsqueda). El saludo y la fecha los decide el navegador (`HomeScreen`); aquí solo se da la hora del
 * servidor para la primera pintura.
 */
export default async function Home() {
  const { user } = await readSession();
  const canOperate = !!user && OPERATIONS_ROLES.includes(user.role);
  const noAreas = areaLinksFor(user?.role ?? null).length === 0;
  // Como en Angular: el nombre de pila o, sin él, el correo
  const name = user ? user.firstName?.trim() || user.email : '';

  return (
    <HomeScreen
      name={name}
      canOperate={canOperate}
      noAreas={noAreas}
      serverMinute={Math.floor(new Date().getTime() / 60_000)}
    />
  );
}

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { IconBook, IconBowl, IconCart, IconGear, IconPlus } from './Icons';
import { useShopping } from '../hooks/useShopping';
import TimerTray from './TimerTray';
import { mergeForDisplay } from '../lib/shopping';
import { useMemo } from 'react';

const TABS = [
  { to: '/', label: 'Receitas', Icon: IconBook, end: true },
  { to: '/o-que-faco', label: 'O que faço?', Icon: IconBowl },
  { to: '/lista', label: 'Lista', Icon: IconCart },
  { to: '/definicoes', label: 'Definições', Icon: IconGear },
];

export function Logo() {
  return (
    <span className="logo">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={34} height={34} />
      <span>Receitas</span>
    </span>
  );
}

export default function Layout() {
  const { items } = useShopping();
  const pending = useMemo(() => mergeForDisplay(items).filter((i) => !i.checked).length, [items]);
  const { pathname } = useLocation();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo />
        <NavLink to="/add" className="btn accent block side-add"><IconPlus /> Adicionar receita</NavLink>
        <nav>
          {TABS.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="side-link">
              <Icon /> <span>{label}</span>
              {to === '/lista' && pending > 0 && <em className="badge">{pending}</em>}
            </NavLink>
          ))}
        </nav>
        <p className="side-foot hand">feito à mão, com fome ✎</p>
      </aside>
      <main className="main" key={pathname.split('/')[1]}>
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Navegação">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="tab">
            <span className="tab-ic"><Icon />{to === '/lista' && pending > 0 && <em className="badge">{pending}</em>}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <TimerTray />
    </div>
  );
}

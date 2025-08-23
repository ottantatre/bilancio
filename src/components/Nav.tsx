import { useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';

export function Nav() {
  const cls = useCallback(
    ({ isActive }: { isActive: boolean }) =>
      `px-3 py-1 rounded ${isActive ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'}`,
    [],
  );

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-semibold">
          Budget
        </Link>
        <nav className="flex gap-2 text-sm">
          <NavLink to="/cashflow" className={cls}>
            Cashflow
          </NavLink>
          <NavLink to="/new" className={cls}>
            Nowy dokument
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

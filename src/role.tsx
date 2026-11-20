import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Role } from './types';
import { setApiRole } from './api/client';

const KEY = 'salon-demo-role';

function initialRole(): Role {
  try {
    return localStorage.getItem(KEY) === 'staff' ? 'staff' : 'admin';
  } catch {
    return 'admin';
  }
}

const Ctx = createContext<{ role: Role; setRole: (r: Role) => void } | null>(null);

/** 画面上の権限（デモ用の切り替え）。APIへのリクエストにも同じ権限を付ける */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    const r = initialRole();
    setApiRole(r);
    return r;
  });
  useEffect(() => {
    setApiRole(role);
    try {
      localStorage.setItem(KEY, role);
    } catch {
      // 保存できなくても切り替えは効く
    }
  }, [role]);
  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}

export function useRole() {
  const v = useContext(Ctx);
  if (!v) throw new Error('RoleProvider がありません');
  return v;
}

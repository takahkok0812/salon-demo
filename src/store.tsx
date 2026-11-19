import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { AppData, Booking, BookingStatus, Customer, Role } from './types';
import { createSeed } from './data/seed';

const STORAGE_KEY = 'salon-demo-v2';

interface State {
  data: AppData;
  role: Role;
}

type Action =
  | { type: 'saveBooking'; booking: Booking }
  | { type: 'setStatus'; id: string; status: BookingStatus }
  | { type: 'deleteBooking'; id: string }
  | { type: 'saveCustomer'; customer: Customer }
  | { type: 'importCustomers'; customers: Customer[] }
  | { type: 'setRole'; role: Role }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  const { data } = state;
  switch (action.type) {
    case 'saveBooking': {
      const exists = data.bookings.some((b) => b.id === action.booking.id);
      const bookings = exists
        ? data.bookings.map((b) => (b.id === action.booking.id ? action.booking : b))
        : [...data.bookings, action.booking];
      return { ...state, data: { ...data, bookings } };
    }
    case 'setStatus':
      return {
        ...state,
        data: {
          ...data,
          bookings: data.bookings.map((b) => (b.id === action.id ? { ...b, status: action.status } : b)),
        },
      };
    case 'deleteBooking':
      return { ...state, data: { ...data, bookings: data.bookings.filter((b) => b.id !== action.id) } };
    case 'saveCustomer': {
      const exists = data.customers.some((c) => c.id === action.customer.id);
      const customers = exists
        ? data.customers.map((c) => (c.id === action.customer.id ? action.customer : c))
        : [...data.customers, action.customer];
      return { ...state, data: { ...data, customers } };
    }
    case 'importCustomers':
      return { ...state, data: { ...data, customers: [...data.customers, ...action.customers] } };
    case 'setRole':
      return { ...state, role: action.role };
    case 'reset':
      return { role: state.role, data: createSeed() };
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed?.data?.bookings) return parsed;
    }
  } catch {
    // 保存領域が使えない環境ではサンプルデータから始める
  }
  return { role: 'admin', data: createSeed() };
}

const Ctx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 保存できなくても画面の操作は続けられる
    }
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider がありません');
  return v;
}

export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

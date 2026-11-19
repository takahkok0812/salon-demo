export type Role = 'admin' | 'staff';

export type BookingStatus = 'reserved' | 'visited' | 'cancelled';

export interface Staff {
  id: string;
  name: string;
  color: string;
}

export interface Menu {
  id: string;
  name: string;
  minutes: number;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  kana: string;
  phone: string;
  email: string;
  note: string;
  createdAt: string; // ISO
}

export interface Booking {
  id: string;
  customerId: string;
  staffId: string;
  menuId: string;
  start: string; // ISO
  minutes: number;
  status: BookingStatus;
  memo: string;
}

export interface AppData {
  staff: Staff[];
  menus: Menu[];
  customers: Customer[];
  bookings: Booking[];
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  reserved: '予約',
  visited: '来店済み',
  cancelled: 'キャンセル',
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理者',
  staff: 'スタッフ',
};

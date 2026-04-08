export type RestaurantName = 'Tom Yum Goong' | 'The View';

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'main' | 'indian';
};

const MENUS: Record<RestaurantName, MenuItem[]> = {
  'Tom Yum Goong': [
    { id: 'TYD1', name: 'Thai Iced Tea', price: 45, category: 'drinks' },
    { id: 'TYM1', name: 'Tom Yum Goong', price: 120, category: 'main' },
    { id: 'TYM2', name: 'Pad Thai', price: 95, category: 'main' },
    { id: 'TYI1', name: 'Butter Chicken', price: 160, category: 'indian' },
  ],
  'The View': [
    { id: 'TVD1', name: 'Mango Lassi', price: 60, category: 'drinks' },
    { id: 'TVM1', name: 'Butter Chicken', price: 160, category: 'indian' },
    { id: 'TVM2', name: 'Paneer Tikka', price: 150, category: 'indian' },
    { id: 'TVM3', name: 'Chicken Biryani', price: 180, category: 'main' },
  ],
};

export const getMenuForRestaurant = (restaurant: string): MenuItem[] => {
  return (MENUS as Record<string, MenuItem[]>)[restaurant] ?? [];
};

export const RESTAURANTS: RestaurantName[] = ['Tom Yum Goong', 'The View'];

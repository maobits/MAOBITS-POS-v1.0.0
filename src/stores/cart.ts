import { create } from 'zustand';
export interface CartItem {
    productId: string;
    name: string;
    unitPrice: number;
    taxRateBp: number;
    quantity: number;
    imageUri?: string | null;
}
interface CartState {
    items: CartItem[];
    orderDiscount: number;
    appliedOfferId: string | null;
    appliedOfferName: string | null;
    lastRemoved: CartItem | null;
    add(item: Omit<CartItem, 'quantity'>): void;
    increment(id: string): void;
    decrement(id: string): void;
    remove(id: string): void;
    undo(): void;
    clear(): void;
    setDiscount(v: number): void;
    applyOffer(id: string, name: string): void;
    clearOffer(): void;
}
export const useCartStore = create<CartState>((set, get) => ({
    items: [], orderDiscount: 0, appliedOfferId: null, appliedOfferName: null, lastRemoved: null,
    add: item => set(s => { const found = s.items.find(x => x.productId === item.productId); return { items: found ? s.items.map(x => x.productId === item.productId ? { ...x, quantity: x.quantity + 1 } : x) : [...s.items, { ...item, quantity: 1 }] }; }),
    increment: id => set(s => ({ items: s.items.map(x => x.productId === id ? { ...x, quantity: x.quantity + 1 } : x) })),
    decrement: id => set(s => ({ items: s.items.flatMap(x => x.productId === id ? (x.quantity > 1 ? [{ ...x, quantity: x.quantity - 1 }] : []) : [x]) })),
    remove: id => set(s => { const removed = s.items.find(x => x.productId === id) ?? null; return { items: s.items.filter(x => x.productId !== id), lastRemoved: removed }; }),
    undo: () => set(s => s.lastRemoved ? { items: [...s.items, s.lastRemoved], lastRemoved: null } : { lastRemoved: null }),
    clear: () => set({ items: [], orderDiscount: 0, appliedOfferId: null, appliedOfferName: null, lastRemoved: null }),
    setDiscount: v => set({ orderDiscount: Math.max(0, Math.round(v)) }),
    applyOffer: (id, name) => set({ appliedOfferId: id, appliedOfferName: name }),
    clearOffer: () => set({ appliedOfferId: null, appliedOfferName: null }),
}));


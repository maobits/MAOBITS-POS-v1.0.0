/** MAOBITS POS — Tipos compartidos. */
export type Locale = 'es' | 'en';
export type Currency = 'COP' | 'USD' | 'EUR';
export type ThemeMode = 'light' | 'dark' | 'system';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
export type SaleStatus = 'COMPLETED' | 'VOID';
export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type InventoryMovementType = 'INITIAL' | 'PURCHASE' | 'SALE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'SALE_REVERSAL';
export type CustomerAccountEntryType = 'SALE_CREDIT' | 'PAYMENT' | 'CREDIT' | 'CREDIT_USE' | 'ADJUSTMENT' | 'SALE_REVERSAL';
export interface AppSettings {
    businessName: string;
    businessLogoUri: string | null;
    currency: Currency;
    locale: Locale;
    theme: ThemeMode;
    configured: boolean;
}
export interface SessionUser {
    id: string;
    name: string;
    avatarUri: string | null;
    roleId: string;
    roleName: string;
    permissions: string[];
}
export interface Category {
    id: string;
    name: string;
    icon: string;
    active: number;
    created_at: string;
    updated_at: string;
}
export interface Supplier {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    logo_uri: string | null;
    active: number;
    created_at: string;
    updated_at: string;
}
export interface Product {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    description: string;
    category_id: string | null;
    category_name?: string | null;
    purchase_cost: number;
    sale_price: number;
    tax_rate_bp: number;
    stock: number;
    minimum_stock: number;
    unit: string;
    active: number;
    featured_image_uri?: string | null;
    created_at: string;
    updated_at: string;
}
export interface ProductImage {
    id: string;
    product_id: string;
    uri: string;
    is_featured: number;
    sort_order: number;
    created_at: string;
}
export interface Customer {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    active: number;
    created_at: string;
    updated_at: string;
}
export interface CashSession {
    id: string;
    user_id: string;
    opened_at: string;
    opening_amount: number;
    status: CashSessionStatus;
    closed_at: string | null;
    expected_amount: number | null;
    counted_amount: number | null;
    difference: number | null;
    notes: string | null;
}
export interface SaleSummary {
    id: string;
    number: string;
    total: number;
    status: SaleStatus;
    created_at: string;
    user_name: string;
    customer_name: string | null;
    payment_method: PaymentMethod | null;
}
export interface SaleItem {
    id: string;
    sale_id: string;
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    discount: number;
    tax: number;
    total: number;
}
export interface Payment {
    id: string;
    sale_id: string;
    method: PaymentMethod;
    amount: number;
    received: number | null;
    change_amount: number | null;
    created_at: string;
}
export interface SaleDetail extends SaleSummary {
    subtotal: number;
    discount: number;
    tax: number;
    applied_credit: number;
    paid_total: number;
    new_debt: number;
    items: SaleItem[];
    payments: Payment[];
    void_reason?: string | null;
}
export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
}


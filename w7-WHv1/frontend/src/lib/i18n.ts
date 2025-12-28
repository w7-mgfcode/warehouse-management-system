/**
 * Hungarian UI translations
 * All user-facing text must use these constants
 */

export const HU = {
  // Navigation
  nav: {
    dashboard: "Irányítópult",
    warehouses: "Raktárak",
    products: "Termékek",
    suppliers: "Beszállítók",
    bins: "Tárolóhelyek",
    inventory: "Készlet",
    receipt: "Bevételezés",
    issue: "Kiadás",
    transfers: "Áthelyezések",
    reservations: "Foglalások",
    reports: "Riportok",
    users: "Felhasználók",
    settings: "Beállítások",
    logout: "Kijelentkezés",
  },

  // Common actions
  actions: {
    create: "Létrehozás",
    edit: "Szerkesztés",
    delete: "Törlés",
    save: "Mentés",
    cancel: "Mégse",
    search: "Keresés",
    filter: "Szűrés",
    export: "Exportálás",
    import: "Importálás",
    refresh: "Frissítés",
    back: "Vissza",
    next: "Következő",
    previous: "Előző",
    confirm: "Megerősítés",
    close: "Bezárás",
  },

  // Status labels
  status: {
    active: "Aktív",
    inactive: "Inaktív",
    empty: "Üres",
    occupied: "Foglalt",
    reserved: "Lefoglalt",
    available: "Elérhető",
    expired: "Lejárt",
    scrapped: "Selejtezett",
    pending: "Függőben",
    completed: "Teljesített",
    cancelled: "Törölve",
  },

  // Role labels
  roles: {
    admin: "Adminisztrátor",
    manager: "Menedzser",
    warehouse: "Raktáros",
    viewer: "Megtekintő",
  },

  // Validation messages
  validation: {
    required: "Kötelező mező",
    minLength: "Minimum {min} karakter szükséges",
    maxLength: "Maximum {max} karakter engedélyezett",
    invalidEmail: "Érvénytelen email cím",
    invalidPhone: "Érvénytelen telefonszám",
    invalidTaxNumber: "Érvénytelen adószám formátum",
    invalidDate: "Érvénytelen dátum",
    futureDate: "A dátum nem lehet múltbeli",
    pastDate: "A dátum nem lehet jövőbeli",
    positiveNumber: "Pozitív szám szükséges",
    insufficientQuantity: "Nincs elegendő mennyiség",
  },

  // Success messages
  success: {
    created: "{entity} sikeresen létrehozva",
    updated: "{entity} sikeresen módosítva",
    deleted: "{entity} sikeresen törölve",
    received: "Termék sikeresen beérkeztetve",
    issued: "Termék sikeresen kiadva",
    transferred: "Áthelyezés sikeresen végrehajtva",
    reserved: "Foglalás sikeresen létrehozva",
    fulfilled: "Foglalás sikeresen teljesítve",
  },

  // Error messages
  errors: {
    generic: "Hiba történt. Kérjük, próbálja újra.",
    notFound: "Az elem nem található.",
    unauthorized: "Nincs jogosultsága ehhez a művelethez.",
    networkError: "Hálózati hiba. Ellenőrizze az internetkapcsolatot.",
    serverError: "Szerverhiba. Kérjük, próbálja újra később.",
    binNotEmpty: "A tárolóhely nem üres, nem törölhető.",
    binOccupied: "A tárolóhely már foglalt.",
    fefoViolation:
      "FEFO szabály megsértése! Korábbi lejáratú tétel elérhető.",
    productHasInventory: "A termék nem törölhető, mert van belőle készlet.",
    supplierHasInventory:
      "A beszállító nem törölhető, mert van hozzá tartozó készlet.",
  },

  // Table headers
  table: {
    name: "Név",
    code: "Kód",
    sku: "SKU",
    category: "Kategória",
    unit: "Egység",
    quantity: "Mennyiség",
    weight: "Súly",
    status: "Státusz",
    warehouse: "Raktár",
    bin: "Tárolóhely",
    product: "Termék",
    supplier: "Beszállító",
    batch: "Sarzs",
    useByDate: "Lejárat",
    receivedDate: "Beérkezés",
    createdAt: "Létrehozva",
    updatedAt: "Módosítva",
    actions: "Műveletek",
  },

  // Units
  units: {
    db: "Darab",
    kg: "Kilogramm",
    l: "Liter",
    m: "Méter",
    csomag: "Csomag",
  },

  // Movement types
  movementTypes: {
    receipt: "Bevételezés",
    issue: "Kiadás",
    transfer: "Áthelyezés",
    adjustment: "Korrekció",
    scrap: "Selejtezés",
  },

  // Expiry urgency
  expiry: {
    critical: "Kritikus",
    high: "Magas",
    medium: "Közepes",
    low: "Alacsony",
    expired: "Lejárt",
  },

  // Empty state messages
  empty: {
    warehouses: "Nincs megjeleníthető raktár",
    products: "Nincs megjeleníthető termék",
    suppliers: "Nincs megjeleníthető beszállító",
    bins: "Nincs megjeleníthető tárolóhely",
    binsAvailable: "Nincs elérhető tárolóhely",
    transfers: "Nincs áthelyezés",
    reservations: "Nincs foglalás",
    movements: "Nincs mozgási előzmény",
    stock: "Nincs készlet a megadott szűrőkkel",
    expiryWarnings: "Nincs lejárati figyelmeztetés",
    stockAvailable: "Nincs elérhető készlet ehhez a termékhez",
  },

  // FEFO messages
  fefo: {
    insufficientStock: "Nincs elegendő készlet. Elérhető: {available} kg, Kért: {requested} kg",
  },
} as const;

// Helper function for message interpolation
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
}

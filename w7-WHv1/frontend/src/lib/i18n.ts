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

  // Template editor
  template: {
    editor: "Sablon szerkesztő",
    predefined: "Előre definiált sablonok",
    custom: "Egyéni sablon",
    importExport: "Import/Export",
    fields: "Mezők",
    preview: "Előnézet",
    settings: "Beállítások",
    codeFormat: "Kód formátum",
    separator: "Elválasztó",
    autoUppercase: "Automatikus nagybetű",
    zeroPadding: "Nullával kitöltés",
    addField: "Mező hozzáadása",
    editField: "Mező szerkesztése",
    deleteField: "Mező törlése",
    fieldName: "Mező neve",
    fieldLabel: "Megjelenített név",
    fieldRequired: "Kötelező mező",
    fieldOrder: "Sorrend",
    applyTemplate: "Sablon alkalmazása",
    useTemplate: "Sablon használata",
    importJson: "JSON importálása",
    exportJson: "JSON exportálása",
    sampleCodes: "Példa kódok",
    validationError: "Érvényesítési hiba",
    dragToReorder: "Húzd át az átrendezéshez",
  },

  // Template presets
  templatePresets: {
    standardPallet: "Szabványos raklap rendszer",
    simplified: "Egyszerűsített",
    floorStorage: "Padlótárolás",
    freezer: "Hűtőházi tárolás",
    standardPalletDesc: "Sor-Állvány-Szint-Pozíció (pl. A-03-2-01)",
    simplifiedDesc: "Sor-Szint-Pozíció (pl. A-2-01)",
    floorStorageDesc: "Zóna-Pozíció (pl. FRISS-12)",
    freezerDesc: "Zóna-Hőmérséklet-Sor-Pozíció (pl. F1-M18-A-05)",
  },

  // Goods receipt
  receipt: {
    title: "Bevételezés",
    newReceipt: "Új áru beérkeztetése",
    smartBinSuggestions: "Javasolt tárolóhelyek",
    manualSelection: "Kézi választás",
    binScore: "Alkalmasság",
    deliveryDate: "Szállítási dátum",
    bestBeforeDate: "Minőségmegőrzési dátum",
    useByDate: "Lejárati dátum",
    freezeDate: "Fagyasztási dátum",
    palletCount: "Raklap darabszám",
    netWeight: "Nettó súly",
    grossWeight: "Bruttó súly",
    palletHeight: "Raklap magasság",
    cmrNumber: "CMR/Fuvarlevél szám",
    cmrDuplicate: "Ez a CMR szám már létezik a rendszerben",
    printLabel: "Címke nyomtatása",
    addAnother: "Újabb bevételezés",
    viewBin: "Tárolóhely megtekintése",
  },

  // Goods issue
  issue: {
    title: "Kiadás",
    fefoTitle: "Áru kiadása FEFO szabály szerint",
    searchBin: "Tárolóhely keresése",
    scanQR: "QR kód beolvasása",
    selectReason: "Válassza ki a kiadás okát",
    fefoViolationWarning: "Figyelem! Ez nem a leghamarabb lejáró tétel.",
    oldestExpiry: "Legrégebbi lejárat",
    selectedItem: "Választott tétel",
    confirmNonFefo: "Biztosan folytatja a FEFO szabály megsértésével?",
    overrideReasonRequired: "FEFO felülbírálásához indoklás szükséges",
  },

  // Issue reasons
  issueReasons: {
    used: "Felhasználva",
    scrapped: "Selejtezve",
    transferred: "Áthelyezve",
    customerOrder: "Vevői megrendelés",
    production: "Gyártásba adva",
    other: "Egyéb",
  },

  // Bin suggestion
  binSuggestion: {
    groundLevel: "Földszinti",
    highCapacity: "Nagy kapacitás",
    sameZone: "Azonos zóna",
    recommended: "Ajánlott",
    score: "Pontszám",
  },

  // Reports
  reports: {
    title: "Riportok",
    fefo: "FEFO Riport",
    supplierStats: "Beszállítói statisztika",
    expiring: "Lejáró termékek",
    binStatus: "Tárolóhely állapot",
    stockLevels: "Készletszintek",
    movements: "Mozgások",
    exportExcel: "Excel exportálás",
    exportPdf: "PDF exportálás",
    exportCsv: "CSV exportálás",
    noData: "Nincs megjeleníthető adat",
    priority: "Prioritás",
    daysUntilExpiry: "Napok lejáratig",
    totalDeliveries: "Összes szállítás",
    avgShelfLife: "Átlagos eltarthatóság",
    warehouseDistribution: "Raktár megoszlás",
    emptyBins: "Üres tárolóhelyek",
    fullBins: "Teli tárolóhelyek",
    utilization: "Kihasználtság",
  },

  // Chart labels
  chartLabels: {
    occupancy: "Kihasználtság",
    occupancyRate: "Kihasználtság (%)",
    totalBins: "Összes tárolóhely",
    occupiedBins: "Foglalt tárolóhelyek",
    emptyBins: "Üres tárolóhelyek",
    receipts: "Bevételezések",
    issues: "Kiadások",
    productsBySupplier: "Termékek beszállítónként",
    expiryDistribution: "Lejárati megoszlás",
    expired: "Lejárt",
    lessThan3Days: "<3 nap",
    days3to6: "3-6 nap",
    days7to14: "7-14 nap",
    days15to30: "15-30 nap",
    moreThan30Days: ">30 nap",
    date: "Dátum",
    count: "Darabszám",
    percentage: "Százalék",
  },

  // Warehouse visualization
  warehouseMap: {
    title: "Térképnézet",
    legend: "Jelmagyarázat",
    zoom: "Nagyítás",
    zoomIn: "Nagyítás",
    zoomOut: "Kicsinyítés",
    filters: "Szűrők",
    printLayout: "Nyomtatás",
    binDetails: "Tárolóhely részletei",
    currentProduct: "Jelenlegi termék",
    expiryInfo: "Lejárati információ",
    selectBin: "Kattintson egy tárolóhelyre a részletekért",
    colors: {
      empty: "Üres",
      occupied: "Foglalt",
      expiringSoon: "Hamarosan lejár (<7 nap)",
      critical: "Kritikus (<3 nap)",
      expired: "Lejárt",
      inactive: "Inaktív",
    },
  },

  // Dashboard
  dashboard: {
    title: "Irányítópult",
    totalBins: "Összes tárolóhely",
    occupiedBins: "Foglalt tárolóhelyek",
    utilizationRate: "Kihasználtság",
    expiringIn7Days: "7 napon belül lejár",
    expiringIn3Days: "3 napon belül lejár",
    expiredProducts: "Lejárt termékek",
    todayReceipts: "Mai bevételezések",
    todayIssues: "Mai kiadások",
    occupancyTrend: "Kihasználtsági trend",
    productDistribution: "Termék megoszlás",
    expiryBreakdown: "Lejárati megoszlás",
    viewDetails: "Részletek megtekintése",
  },
} as const;

// Helper function for message interpolation
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
}

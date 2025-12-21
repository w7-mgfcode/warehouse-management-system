"""Hungarian internationalization messages for the WMS application."""

# Validation error messages (Hungarian)
HU_MESSAGES: dict[str, str] = {
    # General validation
    "name_min_length": "A név legalább 2 karakter hosszú kell legyen.",
    "name_required": "A név megadása kötelező.",
    "field_required": "A mező kitöltése kötelező.",
    "invalid_format": "Érvénytelen formátum.",
    "value_too_long": "Az érték túl hosszú.",
    "value_too_short": "Az érték túl rövid.",
    # Warehouse
    "warehouse_not_found": "A raktár nem található.",
    "warehouse_name_exists": "Ilyen nevű raktár már létezik.",
    "warehouse_has_bins": "A raktár nem törölhető, mert tartalmaz tárolóhelyeket.",
    "bin_template_required": "A tárolóhely sablon megadása kötelező.",
    "bin_template_invalid": "Érvénytelen tárolóhely sablon.",
    # Bin
    "bin_not_found": "A tárolóhely nem található.",
    "bin_code_exists": "Ilyen kódú tárolóhely már létezik.",
    "bin_not_empty": "A tárolóhely nem üres, nem törölhető.",
    "bin_inactive": "A tárolóhely inaktív.",
    "bin_occupied": "A tárolóhely foglalt.",
    "bin_invalid_structure": "A tárolóhely adatai nem felelnek meg a raktár sablonjának.",
    "bulk_generation_failed": "A tömeges létrehozás sikertelen.",
    "bulk_conflicts_found": "Ütköző kódok találhatók: {codes}",
    "bulk_no_bins_generated": "Nem jött létre egyetlen tárolóhely sem.",
    # Product
    "product_not_found": "A termék nem található.",
    "product_sku_exists": "Ilyen SKU-val már létezik termék.",
    "product_name_required": "A termék neve kötelező.",
    "product_has_inventory": "A termék nem törölhető, mert van belőle készlet.",
    # Supplier
    "supplier_not_found": "A beszállító nem található.",
    "supplier_name_required": "A cég neve kötelező.",
    "supplier_has_inventory": "A beszállító nem törölhető, mert van hozzá tartozó készlet.",
    "invalid_tax_number": "Érvénytelen adószám formátum.",
    # Inventory
    "invalid_dates": "A szavatossági dátum nem lehet korábbi, mint a minőségmegőrzési dátum.",
    "invalid_freeze_date": "A fagyasztás dátuma nem lehet a mai napnál későbbi.",
    "invalid_weight": "A súly pozitív szám kell legyen.",
    "invalid_pallet_count": "A raklap szám pozitív egész szám kell legyen.",
    # User
    "user_not_found": "A felhasználó nem található.",
    "username_exists": "Ez a felhasználónév már foglalt.",
    "email_exists": "Ez az email cím már használatban van.",
    "password_min_length": "A jelszó legalább 8 karakter hosszú kell legyen.",
    "password_weak": "A jelszó túl gyenge. Használjon kis- és nagybetűket, számot.",
    # Date validation
    "date_required": "A dátum megadása kötelező.",
    "date_invalid": "Érvénytelen dátum formátum.",
}

# Error messages (Hungarian)
HU_ERRORS: dict[str, str] = {
    # Authentication
    "invalid_credentials": "Érvénytelen felhasználónév vagy jelszó.",
    "inactive_user": "A felhasználói fiók inaktív.",
    "token_expired": "A munkamenet lejárt. Kérjük, jelentkezzen be újra.",
    "invalid_token": "Érvénytelen token.",
    "not_authenticated": "Nem azonosított felhasználó.",
    # Authorization
    "not_enough_permissions": "Nincs megfelelő jogosultsága ehhez a művelethez.",
    "admin_required": "Ez a művelet adminisztrátori jogosultságot igényel.",
    "manager_required": "Ez a művelet legalább menedzser jogosultságot igényel.",
    # General errors
    "internal_error": "Belső szerverhiba történt.",
    "not_found": "A keresett elem nem található.",
    "conflict": "Ütközés történt az adatbázisban.",
    "validation_error": "Érvényesítési hiba.",
    # FEFO
    "fefo_warning": "Figyelem: ez nem a legrégebbi lejáratú tétel!",
}

# Role names in Hungarian
HU_ROLES: dict[str, str] = {
    "admin": "Adminisztrátor",
    "manager": "Menedzser",
    "warehouse": "Raktáros",
    "viewer": "Megtekintő",
}

# Bin status names in Hungarian
HU_BIN_STATUS: dict[str, str] = {
    "empty": "Üres",
    "occupied": "Foglalt",
    "reserved": "Lefoglalt",
    "inactive": "Inaktív",
}

# Removal reasons in Hungarian
HU_REMOVAL_REASONS: dict[str, str] = {
    "used": "Felhasználva",
    "scrapped": "Selejtezve",
    "moved": "Áthelyezve",
    "other": "Egyéb",
}

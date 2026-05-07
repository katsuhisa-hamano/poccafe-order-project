CREATE TABLE users (
    square_customer_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tel TEXT,
    role TEXT DEFAULT 'customer',
    status TEXT DEFAULT 'pending'
);

CREATE TABLE menus (
    square_item_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    default_stock INTEGER
);

CREATE TABLE inventory_overrides (
    menu_id TEXT,
    date TEXT,
    stock_limit INTEGER,
    PRIMARY KEY (menu_id, date)
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    delivery_date TEXT NOT NULL,
    total_amount INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    order_id INTEGER,
    menu_id TEXT,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (order_id, menu_id)
);
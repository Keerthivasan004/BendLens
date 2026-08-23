-- Database Schema for E-Commerce & Invoicing Platform

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    role VARCHAR(50) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'authorized',
    gateway_response JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    grand_total DECIMAL(10, 2) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'issued',
    CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_invoice_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed Data & Sample Values
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (1, 'alice.johnson@example.com', '$2b$12$e8x...hash', 'Alice Johnson', 'admin');
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (2, 'bob.smith@example.com', '$2b$12$k9z...hash', 'Bob Smith', 'customer');

INSERT INTO products (id, sku, title, price, stock_quantity) VALUES (101, 'SKU-KB-01', 'Wireless Ergonomic Keyboard', 79.99, 150);
INSERT INTO products (id, sku, title, price, stock_quantity) VALUES (102, 'SKU-MO-02', 'High-Precision Optical Mouse', 39.50, 220);

INSERT INTO orders (id, order_number, user_id, total_amount, status, shipping_address) VALUES (5001, 'ORD-98312', 2, 119.49, 'completed', '742 Evergreen Terrace, Springfield');
INSERT INTO payments (id, order_id, transaction_id, amount, payment_method, payment_status) VALUES (9001, 5001, 'txn_stripe_884129', 119.49, 'credit_card', 'settled');
INSERT INTO invoices (id, invoice_number, order_id, user_id, grand_total, status) VALUES (7001, 'INV-2026-001', 5001, 2, 119.49, 'paid');

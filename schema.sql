-- PostgreSQL Database Schema for Ananyamlives E-Commerce Website

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    role VARCHAR(20) DEFAULT 'USER', -- 'USER' or 'ADMIN'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    category VARCHAR(100) DEFAULT 'cookware',
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    image_url TEXT,
    gallery_images JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    product_care TEXT,
    rating NUMERIC(3, 2) DEFAULT 4.8,
    review_count INT DEFAULT 12,
    stock INT DEFAULT 50,
    features TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_care TEXT;

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'
    tracking_number VARCHAR(100) DEFAULT '',
    payment_method VARCHAR(50) DEFAULT 'WhatsApp Order',
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    razorpay_order_id VARCHAR(100) DEFAULT '',
    razorpay_payment_id VARCHAR(100) DEFAULT '',
    special_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Product Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Editable storefront and blog content
CREATE TABLE IF NOT EXISTS site_content (
    id INT PRIMARY KEY,
    content JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Customer activity analytics
CREATE TABLE IF NOT EXISTS customer_activity (
    id BIGSERIAL PRIMARY KEY,
    visitor_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(100),
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    event_type VARCHAR(60) NOT NULL,
    page_path TEXT,
    page_title TEXT,
    product_id VARCHAR(100),
    product_title TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    user_agent TEXT,
    browser VARCHAR(100),
    device_type VARCHAR(50),
    traffic_source VARCHAR(255),
    referrer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE customer_activity ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);
ALTER TABLE customer_activity ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE customer_activity ADD COLUMN IF NOT EXISTS browser VARCHAR(100);
ALTER TABLE customer_activity ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
ALTER TABLE customer_activity ADD COLUMN IF NOT EXISTS traffic_source VARCHAR(255);
ALTER TABLE customer_activity ADD COLUMN IF NOT EXISTS referrer TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_activity_created_at ON customer_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_activity_event_type ON customer_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_customer_activity_visitor_id ON customer_activity(visitor_id);

CREATE TABLE IF NOT EXISTS analytics_blocks (
    id SERIAL PRIMARY KEY,
    block_type VARCHAR(20) NOT NULL,
    block_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(block_type, block_value)
);

-- Seed Categories
INSERT INTO categories (name, slug) VALUES 
('Clay Kadai', 'clay-kadai'),
('Fish Curry Manchatti', 'fish-curry-manchatti'),
('Biryani Pot', 'biryani-pot'),
('Clay Water Bottle', 'clay-water-bottle'),
('Clay Tawa', 'clay-tawa')
ON CONFLICT (slug) DO NOTHING;

-- Seed Initial Products if empty
INSERT INTO products (id, title, subtitle, category, price, original_price, image_url, description, rating, review_count, stock, features) VALUES
('prod-1', 'Handmade Clay Fish Curry Manchatti (3 Litres)', 'Authentic Eco-Friendly Clay Pot', 'fish-curry-manchatti', 899.00, 1299.00, 'images/fish-curry-pot.png', 'Handcrafted traditional unglazed clay pot engineered for slow cooking fish curry, sambar and traditional stews. Retains 100% natural nutrients.', 4.9, 142, 45, '100% Natural Clay, Pre-seasoned ready to use, Retains heat up to 2 hours'),
('prod-2', 'Heritage Heavy Duty Clay Kadai with Lid (2.5L)', 'Pure Terracotta Cooking Pot', 'clay-kadai', 749.00, 999.00, 'images/clay-kadai.png', 'Thick wall terracotta clay kadai perfect for fry, gravies and daily vegetables. Enhances aromatic spices and balances pH levels of food naturally.', 4.8, 98, 30, 'Eco-friendly terracotta, Sturdy heat retention, Chemical-free lead-free clay'),
('prod-3', 'Traditional Clay Biryani Handi (4 Litres)', 'Ideal for Authentic Dum Biryani', 'biryani-pot', 1199.00, 1599.00, 'images/biryani-pot.png', 'Deep seasoned traditional handi designed for cooking perfect dum biryani and aromatic rice dishes with natural earthen flavor.', 4.9, 210, 25, 'Heavy bottom for uniform dum heating, Natural clay aroma, Eco lid seal'),
('prod-4', 'Natural Clay Water Bottle (1 Litre)', 'Natural Cooling Hydration', 'clay-water-bottle', 499.00, 699.00, 'images/water-bottle.png', 'Ergonomic pure clay bottle with leak-proof cap. Naturally cools drinking water and enriches it with essential natural minerals.', 4.7, 85, 60, '100% Organic clay, Natural evaporative cooling, BPA and plastic-free')
ON CONFLICT (id) DO NOTHING;

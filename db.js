const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const catalog = require('./js/catalog');

const localDbPath = path.join(__dirname, 'localDb.json');

// Initialize PostgreSQL Pool
let pool = null;
let usePg = false;

const connectionString = process.env.DATABASE_URL || 
    (process.env.PGHOST ? `postgres://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'ananyamlives'}` : null);

if (connectionString) {
    try {
        pool = new Pool({
            connectionString,
            ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 5000
        });
    } catch (e) {
        console.warn('⚠️ Could not initialize PostgreSQL Pool:', e.message);
    }
}

const productCareColumnReady = pool
    ? pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS product_care TEXT').catch(error => {
        console.warn('Could not prepare product care column:', error.message);
    })
    : Promise.resolve();

const defaultSiteContent = {
    announcementLeft: 'FREE SHIPPING on orders above ₹1499',
    announcementMiddle: 'Traditional Cookware, Made the Traditional Way',
    brandSubtitle: 'Retrive our Heredity',
    phone: '+91 951 403 2880',
    email: 'reach.ananyamlives@gmail.com',
    address: 'Chennai, Tamil Nadu, India',
    heroTitle: "DON'T JUST FEED YOUR FAMILY PROTECT THEIR HEALTH WITH ANANYAM COOKWARE BUILT TO LIFETIME.",
    heroDescription: 'Bring Tradition Back to Your Kitchen made by hands,Inspired by generations. Cook healthy and feel connected with authentic heritage Cookware.',
    heroImage: 'images/hero_bg.jpeg',
    heroCta: 'Explore Ananyamlives',
    collectionTitle: 'Our Collection',
    collectionSubtitle: 'Our top customer-rated pots, loved for their durability and authentic cooking characteristics.',
    storyKicker: 'Our Story',
    storyTitle: 'Made With Tradition, For Everyday Health',
    storyIntro: 'In a world of fast-moving convenience, Teflon coatings, and chemical non-sticks, we lost something deeply precious—the slow, mineral-rich, pure taste of traditional Indian cooking. Ananyamlives was born out of a simple desire: to bring back the authentic health benefits and unmatched flavors of traditional cookware to modern homes.',
    storyCard1Title: 'The Meaning Behind the Name',
    storyCard1Body: 'Ananyam means “Unrivaled, Unique, and Peerless.” To us, it represents cookware that is unmatched in quality, crafted without compromise, and built to be passed down through generations.',
    storyCard2Title: 'Empowering Native Artisans',
    storyCard2Body: "Every piece of cookware at Ananyam isn't factory-made on an assembly line. It is individually hand-carved, hammered, and shaped by rural Indian artisans, keeping traditional craftsmanship alive.",
    storyCard3Title: 'Pure, Chemical-Free Living',
    storyCard3Body: 'We believe cooking should nourish you, not introduce unwanted chemicals into your food. Our products are natural, food-safe, and rich in natural micro-minerals.',
    storyCard4Title: 'Our Purpose',
    storyCard4Body: 'When you buy from Ananyamlives, you do not just buy a utensil. You bring home a piece of art, a legacy of good health, and a story of skilled hands that made it with love.',
    storyClosing: 'When you buy from Ananyamlives, you bring home more than cookware.',
    storyClosingSubtext: 'A piece of art. A legacy of good health. A story of skilled hands.',
    careKicker: 'Care Guide',
    careTitle: 'Care For Your Clay Cookware',
    careBody: 'Soak new clay cookware before its first use, warm it gradually on a low flame, and wash it with water and a soft scrubber. Let it dry fully before storing.',
    footerAbout: 'Bringing tradition back to your kitchen with authentic, handcrafted clay cookware made with pure, chemical-free raw materials. Inspired by ancient Tamil culture.',
    blogKicker: 'Our Journal',
    blogTitle: 'Stories from the kitchen and the clay',
    blogIntro: 'Explore simple rituals, healthy cooking ideas, and timeless traditions that make natural clay cookware part of everyday culture.',
    blog1Category: 'Health & Cooking', blog1Title: 'Why clay cookware tastes different', blog1Body: 'Clay brings a natural earthy warmth to food, helping meals retain flavour while keeping your cooking rituals grounded in tradition.', blog1Image: 'images/manchatti.png',
    blog2Category: 'Care Guide', blog2Title: 'How to season and care for your clay kadai', blog2Body: 'Simple everyday care keeps your cookware stronger, softer, and more flavourful over time, without complicated routines.', blog2Image: 'images/clay_kadai.png',
    blog3Category: 'Traditional Living', blog3Title: 'Bringing heritage cookware back home', blog3Body: 'From family meals to everyday rituals, handmade clay tools reconnect kitchens with slower, healthier, more meaningful cooking.', blog3Image: 'images/handi.png',
    blogArticles: [
        { category: 'Health & Cooking', title: 'Why clay cookware tastes different', body: 'Clay brings a natural earthy warmth to food, helping meals retain flavour while keeping your cooking rituals grounded in tradition.', image: 'images/manchatti.png' },
        { category: 'Care Guide', title: 'How to season and care for your clay kadai', body: 'Simple everyday care keeps your cookware stronger, softer, and more flavourful over time, without complicated routines.', image: 'images/clay_kadai.png' },
        { category: 'Traditional Living', title: 'Bringing heritage cookware back home', body: 'From family meals to everyday rituals, handmade clay tools reconnect kitchens with slower, healthier, more meaningful cooking.', image: 'images/handi.png' }
    ],
    palettePrimary: '#3A1A09',
    paletteSecondary: '#623515',
    paletteTerracotta: '#8E4A20',
    paletteAccent: '#AF6B39',
    paletteBackground: '#F6ECDC',
    paletteCard: '#F1DFC7',
    paletteText: '#1A0B03',
    paletteNatural: '#6B7A43'
};

// Initial Local Storage State
const defaultLocalDb = {
    siteContent: defaultSiteContent,
    users: [
        {
            id: 1,
            name: 'Admin User',
            email: 'admin@ananyamlives.com',
            // Default admin: admin@ananyamlives.com / SaKaV@GuRu#
            password_hash: '$2b$10$EC227iF85qs7TrGdwAGWLOYcdKVvm4.I3PXfpENTY2tzjMBK37sOq',
            phone: '9876543210',
            address: 'Coimbatore, Tamil Nadu',
            role: 'ADMIN',
            created_at: new Date().toISOString()
        }
    ],
    categories: [
        { id: 1, name: 'Clay Kadai', slug: 'clay-kadai' },
        { id: 2, name: 'Fish Curry Manchatti', slug: 'fish-curry-manchatti' },
        { id: 3, name: 'Biryani Pot', slug: 'biryani-pot' },
        { id: 4, name: 'Clay Water Bottle', slug: 'clay-water-bottle' },
        { id: 5, name: 'Clay Tawa', slug: 'clay-tawa' }
    ],
    products: [
        {
            id: 'prod-1',
            title: 'Handmade Clay Fish Curry Manchatti (3 Litres)',
            subtitle: 'Authentic Eco-Friendly Clay Pot',
            category: 'fish-curry-manchatti',
            price: 899.00,
            original_price: 1299.00,
            image_url: 'images/fish-curry-pot.png',
            description: 'Handcrafted traditional unglazed clay pot engineered for slow cooking fish curry, sambar and traditional stews. Retains 100% natural nutrients.',
            rating: 4.9,
            review_count: 142,
            stock: 45,
            features: '100% Natural Clay, Pre-seasoned ready to use, Retains heat up to 2 hours',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'prod-2',
            title: 'Heritage Heavy Duty Clay Kadai with Lid (2.5L)',
            subtitle: 'Pure Terracotta Cooking Pot',
            category: 'clay-kadai',
            price: 749.00,
            original_price: 999.00,
            image_url: 'images/clay-kadai.png',
            description: 'Thick wall terracotta clay kadai perfect for fry, gravies and daily vegetables. Enhances aromatic spices and balances pH levels of food naturally.',
            rating: 4.8,
            review_count: 98,
            stock: 30,
            features: 'Eco-friendly terracotta, Sturdy heat retention, Chemical-free lead-free clay',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'prod-3',
            title: 'Traditional Clay Biryani Handi (4 Litres)',
            subtitle: 'Ideal for Authentic Dum Biryani',
            category: 'biryani-pot',
            price: 1199.00,
            original_price: 1599.00,
            image_url: 'images/biryani-pot.png',
            description: 'Deep seasoned traditional handi designed for cooking perfect dum biryani and aromatic rice dishes with natural earthen flavor.',
            rating: 4.9,
            review_count: 210,
            stock: 25,
            features: 'Heavy bottom for uniform dum heating, Natural clay aroma, Eco lid seal',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'prod-4',
            title: 'Natural Clay Water Bottle (1 Litre)',
            subtitle: 'Natural Cooling Hydration',
            category: 'clay-water-bottle',
            price: 499.00,
            original_price: 699.00,
            image_url: 'images/water-bottle.png',
            description: 'Ergonomic pure clay bottle with leak-proof cap. Naturally cools drinking water and enriches it with essential natural minerals.',
            rating: 4.7,
            review_count: 85,
            stock: 60,
            features: '100% Organic clay, Natural evaporative cooling, BPA and plastic-free',
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    orders: [],
    reviews: [],
    customerActivity: [],
    analyticsBlocks: []
};

function readLocalDb() {
    if (!fs.existsSync(localDbPath)) {
        fs.writeFileSync(localDbPath, JSON.stringify(defaultLocalDb, null, 2));
        return defaultLocalDb;
    }
    try {
        const data = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        const merged = { ...defaultLocalDb, ...data };
        const storedProducts = new Map((data.products || []).map(product => [product.id, product]));
        const catalogIds = new Set(catalog.map(product => product.id));
        const customProducts = (data.products || []).filter(product => !catalogIds.has(product.id)).map(p => ({
            ...p,
            is_active: p.is_active !== undefined ? Boolean(p.is_active) : true
        }));
        const defaultProducts = catalog.map(product => {
            const stored = storedProducts.get(product.id) || {};
            return {
                rating: 4.8,
                review_count: 0,
                stock: 50,
                features: '',
                is_active: stored.is_active !== undefined ? Boolean(stored.is_active) : true,
                created_at: new Date().toISOString(),
                ...product,
                ...stored
            };
        });
        merged.products = customProducts.concat(defaultProducts);
        return merged;
    } catch (e) {
        return defaultLocalDb;
    }
}

function saveLocalDb(data) {
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2));
}

async function recordCustomerActivity(activity) {
    const safeActivity = {
        visitor_id: String(activity.visitor_id || 'unknown').slice(0, 100),
        session_id: activity.session_id ? String(activity.session_id).slice(0, 100) : null,
        user_id: activity.user_id ? Number(activity.user_id) : null,
        customer_name: activity.customer_name ? String(activity.customer_name).slice(0, 255) : null,
        customer_email: activity.customer_email ? String(activity.customer_email).slice(0, 255) : null,
        event_type: String(activity.event_type || 'unknown').slice(0, 60),
        page_path: activity.page_path ? String(activity.page_path).slice(0, 1000) : null,
        page_title: activity.page_title ? String(activity.page_title).slice(0, 500) : null,
        product_id: activity.product_id ? String(activity.product_id).slice(0, 100) : null,
        product_title: activity.product_title ? String(activity.product_title).slice(0, 500) : null,
        metadata: activity.metadata && typeof activity.metadata === 'object' ? activity.metadata : {}
        ,ip_address: activity.ip_address ? String(activity.ip_address).slice(0, 100) : null,
        user_agent: activity.user_agent ? String(activity.user_agent).slice(0, 1000) : null,
        browser: activity.browser ? String(activity.browser).slice(0, 100) : null,
        device_type: activity.device_type ? String(activity.device_type).slice(0, 50) : null,
        traffic_source: activity.traffic_source ? String(activity.traffic_source).slice(0, 255) : null,
        referrer: activity.referrer ? String(activity.referrer).slice(0, 2000) : null
    };

    if (usePg) {
        const result = await pool.query(
            `INSERT INTO customer_activity
             (visitor_id, session_id, user_id, customer_name, customer_email, event_type, page_path, page_title, product_id, product_title, metadata, ip_address, user_agent, browser, device_type, traffic_source, referrer)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
            [safeActivity.visitor_id, safeActivity.session_id, safeActivity.user_id, safeActivity.customer_name,
             safeActivity.customer_email, safeActivity.event_type, safeActivity.page_path, safeActivity.page_title,
             safeActivity.product_id, safeActivity.product_title, JSON.stringify(safeActivity.metadata), safeActivity.ip_address,
             safeActivity.user_agent, safeActivity.browser, safeActivity.device_type, safeActivity.traffic_source, safeActivity.referrer]
        );
        return result.rows[0];
    }

    const local = readLocalDb();
    const saved = { id: Date.now(), ...safeActivity, created_at: new Date().toISOString() };
    local.customerActivity = local.customerActivity || [];
    local.customerActivity.push(saved);
    // Keep the local fallback bounded so analytics cannot grow without limit.
    if (local.customerActivity.length > 50000) local.customerActivity = local.customerActivity.slice(-50000);
    saveLocalDb(local);
    return saved;
}

async function getAnalyticsBlocks() {
    if (usePg) {
        const result = await pool.query('SELECT block_type, block_value, created_at FROM analytics_blocks ORDER BY created_at DESC');
        return result.rows;
    }
    return readLocalDb().analyticsBlocks || [];
}

async function isCustomerActivityBlocked({ email, visitorId, ipAddress }) {
    const values = [email, visitorId, ipAddress].filter(Boolean).map(value => String(value).toLowerCase());
    if (!values.length) return false;
    if (usePg) {
        const result = await pool.query('SELECT 1 FROM analytics_blocks WHERE LOWER(block_value) = ANY($1::text[]) LIMIT 1', [values]);
        return result.rowCount > 0;
    }
    return (readLocalDb().analyticsBlocks || []).some(block => values.includes(String(block.block_value).toLowerCase()));
}

async function setAnalyticsBlock(blockType, blockValue) {
    const type = ['email', 'visitor', 'ip'].includes(blockType) ? blockType : null;
    const value = String(blockValue || '').trim();
    if (!type || !value) return null;
    if (usePg) {
        const result = await pool.query(`INSERT INTO analytics_blocks (block_type, block_value)
            VALUES ($1, $2) ON CONFLICT (block_type, block_value) DO NOTHING RETURNING *`, [type, value]);
        return result.rows[0] || { block_type: type, block_value: value };
    }
    const local = readLocalDb();
    local.analyticsBlocks = local.analyticsBlocks || [];
    const existing = local.analyticsBlocks.find(block => block.block_type === type && block.block_value.toLowerCase() === value.toLowerCase());
    if (existing) return existing;
    const saved = { id: Date.now(), block_type: type, block_value: value, created_at: new Date().toISOString() };
    local.analyticsBlocks.push(saved);
    saveLocalDb(local);
    return saved;
}

async function removeAnalyticsBlock(blockType, blockValue) {
    if (usePg) {
        await pool.query('DELETE FROM analytics_blocks WHERE block_type = $1 AND LOWER(block_value) = LOWER($2)', [blockType, blockValue]);
        return true;
    }
    const local = readLocalDb();
    local.analyticsBlocks = (local.analyticsBlocks || []).filter(block => !(block.block_type === blockType && block.block_value.toLowerCase() === String(blockValue).toLowerCase()));
    saveLocalDb(local);
    return true;
}

async function deleteCustomerActivity({ identifier, ipAddress }) {
    if (usePg) {
        const result = await pool.query(`DELETE FROM customer_activity
            WHERE ($1 <> '' AND (LOWER(COALESCE(customer_email, '')) = LOWER($1) OR visitor_id = $1))
               OR ($2 <> '' AND ip_address = $2)`, [String(identifier || ''), String(ipAddress || '')]);
        return result.rowCount;
    }
    const local = readLocalDb();
    const before = (local.customerActivity || []).length;
    local.customerActivity = (local.customerActivity || []).filter(event => {
        const matchesIdentifier = identifier && ((event.customer_email && event.customer_email.toLowerCase() === String(identifier).toLowerCase()) || event.visitor_id === identifier);
        const matchesIp = ipAddress && event.ip_address === ipAddress;
        return !matchesIdentifier && !matchesIp;
    });
    saveLocalDb(local);
    return before - local.customerActivity.length;
}

async function deleteCustomerPermanently({ identifier, ipAddress }) {
    const value = String(identifier || '').trim();
    if (usePg && value.includes('@')) {
        await pool.query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [value]);
    } else if (!usePg && value.includes('@')) {
        const local = readLocalDb();
        local.users = (local.users || []).filter(user => user.email.toLowerCase() !== value.toLowerCase());
        saveLocalDb(local);
    }
    const deleted = await deleteCustomerActivity({ identifier: value, ipAddress });
    if (value) await setAnalyticsBlock(value.includes('@') ? 'email' : 'visitor', value);
    if (ipAddress) await setAnalyticsBlock('ip', ipAddress);
    return deleted;
}

async function getCustomerActivityAnalytics(limit = 200) {
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
    if (usePg) {
        const [summary, products, customers, recent, orders] = await Promise.all([
            pool.query(`SELECT COUNT(*)::int AS total_events,
                COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
                COUNT(DISTINCT visitor_id)::int AS unique_visitors,
                COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS identified_customers
                FROM customer_activity`),
            pool.query(`SELECT product_id, MAX(product_title) AS product_title,
                COUNT(*) FILTER (WHERE event_type = 'product_view')::int AS views,
                COUNT(*) FILTER (WHERE event_type IN ('wishlist_add','wishlist_remove'))::int AS wishlist_actions,
                COUNT(*) FILTER (WHERE event_type IN ('cart_add','cart_remove','cart_update'))::int AS cart_actions
                FROM customer_activity WHERE product_id IS NOT NULL
                GROUP BY product_id ORDER BY views DESC, wishlist_actions DESC, cart_actions DESC LIMIT 20`),
            pool.query(`SELECT COALESCE(customer_email, visitor_id) AS customer_identifier,
                COALESCE(customer_email, 'Guest visitor') AS customer_email,
                MAX(customer_name) AS customer_name, COUNT(*)::int AS total_events,
                COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
                COUNT(*) FILTER (WHERE event_type = 'product_view')::int AS product_views,
                COUNT(*) FILTER (WHERE event_type = 'wishlist_add')::int AS wishlist_adds,
                COUNT(*) FILTER (WHERE event_type IN ('cart_add','cart_update'))::int AS cart_actions,
                (array_agg(ip_address ORDER BY created_at DESC))[1] AS ip_address,
                (array_agg(browser ORDER BY created_at DESC))[1] AS browser,
                (array_agg(device_type ORDER BY created_at DESC))[1] AS device_type,
                (array_agg(traffic_source ORDER BY created_at DESC))[1] AS traffic_source,
                MAX(created_at) AS last_seen FROM customer_activity
                GROUP BY COALESCE(customer_email, visitor_id) ORDER BY last_seen DESC LIMIT 100`),
            pool.query(`SELECT id, visitor_id, customer_name, customer_email, event_type, page_path,
                product_title, metadata, ip_address, browser, device_type, traffic_source, referrer, created_at
                FROM customer_activity ORDER BY created_at DESC LIMIT $1`, [safeLimit]),
            pool.query(`SELECT user_id, email, items FROM orders WHERE status <> 'Cancelled'`)
        ]);
        const productOrders = new Map();
        const customerOrders = new Map();
        orders.rows.forEach(order => {
            const customerKey = order.email || `user:${order.user_id || 'unknown'}`;
            customerOrders.set(customerKey, (customerOrders.get(customerKey) || 0) + 1);
            const items = Array.isArray(order.items) ? order.items : [];
            items.forEach(item => {
                const key = item.id || item.product_id || item.title || item.name;
                if (!key) return;
                const entry = productOrders.get(String(key)) || { customers: new Set(), title: item.title || item.name || String(key) };
                entry.customers.add(customerKey);
                productOrders.set(String(key), entry);
            });
        });
        const productRows = products.rows.map(product => ({ ...product, order_count: productOrders.get(String(product.product_id))?.customers.size || 0 }));
        const knownProductIds = new Set(productRows.map(product => String(product.product_id)));
        productOrders.forEach((entry, productId) => {
            if (!knownProductIds.has(String(productId))) productRows.push({ product_id: productId, product_title: entry.title, views: 0, wishlist_actions: 0, cart_actions: 0, order_count: entry.customers.size });
        });
        const customerRows = customers.rows.map(customer => ({ ...customer, place_orders: customerOrders.get(customer.customer_email) || 0 }));
        customerOrders.forEach((place_orders, customer_email) => {
            if (!customerRows.some(customer => customer.customer_email === customer_email)) {
                customerRows.push({ customer_identifier: customer_email, customer_email, customer_name: 'Customer', total_events: 0, page_views: 0, product_views: 0, wishlist_adds: 0, cart_actions: 0, place_orders, last_seen: null, ip_address: null, browser: null, device_type: null, traffic_source: null });
            }
        });
        return { summary: summary.rows[0], products: productRows, customers: customerRows, recent: recent.rows };
    }

    const local = readLocalDb();
    const events = (local.customerActivity || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const count = type => events.filter(event => event.event_type === type).length;
    const productMap = new Map();
    events.filter(event => event.product_id).forEach(event => {
        const item = productMap.get(event.product_id) || { product_id: event.product_id, product_title: event.product_title || event.product_id, views: 0, wishlist_actions: 0, cart_actions: 0 };
        if (event.event_type === 'product_view') item.views++;
        if (['wishlist_add', 'wishlist_remove'].includes(event.event_type)) item.wishlist_actions++;
        if (['cart_add', 'cart_remove', 'cart_update'].includes(event.event_type)) item.cart_actions++;
        productMap.set(event.product_id, item);
    });
    const customerMap = new Map();
    events.forEach(event => {
        const key = event.customer_email || `visitor:${event.visitor_id}`;
        const item = customerMap.get(key) || { customer_identifier: event.customer_email || event.visitor_id, customer_email: event.customer_email || 'Guest visitor', customer_name: event.customer_name || 'Guest', total_events: 0, page_views: 0, product_views: 0, wishlist_adds: 0, cart_actions: 0, last_seen: event.created_at, ip_address: event.ip_address || null, browser: event.browser || null, device_type: event.device_type || null, traffic_source: event.traffic_source || null };
        item.total_events++;
        if (event.event_type === 'page_view') item.page_views++;
        if (event.event_type === 'product_view') item.product_views++;
        if (event.event_type === 'wishlist_add') item.wishlist_adds++;
        if (['cart_add', 'cart_update'].includes(event.event_type)) item.cart_actions++;
        if (new Date(event.created_at) >= new Date(item.last_seen)) {
            item.last_seen = event.created_at;
            item.ip_address = event.ip_address || item.ip_address;
            item.browser = event.browser || item.browser;
            item.device_type = event.device_type || item.device_type;
            item.traffic_source = event.traffic_source || item.traffic_source;
        }
        customerMap.set(key, item);
    });
    const customerOrders = new Map();
    const productOrders = new Map();
    (local.orders || []).filter(order => order.status !== 'Cancelled').forEach(order => {
        const customerKey = order.email || `user:${order.user_id || 'unknown'}`;
        customerOrders.set(customerKey, (customerOrders.get(customerKey) || 0) + 1);
        (Array.isArray(order.items) ? order.items : []).forEach(item => {
            const key = item.id || item.product_id || item.title || item.name;
            if (!key) return;
            const entry = productOrders.get(String(key)) || { customers: new Set(), title: item.title || item.name || String(key) };
            entry.customers.add(customerKey);
            productOrders.set(String(key), entry);
        });
    });
    const productRows = [...productMap.values()].map(product => ({ ...product, order_count: productOrders.get(String(product.product_id))?.customers.size || 0 }));
    productOrders.forEach((entry, productId) => {
        if (!productMap.has(productId)) productRows.push({ product_id: productId, product_title: entry.title, views: 0, wishlist_actions: 0, cart_actions: 0, order_count: entry.customers.size });
    });
    const customerRows = [...customerMap.values()].map(customer => ({ ...customer, place_orders: customerOrders.get(customer.customer_email) || 0 }));
    customerOrders.forEach((place_orders, customer_email) => {
        if (!customerRows.some(customer => customer.customer_email === customer_email)) {
            customerRows.push({ customer_identifier: customer_email, customer_email, customer_name: 'Customer', total_events: 0, page_views: 0, product_views: 0, wishlist_adds: 0, cart_actions: 0, place_orders, last_seen: null, ip_address: null, browser: null, device_type: null, traffic_source: null });
        }
    });
    return {
        summary: { total_events: events.length, page_views: count('page_view'), unique_visitors: new Set(events.map(event => event.visitor_id)).size, identified_customers: new Set(events.filter(event => event.user_id).map(event => event.user_id)).size },
        products: productRows.sort((a, b) => b.views - a.views || b.wishlist_actions - a.wishlist_actions).slice(0, 20),
        customers: customerRows.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen)).slice(0, 100),
        recent: events.slice(0, safeLimit)
    };
}

async function getCustomerActivityHistory(identifier, limit = 500) {
    const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 2000);
    if (usePg) {
        const result = await pool.query(`SELECT id, visitor_id, customer_name, customer_email, event_type,
            page_path, product_title, metadata, ip_address, browser, device_type, traffic_source, referrer, created_at FROM customer_activity
            WHERE LOWER(COALESCE(customer_email, '')) = LOWER($1) OR visitor_id = $1
            ORDER BY created_at DESC LIMIT $2`, [String(identifier || ''), safeLimit]);
        return result.rows;
    }
    const local = readLocalDb();
    return (local.customerActivity || []).filter(event =>
        (event.customer_email && event.customer_email.toLowerCase() === String(identifier || '').toLowerCase()) || event.visitor_id === identifier
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, safeLimit);
}

// Check and Initialize DB
async function initDb() {
    if (pool) {
        try {
            const client = await pool.connect();
            console.log('✅ Connected to PostgreSQL Database!');
            client.release();
            usePg = true;

            const schemaSqlPath = path.join(__dirname, 'schema.sql');
            if (fs.existsSync(schemaSqlPath)) {
                const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
                await pool.query(schemaSql);
                console.log('✅ PostgreSQL Schema initialized');
            }
            return true;
        } catch (err) {
            console.warn('⚠️ PostgreSQL connection failed:', err.message);
            console.log('🔄 Falling back to JSON Database Storage (localDb.json)...');
            usePg = false;
        }
    } else {
        console.log('ℹ️ PostgreSQL connection string not provided. Using embedded JSON Database Storage (localDb.json)...');
        usePg = false;
    }

    readLocalDb();
    return false;
}

// User helper methods
async function findUserByEmail(email) {
    if (usePg) {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0] || null;
    }
    const db = readLocalDb();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

async function findUserByPhone(phone) {
    const cleanPhone = String(phone).replace(/[^\d]/g, '').slice(-10);
    if (!cleanPhone) return null;
    if (usePg) {
        const res = await pool.query('SELECT * FROM users WHERE RIGHT(phone, 10) = $1', [cleanPhone]);
        return res.rows[0] || null;
    }
    const db = readLocalDb();
    return db.users.find(u => String(u.phone).replace(/[^\d]/g, '').slice(-10) === cleanPhone) || null;
}

async function findUserById(id) {
    if (usePg) {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return res.rows[0] || null;
    }
    const db = readLocalDb();
    return db.users.find(u => Number(u.id) === Number(id)) || null;
}

async function createUser(user) {
    if (usePg) {
        const res = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, address, role) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [user.name, user.email, user.password_hash, user.phone || '', user.address || '', user.role || 'USER']
        );
        return res.rows[0];
    }
    const db = readLocalDb();
    const newUser = {
        id: db.users.length + 1,
        name: user.name,
        email: user.email,
        password_hash: user.password_hash,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role || 'USER',
        created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveLocalDb(db);
    return newUser;
}

async function getAllUsers() {
    if (usePg) {
        const res = await pool.query('SELECT id, name, email, phone, address, role, created_at FROM users ORDER BY id DESC');
        return res.rows;
    }
    const db = readLocalDb();
    return db.users.map(({ password_hash, ...rest }) => rest);
}

async function updateUserRole(id, role) {
    if (usePg) {
        const res = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING *', [role, id]);
        return res.rows[0];
    }
    const db = readLocalDb();
    const user = db.users.find(u => Number(u.id) === Number(id));
    if (user) {
        user.role = role;
        saveLocalDb(db);
    }
    return user;
}

// Products Helper Methods
async function getAllProducts() {
    if (usePg) {
        const res = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        return res.rows;
    }
    const db = readLocalDb();
    return db.products;
}

async function getProductById(id) {
    if (usePg) {
        const res = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        return res.rows[0] || null;
    }
    const db = readLocalDb();
    return db.products.find(p => p.id === id) || null;
}

function normalizeGalleryImages(images, fallback) {
    let values = images;
    if (typeof values === 'string') {
        try { values = JSON.parse(values); } catch (error) { values = values.split(','); }
    }
    if (!Array.isArray(values)) values = [];
    const clean = values.map(value => String(value || '').trim()).filter(Boolean).slice(0, 3);
    if (!clean.length && fallback) clean.push(String(fallback).trim());
    return clean;
}

async function createProduct(prod) {
    const id = prod.id || `prod-${Date.now()}`;
    const primaryImage = prod.image_url || 'images/manchatti.png';
    const galleryImages = normalizeGalleryImages(prod.gallery_images, primaryImage);
    const isActive = prod.is_active !== undefined ? (prod.is_active === true || prod.is_active === 'true' || prod.is_active === 1 || prod.is_active === '1') : true;

    if (usePg) {
        await productCareColumnReady;
        const res = await pool.query(
            `INSERT INTO products (id, title, subtitle, category, price, original_price, image_url, gallery_images, description, product_care, rating, review_count, stock, features, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
            [id, prod.title, prod.subtitle || '', prod.category || 'cookware', prod.price, prod.original_price || prod.price, primaryImage, JSON.stringify(galleryImages), prod.description || '', prod.product_care || '', prod.rating || 4.8, prod.review_count || 0, prod.stock || 50, prod.features || '', isActive]
        );
        return res.rows[0];
    }
    const db = readLocalDb();
    const newProd = {
        id,
        title: prod.title,
        subtitle: prod.subtitle || '',
        category: prod.category || 'cookware',
        price: Number(prod.price),
        original_price: Number(prod.original_price || prod.price),
        image_url: primaryImage,
        gallery_images: galleryImages,
        description: prod.description || '',
        product_care: prod.product_care || '',
        rating: 4.8,
        review_count: 0,
        stock: Number(prod.stock || 50),
        features: prod.features || '',
        is_active: isActive,
        is_new: true,
        created_at: new Date().toISOString()
    };
    db.products.unshift(newProd);
    saveLocalDb(db);
    return newProd;
}

async function updateProduct(id, updates) {
    const allowedFields = ['title', 'subtitle', 'category', 'price', 'original_price', 'image_url', 'gallery_images', 'description', 'product_care', 'stock', 'features', 'is_active', 'is_new'];
    const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedFields.includes(key))
    );
    if (safeUpdates.is_active !== undefined) {
        safeUpdates.is_active = (safeUpdates.is_active === true || safeUpdates.is_active === 'true' || safeUpdates.is_active === 1 || safeUpdates.is_active === '1');
    }
    if (Object.prototype.hasOwnProperty.call(safeUpdates, 'gallery_images')) {
        safeUpdates.gallery_images = normalizeGalleryImages(safeUpdates.gallery_images, safeUpdates.image_url);
        if (!safeUpdates.image_url && safeUpdates.gallery_images[0]) safeUpdates.image_url = safeUpdates.gallery_images[0];
    }
    if (Object.keys(safeUpdates).length === 0) return getProductById(id);

    if (usePg) {
        await productCareColumnReady;
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [k, v] of Object.entries(safeUpdates)) {
            if (k === 'gallery_images') {
                fields.push(`${k} = $${idx++}::jsonb`);
                values.push(JSON.stringify(v));
            } else {
                fields.push(`${k} = $${idx++}`);
                values.push(v);
            }
        }
        values.push(id);
        const res = await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
        return res.rows[0];
    }
    const db = readLocalDb();
    const prodIndex = db.products.findIndex(p => p.id === id);
    if (prodIndex !== -1) {
        db.products[prodIndex] = { ...db.products[prodIndex], ...safeUpdates };
        saveLocalDb(db);
        return db.products[prodIndex];
    }
    return null;
}

async function deleteProduct(id) {
    if (usePg) {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        return true;
    }
    const db = readLocalDb();
    db.products = db.products.filter(p => p.id !== id);
    saveLocalDb(db);
    return true;
}

async function getSiteContent() {
    if (usePg) {
        const res = await pool.query('SELECT content FROM site_content WHERE id = 1');
        if (res.rows[0]) return { ...defaultSiteContent, ...res.rows[0].content };
        const inserted = await pool.query('INSERT INTO site_content (id, content) VALUES (1, $1) RETURNING content', [defaultSiteContent]);
        return inserted.rows[0].content;
    }
    const db = readLocalDb();
    return { ...defaultSiteContent, ...(db.siteContent || {}) };
}

async function updateSiteContent(updates) {
    const content = { ...await getSiteContent(), ...updates };
    if (usePg) {
        const res = await pool.query('INSERT INTO site_content (id, content) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET content = $1, updated_at = CURRENT_TIMESTAMP RETURNING content', [content]);
        return res.rows[0].content;
    }
    const db = readLocalDb();
    db.siteContent = content;
    saveLocalDb(db);
    return content;
}

// Orders Helper Methods
async function getAllOrders() {
    if (usePg) {
        const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        return res.rows;
    }
    const db = readLocalDb();
    return db.orders;
}

async function getUserOrders(userId, email) {
    if (usePg) {
        const res = await pool.query('SELECT * FROM orders WHERE user_id = $1 OR email = $2 ORDER BY created_at DESC', [userId, email]);
        return res.rows;
    }
    const db = readLocalDb();
    return db.orders.filter(o => o.user_id === userId || (email && o.email === email));
}

async function getOrderById(id) {
    if (usePg) {
        const res = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        return res.rows[0] || null;
    }
    const db = readLocalDb();
    return db.orders.find(o => o.id === id) || null;
}

async function createOrder(ord) {
    if (usePg) {
        const res = await pool.query(
            `INSERT INTO orders (id, user_id, customer_name, email, phone, address, city, state, pincode, items, total, status, tracking_number, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, special_note)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
            [
                ord.id,
                ord.user_id || null,
                ord.customer_name,
                ord.email,
                ord.phone,
                ord.address,
                ord.city,
                ord.state,
                ord.pincode,
                JSON.stringify(ord.items),
                ord.total,
                ord.status || 'Pending',
                ord.tracking_number || '',
                ord.payment_method || 'WhatsApp Order',
                ord.payment_status || 'UNPAID',
                ord.razorpay_order_id || '',
                ord.razorpay_payment_id || '',
                ord.special_note || ''
            ]
        );
        return res.rows[0];
    }
    const db = readLocalDb();
    const newOrd = {
        id: ord.id,
        user_id: ord.user_id || null,
        customer_name: ord.customer_name,
        email: ord.email,
        phone: ord.phone,
        address: ord.address,
        city: ord.city,
        state: ord.state,
        pincode: ord.pincode,
        items: ord.items,
        total: Number(ord.total),
        status: ord.status || 'Pending',
        tracking_number: ord.tracking_number || '',
        payment_method: ord.payment_method || 'WhatsApp Order',
        payment_status: ord.payment_status || 'UNPAID',
        razorpay_order_id: ord.razorpay_order_id || '',
        razorpay_payment_id: ord.razorpay_payment_id || '',
        special_note: ord.special_note || '',
        created_at: new Date().toISOString()
    };
    db.orders.unshift(newOrd);
    saveLocalDb(db);
    return newOrd;
}

async function updateOrderStatus(id, status, trackingNumber) {
    return updateOrderDetails(id, {
        status,
        tracking_number: trackingNumber
    });
}

async function updateOrderDetails(id, updates) {
    const allowedFields = [
        'customer_name',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'pincode',
        'items',
        'total',
        'status',
        'tracking_number',
        'payment_method',
        'payment_status',
        'special_note'
    ];

    const safeUpdates = {};
    for (const key of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(updates || {}, key)) {
            safeUpdates[key] = updates[key];
        }
    }

    if (Object.prototype.hasOwnProperty.call(safeUpdates, 'total')) {
        safeUpdates.total = Number(safeUpdates.total);
    }
    if (Object.prototype.hasOwnProperty.call(safeUpdates, 'items') && !Array.isArray(safeUpdates.items)) {
        if (typeof safeUpdates.items === 'string') {
            try {
                safeUpdates.items = JSON.parse(safeUpdates.items);
            } catch (error) {
                safeUpdates.items = [];
            }
        } else {
            safeUpdates.items = [];
        }
    }

    if (Object.keys(safeUpdates).length === 0) {
        return getOrderById(id);
    }

    if (usePg) {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(safeUpdates)) {
            if (key === 'items') {
                fields.push(`${key} = $${idx++}::jsonb`);
                values.push(JSON.stringify(value));
            } else {
                fields.push(`${key} = $${idx++}`);
                values.push(value);
            }
        }

        values.push(id);
        const res = await pool.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
        return res.rows[0] || null;
    }

    const db = readLocalDb();
    const order = db.orders.find(o => o.id === id);
    if (order) {
        Object.entries(safeUpdates).forEach(([key, value]) => {
            order[key] = value;
        });
        saveLocalDb(db);
    }
    return order || null;
}

// Stats helper
async function getAdminStats(dateRange = {}) {
    const allOrders = await getAllOrders();
    const from = /^\d{4}-\d{2}-\d{2}$/.test(dateRange.from || '') ? dateRange.from : '';
    const to = /^\d{4}-\d{2}-\d{2}$/.test(dateRange.to || '') ? dateRange.to : '';
    const orders = allOrders.filter(order => {
        if (!from && !to) return true;
        const date = new Date(order.created_at || order.date);
        if (Number.isNaN(date.getTime())) return false;
        const day = date.toISOString().slice(0, 10);
        return (!from || day >= from) && (!to || day <= to);
    });
    const products = await getAllProducts();
    const users = await getAllUsers();

    const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? Number(o.total || 0) : 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;

    return {
        totalOrders: orders.length,
        totalRevenue,
        pendingOrders,
        totalProducts: products.length,
        totalUsers: users.length
    };
}

module.exports = {
    initDb,
    isPgActive: () => usePg,
    findUserByEmail,
    findUserByPhone,
    findUserById,
    createUser,
    getAllUsers,
    updateUserRole,
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getSiteContent,
    updateSiteContent,
    getAllOrders,
    getUserOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    updateOrderDetails,
    getAdminStats,
    recordCustomerActivity,
    getCustomerActivityAnalytics,
    getCustomerActivityHistory,
    getAnalyticsBlocks,
    isCustomerActivityBlocked,
    setAnalyticsBlock,
    removeAnalyticsBlock,
    deleteCustomerActivity,
    deleteCustomerPermanently
};

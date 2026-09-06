/* ============================================================
   ANANYAMLIVES — Main JavaScript
   Traditional Cookware — Premium Tamil Heritage Style
   Pure Vanilla JavaScript — No dependencies
   ============================================================ */

'use strict';

// ── Configuration ──────────────────────────────────────────
const WHATSAPP_NUMBER = '919514032880';   // +91 9514032880
const STORE_NAME      = 'Ananyamlives';
const PRIVATE_GALLERY_IMAGE_PREFIX = '__PRIVATE_IMAGE__:';
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw469aG4pRwGte5710C9nQFRz6FwQiFpKP6av0cqNv1XlnFouiu1gIVImAD0LXdNIq7/exec';

// ── Cart State ──────────────────────────────────────────────
// Extra product format: [id, title, offerPrice, compareAtPrice, category, image]
function readStoredList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
    } catch (error) {
        return [];
    }
}

let cart = readStoredList('ananyan_cart');
let wishlist = readStoredList('ananyan_wishlist');
let invoiceLogoBytes = null;
let latestCompletedOrder = null;
const GOOGLE_SHEETS_SYNCED_ORDERS = new Set();

const ANALYTICS_VISITOR_KEY = 'ananyan_analytics_visitor_id';
const ANALYTICS_SESSION_KEY = 'ananyan_analytics_session_id';
const ANALYTICS_QUEUE_KEY = 'ananyan_analytics_queue';
const analyticsVisitorId = localStorage.getItem(ANALYTICS_VISITOR_KEY) || `visitor-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
const analyticsSessionId = sessionStorage.getItem(ANALYTICS_SESSION_KEY) || `session-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
localStorage.setItem(ANALYTICS_VISITOR_KEY, analyticsVisitorId);
sessionStorage.setItem(ANALYTICS_SESSION_KEY, analyticsSessionId);

function trackCustomerActivity(eventType, details = {}) {
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('ananyan_user') || '{}'); } catch (error) { return {}; }
    })();
    const payload = {
        visitor_id: analyticsVisitorId,
        session_id: analyticsSessionId,
        user_id: user.id || null,
        customer_name: user.name || null,
        customer_email: user.email || null,
        event_type: eventType,
        page_path: window.location.pathname,
        page_title: document.title,
        ...details
    };
    const body = JSON.stringify(payload);
    const queue = readStoredList(ANALYTICS_QUEUE_KEY);
    const apiBase = window.API_BASE_URL || '';
    const send = eventBody => fetch(`${apiBase}/api/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
        keepalive: true
    }).then(response => {
        if (!response.ok) throw new Error(`Analytics API returned ${response.status}`);
        return response;
    });

    // Flush events that happened while the server was unavailable.
    const pending = [...queue, payload];
    localStorage.removeItem(ANALYTICS_QUEUE_KEY);
    Promise.all(pending.map(eventBody => send(eventBody).then(() => null).catch(() => eventBody)))
        .then(failedEvents => {
            const failed = failedEvents.filter(Boolean);
            if (!failed.length) return;
            try {
                const existing = readStoredList(ANALYTICS_QUEUE_KEY);
                localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify([...existing, ...failed].slice(-500)));
            } catch (error) { /* Ignore storage quota errors */ }
        });
}

function persistCart() {
    try { localStorage.setItem('ananyan_cart', JSON.stringify(cart)); } catch (error) { /* Ignore storage quota errors */ }
}

function persistWishlist() {
    try { localStorage.setItem('ananyan_wishlist', JSON.stringify(wishlist)); } catch (error) { /* Ignore storage quota errors */ }
}

function initCustomerActivityTracking() {
    trackCustomerActivity('page_view', { metadata: { referrer: document.referrer || '' } });
    document.querySelectorAll('section[id]').forEach(section => {
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                trackCustomerActivity('section_view', { metadata: { section_id: section.id } });
                observer.disconnect();
            }
        }, { threshold: 0.35 });
        observer.observe(section);
    });
}

function lockBodyScroll() {
    const scrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
}

function unlockBodyScroll() {
    const scrollY = Math.abs(parseFloat(document.body.style.top || '0')) || window.scrollY;
    document.body.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    // The page has `scroll-behavior: smooth` set globally, which would otherwise
    // make this restore animate — visibly "jumping/scrolling back" to the product
    // after closing a popup (cart, wishlist, etc). Force it instant on every
    // viewport so closing lands silently on the exact same scroll position.
    window.scrollTo({ top: scrollY, left: window.scrollX, behavior: 'instant' });
}

// The first five products are authored in index.html.  These entries complete
// the collection to 20 cards while reusing the existing product photography.
const EXTRA_PRODUCTS = [
    ['p6', 'CLAY CURRY POT', 349, 949, 'manchatti', 'images/clay curry pot.jpeg'],
    ['p7', 'CLAY WATER JUG', 429, 629, 'manchatti', 'images/clay water jug.jpeg'],
    ['p8', 'Clay Parupu Chatti/Keerai Chatti BLACK', 499, 699, 'waterpot', 'images/clay parupu chatti-keerai chatti.jpeg'],
    ['p9', 'clay handi pot', 579, 779, 'waterpot', 'images/clay handi pot.jpeg'],
    ['p10', 'Clay Money Bank / Piggy Bank', 649, 849, 'handi', 'images/clay money bank-piggy bank.jpeg'],
    ['p12', 'Clay Biriyani Pot', 849, 1049, 'handi', 'images/clay biriyani pot.jpeg'],
    ['p13', 'Clay Dinner Plate with Tumbler', 949, 1149, 'handi', 'images/clay dinner palte with tumpler.jpeg'],
    ['p14', 'Clay Kadai Black', 960, 1160, 'kadai', 'images/clay kadai black.jpeg'],
    ['p15', 'Clay Dosa Tawa / Chapati Tawa', 1199, 1399, 'kadai', 'images/clay dosa tawa-chapati tawa.jpeg'],
    ['p16', 'Clay cooking pot with lid', 1349, 1549, 'kadai', 'images/clay cooking pot with lid.jpeg'],
    ['p17', 'Clay Parupu Chatti Red', 1499, 1699, 'waterpot', 'images/clay parupu chatti.jpeg'],
    ['p18', 'Clay Fish Curry Pot', 1699, 1899, 'waterpot', 'images/clay fish curry pot.jpeg'],
    ['p19', 'Clay Stove / Aduppu (18 Litre)', 1899, 2099, 'waterpot', 'images/clay stove -adupu.jpeg'],
    ['p20', 'Clay Round Gravy Pot', 2099, 2299, 'waterpot', 'images/clay round gravy pot.jpeg']
];

// ── Helpers ─────────────────────────────────────────────────
function openWhatsApp(message) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatPrice(n) {
    return '₹' + Number(n).toLocaleString('en-IN');
}

function normalizePublicGalleryImages(images) {
    return (Array.isArray(images) ? images : [])
        .map(image => String(image || '').trim())
        .filter(image => image && !image.startsWith(PRIVATE_GALLERY_IMAGE_PREFIX));
}

function parsePriceValue(value) {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const numeric = Number(String(value).replace(/[^\d.]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
}

function buildPriceMarkup(currentPrice, compareAtPrice) {
    const current = parsePriceValue(currentPrice);
    const compare = parsePriceValue(compareAtPrice);
    if (!current) return '';
    const hasCompare = compare > current && compare > 0;
    return hasCompare
        ? `<span class="product-price-original">${formatPrice(compare)}</span><span class="product-price-current">${formatPrice(current)}</span>`
        : `<span class="product-price-current">${formatPrice(current)}</span>`;
}

function updatePriceBlock(el, currentPrice, compareAtPrice) {
    if (!el) return;
    const current = parsePriceValue(currentPrice);
    const compare = parsePriceValue(compareAtPrice);
    if (!current) {
        el.hidden = true;
        el.innerHTML = '';
        el.setAttribute('data-price', '');
        el.setAttribute('data-compare-at-price', '');
        return;
    }
    el.hidden = false;
    const hasCompare = compare > current && compare > 0;
    el.innerHTML = buildPriceMarkup(current, compare);
    el.setAttribute('data-price', String(current));
    el.setAttribute('data-compare-at-price', hasCompare ? String(compare) : '');
    el.dataset.price = String(current);
    el.dataset.compareAtPrice = hasCompare ? String(compare) : '';
}

function resolveProductPriceData(productCard) {
    if (!productCard) return { currentPrice: null, compareAtPrice: null };

    const cardPrice = productCard.dataset.price;
    const cardCompare = productCard.dataset.compareAtPrice;
    const priceNode = productCard.querySelector('.product-price');
    const priceNodePrice = priceNode?.dataset.price;
    const priceNodeCompare = priceNode?.dataset.compareAtPrice;
    const buttons = [
        productCard.querySelector('.btn-add-cart'),
        productCard.querySelector('.btn-order-now'),
        productCard.querySelector('.btn-product-description')
    ].filter(Boolean);
    const buttonPrice = buttons.find(button => parsePriceValue(button?.dataset.price))?.dataset.price;
    const buttonCompare = buttons.find(button => parsePriceValue(button?.dataset.compareAtPrice))?.dataset.compareAtPrice;

    const currentPrice = parsePriceValue(cardPrice || priceNodePrice || buttonPrice || priceNode?.textContent || 0);
    const compareAtPrice = parsePriceValue(cardCompare || priceNodeCompare || buttonCompare || 0);

    return {
        currentPrice: currentPrice > 0 ? currentPrice : null,
        compareAtPrice: compareAtPrice > 0 ? compareAtPrice : null
    };
}

function cartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartTotalQty() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

/* ── Save Order to Google Sheets via Apps Script ────────── */
function saveOrderToExcel(order) {
    if (!order || !order.id) return;
    if (GOOGLE_SHEETS_SYNCED_ORDERS.has(order.id)) {
        console.log('Google Sheets sync skipped: duplicate order ID detected:', order.id);
        return;
    }
    GOOGLE_SHEETS_SYNCED_ORDERS.add(order.id);

    const extractTitleParts = (title) => {
        const cleanTitle = String(title || '').trim();
        if (!cleanTitle) return { product: 'Product', variant: 'Standard' };

        const match = cleanTitle.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
        const product = (match && match[1] ? match[1].trim() : cleanTitle).trim() || 'Product';
        const variant = (match && match[2] ? match[2].trim() : 'Standard').trim() || 'Standard';
        return { product, variant };
    };

    const orderPayload = {
        orderId: order.id,
        customerName: order.name,
        email: order.email,
        phone: order.phone,
        items: (Array.isArray(order.items) ? order.items : []).map(item => {
            const { product, variant } = extractTitleParts(item.title || item.product || 'Product');
            return {
                product,
                variant,
                quantity: Number(item.qty || item.quantity || 1),
                unitPrice: Number(item.price || item.unitPrice || 0)
            };
        }),
        orderTotal: Number(order.total || cartTotal()),
        address: order.address,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        orderStatus: 'New'
    };

    console.log('Sending order to Google Sheets');
    console.log('Google Sheets payload:', orderPayload);

    fetch(GOOGLE_SHEETS_WEB_APP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(orderPayload)
    })
    .then(async response => {
        const responseText = await response.text();
        let responseData = {};

        try {
            responseData = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            responseData = { raw: responseText };
        }

        console.log('Google Sheets request completed');
        console.log('Google Sheets response:', responseData);

        if (response.ok && (responseData.success === true || responseData.status === 'success' || responseData.message)) {
            console.log('Google Sheets sync successful:', responseData);
        } else {
            const errorMessage = responseData.error || responseData.message || 'Unknown Google Sheets save error';
            console.error('Google Sheets sync failed:', errorMessage);
        }
    })
    .catch(error => {
        console.error('Google Sheets sync failed:', error);
    });
}

// ── DOM Ready ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    addProductDescriptions();
    if (!document.getElementById('productsGrid')) return;

    addContainerProducts();
    initProductImageSliders();
    syncHomePageProductPrices();
    syncManagedProducts();
    initProductDescriptionModal();
    initProductsCarousel();
    injectOrderConfirmationModal();
    loadInvoiceLogo().then(bytes => { invoiceLogoBytes = bytes; }).catch(() => {});
    initStickyHeader();
    initScrollProgress();
    initSmoothScroll();
    initMobileMenu();
    initSearch();
    initTermsModal();
    injectCartSidebar();
    injectWishlistSidebar();
    initCartWishlistInteractions();
    initFormsAndAlerts();
    injectCheckoutModal();
    updateCartBadge();
    updateWishlistBadge();
    renderWishlistSidebar();
    initCustomerActivityTracking();
});

function syncHomePageProductPrices() {
    document.querySelectorAll('.product-price').forEach(el => {
        const current = parsePriceValue(el.dataset.price);
        const compare = parsePriceValue(el.dataset.compareAtPrice);
        updatePriceBlock(el, current, compare);
    });
}

// Keep the authored storefront cards compatible with products edited/added in the admin panel.
async function syncManagedProducts() {
    try {
        const apiBase = window.API_BASE_URL || '';
        const response = await fetch(`${apiBase}/api/products?_=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        if (!data.success || !Array.isArray(data.products)) return;

        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        // Only display public products (is_active !== false)
        const publicProducts = data.products.filter(product => product.is_active !== false);
        if (!publicProducts.length) return;

        // Sort so that newly added / custom products appear FIRST (newest first)
        const sortedProducts = [...publicProducts].sort((a, b) => {
            const aIsNew = Boolean(a.is_new) || !/^prod-([1-9]|1[0-9])$/.test(String(a.id));
            const bIsNew = Boolean(b.is_new) || !/^prod-([1-9]|1[0-9])$/.test(String(b.id));
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;
            if (aIsNew && bIsNew) {
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            }
            return 0;
        });

        grid.innerHTML = '';
        grid.insertAdjacentHTML('beforeend', sortedProducts.map(product => {
            const productNumber = String(product.id).match(/^prod-(\d+)$/)?.[1];
            const id = product.storefrontId || (productNumber ? `p${productNumber}` : product.id);
            const isInitialProduct = /^prod-([1-9]|1[0-9])$/.test(String(product.id));
            const isNew = Boolean(product.is_new) || !isInitialProduct;

            let images = [];
            if (Array.isArray(product.gallery_images)) {
                images = product.gallery_images.slice(0, 3);
            } else if (typeof product.gallery_images === 'string') {
                try { images = JSON.parse(product.gallery_images); } catch (e) { images = product.gallery_images.split(','); }
            }
            images = normalizePublicGalleryImages(images).slice(0, 3);
            if (!images.length) {
                images = getProductGalleryImages(id, product.image_url);
            }
            if (!images.length) images.push('images/manchatti.png');
            const primaryImage = images[0];
            const galleryImages = images.join(',');

            const price = Number(product.price) || 0;
            const compareAtPrice = Number(product.original_price) || price;
            const title = product.title || product.subtitle || 'Clay Cookware';
            const fullTitle = product.title || title;
            const description = product.description || '';
            const isWishlisted = Array.isArray(wishlist) && wishlist.some(item => item.id === id);

            return `
            <div class="product-card" data-product-id="${escapeHtml(id)}" data-catalog-id="${escapeHtml(product.id)}" data-category="${escapeHtml(product.category || 'cookware')}" data-gallery-images="${escapeHtml(galleryImages)}" data-product-care="${escapeHtml(product.product_care || '')}" data-price="${price}" data-compare-at-price="${compareAtPrice}" data-stock="${Number(product.stock ?? 50)}">
                ${isNew ? '<span class="new-product-badge"><span class="badge-dot"></span>NEW</span>' : ''}
                <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <div class="product-image-wrapper" data-product-id="${escapeHtml(id)}"><img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(fullTitle)}" class="product-image" loading="lazy"></div>
                <div class="product-info">
                    <h3 class="product-title">${escapeHtml(title)}</h3>
                    <span class="product-price" data-price="${price}" data-compare-at-price="${compareAtPrice}">${formatPrice(price)}</span>
                    <button type="button" class="btn-product-description" data-product-title="${escapeHtml(fullTitle)}" data-description="${escapeHtml(description)}">Product Description</button>
                    <div class="product-btn-group">
                        <button class="btn btn-add-cart" data-id="${escapeHtml(id)}" data-title="${escapeHtml(fullTitle)}" data-price="${price}" data-compare-at-price="${compareAtPrice}">Add To Cart</button>
                        <button class="btn btn-order-now" data-id="${escapeHtml(id)}" data-title="${escapeHtml(fullTitle)}" data-price="${price}" data-compare-at-price="${compareAtPrice}">Order Now</button>
                    </div>
                </div>
            </div>`;
        }).join(''));

        syncHomePageProductPrices();
        addProductDescriptions();
        initProductImageSliders();
        syncWishlistButtons();
    } catch (error) {
        console.warn('Managed product sync unavailable:', error.message);
    }
}

function initTermsModal() {
    const links = document.querySelectorAll('.policy-link');
    const modal = document.getElementById('termsModal');
    const overlay = document.getElementById('termsOverlay');
    const closeButton = document.getElementById('termsClose');
    const title = document.getElementById('termsTitle');
    const sections = modal?.querySelectorAll('[data-policy-section]');
    if (!links.length || !modal || !overlay || !closeButton || !title || !sections) return;
    let lastTrigger = null;

    const close = () => {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        unlockBodyScroll();
        lastTrigger?.focus();
    };
    links.forEach(link => link.addEventListener('click', event => {
        event.preventDefault();
        const policy = link.dataset.policy;
        lastTrigger = link;
        title.textContent = link.textContent;
        sections.forEach(section => {
            section.hidden = policy !== 'terms' && section.dataset.policySection !== policy;
        });
        modal.classList.add('active');
        overlay.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        lockBodyScroll();
        closeButton.focus();
    }));
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.classList.contains('active')) close();
    });
}

const PRODUCT_GALLERY_IMAGES = {
    p1: ['images/clay rice pot.png', 'images/clay rice pot1.jpeg'],
    p2: ['images/clay kadai.jpeg', 'images/clay kadai1.jpeg'],
    p3: ['images/clay curd jar.jpeg', 'images/clay curd jar1.jpeg'],
    p4: ['images/clay tumpler.jpeg', 'images/clay tumpler1.jpeg'],
    p5: ['images/clay curry pot black.jpeg', 'images/clay curry pot black1.jpeg'],
    p6: ['images/clay curry pot.jpeg', 'images/clay curry pot1.jpeg'],
    p7: ['images/clay water jug.jpeg', 'images/clay water jug1.jpeg'],
    p8: ['images/clay parupu chatti-keerai chatti.jpeg', 'images/clay parupu chatti-keerai chatti1.jpeg'],
    p9: ['images/clay handi pot.jpeg', 'images/clay handi pot1.jpeg'],
    p10: ['images/clay money bank-piggy bank.jpeg', 'images/clay money bank-piggy bank1.jpeg'],
    p11: ['images/clay parupu chatti.jpeg', 'images/clay parupu chatti1.jpeg'],
    p12: ['images/clay biriyani pot.jpeg', 'images/clay biriyani pot1.jpeg'],
    p13: ['images/clay dinner palte with tumpler.jpeg', 'images/clay dinner palte with tumpler1.jpeg'],
    p14: ['images/clay kadai black.jpeg', 'images/clay kadai.jpeg'],
    p15: ['images/clay dosa tawa-chapati tawa.jpeg', 'images/clay dosa tawa-chapati tawa1.jpeg'],
    p16: ['images/clay cooking pot with lid.jpeg', 'images/clay cooking pot with lid1.jpeg'],
    p17: ['images/clay parupu chatti.jpeg', 'images/clay parupu chatti1.jpeg'],
    p18: ['images/clay fish curry pot.jpeg', 'images/clay fish curry pot1.jpeg'],
    p19: ['images/clay stove -adupu.jpeg', 'images/clay stove -adupu1.jpeg'],
    p20: ['images/clay round gravy pot.jpeg', 'images/clay round gravy pot1.jpeg']
};

const PRODUCT_DIMENSIONS = {
    p1: { width: '22 cm', height: '18 cm', length: '24 cm', capacity: '12 L' },
    p2: { width: '30 cm', height: '12 cm' },
    p3: { width: '18 cm', height: '16 cm' },
    p4: { width: '14 cm', height: '10 cm' },
    p5: { width: '29 cm', height: '38 cm' },
    p6: { width: '20 cm', height: '15 cm' },
    p7: { width: '18 cm', height: '26 cm' },
    p8: { width: '18 cm', height: '18 cm', length: '24 cm' },
    p9: { width: '26 cm', height: '18 cm' },
    p10: { width: '14 cm', height: '18 cm', diameter: '12 cm' },
    p11: { width: '18 cm', height: '15 cm' },
    p12: { width: '26 cm', height: '20 cm' },
    p13: { width: '28 cm', height: '13 cm' },
    p14: { width: '26 cm', height: '10 cm', diameter: '15 cm' },
    p15: { width: '30 cm', height: '3 cm', diameter: '28 cm' },
    p16: { width: '22 cm', height: '26 cm' },
    p17: { width: '30 cm', height: '28 cm', capacity: '12 L' },
    p18: { width: '34 cm', height: '32 cm', capacity: '15 L' },
    p19: { width: '32 cm', height: '36 cm', capacity: '18 L' },
    p20: { width: '28 cm', height: '22 cm' }
};

function getProductGalleryImages(productId, image) {
    const id = productId || 'p1';
    const pair = PRODUCT_GALLERY_IMAGES[id] || [image, image, ''];
    const primaryImage = pair[0] || image || '';
    const secondaryImage = pair[1] || '';
    const thirdImage = pair[2] || '';
    return [primaryImage, secondaryImage, thirdImage];
}

function initProductImageSliders() {
    document.querySelectorAll('.product-card').forEach(card => {
        const wrapper = card.querySelector('.product-image-wrapper');
        const imageEl = card.querySelector('.product-image');
        if (!wrapper || !imageEl) return;

        const productId = card.dataset.productId || card.querySelector('[data-id]')?.dataset.id || 'p1';
        if (!card.dataset.productId) card.dataset.productId = productId;

        const currentSrc = imageEl.getAttribute('src') || '';
        const savedImages = normalizePublicGalleryImages((card.dataset.galleryImages || '').split(',').slice(0, 3));
        const images = savedImages.length
            ? savedImages
            : normalizePublicGalleryImages(getProductGalleryImages(productId, currentSrc));
        if (!images.length && currentSrc) images.push(currentSrc);
        card.dataset.galleryImages = images.join(',');

        // Keep the image wrapper inside a "stage" row that preserves the
        // existing margin below the image. The arrows are absolutely-positioned
        // children of the STAGE (not the wrapper): the wrapper has
        // overflow:hidden to crop/frame the image itself, so an arrow living
        // inside it can never be nudged out past the image edge. Living in the
        // stage lets the arrows sit in the card's white border area beside the
        // image without touching the image's width/height at all.
        let stage = wrapper.closest('.product-image-stage');
        if (!stage) {
            stage = document.createElement('div');
            stage.className = 'product-image-stage';
            wrapper.parentNode.insertBefore(stage, wrapper);
            stage.appendChild(wrapper);
        }

        let leftArrow = stage.querySelector('.product-image-arrow.left');
        if (!leftArrow) {
            leftArrow = document.createElement('button');
            leftArrow.type = 'button';
            leftArrow.className = 'product-image-arrow left';
            leftArrow.setAttribute('aria-label', 'Previous image');
            leftArrow.innerHTML = '&#10094;';
            stage.appendChild(leftArrow);
        }

        let rightArrow = stage.querySelector('.product-image-arrow.right');
        if (!rightArrow) {
            rightArrow = document.createElement('button');
            rightArrow.type = 'button';
            rightArrow.className = 'product-image-arrow right';
            rightArrow.setAttribute('aria-label', 'Next image');
            rightArrow.innerHTML = '&#10095;';
            stage.appendChild(rightArrow);
        }

        const hasMultipleImages = images.length > 1;
        // Only show navigation arrows when this product actually has more than one image.
        leftArrow.style.display = hasMultipleImages ? 'flex' : 'none';
        rightArrow.style.display = hasMultipleImages ? 'flex' : 'none';

        let currentIndex = 0;
        const currentImage = wrapper.querySelector('.product-image');
        const updateImage = () => {
            if (!currentImage) return;
            currentImage.src = images[currentIndex];
            currentImage.alt = card.querySelector('.product-title')?.textContent.trim() || 'Product';
        };

        // Shared step function used by both the arrow buttons and the swipe
        // gesture below, so there is exactly one carousel/navigation logic
        // path (no duplicate carousel system).
        const goToIndex = newIndex => {
            currentIndex = (newIndex + images.length) % images.length;
            updateImage();
        };

        // Use property assignment (not addEventListener) so re-running this setup
        // never stacks duplicate handlers on the same arrow button.
        leftArrow.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            goToIndex(currentIndex - 1);
        };

        rightArrow.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            goToIndex(currentIndex + 1);
        };

        // ---- Swipe gesture (touch) support ----
        // Each card gets its own closure-scoped touch state below, so
        // swiping one product's image can never affect another card.
        const SWIPE_THRESHOLD = 50; // px — ignore small/accidental drags
        let touchStartX = 0;
        let touchStartY = 0;
        let touchDeltaX = 0;
        let touchDeltaY = 0;
        let isHorizontalSwipe = false;
        let touchActive = false;
        let suppressClick = false;

        // Property assignment (ontouchstart/move/end/cancel), like the arrow
        // onclick handlers above, so re-running initProductImageSliders()
        // never stacks duplicate touch listeners on the same wrapper.
        wrapper.ontouchstart = event => {
            if (!hasMultipleImages) return;
            if (event.target.closest('.product-image-arrow')) return;
            const touch = event.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchDeltaX = 0;
            touchDeltaY = 0;
            isHorizontalSwipe = false;
            touchActive = true;
        };

        wrapper.ontouchmove = event => {
            if (!touchActive) return;
            const touch = event.touches[0];
            touchDeltaX = touch.clientX - touchStartX;
            touchDeltaY = touch.clientY - touchStartY;

            // Only commit to "this is a horizontal swipe" once the horizontal
            // movement is clearly larger than the vertical movement, so a
            // normal vertical scroll gesture is never hijacked.
            if (!isHorizontalSwipe && Math.abs(touchDeltaX) > 10 && Math.abs(touchDeltaX) > Math.abs(touchDeltaY)) {
                isHorizontalSwipe = true;
            }

            // Only block page scrolling once we're sure the user is swiping
            // the image horizontally, not scrolling the page vertically.
            if (isHorizontalSwipe && event.cancelable) {
                event.preventDefault();
            }
        };

        wrapper.ontouchend = () => {
            if (!touchActive) return;
            touchActive = false;

            if (isHorizontalSwipe && Math.abs(touchDeltaX) >= SWIPE_THRESHOLD) {
                suppressClick = true;
                if (touchDeltaX < 0) {
                    goToIndex(currentIndex + 1); // swipe left -> next image
                } else {
                    goToIndex(currentIndex - 1); // swipe right -> previous image
                }
                // Mobile browsers fire a synthetic "click" shortly after
                // touchend; suppress just that one click so a completed
                // swipe doesn't also open the product description modal.
                setTimeout(() => { suppressClick = false; }, 400);
            }

            isHorizontalSwipe = false;
            touchDeltaX = 0;
            touchDeltaY = 0;
        };

        wrapper.ontouchcancel = () => {
            touchActive = false;
            isHorizontalSwipe = false;
        };

        // Tapping/clicking the image itself opens the same product description modal
        // used by the existing "Product Description" button, for this exact card.
        // Guard against arrow clicks and against the synthetic click that follows
        // a swipe gesture before opening the modal.
        wrapper.onclick = event => {
            if (suppressClick) { suppressClick = false; return; }
            if (event.target.closest('.product-image-arrow')) return;
            card.querySelector('.btn-product-description')?.click();
        };

        updateImage();
    });
}

function addContainerProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const catalog = window.ANANYAM_CATALOG || [];
    if (catalog.length) {
        grid.innerHTML = '';
        grid.insertAdjacentHTML('beforeend', catalog.map(product => {
            const id = product.storefrontId || product.id;
            const [primaryImage, secondaryImage] = getProductGalleryImages(id, product.image_url);
            const galleryImages = [primaryImage, secondaryImage].filter(Boolean).join(',');
            const price = Number(product.price) || 0;
            const compareAtPrice = Number(product.original_price) || price;
            return `
            <div class="product-card" data-product-id="${id}" data-catalog-id="${product.id}" data-category="${product.category}" data-gallery-images="${galleryImages}" data-product-care="${escapeHtml(product.product_care || '')}" data-price="${price}" data-compare-at-price="${compareAtPrice}">
                <button class="wishlist-btn" aria-label="Add to wishlist">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <div class="product-image-wrapper" data-product-id="${id}"><img src="${primaryImage}" alt="${product.title}" class="product-image" loading="lazy"></div>
                <div class="product-info">
                    <h3 class="product-title">${product.title || product.subtitle}</h3>
                    <span class="product-price" data-price="${price}" data-compare-at-price="${compareAtPrice}">${formatPrice(price)}</span>
                    <button type="button" class="btn-product-description" data-product-title="${product.title}" data-description="${product.description || ''}">Product Description</button>
                    <div class="product-btn-group">
                        <button class="btn btn-add-cart" data-id="${id}" data-title="${product.title}" data-price="${price}" data-compare-at-price="${compareAtPrice}">Add To Cart</button>
                        <button class="btn btn-order-now" data-id="${id}" data-title="${product.title}" data-price="${price}" data-compare-at-price="${compareAtPrice}">Order Now</button>
                    </div>
                </div>
            </div>`;
        }).join(''));
        return;
    }

    grid.insertAdjacentHTML('beforeend', EXTRA_PRODUCTS.map(([id, title, price, compareAtPrice, category, image]) => {
        const [primaryImage, secondaryImage] = getProductGalleryImages(id, image);
        const galleryImages = [primaryImage, secondaryImage].join(',');
        return `
        <div class="product-card" data-product-id="${id}" data-category="${category}" data-gallery-images="${galleryImages}" data-price="${price}" data-compare-at-price="${compareAtPrice}">
            <button class="wishlist-btn" aria-label="Add to wishlist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            <div class="product-image-wrapper" data-product-id="${id}">
                <img src="${primaryImage}" alt="${title}" class="product-image" loading="lazy">
            </div>
            <div class="product-info"><h3 class="product-title">${title}</h3><span class="product-price" data-price="${price}" data-compare-at-price="${compareAtPrice}">${formatPrice(price)}</span><button type="button" class="btn-product-description" data-product-title="${title}">Product Description</button>
                <div class="product-btn-group">
                    <button class="btn btn-add-cart" data-id="${id}" data-title="${title}" data-price="${price}" data-compare-at-price="${compareAtPrice}">Add To Cart</button>
                    <button class="btn btn-order-now" data-id="${id}" data-title="${title}" data-price="${price}" data-compare-at-price="${compareAtPrice}">Order Now</button>
                </div>
            </div>
        </div>`;
    }).join(''));

    document.querySelectorAll('.product-card').forEach(card => {
        const { currentPrice, compareAtPrice } = resolveProductPriceData(card);
        const priceNode = card.querySelector('.product-price');
        if (priceNode) updatePriceBlock(priceNode, currentPrice, compareAtPrice);
    });
    // Arrow wiring, gallery state and image-click-to-open-description are all
    // handled centrally in initProductImageSliders(), which runs right after
    // this function for every product card (avoids duplicate listeners).
}

function addProductDescriptions() {
    const descriptions = {
        p1: 'Clay Rice Pot\n\nBring the goodness of traditional clay cooking into your everyday kitchen with our Clay Rice Pot.\n\nMade from natural clay, this pot is a simple and traditional choice for cooking rice and other everyday dishes. Cooking in clay adds a unique traditional touch to the cooking experience and makes every meal feel a little more special.\n\nThe pot has a classic rounded shape with a wide opening, making it easy to add ingredients, stir and serve. Its natural clay finish also gives your kitchen a warm, rustic look.\n\nEach pot is made from clay and may have slight variations in colour, texture and finish. These small differences are natural and are part of the charm of handmade clay cookware.\n\nSimple cookware. Traditional cooking. Everyday goodness. 🌿',
        p2: 'Clay Kadai Red\n\nBring the traditional charm of clay cooking into your everyday kitchen with our Clay Kadai – Red.\n\nMade from natural clay, this kadai is perfect for preparing curries, gravies, vegetables and a variety of traditional dishes. Its wide and deep design gives you enough space to cook comfortably, while the two side handles make it easy to hold and serve.\n\nThe natural red clay finish gives the kadai a warm, rustic look that adds a traditional touch to your kitchen and dining table. It is a simple choice for anyone who enjoys traditional cookware and homemade meals.\n\nEach piece may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every kadai unique.',
        p3: 'Clay Curd Jar\n\nBring a touch of traditional Indian kitchenware into your home with our Clay Curd Jar.\n\nPerfect for preparing, storing and serving curd, buttermilk, yogurt and other homemade dairy items. The natural clay helps create a traditional setting for curd, making homemade curd thick and creamy.\n\nCurd prepared in this traditional clay jar can set nicely and become naturally thick and firm, making it perfect for enjoying fresh homemade curd.\n\nIts simple handcrafted appearance adds a natural and rustic charm to your kitchen and dining space. It is suitable for everyday use as well as traditional serving.\n\nEach jar may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every piece unique.',
        p4: 'Clay Tumbler\n\nBring the natural and traditional way of drinking into your everyday routine with our Clay Tumbler.\n\nMade from natural clay, this tumbler is perfect for enjoying water, buttermilk, juices and other refreshing beverages. Its simple handmade design adds an earthy and traditional touch to your kitchen and dining experience.\n\nThe natural clay finish gives the tumbler a warm, rustic appearance that blends beautifully with both traditional and modern table settings. Perfect for everyday use or for serving guests in a unique and traditional style.\n\nEach tumbler may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay products and make every piece unique.',
        p5: 'lay Curry Pot Black\n\nBring a traditional touch to your everyday cooking with our Clay Curry Pot – Black.\n\nMade from natural clay, this pot is perfect for preparing a variety of homemade dishes such as curries, gravies, vegetables, lentils and other traditional recipes. Its wide shape provides enough space for comfortable cooking and easy stirring, while the natural clay construction helps retain heat and allows food to cook gently and evenly.\n\nThe classic black clay finish gives the pot a simple, rustic and traditional look, making it suitable for both everyday cooking and serving at the dining table.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of handmade clay cookware and make every piece unique.',
        p6: 'Clay Curry Pot\n\nBring a traditional touch to your everyday cooking with our Clay Curry Pot – Black.\n\nMade from natural clay, this pot is perfect for preparing a variety of homemade dishes such as curries, gravies, vegetables, lentils and other traditional recipes. Its wide shape provides enough space for comfortable cooking and easy stirring, while the natural clay construction helps retain heat and allows food to cook gently and evenly.\n\nThe classic black clay finish gives the pot a simple, rustic and traditional look, making it suitable for both everyday cooking and serving at the dining table.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of handmade clay cookware and make every piece unique.',
        p7: 'Clay Water Jug\n\nBring the traditional charm of natural clay into your everyday drinking experience with our Clay Water Jug.\n\nPerfect for storing and serving drinking water, this traditional clay jug adds a natural and rustic touch to your kitchen and dining space. The earthen design makes it a beautiful choice for everyday use and traditional serving.\n\nThe covered design helps keep the water protected while the sturdy handle makes it convenient to carry and serve. Its handcrafted appearance also makes it a lovely addition to a traditional kitchen.\n\nEach jug may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay products and make every piece unique.',
        p8: 'Clay Parupu Chatti / Keerai Chatti Black\n\nBring the traditional charm of South Indian cooking into your kitchen with our Clay Parupu Chatti.\n\nPerfect for preparing dal, sambar, kootu, kuzhambu, vegetables and other traditional homemade dishes. Cooking in a traditional clay vessel adds a rustic touch to everyday meals and makes it ideal for authentic-style cooking.\n\nThe natural clay design makes it a beautiful addition to both traditional and modern kitchens. It can also be taken directly from the kitchen to the dining table for a simple, natural serving experience.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every piece unique.',
        p9: 'Clay Handi Pot\n\nBring the traditional charm of Indian cooking into your kitchen with our Clay Handi Pot.\n\nPerfect for preparing a variety of homemade dishes such as curries, gravies, biryani, rice, vegetables and other traditional recipes. Its traditional handi-style shape makes it ideal for slow and flavourful cooking.\n\nThe natural clay design adds a rustic and traditional touch to your kitchen and dining table. It is suitable for everyday cooking as well as serving traditional dishes.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every piece unique.',
        p10: 'Clay Money Bank / Piggy Bank\n\nSave your money the traditional way with our Clay Money Bank / Piggy Bank.\n\nMade from natural clay, this money bank is a simple and beautiful way to develop the habit of saving. Its traditional design gives it a natural, rustic look that makes it a lovely addition to your home, office or childrens room.\n\nWhether you are saving coins, notes or simply looking for a traditional gift, this clay money bank is a meaningful and charming choice. The natural clay finish and handmade look give each piece its own unique character.\n\nEach piece may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay products and make every piece unique\n\nA simple way to save today for something you want tomorrow. 🌿',
        p11: 'Clay Parupu Chatti Red\n\nBring the traditional charm of South Indian cooking into your kitchen with our Clay Parupu Chatti.\n\nperfect for preparing dal, sambar, kootu, kuzhambu, vegetables and other traditional homemade dishes. Cooking in a traditional clay vessel adds a rustic touch to everyday meals and makes it ideal for authentic-style cooking.\n\nThe natural clay design makes it a beautiful addition to both traditional and modern kitchens. It can also be taken directly from the kitchen to the dining table for a simple, natural serving experience.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every piece unique.',
        p12: 'Clay Biriyani Pot\n\nBring the traditional taste and charm of clay cooking into your kitchen with our Clay Biriyani Pot.\n\nMade from natural clay, this pot is specially suited for preparing biriyani, pulao, rice dishes, curries and other traditional recipes. Its wide and deep design provides enough space for comfortable cooking and mixing, while the natural clay helps retain heat and allows food to cook gently and evenly.\n\nCooking biriyani in a clay pot can help retain moisture and bring out a rich, traditional flavour. Its rustic natural finish also makes it beautiful enough to take straight from the kitchen to the dining table.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of handmade clay cookware and make every piece unique.',
        p13: 'Clay Dinner Plate with Tumbler\n\nBring a touch of traditional dining to your everyday meals with our Clay Dinner Plate with Tumbler.\n\nMade from natural clay, this set is perfect for serving rice, curries, gravies, vegetables, snacks and a variety of homemade dishes. The wide plate provides comfortable space for serving your favourite meals, while the matching clay tumbler is ideal for enjoying water, buttermilk, juices and other refreshing beverages.\n\nIts simple handmade design and earthy finish create a warm, traditional dining experience. Perfect for everyday use, family meals or serving guests in a natural and elegant style.\n\nEach piece may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay products and make every piece unique.',
        p14: 'Clay Kadai Black\n\nCook your everyday meals in a traditional way with our Black Clay Kadai.\n\nMade from natural clay, this kadai is perfect for cooking curries, gravies, vegetables and other traditional dishes. The deep shape gives you enough space to cook and mix your food comfortably, while the two side handles make it easy to hold and serve.\n\nIts simple black finish gives your kitchen a natural and traditional look. Each kadai may have slight variations in colour, texture and finish, making every piece unique.',
        p15: 'Clay Dosa Tawa / Chapati Tawa\n\nClay Dosa Tawa Make your favourite dosas the traditional way with our Clay Dosa Tawa.\n\nMade from natural clay, this tawa is designed for making delicious homemade dosas with a simple, traditional cooking experience. Its wide, flat surface gives you enough space to spread the dosa evenly and cook it to your liking\n\nThe natural clay finish gives the tawa a rustic, traditional look that brings a homely feel to your kitchen. It is also a great choice for anyone who enjoys using traditional cookware and wants to bring old-style cooking back into everyday meals.\n\nEach piece may have slight variations in colour, texture and finish. These natural differences are a part of clay cookware and make every piece unique.',
        p16: 'Clay Cooking Pot with Lid\n\nBring the traditional way of cooking into your everyday kitchen with our Clay Cooking Pot with Lid.\n\nMade from natural clay, this pot is perfect for preparing a variety of homemade dishes such as curries, gravies, vegetables, rice and other traditional recipes. The deep shape gives you enough space to cook comfortably, while the fitted clay lid helps keep the dish covered while cooking.\n\nIts simple, natural design adds a traditional touch to your kitchen and makes it beautiful enough to take straight from the kitchen to the dining table.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every piece unique.',
        p17: 'Clay Parupu chatti\n\nBring the traditional charm of South Indian cooking into your kitchen with our Clay Parupu Chatti.\n\nPerfect for preparing dal, sambar, kootu, kuzhambu, vegetables and other traditional homemade dishes. Cooking in a traditional clay vessel adds a rustic touch to everyday meals and makes it ideal for authentic-style cooking.\n\nThe natural clay design makes it a beautiful addition to both traditional and modern kitchens. It can also be taken directly from the kitchen to the dining table for a simple, natural serving experience.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every piece unique.',
        p18: 'Clay Fish Curry Pot\n\nBring the traditional taste and feel of clay cooking to your kitchen with our Clay Fish Curry Pot.\n\nMade from natural clay, this pot is perfect for preparing fish curry, kuzhambu and other traditional dishes. Its wide, deep design gives you enough space to cook comfortably and allows the flavours of your dish to come together beautifully.\n\nMade from natural clay, this pot is perfect for preparing fish curry, kuzhambu and other traditional dishes. Its wide, deep design gives you enough space to cook comfortably and allows the flavours of your dish to come together beautifully.\n\nThe natural clay finish adds a warm, rustic touch to your kitchen and dining table. It is a great choice for anyone who enjoys traditional cooking and homemade meals.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every piece unique.',
        p19: 'Clay Stove / Aduppu \n\nBring the charm of traditional cooking into your home with our Clay Stove / Aduppu.\n\nMade from natural clay, this traditional stove is designed for those who love simple, old-style cooking. Its sturdy structure and open cooking space make it suitable for traditional cookware and everyday cooking.\n\nThe natural clay design gives your cooking space a warm, rustic feel while bringing back the experience of cooking in the traditional way. It is a great choice for homes that enjoy clay cookware, village-style cooking and traditional recipes.\n\nEach piece may have slight variations in colour, texture and finish. These natural variations are a part of the character of clay products and make every piece unique.',
        p20: 'Clay Round Gravy Pot\n\nBring the traditional way of cooking into your everyday kitchen with our Clay Round Gravy Pot.\n\nMade from natural clay, this pot is perfect for preparing and serving a variety of homemade dishes such as gravies, curries, sauces, vegetables and other traditional recipes. Its wide and deep design provides comfortable space for cooking while adding an authentic touch to your meals.\n\nIts simple, natural design makes it suitable for both cooking and serving, allowing you to bring the traditional charm of clay cookware straight to your dining table.\n\nEach pot may have slight variations in colour, texture and finish. These natural variations are part of the beauty of clay cookware and make every piece unique.'
    };

    window.ANANYAM_PRODUCT_DESCRIPTIONS = descriptions;

    document.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId || card.querySelector('[data-id]')?.dataset.id || card.querySelector('.product-image-wrapper')?.dataset.productId || null;
        if (!productId) return;

        const text = descriptions[productId] || 'Handcrafted natural clay container for fresh and healthy everyday storage.';
        const title = card.querySelector('.product-title')?.textContent.trim() || 'Product';
        const productBtnGroup = card.querySelector('.product-btn-group');
        let descriptionButton = card.querySelector('.btn-product-description');

        if (!descriptionButton && productBtnGroup) {
            descriptionButton = document.createElement('button');
            descriptionButton.type = 'button';
            descriptionButton.className = 'btn-product-description';
            productBtnGroup.parentNode.insertBefore(descriptionButton, productBtnGroup);
        }

        if (!descriptionButton) return;

        descriptionButton.dataset.productTitle = title;
        descriptionButton.dataset.description = text;
        descriptionButton.textContent = 'Product Description';
    });
}

const productCare = {
    p1: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p2: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p3: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p4: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p5: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p7: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p8: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p9: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p10: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p11: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p12: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p13: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p14: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p15: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p16: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p17: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p18: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p19: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
    p20: 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.',
};

function getProductDimensionEntries(productId) {
    const dimensions = PRODUCT_DIMENSIONS[productId] || {};
    const labels = {
        width: 'Width',
        height: 'Height',
        length: 'Length',
        diameter: 'Diameter',
        capacity: 'Capacity'
    };

    return Object.entries(labels)
        .map(([key, label]) => {
            const value = dimensions[key];
            if (value === undefined || value === null || value === '') return null;
            const normalizedValue = typeof value === 'number' ? `${value} cm` : String(value).trim();
            return { label, value: normalizedValue };
        })
        .filter(Boolean);
}

function buildProductDescriptionContent(descriptionText, productId, disclaimerText) {
    const dimensions = getProductDimensionEntries(productId);
    const dimensionsMarkup = dimensions.length
        ? `
            <div class="product-description-dimensions">
                ${dimensions.map(({ label, value }) => `
                    <div class="product-dimensions-row">
                        <span class="product-dimensions-label">${label}</span>
                        <span class="product-dimensions-colon">:</span>
                        <span class="product-dimensions-value">${value}</span>
                    </div>
                `).join('')}
            </div>
        `
        : '';

    return `
        <div class="product-description-body-copy">${descriptionText}</div>
        ${dimensionsMarkup}
        <div class="product-description-disclaimer">${disclaimerText}</div>
    `;
}

function buildAccordion(title, content, isOpen = false) {
    const item = document.createElement('div');
    item.className = `product-description-accordion-item ${isOpen ? 'open' : ''}`;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'product-description-accordion-header';
    header.innerHTML = `
        <span class="accordion-title-wrap">
            <span class="accordion-icon">${title === 'Product Description' ? '◌' : title === 'Product Care' ? '◍' : '◔'}</span>
            <span class="accordion-title">${title}</span>
        </span>
        <span class="accordion-caret">${isOpen ? '⌃' : '⌄'}</span>
    `;

    const body = document.createElement('div');
    body.className = 'product-description-accordion-body';
    body.innerHTML = content;

    header.addEventListener('click', () => {
        const isExpanded = item.classList.contains('open');
        item.classList.toggle('open', !isExpanded);
        header.querySelector('.accordion-caret').textContent = isExpanded ? '⌄' : '⌃';
    });

    item.append(header, body);
    return item;
}

function openProductDescriptionModal(target) {
    const productCard = target.closest ? target.closest('.product-card') : target;
    if (!productCard) return;

    const modal = document.getElementById('productDescriptionModal');
    const overlay = document.getElementById('productDescriptionOverlay');
    const gallery = document.getElementById('productDescriptionGallery');
    const accordion = document.getElementById('productDescriptionAccordion');
    const productQuickViewPrice = document.getElementById('productQuickViewPrice');
    const productQuickViewComparePrice = document.getElementById('productQuickViewComparePrice');
    const productQuickViewQtyValue = document.getElementById('productQuickViewQtyValue');
    const productQuickViewStock = document.getElementById('productQuickViewStock');
    const addCartButton = document.querySelector('.product-modal-add-cart');
    const buyNowButton = document.querySelector('.product-modal-buy-now');
    const button = productCard.querySelector('.btn-product-description');

    const productId = productCard.querySelector('[data-id]')?.dataset.id || productCard.dataset.productId || null;
    const images = normalizePublicGalleryImages((productCard.dataset.galleryImages || '').split(',').slice(0, 3));
    const fallbackImage = productCard.querySelector('.product-image')?.getAttribute('src') || 'images/manchatti.png';
    const galleryImages = images.length ? images : [fallbackImage];
    let currentIndex = 0;
    let selectedQuantity = 1;

    const titleText = button?.dataset.productTitle || productCard.querySelector('.product-title')?.textContent.trim() || 'Product';
    trackCustomerActivity('product_view', { product_id: productId, product_title: titleText, metadata: { source: 'quick_view' } });
    const descriptionText = button?.dataset.description || 'Handcrafted natural clay container for fresh and healthy everyday cooking.';
    const { currentPrice: productPrice, compareAtPrice } = resolveProductPriceData(productCard);
    const stockCount = productCard.dataset.stock === undefined ? null : Math.max(0, Number(productCard.dataset.stock));
    const productCareText = productCard.dataset.productCare || productCare[productId] || 'Allow the clay product to cool completely before washing.\n\nWash gently with warm water and a soft sponge.\n\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\n\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\n\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\n\nAfter washing, dry the item completely in a well-ventilated place before storing.\n\nDo not store the clay item while it is still damp.';
    const disclaimerText = 'Images are representative. Our products are handmade by artisans and may slightly vary in size, dimensions and volume.';

    const updatePurchaseUi = () => {
        const hasProductPrice = productPrice > 0;
        const showComparePrice = compareAtPrice > productPrice && compareAtPrice > 0;

        if (productQuickViewComparePrice) productQuickViewComparePrice.hidden = !showComparePrice;
        if (productQuickViewPrice) productQuickViewPrice.hidden = !hasProductPrice;

        if (productQuickViewStock) {
            productQuickViewStock.textContent = stockCount === null ? 'Stock available' : stockCount > 0 ? `${stockCount} in stock` : 'Out of stock';
            productQuickViewStock.classList.toggle('out-of-stock', stockCount === 0);
        }

        if (!hasProductPrice) {
            if (productQuickViewPrice) productQuickViewPrice.textContent = '';
            if (productQuickViewComparePrice) productQuickViewComparePrice.textContent = '';
            if (productQuickViewQtyValue) productQuickViewQtyValue.textContent = String(selectedQuantity);
            return;
        }

        if (productQuickViewPrice) productQuickViewPrice.textContent = formatPrice(productPrice);
        if (productQuickViewComparePrice) productQuickViewComparePrice.textContent = showComparePrice ? formatPrice(compareAtPrice) : '';
        if (productQuickViewQtyValue) productQuickViewQtyValue.textContent = String(selectedQuantity);
    };

    const modalTitleEl = document.getElementById('productDescriptionTitle');
    if (modalTitleEl) modalTitleEl.textContent = titleText;
    updatePurchaseUi();

    if (accordion) {
        accordion.innerHTML = '';
        accordion.append(
            buildAccordion('Product Description', buildProductDescriptionContent(descriptionText, productId, disclaimerText), false),
            buildAccordion('Product Care', `<p>${escapeHtml(productCareText).replace(/\n/g, '<br>')}</p>`, false)
        );
    }

    document.querySelectorAll('.product-qty-btn').forEach(qtyBtn => {
        qtyBtn.onclick = () => {
            const action = qtyBtn.dataset.action;
            if (action === 'increase') {
                selectedQuantity += 1;
            } else if (action === 'decrease') {
                selectedQuantity = Math.max(1, selectedQuantity - 1);
            }
            updatePurchaseUi();
        };
    });

    if (addCartButton) {
        addCartButton.onclick = () => {
            if (stockCount === 0) return showToast('This product is currently out of stock.');
            const existing = cart.find(item => item.id === productId);
            if (existing) {
                existing.qty += selectedQuantity;
            } else {
                cart.push({ id: productId, title: titleText, price: productPrice, qty: selectedQuantity });
            }
            updateCartBadge();
            showToast(`"${titleText}" added to cart!`);
        };
    }

    if (buyNowButton) {
        buyNowButton.onclick = () => {
            if (stockCount === 0) return showToast('This product is currently out of stock.');
            const existing = cart.find(item => item.id === productId);
            if (existing) {
                existing.qty += selectedQuantity;
            } else {
                cart.push({ id: productId, title: titleText, price: productPrice, qty: selectedQuantity });
            }
            updateCartBadge();
            if (modal) modal.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            unlockBodyScroll();
            if (!userToken || !loggedUser) {
                pendingCheckoutAfterLogin = true;
                openAuthModal('login');
                return;
            }
            openCheckoutModal();
        };
    }

    if (gallery) {
        gallery.replaceChildren();

        const leftButton = document.createElement('button');
        leftButton.type = 'button';
        leftButton.className = 'product-description-gallery-arrow left';
        leftButton.setAttribute('aria-label', 'Previous image');
        leftButton.innerHTML = '&#10094;';

        const frame = document.createElement('div');
        frame.className = 'product-description-gallery-frame';
        const galleryImage = document.createElement('img');
        galleryImage.loading = 'lazy';
        galleryImage.alt = 'Product view';
        frame.appendChild(galleryImage);

        const rightButton = document.createElement('button');
        rightButton.type = 'button';
        rightButton.className = 'product-description-gallery-arrow right';
        rightButton.setAttribute('aria-label', 'Next image');
        rightButton.innerHTML = '&#10095;';

        gallery.append(leftButton, frame, rightButton);

        const renderGalleryImage = () => {
            const imageSource = galleryImages[currentIndex];
            galleryImage.classList.toggle('empty-gallery-image', !imageSource);
            if (imageSource) {
                galleryImage.src = imageSource;
                galleryImage.alt = 'Product view';
            } else {
                galleryImage.removeAttribute('src');
                galleryImage.alt = 'No additional product image';
            }
        };

        leftButton.onclick = event => {
            event.stopPropagation();
            currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
            renderGalleryImage();
        };

        rightButton.onclick = event => {
            event.stopPropagation();
            currentIndex = (currentIndex + 1) % galleryImages.length;
            renderGalleryImage();
        };

        renderGalleryImage();
    }

    if (modal) modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
    lockBodyScroll();
}

function initProductDescriptionModal() {
    if (!document.getElementById('productDescriptionModal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="product-description-overlay" id="productDescriptionOverlay"></div>
            <section class="product-description-modal" id="productDescriptionModal" role="dialog" aria-modal="true" aria-labelledby="productDescriptionTitle">
                <button type="button" class="product-description-close" id="productDescriptionClose" aria-label="Close description">&times;</button>
                <div class="product-description-scroll">
                    <div class="product-description-layout">
                        <div class="product-description-gallery-wrap">
                            <div class="product-description-gallery" id="productDescriptionGallery" aria-label="Product gallery"></div>
                        </div>
                        <div class="product-description-copy">
                            <h2 id="productDescriptionTitle"></h2>
                            <div class="product-purchase-panel" id="productPurchasePanel">
                                <div class="product-purchase-meta">
                                    <div class="product-price-row">
                                        <span class="product-purchase-label">Price:</span>
                                        <div class="product-price-stack" aria-label="Product price">
                                            <span class="product-purchase-value product-purchase-original" id="productQuickViewComparePrice" hidden></span>
                                            <span class="product-purchase-value product-purchase-current" id="productQuickViewPrice" hidden></span>
                                        </div>
                                    </div>
                                    <div class="product-stock-row">
                                        <span class="product-stock-value" id="productQuickViewStock"></span>
                                    </div>
                                    <div class="product-qty-row">
                                        <span class="product-purchase-label">Quantity:</span>
                                        <div class="product-qty-stepper" aria-label="Quantity selector">
                                            <button type="button" class="product-qty-btn" data-action="decrease" aria-label="Decrease quantity">−</button>
                                            <span class="product-qty-value" id="productQuickViewQtyValue">1</span>
                                            <button type="button" class="product-qty-btn" data-action="increase" aria-label="Increase quantity">+</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="product-action-row">
                                    <button type="button" class="btn btn-outline product-modal-add-cart">Add To Cart</button>
                                    <button type="button" class="btn btn-primary product-modal-buy-now">Buy Now</button>
                                </div>
                            </div>
                            <div class="product-description-accordion" id="productDescriptionAccordion"></div>
                        </div>
                    </div>
                </div>
            </section>`);
    }

    const modal = document.getElementById('productDescriptionModal');
    const overlay = document.getElementById('productDescriptionOverlay');
    const close = (event) => {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        unlockBodyScroll();
    };

    // Event delegation for Product Description buttons
    document.addEventListener('click', event => {
        const btn = event.target.closest('.btn-product-description');
        if (btn) {
            event.preventDefault();
            openProductDescriptionModal(btn);
        }
    });

    document.getElementById('productDescriptionClose')?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal && modal.classList.contains('active')) close(event);
    });
}

function injectOrderConfirmationModal() {
    document.body.insertAdjacentHTML('beforeend', `
        <div class="order-confirmation-overlay" id="orderConfirmationOverlay"></div>
        <section class="order-confirmation-modal" id="orderConfirmationModal" role="dialog" aria-modal="true" aria-labelledby="orderConfirmationTitle">
            <div class="order-confirmation-icon">&#10003;</div>
            <h2 id="orderConfirmationTitle">Order Placed Successfully!</h2>
            <p class="order-confirmation-id" id="orderConfirmationId"></p>
            <p>Our team will reach you out shortly for the order and payment confirmation.</p>
            <div class="order-confirmation-actions">
                <button type="button" class="btn btn-primary order-confirmation-download" id="orderConfirmationDownload">Download PDF</button>
                <button type="button" class="btn btn-outline order-confirmation-close" id="orderConfirmationClose">Okay</button>
            </div>
        </section>`);
    const close = () => {
        document.getElementById('orderConfirmationModal').classList.remove('active');
        document.getElementById('orderConfirmationOverlay').classList.remove('active');
        unlockBodyScroll();
    };
    document.getElementById('orderConfirmationClose').addEventListener('click', close);
    document.getElementById('orderConfirmationDownload').addEventListener('click', () => {
        if (!latestCompletedOrder) return;
        downloadOrderPdf(latestCompletedOrder, 'Customer');
        downloadOrderPdf(latestCompletedOrder, 'Shop Owner');
        showToast('Customer and Shop Owner invoice PDFs are downloading.');
    });
    document.getElementById('orderConfirmationOverlay').addEventListener('click', close);
}

function showOrderConfirmation(order, pdfUrl) {
    latestCompletedOrder = order;
    trackCustomerActivity('order_success', { metadata: { order_id: order.id, total: order.total } });
    document.getElementById('orderConfirmationId').textContent = `Order ID: #${order.id}`;
    document.getElementById('orderConfirmationModal').classList.add('active');
    document.getElementById('orderConfirmationOverlay').classList.add('active');

    const downloadBtn = document.getElementById('orderConfirmationDownload');
    if (downloadBtn) {
        downloadBtn.onclick = function(e) {
            e.preventDefault();
            const targetUrl = pdfUrl || `/api/orders/${order.id}/pdf`;
            window.open(targetUrl, '_blank');
        };
    }
}

/* ============ STICKY HEADER ============ */
function initStickyHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    function handleScroll() {
        header.classList.toggle('scrolled', window.scrollY > 30);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
}

/* ============ SCROLL PROGRESS BAR ============ */
function initScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    function update() {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* ============ SMOOTH SCROLL ============ */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const offset = document.getElementById('header')?.offsetHeight || 85;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
            if (this.classList.contains('nav-link')) {
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

/* ============ PRODUCTS CAROUSEL (mobile horizontal scroll) ============ */
function initProductsCarousel() {
    const track = document.getElementById('productsGrid');
    const prevBtn = document.getElementById('productsCarouselPrev');
    const nextBtn = document.getElementById('productsCarouselNext');
    if (!track || !prevBtn || !nextBtn) return;

    function scrollByCard(direction) {
        const card = track.querySelector('.product-card');
        const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 14);
        const amount = card ? (card.getBoundingClientRect().width + gap) : track.clientWidth * 0.8;
        track.scrollBy({ left: direction * amount, behavior: 'smooth' });
    }

    prevBtn.addEventListener('click', () => scrollByCard(-1));
    nextBtn.addEventListener('click', () => scrollByCard(1));
}

/* ============ MOBILE NAVIGATION ============ */
function initMobileMenu() {
    const ham = document.getElementById('hamburger');
    const nav = document.getElementById('navLinks');
    if (!ham || !nav) return;

    const closeMobileMenu = () => {
        nav.classList.remove('mobile-active');
        ham.classList.remove('active');
        ham.setAttribute('aria-expanded', 'false');
    };

    ham.addEventListener('click', () => {
        const exp = ham.getAttribute('aria-expanded') === 'true';
        ham.setAttribute('aria-expanded', !exp);
        nav.classList.toggle('mobile-active');
        ham.classList.toggle('active');
    });
    document.querySelectorAll('.nav-link').forEach(l => {
        l.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    // Close the mobile menu when tapping/clicking anywhere outside the open
    // menu panel (and outside the hamburger toggle itself, which already has
    // its own open/close handler above). A document-level listener in the
    // capture phase reliably sees the event before other handlers might stop
    // propagation, and this covers both mouse and touch input.
    const handleOutsideInteraction = event => {
        if (!nav.classList.contains('mobile-active')) return;
        const target = event.target;
        const clickedInsideMenu = nav.contains(target);
        const clickedToggleButton = ham.contains(target);
        if (!clickedInsideMenu && !clickedToggleButton) {
            closeMobileMenu();
        }
    };
    document.addEventListener('click', handleOutsideInteraction, true);
    document.addEventListener('touchstart', handleOutsideInteraction, true);
}

/* ============ INLINE SEARCH ============ */
function initSearch() {
    const searchBtn    = document.getElementById('searchBtn');
    const searchForm   = document.getElementById('searchForm');
    const searchInput  = document.getElementById('searchInput');
    const searchResults= document.getElementById('searchResults');
    if (!searchBtn || !searchForm || !searchInput || !searchResults) return;

    const getSearchableProducts = () => {
        const cards = document.querySelectorAll('.product-card');
        const list = [];
        cards.forEach(card => {
            const id = card.dataset.productId || card.querySelector('.btn-add-cart')?.dataset.id;
            const title = card.querySelector('.product-title')?.textContent.trim();
            const price = card.querySelector('.product-price')?.textContent.trim();
            const category = card.dataset.category || 'cookware';
            if (id && title) list.push({ id, name: title, price, category });
        });
        return list;
    };

    const closeSearch = () => {
        searchForm.hidden = true;
        searchBtn.setAttribute('aria-expanded', 'false');
        searchInput.blur();
    };

    // Resolves a product's real id/handle (e.g. "p1", "p12") back to its actual
    // <div class="product-card"> in the DOM.
    const findProductCardById = productId => {
        if (!productId) return null;
        return document.querySelector(`.product-card[data-product-id="${productId}"]`)
            || Array.from(document.querySelectorAll('.product-card'))
                .find(card => card.querySelector(`[data-id="${productId}"]`)) || null;
    };

    // First search click takes the user to the exact product card. The card's
    // own image or description button can then be clicked to open its details.
    const openSearchResult = productId => {
        const productCard = findProductCardById(productId);
        if (!productCard) return;
        closeSearch();
        document.querySelectorAll('.search-target').forEach(card => card.classList.remove('search-target'));
        productCard.classList.add('search-target');
        productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => productCard.classList.remove('search-target'), 2200);
    };

    searchBtn.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = !searchForm.hidden;
        searchForm.hidden = isOpen;
        searchBtn.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen) {
            setTimeout(() => searchInput.focus(), 0);
        }
    });

    document.addEventListener('click', event => {
        const target = event.target;
        const clickedInsideSearch = target.closest('#searchForm') || target.closest('#searchBtn');
        if (!searchForm.hidden && !clickedInsideSearch) {
            closeSearch();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !searchForm.hidden) {
            closeSearch();
        }
    });

    searchInput?.addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) { searchResults.textContent = ''; return; }
        trackCustomerActivity('search', { metadata: { query: q } });
        const list = getSearchableProducts();
        const matches = list.filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
        searchResults.innerHTML = matches.length
            ? matches.map(p => `<div class="search-result-item" data-product-id="${p.id}" role="button" tabindex="0"><span>${p.name}</span><span>${p.price}</span></div>`).join('')
            : 'No matching traditional products found.';
    });

    // Entire result row (image/name/price all live inside it) is clickable —
    // event delegation covers both mouse clicks and touch taps on mobile.
    searchResults.addEventListener('click', event => {
        const resultItem = event.target.closest('.search-result-item');
        if (!resultItem) return;
        openSearchResult(resultItem.dataset.productId);
    });

    // Keyboard support (Enter / Space) since results are focusable via tabindex.
    searchResults.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const resultItem = event.target.closest('.search-result-item');
        if (!resultItem) return;
        event.preventDefault();
        openSearchResult(resultItem.dataset.productId);
    });

    searchForm.addEventListener('submit', e => e.preventDefault());
}

/* ============ CART SIDEBAR (inject into DOM) ============ */
function injectCartSidebar() {
    const html = `
    <!-- CART SIDEBAR OVERLAY -->
    <div class="cart-overlay" id="cartOverlay"></div>

    <!-- CART SIDEBAR -->
    <aside class="cart-sidebar" id="cartSidebar" role="dialog" aria-label="Shopping Cart">
        <div class="cart-sidebar-header">
            <h2 class="cart-sidebar-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Your Cart
            </h2>
            <button class="cart-close-btn" id="cartCloseBtn" aria-label="Close cart">&times;</button>
        </div>

        <div class="cart-items-list" id="cartItemsList">
            <!-- items injected here -->
        </div>

        <div class="cart-empty-msg" id="cartEmptyMsg">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--muted-accent)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <p>Your cart is empty</p>
            <span>Add some handcrafted clay cookware!</span>
        </div>

        <div class="cart-sidebar-footer" id="cartFooter">
            <div class="cart-total-row">
                <span>Total</span>
                <span class="cart-total-price" id="cartTotalPrice">₹0</span>
            </div>
            <button class="btn btn-primary cart-checkout-btn" id="cartCheckoutBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Proceed to Checkout
            </button>
        </div>
    </aside>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Wire events
    document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);
    document.getElementById('cartCheckoutBtn').addEventListener('click', () => {
        if (cart.length === 0) return;
        closeCart();
        openCheckoutModal();
    });
}

/* ============ CHECKOUT ADDRESS MODAL (inject into DOM) ============ */
function injectCheckoutModal() {
    const html = `
    <!-- CHECKOUT MODAL OVERLAY -->
    <div class="checkout-overlay" id="checkoutOverlay"></div>

    <!-- CHECKOUT MODAL -->
    <div class="checkout-modal" id="checkoutModal" role="dialog" aria-label="Delivery Details">
        <div class="checkout-modal-inner">
            <!-- Step indicator -->
            <div class="checkout-steps">
                <div class="checkout-step active" id="stepDot1">1</div>
                <div class="checkout-step-line"></div>
                <div class="checkout-step" id="stepDot2">2</div>
            </div>
            <p class="checkout-step-label" id="checkoutStepLabel">Delivery Address</p>

            <button class="checkout-close-btn" id="checkoutCloseBtn" aria-label="Close checkout">&times;</button>

            <!-- STEP 1: Address Form -->
            <div id="checkoutStep1">
                <h2 class="checkout-title">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Delivery Address
                </h2>
                <form id="checkoutForm" novalidate>
                    <div class="saved-address-panel" id="savedAddressPanel" hidden>
                        <label class="form-label" for="cf_saved_address">Saved address</label>
                        <select class="form-input" id="cf_saved_address">
                            <option value="">Use a saved address...</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="cf_name">Full Name *</label>
                            <input class="form-input" type="text" id="cf_name" placeholder="e.g. Ananya Kumar" required autocomplete="name">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="cf_phone">Mobile Number *</label>
                            <input class="form-input" type="tel" id="cf_phone" placeholder="+91 98765 43210" required autocomplete="tel" maxlength="14" pattern="\\+91\\s?[6-9]\\d{9}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="cf_email">Email ID *</label>
                        <input class="form-input" type="email" id="cf_email" placeholder="e.g. ananya@email.com" required autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="cf_address">Full Address *</label>
                        <textarea class="form-input form-textarea" id="cf_address" placeholder="Door No., Street Name, Area / Locality" required rows="3"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="cf_city">City *</label>
                            <input class="form-input" type="text" id="cf_city" placeholder="e.g. Coimbatore" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="cf_state">State *</label>
                            <input class="form-input" type="text" id="cf_state" placeholder="e.g. Tamil Nadu" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="cf_pincode">Pincode *</label>
                            <input class="form-input" type="text" id="cf_pincode" placeholder="e.g. 641001" required maxlength="6">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="cf_note">Order Note (optional)</label>
                            <input class="form-input" type="text" id="cf_note" placeholder="Any special instructions...">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="cf_country">Country *</label>
                        <select class="form-input" id="cf_country" required>
                            <option value="India" selected>India</option>
                        </select>
                    </div>
                    <section class="order-suggestions" id="orderSuggestions" aria-live="polite"></section>
                    <div class="form-error" id="formError" style="display:none;"></div>
                    <button type="submit" class="btn btn-primary checkout-submit-btn" id="checkoutNextBtn">
                        Review Order
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                </form>
            </div>

            <!-- STEP 2: Order Summary + WhatsApp -->
            <div id="checkoutStep2" style="display:none;">
                <h2 class="checkout-title">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    Order Summary
                </h2>
                <div class="order-summary-box" id="orderSummaryBox">
                    <!-- Filled by JS -->
                </div>
                <div class="order-address-box" id="orderAddressBox">
                    <!-- Filled by JS -->
                </div>
                <div class="checkout-step2-actions">
                    <button class="btn btn-outline checkout-back-btn" id="checkoutBackBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Edit Address
                    </button>
                    <button class="btn-primary checkout-submit-btn" id="checkoutPayBtn" style="background: linear-gradient(135deg, #176b3a 0%, #25a05a 100%); color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:700; font-size:1rem; cursor:pointer; width:100%;">
                        &#128172; Confirm Order via WhatsApp
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Wire events
    document.getElementById('checkoutCloseBtn').addEventListener('click', closeCheckout);
    document.getElementById('checkoutOverlay').addEventListener('click', closeCheckout);

    document.getElementById('checkoutForm').addEventListener('submit', e => {
        e.preventDefault();
        goToStep2();
    });

    document.getElementById('checkoutBackBtn').addEventListener('click', goToStep1);

    document.getElementById('checkoutPayBtn').addEventListener('click', handleWhatsAppCheckoutOrder);
}

/* ── Cart Open / Close ─────────────────────────────────── */
function openCart() {
    renderCartSidebar();
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('active');
    lockBodyScroll();
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('active');
    unlockBodyScroll();
}

/* ── Checkout Open / Close ─────────────────────────────── */
function openCheckoutModal() {
    trackCustomerActivity('checkout_start', { metadata: { cart_items: cart.length, cart_total: cartTotal() } });
    goToStep1();
    renderOrderSuggestions();
    renderSavedAddressOptions();
    document.getElementById('checkoutModal').classList.add('active');
    document.getElementById('checkoutOverlay').classList.add('active');
    lockBodyScroll();
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('checkoutOverlay').classList.remove('active');
    unlockBodyScroll();
}

/* ── Render Cart Items ─────────────────────────────────── */
function injectWishlistSidebar() {
    const html = `
    <div class="wishlist-overlay" id="wishlistOverlay"></div>
    <aside class="wishlist-sidebar" id="wishlistSidebar" role="dialog" aria-label="Wishlist">
        <div class="wishlist-sidebar-header">
            <h2 class="wishlist-sidebar-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Your Wishlist
            </h2>
            <button class="wishlist-close-btn" id="wishlistCloseBtn" aria-label="Close wishlist">&times;</button>
        </div>
        <div class="wishlist-items-list" id="wishlistItemsList"></div>
        <div class="wishlist-empty-msg" id="wishlistEmptyMsg">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--muted-accent)" stroke-width="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <p>Your wishlist is empty</p>
            <span>Save your favourite clay essentials here.</span>
        </div>
    </aside>`;

    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('wishlistCloseBtn').addEventListener('click', closeWishlist);
    document.getElementById('wishlistOverlay').addEventListener('click', closeWishlist);
}

function openWishlist() {
    renderWishlistSidebar();
    document.getElementById('wishlistSidebar').classList.add('open');
    document.getElementById('wishlistOverlay').classList.add('active');
    lockBodyScroll();
}

function closeWishlist() {
    document.getElementById('wishlistSidebar').classList.remove('open');
    document.getElementById('wishlistOverlay').classList.remove('active');
    unlockBodyScroll();
}

function syncWishlistButtons() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const card = btn.closest('.product-card');
        const id = card?.dataset.productId || card?.querySelector('.btn-add-cart')?.dataset.id || null;
        const hasItem = id ? wishlist.some(item => item.id === id) : false;
        btn.classList.toggle('active', hasItem);
        btn.setAttribute('aria-label', hasItem ? 'Remove from wishlist' : 'Add to wishlist');
    });
}

function updateWishlistBadge() {
    persistWishlist();
    const badge = document.getElementById('wishlistCount');
    if (!badge) return;
    badge.textContent = wishlist.length;
    badge.style.display = wishlist.length > 0 ? 'flex' : 'none';
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 500);
    syncWishlistButtons();
}

function resolveWishlistCurrentPrice(item) {
    const id = item?.id;
    const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
    const productPrice = parsePriceValue(
        productCard?.dataset.price ||
        productCard?.querySelector('.product-price')?.dataset.price ||
        productCard?.querySelector('.btn-add-cart')?.dataset.price ||
        item?.price ||
        0
    );

    return productPrice > 0 ? productPrice : parsePriceValue(item?.price || 0);
}

function renderWishlistSidebar() {
    const list = document.getElementById('wishlistItemsList');
    const emptyMsg = document.getElementById('wishlistEmptyMsg');
    if (!list || !emptyMsg) return;
    list.innerHTML = '';

    if (wishlist.length === 0) {
        emptyMsg.style.display = 'flex';
        return;
    }

    emptyMsg.style.display = 'none';
    wishlist.forEach(item => {
        const image = item.image || getProductGalleryImages(item.id, '')[0] || 'images/manchatti.png';
        const currentPrice = resolveWishlistCurrentPrice(item);
        const row = document.createElement('div');
        row.className = 'wishlist-item';
        row.innerHTML = `
            <div class="wishlist-item-image-wrap">
                <img src="${image}" alt="${item.title}" class="wishlist-item-image" loading="lazy">
            </div>
            <div class="wishlist-item-info">
                <span class="wishlist-item-name">${item.title}</span>
                <span class="wishlist-item-price-stack">
                    <span class="wishlist-item-price">${formatPrice(currentPrice)}</span>
                </span>
            </div>
            <div class="wishlist-item-actions">
                <button class="wishlist-item-add" data-id="${item.id}" type="button">Add to cart</button>
                <button class="wishlist-item-remove" data-id="${item.id}" type="button" aria-label="Remove from wishlist">&times;</button>
            </div>`;
        list.appendChild(row);
    });

    list.querySelectorAll('.wishlist-item-remove').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const card = document.querySelector(`.product-card[data-product-id="${id}"] .wishlist-btn`);
            if (card) card.classList.remove('active');
            wishlist = wishlist.filter(item => item.id !== id);
            trackCustomerActivity('wishlist_remove', { product_id: id, product_title: button.closest('.wishlist-item')?.querySelector('.wishlist-item-name')?.textContent || id });
            updateWishlistBadge();
            renderWishlistSidebar();
        });
    });

    list.querySelectorAll('.wishlist-item-add').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const item = wishlist.find(entry => entry.id === id);
            if (!item) return;
            const existing = cart.find(c => c.id === id);
            if (existing) existing.qty += 1; else cart.push({ id, title: item.title, price: item.price, qty: 1 });
            trackCustomerActivity('cart_add', { product_id: id, product_title: item.title, metadata: { source: 'wishlist' } });
            updateCartBadge();
            showToast(`"${item.title}" added to cart!`);
            closeWishlist();
        });
    });
}

function renderCartSidebar() {
    const list     = document.getElementById('cartItemsList');
    const emptyMsg = document.getElementById('cartEmptyMsg');
    const footer   = document.getElementById('cartFooter');
    const totalEl  = document.getElementById('cartTotalPrice');

    list.innerHTML = '';

    if (cart.length === 0) {
        emptyMsg.style.display = 'flex';
        footer.style.display   = 'none';
    } else {
        emptyMsg.style.display = 'none';
        footer.style.display   = 'block';

        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.title}</span>
                    <span class="cart-item-unit">${formatPrice(item.price)} each</span>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" data-id="${item.id}" data-action="dec" aria-label="Decrease quantity">−</button>
                    <span class="qty-value">${item.qty}</span>
                    <button class="qty-btn" data-id="${item.id}" data-action="inc" aria-label="Increase quantity">+</button>
                </div>
                <div class="cart-item-subtotal">${formatPrice(item.price * item.qty)}</div>
                <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>`;
            list.appendChild(div);
        });

        // qty + remove button events
        list.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id  = btn.dataset.id;
                const act = btn.dataset.action;
                const idx = cart.findIndex(c => c.id === id);
                if (idx === -1) return;
                if (act === 'inc') {
                    cart[idx].qty++;
                } else {
                    cart[idx].qty--;
                    if (cart[idx].qty <= 0) cart.splice(idx, 1);
                }
                trackCustomerActivity('cart_update', { product_id: id, product_title: cart[idx]?.title || id, metadata: { action: act, quantity: cart[idx]?.qty || 0 } });
                updateCartBadge();
                renderCartSidebar();
            });
        });

        list.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const id  = btn.dataset.id;
                const removed = cart.find(c => c.id === id);
                cart = cart.filter(c => c.id !== id);
                trackCustomerActivity('cart_remove', { product_id: id, product_title: removed?.title || id });
                updateCartBadge();
                renderCartSidebar();
            });
        });

        totalEl.textContent = formatPrice(cartTotal());
    }
}

/* ── Cart badge update ─────────────────────────────────── */
function updateCartBadge() {
    persistCart();
    const badge = document.getElementById('cartCount');
    if (!badge) return;
    const total = cartTotalQty();
    badge.textContent = total;
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 500);
}

/* ── Step navigation ───────────────────────────────────── */
function goToStep1() {
    document.getElementById('checkoutStep1').style.display = 'block';
    document.getElementById('checkoutStep2').style.display = 'none';
    document.getElementById('stepDot1').classList.add('active');
    document.getElementById('stepDot2').classList.remove('active');
    document.getElementById('checkoutStepLabel').textContent = 'Delivery Address';
    document.getElementById('formError').style.display = 'none';
}

function goToStep2() {
    // Validate
    if (!Array.isArray(cart) || cart.length === 0 || cart.some(item => !item.title || Number(item.qty) < 1)) {
        const emptyCartError = document.getElementById('formError');
        emptyCartError.textContent = 'Please add at least one product before checkout.';
        emptyCartError.style.display = 'block';
        return;
    }
    const name    = document.getElementById('cf_name').value.trim();
    const phoneField = document.getElementById('cf_phone');
    let phone   = phoneField.value.trim();
    const email   = document.getElementById('cf_email').value.trim();
    const address = document.getElementById('cf_address').value.trim();
    const city    = document.getElementById('cf_city').value.trim();
    const state   = document.getElementById('cf_state').value.trim();
    const pincode = document.getElementById('cf_pincode').value.trim();
    const country = document.getElementById('cf_country').value;
    const errEl   = document.getElementById('formError');

    if (!name || !phone || !email || !address || !city || !state || !pincode || country !== 'India') {
        errEl.textContent = '⚠️ Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        errEl.textContent = 'Please enter a valid email address.';
        errEl.style.display = 'block';
        return;
    }
    if (!/^\d{6}$/.test(pincode)) {
        errEl.textContent = '⚠️ Pincode must be exactly 6 digits.';
        errEl.style.display = 'block';
        return;
    }
    if (/^[6-9]\d{9}$/.test(phone)) {
        phone = `+91 ${phone}`;
        phoneField.value = phone;
    }
    if (!/^\+91\s?[6-9]\d{9}$/.test(phone)) {
        errEl.textContent = '⚠️ Mobile number must be a valid Indian +91 number.';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';
    saveCheckoutAddress({ name, phone, email, address, city, state, pincode, country });

    // Build order summary HTML
    const summaryBox = document.getElementById('orderSummaryBox');
    const addressBox = document.getElementById('orderAddressBox');

    const itemRows = cart.map(item => `
        <div class="summary-item-row">
            <span class="summary-item-name">${item.title} × ${item.qty}</span>
            <span class="summary-item-price">${formatPrice(item.price * item.qty)}</span>
        </div>`).join('');

    summaryBox.innerHTML = `
        <h3 class="summary-section-title">🛒 Items Ordered</h3>
        ${itemRows}
        <div class="summary-total-row">
            <span>Order Total</span>
            <span>${formatPrice(cartTotal())}</span>
        </div>`;

    const note = document.getElementById('cf_note').value.trim();
    addressBox.innerHTML = `
        <h3 class="summary-section-title">📍 Delivery Address</h3>
        <p class="summary-address-line"><strong>${name}</strong> &nbsp;|&nbsp; ${phone}</p>
        <p class="summary-address-line">${email}</p>
        <p class="summary-address-line">${address}</p>
        <p class="summary-address-line">${city}, ${state} — ${pincode}</p>
        ${note ? `<p class="summary-address-line" style="color:var(--accent);font-style:italic;">Note: ${note}</p>` : ''}`;

    // Show step 2
    document.getElementById('checkoutStep1').style.display = 'none';
    document.getElementById('checkoutStep2').style.display = 'block';
    document.getElementById('stepDot1').classList.remove('active');
    document.getElementById('stepDot2').classList.add('active');
    document.getElementById('checkoutStepLabel').textContent = 'Confirm & Send';
}

function renderOrderSuggestions() {
    const box = document.getElementById('orderSuggestions');
    if (!box) return;
    const cartIds = new Set(cart.map(item => item.id));
    const options = [...document.querySelectorAll('.btn-order-now')].filter(button => !cartIds.has(button.dataset.id)).slice(0, 4);
    if (!options.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<h3>You may also like</h3><p>Add a remaining product before placing your order.</p><div class="suggestion-list">${options.map(button => {
        const image = button.closest('.product-card')?.querySelector('.product-image');
        const imageMarkup = image ? `<img class="suggestion-image" src="${image.src}" alt="${image.alt}">` : '';
        return `<button type="button" class="suggestion-item" data-id="${button.dataset.id}" data-title="${button.dataset.title}" data-price="${button.dataset.price}">${imageMarkup}<span>${button.dataset.title}</span><strong>${formatPrice(button.dataset.price)}</strong><em>+ Add</em></button>`;
    }).join('')}</div>`;
    box.querySelectorAll('.suggestion-item').forEach(button => button.addEventListener('click', () => {
        cart.push({ id: button.dataset.id, title: button.dataset.title, price: Number(button.dataset.price), qty: 1 });
        updateCartBadge(); renderOrderSuggestions(); showToast(`${button.dataset.title} added to your order.`);
    }));
}

function getSavedCheckoutAddresses() {
    const key = loggedUser?.email ? `ananyan_addresses_${loggedUser.email.toLowerCase()}` : null;
    if (!key) return [];
    try {
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch (error) { return []; }
}

function renderSavedAddressOptions() {
    const panel = document.getElementById('savedAddressPanel');
    const select = document.getElementById('cf_saved_address');
    if (!panel || !select || !loggedUser) return;
    const addresses = getSavedCheckoutAddresses();
    const profileAddress = loggedUser.address ? [{
        name: loggedUser.name || '', phone: loggedUser.phone || '', email: loggedUser.email || '',
        address: loggedUser.address, city: '', state: '', pincode: '', country: 'India'
    }] : [];
    const all = [...profileAddress, ...addresses].filter((entry, index, list) =>
        entry.address && list.findIndex(candidate => candidate.address === entry.address && candidate.pincode === entry.pincode) === index
    );
    select.innerHTML = '<option value="">Use a saved address...</option>' + all.map((entry, index) =>
        `<option value="${index}">${escapeHtml(entry.address)}${entry.city ? `, ${escapeHtml(entry.city)}` : ''}${entry.pincode ? ` - ${escapeHtml(entry.pincode)}` : ''}</option>`
    ).join('');
    select.onchange = () => {
        const entry = all[Number(select.value)];
        if (!entry) return;
        ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode', 'country'].forEach(field => {
            const input = document.getElementById(`cf_${field}`);
            if (input && entry[field]) input.value = entry[field];
        });
    };
    panel.hidden = !all.length;
}

function saveCheckoutAddress(address) {
    if (!loggedUser?.email || !address?.address) return;
    const key = `ananyan_addresses_${loggedUser.email.toLowerCase()}`;
    const saved = getSavedCheckoutAddresses().filter(entry => entry.address !== address.address || entry.pincode !== address.pincode);
    localStorage.setItem(key, JSON.stringify([address, ...saved].slice(0, 5)));
}

function generateOrderId() {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const key = `ananyamlives-order-count-${day}`;
    const next = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, String(next));
    return `ANL-${day}-${String(next).padStart(4, '0')}`;
}

async function loadInvoiceLogo() {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 180;
            const context = canvas.getContext('2d');
            context.fillStyle = '#fffaf3';
            context.fillRect(0, 0, 180, 180);
            // Keep the supplied square mark intact so no leaves or roots are cropped in the PDF.
            context.drawImage(image, 0, 0, 180, 180);
            const bytes = atob(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
            resolve(new Uint8Array([...bytes].map(char => char.charCodeAt(0))));
        };
        image.onerror = reject;
        image.src = 'main.jpeg';
    });
}

function downloadOrderPdf(order, copyFor) {
    const clean = value => String(value).replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7E]/g, '');
    // The logo is preloaded when the page opens. This keeps download creation in
    // the user's click event, which browsers require for automatic downloads.
    const logoBytes = invoiceLogoBytes;
    const money = value => `INR ${Number(value).toLocaleString('en-IN')}`;
    const text = (value, x, y, size = 10, bold = false, color = '0.16 0.08 0.03') =>
        `${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${clean(value)}) Tj ET`;
    const truncate = (value, length = 37) => value.length > length ? `${value.slice(0, length - 3)}...` : value;
    const contentParts = [
        // Header: cream brand panel on the left, dark invoice panel on the right.
        '0.96 0.88 0.80 rg 0 760 360 82 re f',
        '0.23 0.10 0.04 rg 360 760 235 82 re f',
        text(STORE_NAME.toUpperCase(), 115, 802, 21, true, '0.42 0.12 0.12'),
        text('Retrive our Heredity', 143, 781, 12, true, '0.08 0.05 0.03'),
        text('INVOICE', 420, 801, 27, true, '1 1 1'),
        text(`${copyFor.toUpperCase()} COPY`, 446, 780, 9, true, '1 1 1'),
        text('INVOICE TO', 50, 724, 10, true, '0.71 0.44 0.22'),
        text(order.name, 50, 704, 13, true),
        text(truncate(order.address, 42), 50, 686, 10),
        text(`${order.city}, ${order.state} - ${order.pincode}`, 50, 670, 10),
        text(order.email, 50, 654, 10),
        text('INVOICE DETAILS', 380, 724, 10, true, '0.71 0.44 0.22'),
        text(`Invoice No.  ${order.id}`, 380, 704, 10, true),
        text(`Invoice Date: ${order.date}`, 380, 686, 10),
        text(`Phone: ${order.phone}`, 380, 668, 10),
        '0.23 0.10 0.04 rg 50 622 495 27 re f',
        text('SL#', 62, 632, 9, true, '1 1 1'),
        text('PRODUCT DESCRIPTION', 102, 632, 9, true, '1 1 1'),
        '0.71 0.44 0.22 rg 360 622 185 27 re f',
        text('UNIT PRICE', 370, 632, 9, true, '1 1 1'),
        text('QTY.', 440, 632, 9, true, '1 1 1'),
        text('TOTAL', 486, 632, 9, true, '1 1 1')
    ];
    if (logoBytes) contentParts.push('q 66 0 0 66 28 768 cm /Logo Do Q');
    let rowY = 602;
    order.items.forEach((item, index) => {
        if (index % 2 === 0) contentParts.push(`0.98 0.95 0.90 rg 50 ${rowY - 8} 495 17 re f`);
        contentParts.push(text(String(index + 1).padStart(2, '0'), 73, rowY, 10));
        contentParts.push(text(truncate(item.title), 102, rowY, 10));
        contentParts.push(text(money(item.price), 365, rowY, 10));
        contentParts.push(text(String(item.qty), 447, rowY, 10));
        contentParts.push(text(money(item.price * item.qty), 480, rowY, 10, true));
        contentParts.push(`0.86 0.78 0.68 RG 0.5 w 50 ${rowY - 9} m 545 ${rowY - 9} l S`);
        rowY -= 18;
    });
    const totalY = rowY - 10;
    contentParts.push('0.95 0.91 0.85 rg 350 ' + totalY + ' 195 25 re f');
    contentParts.push(text('Subtotal', 365, totalY + 8, 10));
    contentParts.push(text(money(order.total), 474, totalY + 8, 10));
    contentParts.push('0.71 0.44 0.22 rg 350 ' + (totalY - 26) + ' 195 26 re f');
    contentParts.push(text('GRAND TOTAL', 365, totalY - 17, 10, true, '1 1 1'));
    contentParts.push(text(money(order.total), 474, totalY - 17, 10, true, '1 1 1'));
    const paymentY = totalY - 62;
    const termsY = 72; // Fixed above the footer, matching the invoice template.
    contentParts.push(text('CUSTOMER NOTES', 50, paymentY, 11, true));
    contentParts.push(text(order.note || 'No customer note provided.', 50, paymentY - 19, 9, false, '0.40 0.32 0.26'));
    contentParts.push(text('TERMS AND CONDITIONS', 50, termsY, 11, true));
    contentParts.push(text('Please retain this invoice for your order and payment reference.', 50, termsY - 19, 9, false, '0.40 0.32 0.26'));
    contentParts.push('0.23 0.10 0.04 rg 0 0 595 44 re f');
    contentParts.push(text('Thank you for choosing Ananyamlives authentic handcrafted cookware!', 120, 29, 8, true, '1 1 1'));
    contentParts.push(text(`${STORE_NAME} | +91 883 810 5431 | ananyamlives@gmail.com`, 105, 13, 8, false, '1 1 1'));
    const content = contentParts.join('\n');
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    const imageObject = logoBytes ? [
        encoder.encode(`<< /Type /XObject /Subtype /Image /Width 180 /Height 180 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`),
        logoBytes,
        encoder.encode('\nendstream')
    ] : null;
    const objectBodies = [
        [encoder.encode('<< /Type /Catalog /Pages 2 0 R >>')],
        [encoder.encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')],
        [encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> ${logoBytes ? '/XObject << /Logo 6 0 R >>' : ''} >> /Contents ${logoBytes ? 7 : 6} 0 R >>`)],
        [encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')],
        [encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')],
        ...(imageObject ? [imageObject] : []),
        [encoder.encode(`<< /Length ${contentBytes.length} >>\nstream\n`), contentBytes, encoder.encode('\nendstream')]
    ];
    const concat = parts => {
        const length = parts.reduce((sum, part) => sum + part.length, 0); const joined = new Uint8Array(length); let offset = 0;
        parts.forEach(part => { joined.set(part, offset); offset += part.length; }); return joined;
    };
    const pieces = [encoder.encode('%PDF-1.4\n')]; const offsets = [0]; let length = pieces[0].length;
    objectBodies.forEach((body, i) => { const entry = concat([encoder.encode(`${i + 1} 0 obj\n`), ...body, encoder.encode('\nendobj\n')]); offsets.push(length); pieces.push(entry); length += entry.length; });
    const startXref = length;
    pieces.push(encoder.encode(`xref\n0 ${objectBodies.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objectBodies.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`));
    const pdf = concat(pieces);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    link.download = `${order.id}-${copyFor.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/* ── WhatsApp Order Confirmation ─────────────────────────────────── */
async function handleWhatsAppCheckoutOrder() {
    const name    = document.getElementById('cf_name')?.value.trim();
    const phone   = document.getElementById('cf_phone')?.value.trim();
    const email   = document.getElementById('cf_email')?.value.trim();
    const address = document.getElementById('cf_address')?.value.trim();
    const city    = document.getElementById('cf_city')?.value.trim();
    const state   = document.getElementById('cf_state')?.value.trim();
    const pincode = document.getElementById('cf_pincode')?.value.trim();
    const note    = document.getElementById('cf_note')?.value.trim();
    const country = document.getElementById('cf_country')?.value;

    if (!name || !email || !phone || !address || !city || !state || !pincode || country !== 'India' || !/^\+91\s?[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(pincode)) {
        alert('Please fill in all required delivery address fields.');
        return;
    }

    if (cart.length === 0) {
        alert('Your shopping cart is empty.');
        return;
    }

    const orderTotal = cartTotal();
    const orderId = generateOrderId();

    const orderPayload = {
        id: orderId,
        date: new Date().toLocaleString('en-IN'),
        name,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        country,
        note: note || '',
        items: cart.map(item => ({ ...item })),
        total: orderTotal
    };

    const submitBtn = document.querySelector('.checkout-submit-btn') || document.getElementById('checkoutPayBtn');
    const whatsappWindow = window.open('', '_blank');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Confirming order...';
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (userToken) headers.Authorization = `Bearer ${userToken}`;
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/orders/confirm`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ orderData: orderPayload })
        });
        const data = await res.json();

        if (!data.success) {
            alert(data.error || 'Failed to confirm order.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Confirm Order via WhatsApp'; }
            return;
        }

        const whatsappItems = orderPayload.items.map(item => `- ${item.title} x ${item.qty} = ${formatPrice(item.price * item.qty)}`).join('\n');
        const message = `New Order - ${orderPayload.id}\n\nCustomer: ${orderPayload.name}\nPhone: ${orderPayload.phone}\nEmail: ${orderPayload.email}\nAddress: ${orderPayload.address}, ${orderPayload.city}, ${orderPayload.state} - ${orderPayload.pincode}\n\nProducts:\n${whatsappItems}\n\nTotal: ${formatPrice(orderPayload.total)}\nPayment:  Direct confirmation\n${orderPayload.note ? `Note: ${orderPayload.note}` : ''}`;
        cart = [];
        updateCartBadge();
        closeCheckout();
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.trim())}`;
        if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
        else openWhatsApp(message);
        showOrderConfirmation(orderPayload, data.pdfUrl);

    } catch (err) {
        console.error('Checkout error:', err);
        whatsappWindow?.close();
        alert('Order confirmation failed. Please try again.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Confirm Order via WhatsApp'; }
    }
}

/* ============ CART & WISHLIST INTERACTIONS ============ */
function initCartWishlistInteractions() {
    // Event delegation for Add to Cart buttons
    document.addEventListener('click', e => {
        const btn = e.target.closest('.btn-add-cart');
        if (!btn) return;

        const id    = btn.dataset.id || btn.closest('.product-card')?.dataset.productId;
        const title = btn.dataset.title || btn.closest('.product-card')?.querySelector('.product-title')?.textContent.trim() || 'Product';
        const card  = btn.closest('.product-card');
        const price = parseInt(btn.dataset.price || card?.dataset.price || card?.querySelector('.product-price')?.dataset.price, 10) || 0;

        const existing = cart.find(c => c.id === id);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ id, title, price, qty: 1 });
        }

        trackCustomerActivity('cart_add', { product_id: id, product_title: title, metadata: { price, quantity: existing ? existing.qty : 1 } });
        updateCartBadge();
        showToast(`"${title}" added to cart!`);
    });

    // Event delegation for Order Now buttons
    document.addEventListener('click', e => {
        const btn = e.target.closest('.btn-order-now');
        if (!btn) return;

        const id    = btn.dataset.id || btn.closest('.product-card')?.dataset.productId;
        const title = btn.dataset.title || btn.closest('.product-card')?.querySelector('.product-title')?.textContent.trim() || 'Product';
        const card  = btn.closest('.product-card');
        const price = parseInt(btn.dataset.price || card?.dataset.price || card?.querySelector('.product-price')?.dataset.price, 10) || 0;

        const existing = cart.find(c => c.id === id);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ id, title, price, qty: 1 });
        }

        trackCustomerActivity('cart_add', { product_id: id, product_title: title, metadata: { price, quantity: existing ? existing.qty : 1, source: 'order_now' } });
        updateCartBadge();
        if (!userToken || !loggedUser) {
            pendingCheckoutAfterLogin = true;
            openAuthModal('login');
            return;
        }
        openCheckoutModal();
    });

    // Event delegation for Wishlist toggles on product cards
    document.addEventListener('click', e => {
        const btn = e.target.closest('.wishlist-btn');
        if (!btn || btn.closest('#wishlistSidebar')) return;

        const card = btn.closest('.product-card');
        const id = card?.dataset.productId || card?.querySelector('.btn-add-cart')?.dataset.id || `wishlist-${Math.random().toString(16).slice(2)}`;
        const title = card?.querySelector('.product-title')?.textContent.trim() || 'Product';
        const price = parsePriceValue(
            card?.dataset.price ||
            card?.querySelector('.product-price')?.dataset.price ||
            card?.querySelector('.btn-add-cart')?.dataset.price ||
            0
        );
        const image = card?.querySelector('.product-image')?.getAttribute('src') || getProductGalleryImages(id, '')[0] || 'images/manchatti.png';
        const isAdded = btn.classList.toggle('active');

        if (isAdded) {
            if (!wishlist.some(item => item.id === id)) wishlist.push({ id, title, price, image });
            trackCustomerActivity('wishlist_add', { product_id: id, product_title: title, metadata: { price } });
        } else {
            wishlist = wishlist.filter(item => item.id !== id);
            trackCustomerActivity('wishlist_remove', { product_id: id, product_title: title });
        }

        updateWishlistBadge();
        renderWishlistSidebar();
    });

    // Wishlist header button
    document.getElementById('wishlistHeaderBtn')?.addEventListener('click', () => {
        openWishlist();
    });

    // Cart header button → open cart sidebar
    document.getElementById('cartBtn')?.addEventListener('click', openCart);
}

/* ============ TOAST NOTIFICATION ============ */
function showToast(msg) {
    let toast = document.getElementById('aliveToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'aliveToast';
        toast.className = 'alive-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = document.getElementById(toggle.dataset.passwordTarget);
            if (!input) return;
            const isVisible = input.type === 'text';
            input.type = isVisible ? 'password' : 'text';
            toggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
            toggle.setAttribute('aria-pressed', String(!isVisible));
            toggle.textContent = isVisible ? '\u{1F441}' : '\u{1F648}';
        });
    });
}

/* ============ FULL-STACK AUTHENTICATION & USER ORDERS INTEGRATION ============ */
let userToken = localStorage.getItem('ananyan_token');
let loggedUser = null;
let pendingCheckoutAfterLogin = false;
try {
    loggedUser = JSON.parse(localStorage.getItem('ananyan_user'));
} catch (e) {
    loggedUser = null;
}

function initUserAuth() {
    const storedRole = loggedUser?.role;
    if (storedRole !== 'ADMIN') {
        localStorage.removeItem('ananyan_token');
        localStorage.removeItem('ananyan_user');
    }
    userToken = null;
    loggedUser = null;
    updateHeaderUserUI();

    // Event listeners for Auth Modal
    document.getElementById('loginBtn')?.addEventListener('click', e => {
        e.preventDefault();
        openAuthModal('login');
    });

    document.getElementById('authModalClose')?.addEventListener('click', closeAuthModal);
    document.getElementById('tabLoginBtn')?.addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('tabRegisterBtn')?.addEventListener('click', () => switchAuthTab('register'));
    document.getElementById('switchToRegister')?.addEventListener('click', e => { e.preventDefault(); switchAuthTab('register'); });
    document.getElementById('switchToLogin')?.addEventListener('click', e => { e.preventDefault(); switchAuthTab('login'); });
    document.getElementById('backToRegDetails')?.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('regStep1Form').style.display = 'block';
        document.getElementById('regStep2View').style.display = 'none';
    });

    // Form Submits
    document.getElementById('loginForm')?.addEventListener('submit', handleUserLogin);
    document.getElementById('regStep1Form')?.addEventListener('submit', handleRegisterRequest);
    document.getElementById('verifyEmailOtpForm')?.addEventListener('submit', handleRegisterVerify);
    document.getElementById('resendEmailOtpBtn')?.addEventListener('click', handleResendEmailOtp);

    // Logout
    document.getElementById('headerLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('ananyan_token');
        localStorage.removeItem('ananyan_user');
        userToken = null;
        loggedUser = null;
        updateHeaderUserUI();
        showToast('Logged out successfully.');
    });

    // Orders & Tracking Modal
    document.getElementById('trackOrderBtn')?.addEventListener('click', e => {
        e.preventDefault();
        openOrdersModal();
    });
    document.getElementById('mobileTrackOrderBtn')?.addEventListener('click', e => {
        e.preventDefault();
        openOrdersModal();
    });
    document.getElementById('myOrdersBtn')?.addEventListener('click', e => {
        e.preventDefault();
        openOrdersModal();
    });
    document.getElementById('mobileMyOrdersBtn')?.addEventListener('click', e => {
        e.preventDefault();
        openOrdersModal();
    });
    document.getElementById('userOrdersClose')?.addEventListener('click', closeOrdersModal);
    document.getElementById('trackLookupBtn')?.addEventListener('click', handleTrackLookup);
}

function updateHeaderUserUI() {
    const loginBtn = document.getElementById('loginBtn');
    const profileDiv = document.getElementById('userHeaderProfile');
    const userNameSpan = document.getElementById('headerUserName');
    const adminPortalBtn = document.getElementById('adminPortalBtn');

    if (userToken && loggedUser) {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (profileDiv) profileDiv.style.display = 'flex';
        if (userNameSpan) userNameSpan.textContent = `Hi, ${loggedUser.name.split(' ')[0]}`;
        if (adminPortalBtn) {
            adminPortalBtn.style.display = loggedUser.role === 'ADMIN' ? 'inline-block' : 'none';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (profileDiv) profileDiv.style.display = 'none';
    }
}

function openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        switchAuthTab(tab);
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function continuePendingCheckout() {
    if (!pendingCheckoutAfterLogin) return;
    pendingCheckoutAfterLogin = false;
    setTimeout(() => openCheckoutModal(), 0);
}

function prefillCheckoutFromLoggedUser() {
    if (!loggedUser) return;
    const values = {
        cf_name: loggedUser.name,
        cf_email: loggedUser.email,
        cf_phone: loggedUser.phone,
        cf_address: loggedUser.address
    };
    Object.entries(values).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field && value && !field.value.trim()) field.value = value;
    });
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabReg = document.getElementById('tabRegisterBtn');

    if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
    if (regForm) regForm.style.display = tab === 'register' ? 'block' : 'none';

    if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
    if (tabReg) tabReg.classList.toggle('active', tab === 'register');
}

// Step 1: Request Email OTP for Sign Up
async function handleRegisterRequest(e) {
    e.preventDefault();
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();
    const address = document.getElementById('regAddress')?.value.trim();

    if (!name || !email || !password) {
        alert('Please fill in all required fields.');
        return;
    }

    const reqBtn = document.getElementById('requestEmailOtpBtn');
    if (reqBtn) {
        reqBtn.disabled = true;
        reqBtn.textContent = 'Sending Email OTP...';
    }

    try {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/auth/register-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone, address })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('regStep1Form').style.display = 'none';
            document.getElementById('regStep2View').style.display = 'block';
            document.getElementById('verifyTargetEmail').textContent = email;

            const otpInput = document.getElementById('emailOtpInput');
            if (otpInput) {
                otpInput.value = '';
                setTimeout(() => otpInput.focus(), 200);
            }

            showToast(`Verification OTP code sent to ${email}`);
            startEmailOtpTimer();
        } else {
            alert(data.error || 'Failed to send verification OTP');
        }
    } catch (err) {
        alert('Network error. Please try again.');
    } finally {
        if (reqBtn) {
            reqBtn.disabled = false;
            reqBtn.textContent = 'Create Account & Send Email OTP';
        }
    }
}

// Step 2: Verify Email OTP & Finish Signup
async function handleRegisterVerify(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail')?.value.trim();
    const otp = document.getElementById('emailOtpInput')?.value.trim();

    if (!otp || otp.length < 6) {
        alert('Please enter the 6-digit OTP code sent to your email.');
        return;
    }

    const verifyBtn = document.getElementById('verifyEmailOtpBtn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying OTP...';
    }

    try {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/auth/register-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const data = await res.json();

        if (data.success) {
            userToken = data.token;
            loggedUser = data.user;
            localStorage.setItem('ananyan_token', userToken);
            localStorage.setItem('ananyan_user', JSON.stringify(loggedUser));
            updateHeaderUserUI();
            closeAuthModal();
            prefillCheckoutFromLoggedUser();
            continuePendingCheckout();
            showToast(`Email verified! Account created for ${loggedUser.name}.`);
        } else {
            alert(data.error || 'Invalid OTP code');
        }
    } catch (err) {
        alert('Verification error. Please try again.');
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify OTP & Complete Registration';
        }
    }
}

async function handleResendEmailOtp() {
    const email = document.getElementById('regEmail')?.value.trim();
    const resendBtn = document.getElementById('resendEmailOtpBtn');

    if (!email) return;

    if (resendBtn) {
        resendBtn.disabled = true;
    }

    try {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/auth/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.success) {
            showToast(`New verification OTP sent to ${email}`);
            startEmailOtpTimer();
        } else {
            alert(data.error || 'Resend failed');
        }
    } catch (err) {
        alert('Failed to resend OTP.');
    }
}

let emailOtpTimerInterval = null;

function startEmailOtpTimer() {
    let timeLeft = 45;
    const resendBtn = document.getElementById('resendEmailOtpBtn');
    const timerText = document.getElementById('emailOtpTimerText');

    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.style.opacity = '0.5';
    }

    clearInterval(emailOtpTimerInterval);
    emailOtpTimerInterval = setInterval(() => {
        timeLeft--;
        if (timerText) {
            timerText.innerHTML = `OTP sent to email • Resend in <strong>${timeLeft}s</strong>`;
        }
        if (timeLeft <= 0) {
            clearInterval(emailOtpTimerInterval);
            if (timerText) timerText.innerHTML = 'Didn\'t receive email? Check spam folder or resend OTP.';
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.style.opacity = '1';
            }
        }
    }, 1000);
}

function showSmsNotification(phone, code) {
    let banner = document.getElementById('smsPushBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'smsPushBanner';
        banner.className = 'sms-push-banner';
        document.body.appendChild(banner);
    }

    banner.innerHTML = `
        <div class="sms-push-header">
            <span>💬 MESSAGES • Just Now</span>
            <span>+91 ${phone}</span>
        </div>
        <div style="line-height:1.4;">
            Your Ananyamlives verification code is <span class="sms-push-code">${code || '582910'}</span>. Valid for 5 minutes. Do not share with anyone.
        </div>
    `;

    banner.classList.add('show');
    clearTimeout(banner._timer);
    banner._timer = setTimeout(() => {
        banner.classList.remove('show');
    }, 10000);
}

async function handleVerifyOtp() {
    const phone = document.getElementById('otpPhoneInput')?.value.trim();
    const otp = document.getElementById('otpCodeInput')?.value.trim();
    const name = document.getElementById('otpUserName')?.value.trim();

    if (!otp || otp.length < 6) {
        alert('Please enter the 6-digit OTP code sent to your phone');
        return;
    }

    const verifyBtn = document.getElementById('verifyOtpBtn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
    }

    try {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/auth/register-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp, name })
        });
        const data = await res.json();
        if (data.success) {
            if (data.user?.role === 'ADMIN') {
                alert('Please use the Admin Panel login for administrator access.');
                return;
            }
            userToken = data.token;
            loggedUser = data.user;
            localStorage.setItem('ananyan_token', userToken);
            localStorage.setItem('ananyan_user', JSON.stringify(loggedUser));
            updateHeaderUserUI();
            closeAuthModal();
            prefillCheckoutFromLoggedUser();
            continuePendingCheckout();
            showToast(`Phone number verified! Welcome, ${loggedUser.name}.`);
        } else {
            alert(data.error || 'OTP verification failed');
        }
    } catch (err) {
        alert('Verification error. Please try again.');
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify OTP & Login';
        }
    }
}

async function handleUserLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            userToken = data.token;
            loggedUser = data.user;
            localStorage.setItem('ananyan_token', userToken);
            localStorage.setItem('ananyan_user', JSON.stringify(loggedUser));
            updateHeaderUserUI();
            closeAuthModal();
            prefillCheckoutFromLoggedUser();
            continuePendingCheckout();
            showToast(`Welcome back, ${loggedUser.name}!`);
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (err) {
        alert('Login failed. Please check network connection.');
    }
}

async function handleUserRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;
    const address = document.getElementById('regAddress').value;

    try {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/auth/register-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone, address })
        });
        const data = await res.json();
        if (data.success) {
            userToken = data.token;
            loggedUser = data.user;
            localStorage.setItem('ananyan_token', userToken);
            localStorage.setItem('ananyan_user', JSON.stringify(loggedUser));
            updateHeaderUserUI();
            closeAuthModal();
            showToast(`Account registered successfully! Welcome, ${loggedUser.name}.`);
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (err) {
        alert('Registration error. Please try again.');
    }
}

// Orders & Tracking Modal Logic
async function openOrdersModal() {
    const modal = document.getElementById('userOrdersModal');
    if (modal) {
        modal.style.display = 'flex';
        await loadUserOrders();
    }
}

function closeOrdersModal() {
    const modal = document.getElementById('userOrdersModal');
    if (modal) modal.style.display = 'none';
}

async function loadUserOrders() {
    const listDiv = document.getElementById('userOrdersList');
    if (!listDiv) return;

    if (!userToken) {
        listDiv.innerHTML = `
            <div style="text-align:center; padding:1.5rem; color:#666;">
                <p>Please <a href="#" onclick="closeOrdersModal(); openAuthModal('login'); return false;" style="color:#8b4513; font-weight:700;">Login</a> to view your purchase history, or enter an Order ID above to track an order.</p>
            </div>
        `;
        return;
    }

    listDiv.innerHTML = '<p style="text-align:center;">Fetching your orders...</p>';

    try {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/orders/my-orders`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const data = await res.json();
        if (data.success && data.orders.length > 0) {
            listDiv.innerHTML = data.orders.map(o => renderOrderCard(o)).join('');
        } else {
            listDiv.innerHTML = '<p style="text-align:center; color:#666; padding:1.5rem;">No orders placed yet.</p>';
        }
    } catch (err) {
        listDiv.innerHTML = '<p style="color:#e53e3e; text-align:center;">Failed to load orders.</p>';
    }
}

async function handleTrackLookup() {
    const idInput = document.getElementById('trackInputId');
    const listDiv = document.getElementById('userOrdersList');
    const orderId = idInput?.value.trim();

    if (!orderId) {
        alert('Please enter an Order ID');
        return;
    }

    listDiv.innerHTML = `<p style="text-align:center;">Searching for order #${orderId}...</p>`;

    try {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/orders/track/${orderId}`);
        const data = await res.json();
        if (data.success && data.order) {
            listDiv.innerHTML = renderOrderCard(data.order);
        } else {
            listDiv.innerHTML = `<p style="color:#e53e3e; text-align:center; padding:1.5rem;">Order #${orderId} not found. Check Order ID and try again.</p>`;
        }
    } catch (err) {
        listDiv.innerHTML = '<p style="color:#e53e3e; text-align:center;">Failed to track order.</p>';
    }
}

function renderOrderCard(o) {
    const itemsArr = Array.isArray(o.items) ? o.items : (typeof o.items === 'string' ? JSON.parse(o.items) : []);
    
    // Status Timeline Step Progress
    const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentIndex = statuses.indexOf(o.status);

    return `
        <div style="background:#fdfbf7; border:1px solid #e2d9cc; border-radius:12px; padding:1.25rem; margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                <div>
                    <strong style="color:#3b1c09; font-size:1.05rem;">Order #${o.id}</strong>
                    <div style="font-size:0.8rem; color:#777;">${o.date || new Date(o.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <span class="status-badge ${o.status}" style="padding:0.35rem 0.75rem; border-radius:20px; font-weight:700; font-size:0.8rem; background:${getStatusBg(o.status)}; color:${getStatusColor(o.status)};">
                    ${o.status}
                </span>
            </div>

            <!-- Status Step Bar -->
            <div style="display:flex; justify-content:space-between; margin:1rem 0; position:relative;">
                ${statuses.map((st, idx) => `
                    <div style="text-align:center; flex:1; position:relative; z-index:1;">
                        <div style="width:24px; height:24px; border-radius:50%; background:${idx <= currentIndex ? '#8b4513' : '#ddd'}; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">
                            ${idx <= currentIndex ? '✓' : (idx + 1)}
                        </div>
                        <div style="font-size:0.75rem; margin-top:0.25rem; font-weight:${idx === currentIndex ? '700' : '400'}; color:${idx <= currentIndex ? '#3b1c09' : '#999'};">${st}</div>
                    </div>
                `).join('')}
            </div>

            <div style="font-size:0.85rem; color:#444; margin-bottom:0.5rem;">
                <strong>Tracking Number:</strong> ${o.tracking_number || 'TRK-ASSIGNING'}
            </div>
            
            <div style="font-size:0.85rem; color:#444;">
                <strong>Items:</strong> ${itemsArr.map(i => `${i.title || i.name} × ${i.qty || i.quantity}`).join(', ')}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.85rem; padding-top:0.75rem; border-top:1px dashed #e2d9cc;">
                <span style="font-size:0.85rem; color:#666;">Payment: WhatsApp Order</span>
                <strong style="color:#8b4513; font-size:1.1rem;">Total: ₹${o.total}</strong>
            </div>
        </div>
    `;
}

function getStatusBg(st) {
    switch (st) {
        case 'Pending': return '#fef3c7';
        case 'Processing': return '#dbeafe';
        case 'Shipped': return '#f3e8ff';
        case 'Delivered': return '#d1fae5';
        case 'Cancelled': return '#fee2e2';
        default: return '#eee';
    }
}

function getStatusColor(st) {
    switch (st) {
        case 'Pending': return '#b45309';
        case 'Processing': return '#1d4ed8';
        case 'Shipped': return '#6b21a8';
        case 'Delivered': return '#047857';
        case 'Cancelled': return '#b91c1c';
        default: return '#333';
    }
}

function initFormsAndAlerts() {
    initPasswordToggles();
    initUserAuth();

    const newsletterForm  = document.getElementById('newsletterForm');
    const newsletterEmail = document.getElementById('newsletterEmail');
    newsletterForm?.addEventListener('submit', e => {
        e.preventDefault();
        const val = newsletterEmail?.value.trim();
        if (!val) return;
        showToast(`Subscribed! Updates will be sent to: ${val}`);
        newsletterForm.reset();
    });

    document.querySelectorAll('.collection-link').forEach(link => {
        link.addEventListener('click', () => {
            const filter = link.dataset.targetFilter;
            if (!filter) return;
            document.querySelectorAll('.product-card').forEach(card => {
                if (card.dataset.category === filter) {
                    card.style.borderColor = 'var(--accent)';
                    card.style.borderWidth = '2px';
                    setTimeout(() => {
                        card.style.borderColor = '';
                        card.style.borderWidth = '';
                    }, 2500);
                }
            });
        });
    });
}

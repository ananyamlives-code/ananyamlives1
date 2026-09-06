/**
 * Ananyamlives Admin Control Panel JavaScript
 */

const API_BASE = (window.API_BASE_URL || (window.location.protocol === 'file:' ? 'http://localhost:3000' : '')) + '/api';
let authToken = null;
let currentUser = null;
let analyticsBlocks = [];

const DEFAULT_PRODUCT_GALLERY_IMAGES = {
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
const ADMIN_PRIVATE_GALLERY_IMAGE_PREFIX = '__PRIVATE_IMAGE__:';

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', () => {
    localStorage.removeItem('ananyan_token');
    localStorage.removeItem('ananyan_user');
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    initAdminPasswordToggle();
    initProductImagePreviews();
    checkAdminAuth();
    initTabNavigation();
    initEventListeners();
});

function initAdminPasswordToggle() {
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

function initProductImagePreviews() {
    [['prodImageFile', 'prodImagePreview'], ['prodImage2File', 'prodImage2Preview'], ['prodImage3File', 'prodImage3Preview']].forEach(([inputId, previewId]) => {
        document.getElementById(inputId)?.addEventListener('change', event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.src = URL.createObjectURL(file);
                preview.style.display = 'block';
            }
        });
    });
}

function setProductImagePreview(previewId, imageUrl) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    preview.src = imageUrl || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    preview.classList.toggle('is-empty', !imageUrl);
    preview.style.display = 'block';
}

function getStorefrontProductDescription(product) {
    const productNumber = String(product.id || '').match(/^prod-(\d+)$/)?.[1];
    const storefrontId = product.storefrontId || (productNumber ? `p${productNumber}` : product.id);
    return window.ANANYAM_PRODUCT_DESCRIPTIONS?.[storefrontId] || product.description || '';
}

const DEFAULT_PRODUCT_CARE = 'Allow the clay product to cool completely before washing.\nWash gently with warm water and a soft sponge.\nFor food stains or stubborn marks, use a small amount of any natural dish wash with water then scrub lightly.\nAvoid harsh detergents, bleach, steel wool and abrasive scrubbers, as they may damage the natural clay surface.\nDo not use sudden temperature changes. Avoid pouring cold water onto a hot clay item.\nAfter washing, dry the item completely in a well-ventilated place before storing.\nDo not store the clay item while it is still damp.';

function getEditorGalleryImages(product) {
    const productNumber = String(product.id || '').match(/^prod-(\d+)$/)?.[1];
    const storefrontId = product.storefrontId || (productNumber ? `p${productNumber}` : product.id);
    const fallback = DEFAULT_PRODUCT_GALLERY_IMAGES[storefrontId] || [];
    const normalize = values => {
        const images = (Array.isArray(values) ? values : []).filter(Boolean).map(String);
        return images.map(image => image.startsWith(ADMIN_PRIVATE_GALLERY_IMAGE_PREFIX) ? image.slice(ADMIN_PRIVATE_GALLERY_IMAGE_PREFIX.length) : image);
    };
    if (Array.isArray(product.gallery_images)) {
        const images = normalize(product.gallery_images);
        return images.length > 1 ? images : (images.length ? [images[0], fallback[1]].filter(Boolean) : fallback);
    }
    if (typeof product.gallery_images === 'string') {
        try {
            const images = normalize(JSON.parse(product.gallery_images));
            return images.length > 1 ? images : (images.length ? [images[0], fallback[1]].filter(Boolean) : fallback);
        } catch (error) {
            const images = normalize(product.gallery_images.split(',').map(image => image.trim()));
            return images.length > 1 ? images : (images.length ? [images[0], fallback[1]].filter(Boolean) : fallback);
        }
    }
    return fallback;
}

function isPrivateGalleryImage(product, index) {
    if (index !== 1 && index !== 2) return false;
    const values = Array.isArray(product.gallery_images) ? product.gallery_images : (() => {
        try { return JSON.parse(product.gallery_images || '[]'); } catch (error) { return String(product.gallery_images || '').split(','); }
    })();
    return String(values[2] || '').startsWith(ADMIN_PRIVATE_GALLERY_IMAGE_PREFIX);
}

// Authenticate Admin
async function checkAdminAuth() {
    if (!authToken) {
        showAdminLoginGate();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (!data.success || data.user.role !== 'ADMIN') {
            showAdminLoginGate('Access denied. Please use an ADMIN account.');
            return;
        }

        currentUser = data.user;
        document.body.classList.remove('admin-auth-pending');
        document.getElementById('adminUserName').textContent = currentUser.name;
        document.getElementById('adminUserEmail').textContent = currentUser.email;
        document.getElementById('userInitial').textContent = currentUser.name.charAt(0).toUpperCase();

        // Load Initial Tab Data
        loadDashboardStats();
        loadOrders();
        loadProducts();
        loadUsers();
        loadSiteContent();
        loadAnalytics();
        checkSystemHealth();
    } catch (e) {
        console.error('Auth verification error:', e);
        localStorage.removeItem('ananyan_token');
        localStorage.removeItem('ananyan_user');
        authToken = null;
        showAdminLoginGate('Your login session expired. Please sign in again.');
    }
}

function showAdminLoginGate(message = '') {
    document.body.classList.add('admin-auth-pending');
    const gate = document.getElementById('adminLoginGate');
    gate.hidden = false;
    document.getElementById('adminLoginError').textContent = message;
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const error = document.getElementById('adminLoginError');
    error.textContent = '';

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('adminLoginEmail').value.trim(),
                password: document.getElementById('adminLoginPassword').value
            })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Login failed');
        if (data.user.role !== 'ADMIN') throw new Error('This account is not an administrator.');

        authToken = data.token;
        localStorage.setItem('ananyan_token', authToken);
        localStorage.setItem('ananyan_user', JSON.stringify(data.user));
        document.getElementById('adminLoginGate').hidden = true;
        document.body.classList.remove('admin-auth-pending');
        checkAdminAuth();
    } catch (loginError) {
        error.textContent = loginError.message;
    }
}

// Navigation Tabs
function initTabNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchToTab(tabName);
        });
    });
}

function switchToTab(tabName) {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.panel-section').forEach(el => el.classList.remove('active'));

    const activeNav = document.querySelector(`.sidebar-nav .nav-item[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`tab-${tabName}`);

    if (activeNav) activeNav.classList.add('active');
    if (activePanel) activePanel.classList.add('active');

    // Update Titles
    const titles = {
        dashboard: { main: 'Dashboard Overview', sub: 'Live monitor of store performance, sales, orders and inventory.' },
        orders: { main: 'Order Control & Fulfillment', sub: 'Manage customer orders, update delivery status, and assign tracking numbers.' },
        analytics: { main: 'Customer Activity Analytics', sub: 'Understand page visits, product interest, wishlist usage, cart actions and customer journeys.' },
        products: { main: 'Product Catalog & Inventory', sub: 'Create, update, and manage clay cookware products.' },
        users: { main: 'User Accounts & Roles', sub: 'View registered customers and manage administrator privileges.' },
        content: { main: 'Website Content Editor', sub: 'Edit homepage, contact details, story, care guide and blog content.' },
        settings: { main: 'System Health & Integrations', sub: 'Monitor PostgreSQL database connection, local fallback, and Google Drive backups.' }
    };

    if (titles[tabName]) {
        document.getElementById('currentTabTitle').textContent = titles[tabName].main;
        document.getElementById('currentTabSub').textContent = titles[tabName].sub;
    }
}

async function loadSiteContent() {
    try {
        const res = await fetch(`${API_BASE}/site-content`);
        const data = await res.json();
        if (!data.success) {
            fillSiteContentForm(await getCurrentPageContent());
            return;
        }
        fillSiteContentForm(data.content);
    } catch (error) {
        // Older running server versions do not have the content API yet.
        fillSiteContentForm(await getCurrentPageContent());
        console.error('Failed to load site content:', error);
    }
}

function fillSiteContentForm(content) {
        applyAdminPalette(content);
        document.querySelectorAll('[data-content-key]').forEach(field => {
            field.value = content[field.dataset.contentKey] || '';
        });
        renderBlogArticles(content.blogArticles || []);
}

function renderBlogArticles(articles) {
    const editor = document.getElementById('blogArticlesEditor');
    if (!editor) return;
    editor.innerHTML = articles.map((article, index) => `
        <div class="blog-article-editor" data-article-index="${index}">
            <div class="blog-article-editor-header"><strong>Article ${index + 1}</strong><button type="button" class="btn-danger btn-sm" onclick="removeBlogArticle(${index})">Remove</button></div>
            <label>Category<input class="form-control blog-article-category" value="${escapeEditorValue(article.category)}"></label>
            <label>Title<input class="form-control blog-article-title" value="${escapeEditorValue(article.title)}"></label>
            <label>Text<textarea class="form-control blog-article-body" rows="3">${escapeEditorValue(article.body)}</textarea></label>
            <label>Image URL<input class="form-control blog-article-image" value="${escapeEditorValue(article.image)}"></label>
        </div>
    `).join('');
}

function escapeEditorValue(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addBlogArticle() {
    const articles = readBlogArticles();
    articles.push({ category: 'New Category', title: 'New Article', body: 'Write your article content here.', image: 'images/manchatti.png' });
    renderBlogArticles(articles);
}

function removeBlogArticle(index) {
    const articles = readBlogArticles();
    if (articles.length <= 1) return alert('At least one blog article is required.');
    articles.splice(index, 1);
    renderBlogArticles(articles);
}

function readBlogArticles() {
    return Array.from(document.querySelectorAll('.blog-article-editor')).map(editor => ({
        category: editor.querySelector('.blog-article-category').value.trim(),
        title: editor.querySelector('.blog-article-title').value.trim(),
        body: editor.querySelector('.blog-article-body').value.trim(),
        image: editor.querySelector('.blog-article-image').value.trim()
    }));
}

function applyAdminPalette(content) {
    const palette = {
        '--primary-brand': content.paletteAccent,
        '--primary-accent': content.paletteTerracotta,
        '--bg-primary': content.paletteText,
        '--bg-secondary': content.palettePrimary,
        '--text-main': content.paletteBackground,
        '--text-muted': content.paletteCard
    };
    Object.entries(palette).forEach(([variable, value]) => {
        if (value) document.documentElement.style.setProperty(variable, value);
    });
}

async function getCurrentPageContent() {
    const [indexResponse, blogResponse] = await Promise.all([fetch('../index.html'), fetch('../blog.html')]);
    const indexDocument = new DOMParser().parseFromString(await indexResponse.text(), 'text/html');
    const blogDocument = new DOMParser().parseFromString(await blogResponse.text(), 'text/html');
    const text = (selector, documentNode) => documentNode.querySelector(selector)?.textContent.trim() || '';
    const content = {
        announcementLeft: text('.announcement-left span', indexDocument),
        announcementMiddle: text('.announcement-middle span', indexDocument),
        brandSubtitle: text('.logo-sub', indexDocument),
        phone: text('.header-phone-link', indexDocument),
        email: text('.contact-info-item:nth-child(2) a', indexDocument),
        address: text('.contact-info-item:nth-child(3) span', indexDocument),
        heroTitle: text('.hero-subtitle-tamil', indexDocument),
        heroDescription: text('.hero-desc', indexDocument),
        heroCta: text('#heroCta span', indexDocument),
        heroImage: 'images/hero_bg.jpeg',
        palettePrimary: '#3A1A09', paletteSecondary: '#623515', paletteTerracotta: '#8E4A20', paletteAccent: '#AF6B39',
        paletteBackground: '#F6ECDC', paletteCard: '#F1DFC7', paletteText: '#1A0B03', paletteNatural: '#6B7A43',
        collectionTitle: text('#collection .section-title', indexDocument),
        collectionSubtitle: text('#collection .section-subtitle', indexDocument),
        storyKicker: text('#story .info-section-kicker', indexDocument),
        storyTitle: text('#storyTitle', indexDocument),
        storyIntro: text('.story-intro', indexDocument),
        storyClosing: text('.story-closing', indexDocument),
        storyClosingSubtext: text('.story-closing-subtext', indexDocument),
        careKicker: text('#values .info-section-kicker', indexDocument),
        careTitle: text('#careGuideTitle', indexDocument),
        careBody: text('#values .info-section-content > p:last-child', indexDocument),
        footerAbout: text('.footer-about-text', indexDocument),
        blogKicker: text('.blog-kicker', blogDocument),
        blogTitle: text('.blog-hero h1', blogDocument),
        blogIntro: text('.blog-hero p', blogDocument)
    };
    indexDocument.querySelectorAll('.story-card').forEach((card, index) => {
        const number = index + 1;
        content[`storyCard${number}Title`] = card.querySelector('h3')?.textContent.trim() || '';
        content[`storyCard${number}Body`] = card.querySelector('p')?.textContent.trim() || '';
    });
    blogDocument.querySelectorAll('.blog-card').forEach((card, index) => {
        const number = index + 1;
        content[`blog${number}Category`] = card.querySelector('.blog-meta')?.textContent.trim() || '';
        content[`blog${number}Title`] = card.querySelector('h3')?.textContent.trim() || '';
        content[`blog${number}Body`] = card.querySelector('p')?.textContent.trim() || '';
        content[`blog${number}Image`] = card.querySelector('img')?.getAttribute('src') || '';
    });
    content.blogArticles = Array.from(blogDocument.querySelectorAll('.blog-card')).map(card => ({
        category: card.querySelector('.blog-meta')?.textContent.trim() || '',
        title: card.querySelector('h3')?.textContent.trim() || '',
        body: card.querySelector('p')?.textContent.trim() || '',
        image: card.querySelector('img')?.getAttribute('src') || ''
    }));
    return content;
}

async function saveSiteContent() {
    const updates = {};
    document.querySelectorAll('[data-content-key]').forEach(field => {
        updates[field.dataset.contentKey] = field.value.trim();
    });
    updates.blogArticles = readBlogArticles();
    const heroFile = document.getElementById('heroImageFile')?.files?.[0];
    try {
        if (heroFile) updates.heroImage = await uploadAdminImage(heroFile);
        const res = await fetch(`${API_BASE}/site-content`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Could not save content');
        alert('Website content saved successfully. Refresh the storefront to view changes.');
    } catch (error) {
        alert(error.message);
    }
}

async function uploadAdminImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Image upload failed');
    return data.url;
}

// Event Listeners
function initEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('ananyan_token');
        localStorage.removeItem('ananyan_user');
        window.location.href = 'index.html';
    });

    document.getElementById('orderSearch').addEventListener('input', (e) => {
        filterOrdersTable(e.target.value);
    });
    ['orderDateFrom', 'orderDateTo'].forEach(id => document.getElementById(id)?.addEventListener('change', () => filterOrdersTable(document.getElementById('orderSearch').value)));
    ['dashboardDateFrom', 'dashboardDateTo'].forEach(id => document.getElementById(id)?.addEventListener('change', loadDashboardStats));
    document.getElementById('clearDashboardDates')?.addEventListener('click', () => {
        document.getElementById('dashboardDateFrom').value = '';
        document.getElementById('dashboardDateTo').value = '';
        loadDashboardStats();
    });

    document.getElementById('orderEditForm').addEventListener('submit', handleOrderEditSubmit);
    document.getElementById('productForm').addEventListener('submit', handleSaveProduct);
}

// 1. DASHBOARD DATA & STATS
async function loadDashboardStats() {
    try {
        const params = new URLSearchParams();
        const from = document.getElementById('dashboardDateFrom')?.value;
        const to = document.getElementById('dashboardDateTo')?.value;
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const res = await fetch(`${API_BASE}/admin/stats${params.toString() ? `?${params}` : ''}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.status === 401 || res.status === 403) {
            showAdminLoginGate('Admin session expired. Please login again.');
            return;
        }
        if (!data.success) throw new Error(data.error || 'Failed to fetch dashboard stats');
        if (data.success) {
            const { stats } = data;
            document.getElementById('statRevenue').textContent = `₹${Number(stats.totalRevenue).toLocaleString('en-IN')}`;
            document.getElementById('statOrders').textContent = stats.totalOrders;
            document.getElementById('statPending').textContent = stats.pendingOrders;
            document.getElementById('statProducts').textContent = stats.totalProducts;
        }
    } catch (e) {
        console.error('Failed to load stats:', e);
        document.getElementById('statRevenue').textContent = 'Unavailable';
        document.getElementById('statOrders').textContent = 'Unavailable';
        document.getElementById('statPending').textContent = 'Unavailable';
        document.getElementById('statProducts').textContent = 'Unavailable';
    }
}

// 2. ORDERS MANAGEMENT
let globalOrders = [];
let currentOrderDetailsId = null;

const ORDER_STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE}/admin/orders`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.status === 401 || res.status === 403) {
            showAdminLoginGate('Admin session expired. Please login again.');
            return;
        }
        if (!data.success) throw new Error(data.error || 'Failed to fetch orders');
        if (data.success) {
            globalOrders = data.orders;
            renderRecentOrders(globalOrders.slice(0, 5));
            renderAllOrdersTable(globalOrders);
        }
    } catch (e) {
        console.error('Failed to load orders:', e);
        const message = `<tr><td colspan="7" style="text-align:center;">${escapeHtml(e.message || 'Orders unavailable')}</td></tr>`;
        document.getElementById('recentOrdersBody').innerHTML = message;
        document.getElementById('allOrdersBody').innerHTML = `<tr><td colspan="9" style="text-align:center;">${escapeHtml(e.message || 'Orders unavailable')}</td></tr>`;
    }
}

async function loadAnalytics() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE}/admin/analytics?limit=200`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Could not load analytics');
        analyticsBlocks = data.blocks || [];
        renderAnalytics(data.analytics || {});
    } catch (error) {
        console.error('Failed to load analytics:', error);
        ['analyticsProductsBody', 'analyticsCustomersBody'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.innerHTML = `<tr><td colspan="13">Analytics unavailable</td></tr>`;
        });
    }
}

function renderAnalytics(analytics) {
    const summary = analytics.summary || {};
    document.getElementById('analyticsTotalEvents').textContent = Number(summary.total_events || 0).toLocaleString('en-IN');
    document.getElementById('analyticsPageViews').textContent = Number(summary.page_views || 0).toLocaleString('en-IN');
    document.getElementById('analyticsUniqueVisitors').textContent = Number(summary.unique_visitors || 0).toLocaleString('en-IN');
    document.getElementById('analyticsCustomers').textContent = Number(summary.identified_customers || 0).toLocaleString('en-IN');

    const products = analytics.products || [];
    document.getElementById('analyticsProductsBody').innerHTML = products.length ? products.map(product => `
        <tr><td><strong>${escapeHtml(product.product_title || product.product_id)}</strong><div class="analytics-muted">${escapeHtml(product.product_id)}</div></td>
        <td>${Number(product.views || 0).toLocaleString('en-IN')}</td><td>${Number(product.wishlist_actions || 0).toLocaleString('en-IN')}</td><td>${Number(product.cart_actions || 0).toLocaleString('en-IN')}</td><td><strong>${Number(product.order_count || 0).toLocaleString('en-IN')}</strong></td></tr>
    `).join('') : '<tr><td colspan="5">No product activity recorded yet.</td></tr>';

    const customers = analytics.customers || [];
    document.getElementById('analyticsCustomersBody').innerHTML = customers.length ? customers.map(customer => `
        <tr><td><strong>${escapeHtml(customer.customer_name || 'Guest')}</strong><div class="analytics-muted">${escapeHtml(customer.customer_email || 'Guest visitor')}</div><div class="customer-row-actions">${renderCustomerBlockControls(customer)}<button class="btn-danger btn-sm" onclick="deleteCustomerPermanently('${escapeHtml(customer.customer_identifier || customer.customer_email)}', '${escapeHtml(customer.ip_address || '')}')">Delete Permanently</button></div></td>
        <td>${customer.total_events || 0}</td><td>${customer.page_views || 0}</td><td>${customer.product_views || 0}</td><td>${customer.wishlist_adds || 0}</td><td>${customer.cart_actions || 0}</td><td>${customer.place_orders || 0}</td><td>${escapeHtml(formatIpAddress(customer.ip_address))}</td><td>${escapeHtml(customer.browser || '-')}</td><td>${escapeHtml(customer.device_type || '-')}</td><td>${escapeHtml(customer.traffic_source || '-')}</td><td>${formatAnalyticsDate(customer.last_seen)}</td><td><button class="btn-primary btn-sm" onclick="viewCustomerActivity('${escapeHtml(customer.customer_identifier || customer.customer_email)}')">View History</button></td></tr>
    `).join('') : '<tr><td colspan="13">No customer activity recorded yet.</td></tr>';
    renderAnalyticsBlocks();
}

function renderAnalyticsBlocks() {
    const body = document.getElementById('analyticsBlocksBody');
    if (!body) return;
    body.innerHTML = analyticsBlocks.length ? analyticsBlocks.map(block => `
        <tr><td><span class="analytics-event">${escapeHtml(block.block_type === 'ip' ? 'IP Address' : block.block_type === 'email' ? 'User Email' : 'Visitor ID')}</span></td><td>${escapeHtml(block.block_value)}</td><td>${formatAnalyticsDate(block.created_at)}</td><td><button class="btn-secondary btn-sm" onclick="toggleAnalyticsBlock('${escapeHtml(block.block_type)}', '${escapeHtml(block.block_value)}', false)">Unblock</button></td></tr>
    `).join('') : '<tr><td colspan="4">No blocked users or IP addresses.</td></tr>';
}

function formatAnalyticsDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-IN');
}

function renderCustomerBlockControls(customer) {
    const identifier = customer.customer_identifier || customer.customer_email;
    const type = String(identifier || '').includes('@') ? 'email' : 'visitor';
    const userBlocked = analyticsBlocks.some(block => block.block_type === type && String(block.block_value).toLowerCase() === String(identifier).toLowerCase());
    const ipBlocked = customer.ip_address && analyticsBlocks.some(block => block.block_type === 'ip' && block.block_value === customer.ip_address);
    const userAction = userBlocked
        ? `<button class="btn-secondary btn-sm" onclick="toggleAnalyticsBlock('${type}', '${escapeHtml(identifier)}', false)">Unblock User</button>`
        : `<button class="btn-warning btn-sm" onclick="toggleAnalyticsBlock('${type}', '${escapeHtml(identifier)}', true)">Block User</button>`;
    const ipAction = customer.ip_address ? (ipBlocked
        ? `<button class="btn-secondary btn-sm" onclick="toggleAnalyticsBlock('ip', '${escapeHtml(customer.ip_address)}', false)">Unblock IP</button>`
        : `<button class="btn-warning btn-sm" onclick="toggleAnalyticsBlock('ip', '${escapeHtml(customer.ip_address)}', true)">Block IP</button>`) : '';
    return userAction + ipAction;
}

async function toggleAnalyticsBlock(blockType, blockValue, shouldBlock) {
    if (!blockValue) return;
    const action = shouldBlock ? 'block' : 'unblock';
    if (!window.confirm(`${shouldBlock ? 'Block' : 'Unblock'} this ${blockType}?`)) return;
    try {
        const response = await fetch(`${API_BASE}/admin/analytics/block${shouldBlock ? '' : `?blockType=${encodeURIComponent(blockType)}&blockValue=${encodeURIComponent(blockValue)}`}`, {
            method: shouldBlock ? 'POST' : 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            ...(shouldBlock ? { body: JSON.stringify({ blockType, blockValue }) } : {})
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || `Could not ${action} activity`);
        await loadAnalytics();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteCustomerPermanently(identifier, ipAddress) {
    if (!window.confirm('Permanently block and remove this customer? The account and activity history will be deleted, and future access will be blocked. Orders will be retained.')) return;
    try {
        const query = new URLSearchParams({ identifier: identifier || '', ipAddress: ipAddress || '' });
        const response = await fetch(`${API_BASE}/admin/analytics/customer?${query}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Could not delete history');
        await loadAnalytics();
    } catch (error) {
        alert(error.message);
    }
}

async function viewCustomerActivity(identifier) {
    const modal = document.getElementById('customerActivityModal');
    const body = document.getElementById('customerActivityHistoryBody');
    if (!modal || !body || !identifier) return;
    modal.classList.add('active');
    body.innerHTML = '<tr><td colspan="5">Loading history...</td></tr>';
    try {
        const response = await fetch(`${API_BASE}/admin/analytics/customer?identifier=${encodeURIComponent(identifier)}&limit=2000`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Could not load history');
        document.getElementById('customerActivityModalTitle').textContent = `Activity History: ${identifier.includes('@') ? identifier : 'Guest Visitor'}`;
        body.innerHTML = data.history.length ? data.history.map(event => `
            <tr><td>${formatAnalyticsDate(event.created_at)}</td><td><span class="analytics-event">${escapeHtml(formatActivityName(event.event_type))}</span></td><td>${escapeHtml(formatPageName(event.page_path))}</td><td>${escapeHtml(event.product_title || '-')}</td><td>${escapeHtml(formatIpAddress(event.ip_address))}</td><td>${escapeHtml(event.browser || '-')}</td><td>${escapeHtml(event.device_type || '-')}</td><td>${escapeHtml(event.traffic_source || '-')}</td><td><div class="activity-details">${formatActivityDetails(event)}</div></td></tr>
        `).join('') : '<tr><td colspan="9">No activity history found.</td></tr>';
    } catch (error) {
        body.innerHTML = `<tr><td colspan="9">${escapeHtml(error.message)}</td></tr>`;
    }
}

function closeCustomerActivityModal() {
    document.getElementById('customerActivityModal')?.classList.remove('active');
}

function formatActivityName(eventType) {
    return String(eventType || 'activity').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatIpAddress(value) {
    if (!value) return '-';
    return value === '::1' ? '127.0.0.1 (Localhost)' : value;
}

function formatPageName(pagePath) {
    if (!pagePath) return 'Unknown page';
    if (pagePath === '/' || pagePath.endsWith('/index.html')) return 'Home page';
    return pagePath.replace(/^\//, '').replace(/[-_]/g, ' ').replace(/\.html$/i, '').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatActivityDetails(event) {
    const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata : {};
    const details = [];
    if (event.event_type === 'page_view') details.push(metadata.referrer ? `From: ${metadata.referrer}` : 'Direct visit');
    if (event.event_type === 'section_view') details.push(`Section: ${metadata.section_id || 'Unknown'}`);
    if (event.event_type === 'product_view') details.push(metadata.source === 'quick_view' ? 'Opened product quick view' : 'Viewed product');
    if (event.event_type === 'wishlist_add') details.push('Added to wishlist');
    if (event.event_type === 'wishlist_remove') details.push('Removed from wishlist');
    if (event.event_type === 'cart_add') details.push(`Added to cart${metadata.quantity ? ` (Qty: ${metadata.quantity})` : ''}`);
    if (event.event_type === 'cart_remove') details.push('Removed from cart');
    if (event.event_type === 'cart_update') details.push(`${metadata.action === 'inc' ? 'Increased' : 'Decreased'} cart quantity${metadata.quantity ? ` to ${metadata.quantity}` : ''}`);
    if (event.event_type === 'search') details.push(`Search: ${metadata.query || 'Unknown'}`);
    if (event.event_type === 'checkout_start') details.push(`Checkout started${metadata.cart_items ? ` with ${metadata.cart_items} item(s)` : ''}${metadata.cart_total ? `, total: ₹${Number(metadata.cart_total).toLocaleString('en-IN')}` : ''}`);
    if (event.event_type === 'order_success') details.push(`Order: #${metadata.order_id || 'Unknown'}${metadata.total ? `, total: ₹${Number(metadata.total).toLocaleString('en-IN')}` : ''}`);
    if (!details.length) details.push('Activity recorded');
    return details.map(detail => `<span>${escapeHtml(detail)}</span>`).join('');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('en-IN');
}

function parseOrderItems(items) {
    if (Array.isArray(items)) {
        return items.map(item => ({
            title: item.title || item.name || '',
            qty: Number(item.qty ?? item.quantity ?? 1) || 0,
            price: Number(item.price || 0) || 0
        })).filter(item => item.title || item.qty || item.price);
    }

    if (typeof items === 'string' && items.trim()) {
        try {
            const parsed = JSON.parse(items);
            return parseOrderItems(parsed);
        } catch (error) {
            return [{ title: items.trim(), qty: 1, price: 0 }];
        }
    }

    return [];
}

function formatOrderItemsText(items) {
    const list = parseOrderItems(items);
    if (!list.length) return 'No items';
    return list.map(item => `${escapeHtml(item.title)} x ${item.qty}`).join(', ');
}

function renderOrderModal(order, isEditMode = false) {
    currentOrderDetailsId = order.id;
    document.getElementById('orderModalTitle').textContent = isEditMode ? 'Edit Order' : 'Order Details';
    document.getElementById('editOrderBtn').hidden = isEditMode;
    document.getElementById('orderDetailsContent').hidden = isEditMode;
    document.getElementById('orderEditForm').hidden = !isEditMode;

    if (isEditMode) {
        populateOrderEditForm(order);
        return;
    }

    const itemsArr = parseOrderItems(order.items);
    const content = `
        <div class="order-detail-section">
            <h3>Order Summary</h3>
            <div class="order-item-summary">
                <p><strong>Order ID:</strong> #${escapeHtml(order.id)}</p>
                <p><strong>Date:</strong> ${escapeHtml(order.date || new Date(order.created_at).toLocaleString('en-IN'))}</p>
                <p><strong>Status:</strong> <span class="status-badge ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></p>
                <p><strong>Tracking Number:</strong> ${escapeHtml(order.tracking_number || 'N/A')}</p>
                <p><strong>Payment Method:</strong> Online</p>
                <p><strong>Special Note:</strong> ${escapeHtml(order.special_note || 'N/A')}</p>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem;">
                    <a class="btn-primary btn-sm" href="${API_BASE}/orders/${encodeURIComponent(order.id)}/pdf" target="_blank" rel="noopener">Download Invoice</a>
                    <button class="btn-primary btn-sm" type="button" onclick="emailOrderInvoice('${escapeHtml(order.id)}')">Send Invoice Email</button>
                </div>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>Customer Details</h3>
            <div class="order-item-summary">
                <p><strong>Customer:</strong> ${escapeHtml(order.customer_name || order.name)}</p>
                <p><strong>Email:</strong> ${escapeHtml(order.email)}</p>
                <p><strong>Phone:</strong> ${escapeHtml(order.phone)}</p>
                <p><strong>Shipping Address:</strong> ${escapeHtml(order.address)}, ${escapeHtml(order.city)}, ${escapeHtml(order.state)} - ${escapeHtml(order.pincode)}</p>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>Ordered Items</h3>
            <ul style="padding-left:1.2rem; line-height:1.8;">
                ${itemsArr.map(item => `<li>${escapeHtml(item.title || item.name)} x ${Number(item.qty || item.quantity || 0)} (&#8377;${formatCurrency(item.price)})</li>`).join('')}
            </ul>
            <p style="font-size:1.1rem; font-weight:700; margin-top:0.75rem; color:var(--primary-brand);">Total Amount: &#8377;${formatCurrency(order.total)}</p>
        </div>
    `;

    document.getElementById('orderDetailsContent').innerHTML = content;
}

function refreshOrdersFromMemory(updatedOrder) {
    const index = globalOrders.findIndex(order => order.id === updatedOrder.id);
    if (index !== -1) {
        globalOrders[index] = updatedOrder;
    } else {
        globalOrders.unshift(updatedOrder);
    }
    renderRecentOrders(globalOrders.slice(0, 5));
    renderAllOrdersTable(globalOrders);
    if (currentOrderDetailsId === updatedOrder.id && !document.getElementById('orderEditForm').hidden) {
        renderOrderModal(updatedOrder, false);
    }
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No orders received yet.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.id}</strong></td>
            <td>${o.date || new Date(o.created_at).toLocaleDateString('en-IN')}</td>
            <td>${o.customer_name || o.name}</td>
            <td>${typeof o.items === 'string' ? o.items : o.items.map(i => `${i.title} × ${i.qty}`).join(', ')}</td>
            <td><strong>₹${o.total}</strong></td>
            <td><span class="status-badge ${o.status}">${o.status}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="viewOrderDetails('${o.id}')">Details</button>
            </td>
        </tr>
    `).join('');
}

function renderAllOrdersTable(orders) {
    const tbody = document.getElementById('allOrdersBody');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.id}</strong></td>
            <td>${o.date || new Date(o.created_at).toLocaleDateString('en-IN')}</td>
            <td>
                <div><strong>${o.customer_name || o.name}</strong></div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${o.phone}</div>
            </td>
            <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${typeof o.items === 'string' ? o.items : o.items.map(i => `${i.title} × ${i.qty}`).join(', ')}
            </td>
            <td><strong>₹${o.total}</strong></td>
            <td>Online</td>
            <td>
                <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
                    <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>
                <input type="text" class="form-control" style="width:130px; padding:0.3rem 0.5rem; font-size:0.8rem;"
                    value="${o.tracking_number || ''}" 
                    placeholder="Enter Tracking"
                    onchange="updateTrackingNumber('${o.id}', '${o.status}', this.value)">
            </td>
            <td>
                <button class="btn-primary btn-sm" onclick="viewOrderDetails('${o.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

function filterOrdersTable(query) {
    const q = query.toLowerCase();
    const from = document.getElementById('orderDateFrom')?.value;
    const to = document.getElementById('orderDateTo')?.value;
    const filtered = globalOrders.filter(o => 
        (!from || new Date(o.created_at || o.date).toISOString().slice(0, 10) >= from) &&
        (!to || new Date(o.created_at || o.date).toISOString().slice(0, 10) <= to) &&
        (String(o.id).toLowerCase().includes(q) ||
        (o.customer_name || o.name || '').toLowerCase().includes(q) ||
        (o.phone || '').includes(q))
    );
    renderAllOrdersTable(filtered);
}

async function emailOrderInvoice(orderId) {
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${encodeURIComponent(orderId)}/invoice-email`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        alert(data.success ? 'Invoice sent to customer email.' : (data.error || 'Could not send invoice email.'));
    } catch (error) {
        alert('Could not send invoice email.');
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Order #${orderId} status updated to ${newStatus}`);
            loadDashboardStats();
            loadOrders();
        }
    } catch (e) {
        alert('Failed to update status');
    }
}

async function updateTrackingNumber(orderId, status, trackingNumber) {
    try {
        const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status, trackingNumber })
        });
        const data = await res.json();
        if (data.success) {
            loadOrders();
        }
    } catch (e) {
        console.error('Tracking code update error:', e);
    }
}

function viewOrderDetails(orderId) {
    const order = globalOrders.find(o => o.id === orderId);
    if (!order) return;

    const itemsArr = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);

    const content = `
        <div style="font-size:0.95rem; line-height:1.6;">
            <p><strong>Order ID:</strong> #${order.id}</p>
            <p><strong>Date:</strong> ${order.date || new Date(order.created_at).toLocaleString('en-IN')}</p>
            <p><strong>Customer:</strong> ${order.customer_name || order.name}</p>
            <p><strong>Email:</strong> ${order.email}</p>
            <p><strong>Phone:</strong> ${order.phone}</p>
            <p><strong>Shipping Address:</strong> ${order.address}, ${order.city}, ${order.state} - ${order.pincode}</p>
                <p><strong>Payment Method:</strong> Online</p>
            <p><strong>Order Status:</strong> <span class="status-badge ${order.status}">${order.status}</span></p>
            <p><strong>Tracking Number:</strong> ${order.tracking_number || 'N/A'}</p>
            <hr style="border-color:var(--border-color); margin:1rem 0;">
            <h4 style="margin-bottom:0.5rem;">Ordered Items</h4>
            <ul style="padding-left:1.2rem;">
                ${itemsArr.map(item => `<li>${item.title || item.name} × ${item.qty || item.quantity} (₹${item.price})</li>`).join('')}
            </ul>
            <p style="font-size:1.1rem; font-weight:700; margin-top:1rem; color:var(--primary-brand);">Total Amount: ₹${order.total}</p>
        </div>
    `;

    document.getElementById('orderDetailsContent').innerHTML = content;
    document.getElementById('orderModal').classList.add('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// 3. PRODUCTS INVENTORY MANAGEMENT
let globalProducts = [];

async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const data = await res.json();
        if (data.success) {
            globalProducts = data.products;
            renderProductsTable(globalProducts);
        }
    } catch (e) {
        console.error('Failed to load products:', e);
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsBody');
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No products in catalog.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        const isPublic = p.is_active !== false;
        return `
        <tr>
            <td><img src="${p.image_url || 'images/manchatti.png'}" width="45" height="45" style="border-radius:8px; object-fit:cover;"></td>
            <td>
                <div><strong>${escapeHtml(p.title)}</strong> ${p.is_new ? '<span style="background:linear-gradient(135deg, #e65100, #b71c1c); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700; margin-left:4px;">NEW</span>' : ''}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(p.subtitle || '')}</div>
            </td>
            <td><span style="background:rgba(212,163,115,0.1); color:var(--primary-brand); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.8rem;">${escapeHtml(p.category || 'cookware')}</span></td>
            <td><strong>₹${p.price}</strong> <span style="text-decoration:line-through; font-size:0.8rem; color:var(--text-muted);">${p.original_price ? `₹${p.original_price}` : ''}</span></td>
            <td>${p.stock ?? 50} units</td>
            <td>
                ${isPublic 
                    ? `<span style="background:rgba(34,197,94,0.15); color:#22c55e; border:1px solid rgba(34,197,94,0.3); padding:4px 10px; border-radius:6px; font-weight:600; font-size:0.8rem; display:inline-flex; align-items:center; gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;box-shadow:0 0 5px #22c55e;"></span> Public</span>` 
                    : `<span style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:4px 10px; border-radius:6px; font-weight:600; font-size:0.8rem; display:inline-flex; align-items:center; gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block;"></span> Private (Hidden)</span>`
                }
            </td>
            <td>⭐ ${p.rating || 4.8}</td>
            <td>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn-primary btn-sm" style="${isPublic ? 'background:#b91c1c;' : 'background:#15803d;'}" onclick="toggleProductVisibility('${p.id}', ${!isPublic})" title="${isPublic ? 'Hide from customer website' : 'Make visible on customer website'}">
                        ${isPublic ? 'Make Private' : 'Make Public'}
                    </button>
                    <button class="btn-primary btn-sm" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn-primary btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function toggleProductVisibility(productId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ is_active: Boolean(newStatus) })
        });
        const data = await res.json();
        if (data.success) {
            loadProducts();
            loadDashboardStats();
        } else {
            alert(data.error || 'Failed to update visibility');
        }
    } catch (e) {
        console.error('Visibility toggle error:', e);
        alert('Network error updating product visibility');
    }
}

function openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    setProductImagePreview('prodImagePreview', 'images/manchatti.png');
    setProductImagePreview('prodImage2Preview', '');
    setProductImagePreview('prodImage3Preview', '');
    document.getElementById('prodCare').value = DEFAULT_PRODUCT_CARE;
    const visEl = document.getElementById('prodVisibility');
    if (visEl) visEl.value = 'true';
    document.getElementById('productModal').classList.add('active');
}

function editProduct(productId) {
    const prod = globalProducts.find(p => p.id === productId);
    if (!prod) return;

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('prodId').value = prod.id;
    document.getElementById('prodTitle').value = prod.title;
    document.getElementById('prodSubtitle').value = prod.subtitle || '';
    document.getElementById('prodCategory').value = prod.category || 'cookware';
    document.getElementById('prodPrice').value = prod.price;
    document.getElementById('prodOriginalPrice').value = prod.original_price || '';
    document.getElementById('prodStock').value = prod.stock || 50;
    const visEl = document.getElementById('prodVisibility');
    if (visEl) visEl.value = prod.is_active !== false ? 'true' : 'false';
    document.getElementById('prodImageUrl').value = prod.image_url || '';
    const galleryImages = getEditorGalleryImages(prod);
    document.getElementById('prodImage2Url').value = galleryImages[1] || '';
    document.getElementById('prodImage3Url').value = galleryImages[2] || '';
    setProductImagePreview('prodImagePreview', prod.image_url);
    setProductImagePreview('prodImage2Preview', galleryImages[1]);
    setProductImagePreview('prodImage3Preview', galleryImages[2]);
    document.getElementById('prodImage2Visibility').value = isPrivateGalleryImage(prod, 1) ? 'private' : (galleryImages[1] ? 'public' : 'private');
    document.getElementById('prodImage3Visibility').value = isPrivateGalleryImage(prod, 2) ? 'private' : (galleryImages[2] ? 'public' : 'private');
    document.getElementById('prodImageFile').value = '';
    document.getElementById('prodImage2File').value = '';
    document.getElementById('prodImage3File').value = '';
    document.getElementById('prodDescription').value = getStorefrontProductDescription(prod);
    document.getElementById('prodCare').value = prod.product_care ?? DEFAULT_PRODUCT_CARE;

    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

async function handleSaveProduct(e) {
    e.preventDefault();

    const id = document.getElementById('prodId').value;
    const fileInput = document.getElementById('prodImageFile');
    let imageUrl = document.getElementById('prodImageUrl').value;

    try {
        if (fileInput.files.length) imageUrl = await uploadAdminImage(fileInput.files[0]);
        const image2File = document.getElementById('prodImage2File').files[0];
        const image3File = document.getElementById('prodImage3File').files[0];
        if (image2File) document.getElementById('prodImage2Url').value = await uploadAdminImage(image2File);
        if (image3File) document.getElementById('prodImage3Url').value = await uploadAdminImage(image3File);
    } catch (uploadErr) {
        alert(uploadErr.message);
        return;
    }

    const is_active = document.getElementById('prodVisibility')?.value === 'true';
    const image2IsPublic = document.getElementById('prodImage2Visibility')?.value === 'public';
    const image3IsPublic = document.getElementById('prodImage3Visibility')?.value === 'public';
    const image3Url = document.getElementById('prodImage3Url').value.trim();
    const image2Url = document.getElementById('prodImage2Url').value.trim();
    const galleryImages = [
        imageUrl || 'images/manchatti.png',
        image2IsPublic ? image2Url : (image2Url ? `${ADMIN_PRIVATE_GALLERY_IMAGE_PREFIX}${image2Url}` : ''),
        image3IsPublic ? image3Url : (image3Url ? `${ADMIN_PRIVATE_GALLERY_IMAGE_PREFIX}${image3Url}` : '')
    ].filter(Boolean).slice(0, 3);

    const payload = {
        id,
        title: document.getElementById('prodTitle').value,
        subtitle: document.getElementById('prodSubtitle').value,
        category: document.getElementById('prodCategory').value,
        price: Number(document.getElementById('prodPrice').value),
        original_price: Number(document.getElementById('prodOriginalPrice').value || document.getElementById('prodPrice').value),
        stock: Number(document.getElementById('prodStock').value || 50),
        is_active,
        image_url: imageUrl || 'images/manchatti.png',
        gallery_images: galleryImages,
        description: document.getElementById('prodDescription').value,
        product_care: document.getElementById('prodCare').value.trim()
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            if (id && data.product) {
                const productIndex = globalProducts.findIndex(product => product.id === id);
                if (productIndex !== -1) globalProducts[productIndex] = data.product;
            }
            alert(data.message);
            closeProductModal();
            loadProducts();
            loadDashboardStats();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Failed to save product');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this cookware product?')) return;

    try {
        const res = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            loadProducts();
            loadDashboardStats();
        }
    } catch (e) {
        alert('Failed to delete product');
    }
}

// 4. USERS MANAGEMENT
async function loadUsers() {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.success) {
            renderUsersTable(data.users);
        }
    } catch (e) {
        console.error('Failed to load users:', e);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersBody');
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No users registered yet.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td>#${u.id}</td>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td>${u.phone || 'N/A'}</td>
            <td>${u.address || 'N/A'}</td>
            <td>
                <span class="status-badge ${u.role === 'ADMIN' ? 'Shipped' : 'Delivered'}">${u.role}</span>
            </td>
            <td>
                <button class="btn-primary btn-sm" onclick="toggleUserRole(${u.id}, '${u.role}')">
                    Toggle ${u.role === 'ADMIN' ? 'to User' : 'to Admin'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function downloadUsersExcel() {
    try {
        const res = await fetch(`${API_BASE}/admin/users/export`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Could not download users Excel file');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ananyamlives-users-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        alert(error.message);
    }
}

async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ role: newRole })
        });
        const data = await res.json();
        if (data.success) {
            alert(`User role updated to ${newRole}`);
            loadUsers();
        }
    } catch (e) {
        alert('Failed to update user role');
    }
}

// 5. SYSTEM HEALTH CHECK
async function checkSystemHealth() {
    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();
        document.getElementById('dbHealthStatus').innerHTML = `
            🟢 <strong>${data.database}</strong><br>
            <span style="font-size:0.85rem; color:var(--text-muted);">${data.database === 'PostgreSQL' ? 'Connected to remote/local PostgreSQL DB pool.' : 'Running with auto-fallback local JSON DB storage.'}</span>
        `;
        document.getElementById('googleHealthStatus').innerHTML = `
            ${data.googleSheets ? '🟢 <strong>Active</strong>' : '🟡 <strong>Disabled (Optional)</strong>'}<br>
            <span style="font-size:0.85rem; color:var(--text-muted);">${data.googleSheets ? 'Orders auto-syncing to Google Drive.' : 'Configure credentials.json to enable auto-sync.'}</span>
        `;
    } catch (e) {
        console.error('Health check failed:', e);
    }
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No orders received yet.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${escapeHtml(o.id)}</strong></td>
            <td>${escapeHtml(o.date || new Date(o.created_at).toLocaleDateString('en-IN'))}</td>
            <td>${escapeHtml(o.customer_name || o.name)}</td>
            <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${formatOrderItemsText(o.items)}</td>
            <td><strong>&#8377;${formatCurrency(o.total)}</strong></td>
            <td><span class="status-badge ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
            <td>
                <button class="btn-primary btn-sm" onclick="viewOrderDetails('${o.id}')">Details</button>
            </td>
        </tr>
    `).join('');
}

function renderAllOrdersTable(orders) {
    const tbody = document.getElementById('allOrdersBody');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${escapeHtml(o.id)}</strong></td>
            <td>${escapeHtml(o.date || new Date(o.created_at).toLocaleDateString('en-IN'))}</td>
            <td>
                <div><strong>${escapeHtml(o.customer_name || o.name)}</strong></div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(o.phone)}</div>
            </td>
            <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${formatOrderItemsText(o.items)}
            </td>
            <td><strong>&#8377;${formatCurrency(o.total)}</strong></td>
            <td>Online</td>
            <td>
                <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
                    <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>
                <input type="text" class="form-control" style="width:130px; padding:0.3rem 0.5rem; font-size:0.8rem;"
                    value="${escapeHtml(o.tracking_number || '')}" 
                    placeholder="Enter Tracking"
                    onchange="updateTrackingNumber('${o.id}', '${o.status}', this.value)">
            </td>
            <td>
                <button class="btn-primary btn-sm" onclick="viewOrderDetails('${o.id}')">View / Edit</button>
            </td>
        </tr>
    `).join('');
}

function viewOrderDetails(orderId) {
    const order = globalOrders.find(o => o.id === orderId);
    if (!order) return;
    renderOrderModal(order, false);
    document.getElementById('orderModal').classList.add('active');
}

function enableOrderEditMode() {
    const order = globalOrders.find(o => o.id === currentOrderDetailsId);
    if (!order) return;
    renderOrderModal(order, true);
}

function cancelOrderEdit() {
    const order = globalOrders.find(o => o.id === currentOrderDetailsId);
    if (!order) return;
    renderOrderModal(order, false);
}

function buildOrderItemRow(item = {}) {
    return `
        <div class="order-item-row">
            <label class="order-item-label">Title
                <input type="text" list="orderProductSuggestions" class="form-control order-item-title" value="${escapeHtml(item.title || item.name || '')}" placeholder="Select a product" oninput="syncOrderItemPrice(this); syncOrderTotalFromItems()" required>
            </label>
            <label class="order-item-label">Qty
                <input type="number" min="1" step="1" class="form-control order-item-qty" value="${Number(item.qty ?? item.quantity ?? 1) || 1}" oninput="syncOrderTotalFromItems()">
            </label>
            <label class="order-item-label">Price
                <input type="number" min="0" step="0.01" class="form-control order-item-price" value="${Number(item.price || 0) || 0}" oninput="syncOrderTotalFromItems()">
            </label>
            <button type="button" class="btn-danger" onclick="removeOrderItemRow(this)">Remove</button>
        </div>
    `;
}

function renderOrderItemRows(items) {
    const container = document.getElementById('orderItemsEditor');
    const list = Array.isArray(items) && items.length ? items : [];
    const suggestions = document.getElementById('orderProductSuggestions');
    if (suggestions) suggestions.innerHTML = globalProducts.filter(product => Number(product.stock ?? 0) > 0).map(product => `<option value="${escapeHtml(product.title)}"></option>`).join('');
    container.innerHTML = list.map(item => buildOrderItemRow(item)).join('');
}

function addOrderItemRow(item = { title: '', qty: 1, price: 0 }) {
    const container = document.getElementById('orderItemsEditor');
    container.insertAdjacentHTML('beforeend', buildOrderItemRow(item));
    syncOrderTotalFromItems();
}

function removeOrderItemRow(button) {
    const row = button.closest('.order-item-row');
    if (row) row.remove();
    const container = document.getElementById('orderItemsEditor');
    if (!container.querySelector('.order-item-row')) {
        addOrderItemRow();
    } else {
        syncOrderTotalFromItems();
    }
}

function syncOrderTotalFromItems() {
    const rows = document.querySelectorAll('#orderItemsEditor .order-item-row');
    let total = 0;

    rows.forEach(row => {
        const qty = Number(row.querySelector('.order-item-qty')?.value || 0);
        const price = Number(row.querySelector('.order-item-price')?.value || 0);
        total += qty * price;
    });

    const totalInput = document.getElementById('editTotal');
    if (totalInput) {
        totalInput.value = total.toFixed(2);
    }
    return total;
}

function collectOrderItemsFromEditor() {
    const rows = document.querySelectorAll('#orderItemsEditor .order-item-row');
    const items = [];

    rows.forEach(row => {
        const title = row.querySelector('.order-item-title')?.value.trim();
        const qty = Number(row.querySelector('.order-item-qty')?.value || 0);
        const price = Number(row.querySelector('.order-item-price')?.value || 0);

        if (!title) return;
        items.push({ title, qty: qty > 0 ? qty : 1, price: price >= 0 ? price : 0 });
    });

    return items;
}

function syncOrderItemPrice(input) {
    const match = globalProducts.find(product => product.title.toLowerCase() === input.value.trim().toLowerCase());
    if (!match) return;
    const priceInput = input.closest('.order-item-row')?.querySelector('.order-item-price');
    if (priceInput) priceInput.value = Number(match.price || 0);
}

function populateOrderEditForm(order) {
    document.getElementById('editOrderId').value = order.id;
    document.getElementById('editCustomerName').value = order.customer_name || order.name || '';
    document.getElementById('editCustomerEmail').value = order.email || '';
    document.getElementById('editCustomerPhone').value = order.phone || '';
    document.getElementById('editPaymentMethod').value = 'Online';
    document.getElementById('editOrderStatus').value = order.status || 'Pending';
    document.getElementById('editTrackingNumber').value = order.tracking_number || '';
    document.getElementById('editAddress').value = order.address || '';
    document.getElementById('editCity').value = order.city || '';
    document.getElementById('editState').value = order.state || '';
    document.getElementById('editPincode').value = order.pincode || '';
    document.getElementById('editTotal').value = Number(order.total || 0).toFixed(2);
    document.getElementById('editSpecialNote').value = order.special_note || '';
    renderOrderItemRows(parseOrderItems(order.items));
    syncOrderTotalFromItems();
}

async function handleOrderEditSubmit(event) {
    event.preventDefault();

    const orderId = document.getElementById('editOrderId').value;
    const items = collectOrderItemsFromEditor();
    const total = Number(document.getElementById('editTotal').value || 0);

    if (!orderId) return;
    if (!items.length) {
        alert('Please keep at least one item in the order.');
        return;
    }

    const payload = {
        customer_name: document.getElementById('editCustomerName').value.trim(),
        email: document.getElementById('editCustomerEmail').value.trim(),
        phone: document.getElementById('editCustomerPhone').value.trim(),
        address: document.getElementById('editAddress').value.trim(),
        city: document.getElementById('editCity').value.trim(),
        state: document.getElementById('editState').value.trim(),
        pincode: document.getElementById('editPincode').value.trim(),
        payment_method: 'Razorpay Online',
        status: document.getElementById('editOrderStatus').value,
        tracking_number: document.getElementById('editTrackingNumber').value.trim(),
        special_note: document.getElementById('editSpecialNote').value.trim(),
        items,
        total
    };

    try {
        const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Could not save order');

        refreshOrdersFromMemory(data.order);
        renderOrderModal(data.order, false);
        document.getElementById('orderModal').classList.add('active');
        loadDashboardStats();
        alert('Order details updated successfully.');
    } catch (error) {
        alert(error.message);
    }
}

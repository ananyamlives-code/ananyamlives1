// Shared catalog used by the browser storefront and the local database seed.
const ANANYAM_CATALOG = [
    { id: 'prod-1', storefrontId: 'p1', title: 'Manchatti (Medium)', subtitle: 'Clay Rice Pot', category: 'manchatti', price: 1099, original_price: 1299, image_url: 'images/clay rice pot.png' },
    { id: 'prod-2', storefrontId: 'p2', title: 'Clay Kadai (12 inch)', subtitle: 'Clay Kadai Red', category: 'kadai', price: 1299, original_price: 1499, image_url: 'images/clay kadai.jpeg' },
    { id: 'prod-3', storefrontId: 'p3', title: 'Handi Pot (2 Litre)', subtitle: 'Clay Curd Jar with Lid', category: 'handi', price: 899, original_price: 1099, image_url: 'images/clay curd jar.jpeg' },
    { id: 'prod-4', storefrontId: 'p4', title: 'Serving Bowl Set (Set of 3)', subtitle: 'Clay Tumbler', category: 'serving', price: 699, original_price: 799, image_url: 'images/clay tumpler.png' },
    { id: 'prod-5', storefrontId: 'p5', title: 'Water Pot (20 Litre)', subtitle: 'Clay Curry Pot Black', category: 'waterpot', price: 1499, original_price: 1699, image_url: 'images/clay curry pot black.jpeg' },
    { id: 'prod-6', storefrontId: 'p6', title: 'CLAY CURRY POT', subtitle: 'Handcrafted clay cookware', category: 'manchatti', price: 349, original_price: 949, image_url: 'images/clay curry pot.jpeg' },
    { id: 'prod-7', storefrontId: 'p7', title: 'CLAY WATER JUG', subtitle: 'Natural clay water jug', category: 'manchatti', price: 429, original_price: 629, image_url: 'images/clay water jug.jpeg' },
    { id: 'prod-8', storefrontId: 'p8', title: 'Clay Parupu Chatti / Keerai Chatti BLACK', subtitle: 'Traditional cooking vessel', category: 'waterpot', price: 499, original_price: 699, image_url: 'images/clay parupu chatti-keerai chatti.jpeg' },
    { id: 'prod-9', storefrontId: 'p9', title: 'Clay Handi Pot', subtitle: 'Traditional handi cookware', category: 'waterpot', price: 579, original_price: 779, image_url: 'images/clay handi pot.jpeg' },
    { id: 'prod-10', storefrontId: 'p10', title: 'Clay Money Bank / Piggy Bank', subtitle: 'Traditional handmade decor', category: 'handi', price: 649, original_price: 849, image_url: 'images/clay money bank-piggy bank.jpeg' },
    { id: 'prod-11', storefrontId: 'p11', title: 'Clay Parupu Chatti Red', subtitle: 'Traditional cooking vessel', category: 'waterpot', price: 749, original_price: 949, image_url: 'images/clay parupu chatti.jpeg' },
    { id: 'prod-12', storefrontId: 'p12', title: 'Clay Biriyani Pot', subtitle: 'Authentic dum cooking', category: 'handi', price: 849, original_price: 1049, image_url: 'images/clay biriyani pot.jpeg' },
    { id: 'prod-13', storefrontId: 'p13', title: 'Clay Dinner Plate with Tumbler', subtitle: 'Traditional dining set', category: 'handi', price: 949, original_price: 1149, image_url: 'images/clay dinner palte with tumpler.jpeg' },
    { id: 'prod-14', storefrontId: 'p14', title: 'Clay Kadai Black', subtitle: 'Heavy clay kadai', category: 'kadai', price: 960, original_price: 1160, image_url: 'images/clay kadai black.jpeg' },
    { id: 'prod-15', storefrontId: 'p15', title: 'Clay Dosa Tawa / Chapati Tawa', subtitle: 'Traditional clay tawa', category: 'kadai', price: 1199, original_price: 1399, image_url: 'images/clay dosa tawa-chapati tawa.jpeg' },
    { id: 'prod-16', storefrontId: 'p16', title: 'Clay Cooking Pot with Lid', subtitle: 'Covered clay cookware', category: 'kadai', price: 1349, original_price: 1549, image_url: 'images/clay cooking pot with lid.jpeg' },
    { id: 'prod-17', storefrontId: 'p17', title: 'Clay Parupu Chatti Red', subtitle: 'Handmade clay cookware', category: 'waterpot', price: 1499, original_price: 1699, image_url: 'images/clay parupu chatti.jpeg' },
    { id: 'prod-18', storefrontId: 'p18', title: 'Clay Fish Curry Pot', subtitle: 'Authentic fish curry cookware', category: 'waterpot', price: 1699, original_price: 1899, image_url: 'images/clay fish curry pot.jpeg' },
    { id: 'prod-19', storefrontId: 'p19', title: 'Clay Stove / Aduppu (18 Litre)', subtitle: 'Traditional clay stove', category: 'waterpot', price: 1899, original_price: 2099, image_url: 'images/clay stove -adupu.jpeg' }
];

if (typeof module !== 'undefined' && module.exports) module.exports = ANANYAM_CATALOG;
if (typeof window !== 'undefined') window.ANANYAM_CATALOG = ANANYAM_CATALOG;

const CART_KEY = 'spa-cart-items';

// State
let products = [];
let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

// DOM Elements
const mainContent = document.getElementById('main-content');
const cartCount = document.getElementById('cart-count');
const searchInput = document.getElementById('search-input');

// Initialization
async function init() {
    try {
        const response = await fetch('data.json');
        products = await response.json();
        updateCartCount();
        handleRoute();
        window.addEventListener('hashchange', handleRoute);

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch(e.target.value);
            }
        });

    } catch (error) {
        console.error('Failed to load data:', error);
        mainContent.innerHTML = '<p>Error loading products.</p>';
    }
}

// Routing
function handleRoute() {
    const hash = window.location.hash;

    if (hash === '' || hash === '#/') {
        renderHome();
        trackPage('front');
    } else if (hash.startsWith('#/product/')) {
        const id = hash.split('/')[2];
        renderProduct(id);
    } else if (hash === '#/cart') {
        renderCart();
        trackPage('cart');
    }
}

// Nosto Tracking
function trackPage(type, payload = {}) {
    if (typeof nostojs === 'function') {
        nostojs(api => {
            const session = api.defaultSession();

            if (type === 'front') {
                session.viewFrontPage();
            } else if (type === 'product') {
                session.viewProduct(payload);
            } else if (type === 'cart') {
                session.setCart({
                    items: cart.map(item => ({
                        product_id: item.productId,
                        sku_id: item.skuId,
                        quantity: item.quantity,
                        name: item.name,
                        unit_price: item.price,
                        price_currency_code: item.currency
                    }))
                }).viewCart();
            } else if (type === 'search') {
                session.viewSearch({ query: payload.query });
            }

            // Always update cart state in Nosto if not explicitly viewing cart page
            if (type !== 'cart') {
                session.setCart({
                    items: cart.map(item => ({
                        product_id: item.productId,
                        sku_id: item.skuId,
                        quantity: item.quantity,
                        name: item.name,
                        unit_price: item.price,
                        price_currency_code: item.currency
                    }))
                }).update();
            } else {
                session.update();
            }
        });
    }
}

// Rendering
function renderHome() {
    mainContent.innerHTML = `
        <div class="product-grid">
            ${products.map(product => `
                <div class="product-card">
                    <a href="#/product/${product.productId}">
                        <img src="${product.imageUrl}" alt="${product.name}">
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <div class="price">${product.currency} ${product.price}</div>
                        </div>
                    </a>
                </div>
            `).join('')}
        </div>
    `;
}

function renderProduct(id) {
    const product = products.find(p => p.productId === id);
    if (!product) {
        mainContent.innerHTML = '<p>Product not found</p>';
        return;
    }

    trackPage('product', {
        product_id: product.productId,
        name: product.name,
        image_url: product.imageUrl,
        price: product.price,
        price_currency_code: product.currency,
        availability: product.availability,
        categories: product.categories,
        description: product.description,
        brand: product.brand,
        list_price: product.listPrice,
        tags: product.tags,
        custom_fields: product.customFields
    });

    mainContent.innerHTML = `
        <div class="product-detail">
            <img src="${product.imageUrl}" alt="${product.name}">
            <div class="detail-info">
                <h2>${product.name}</h2>
                <p class="price">${product.currency} ${product.price}</p>
                <p>${product.description}</p>
                
                <div class="sku-list">
                    <h3>Available Options</h3>
                    ${product.skus.length > 0 ? product.skus.map(sku => `
                        <div class="sku-item">
                            <span>${sku.name} - ${sku.price} ${product.currency}</span>
                            <button onclick="addToCart('${product.productId}', '${sku.id}')">Add to Cart</button>
                        </div>
                    `).join('') : `
                        <div class="sku-item">
                            <span>Standard</span>
                            <button onclick="addToCart('${product.productId}', '${product.productId}')">Add to Cart</button>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function renderCart() {
    if (cart.length === 0) {
        mainContent.innerHTML = '<h2>Your Cart is Empty</h2>';
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    mainContent.innerHTML = `
        <h2>Shopping Cart</h2>
        <div class="cart-list">
            ${cart.map(item => `
                <div class="cart-item">
                    <div>
                        <strong>${item.name}</strong>
                        <div>SKU: ${item.skuId}</div>
                    </div>
                    <div>
                        Qty: ${item.quantity}
                    </div>
                    <div>
                        ${item.currency} ${(item.price * item.quantity).toFixed(2)}
                    </div>
                    <button onclick="removeFromCart('${item.productId}', '${item.skuId}')">Remove</button>
                </div>
            `).join('')}
            <div class="cart-total">
                Total: USD ${total.toFixed(2)}
            </div>
        </div>
    `;
}

// Cart Logic
window.addToCart = function (productId, skuId) {
    const product = products.find(p => p.productId === productId);
    let sku = product.skus.find(s => s.id === skuId);

    // Fallback if no specific SKU found (for products without explicit SKUs)
    if (!sku) {
        sku = {
            id: productId,
            name: product.name,
            price: product.price,
            currency: product.currency
        };
    }

    const existingItem = cart.find(item => item.productId === productId && item.skuId === skuId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId: product.productId,
            skuId: sku.id,
            name: sku.name || product.name,
            price: sku.price || product.price,
            currency: product.currency,
            quantity: 1
        });
    }

    saveCart();
    alert('Added to cart!');
};

window.removeFromCart = function (productId, skuId) {
    cart = cart.filter(item => !(item.productId === productId && item.skuId === skuId));
    saveCart();
    renderCart();
    trackPage('cart'); // Re-track cart view to update Nosto
};

function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
    // Update Nosto cart state in background
    if (typeof nostojs === 'function') {
        nostojs(api => {
            api.defaultSession().setCart({
                items: cart.map(item => ({
                    product_id: item.productId,
                    sku_id: item.skuId,
                    quantity: item.quantity,
                    name: item.name,
                    unit_price: item.price,
                    price_currency_code: item.currency
                }))
            }).update();
        });
    }
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = count;
}

function handleSearch(query) {
    trackPage('search', { query });
    // Simple client-side search
    const results = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
    );

    mainContent.innerHTML = `
        <h2>Search Results for "${query}"</h2>
        <div class="product-grid">
            ${results.map(product => `
                <div class="product-card">
                    <a href="#/product/${product.productId}">
                        <img src="${product.imageUrl}" alt="${product.name}">
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <div class="price">${product.currency} ${product.price}</div>
                        </div>
                    </a>
                </div>
            `).join('')}
        </div>
    `;
}

init();

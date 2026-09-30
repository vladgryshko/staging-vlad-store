const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const sourceDir = __dirname;
const outputDir = path.join(__dirname, 'new_shop');
const outputFile = path.join(outputDir, 'data.json');

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
}

const products = [];

// Helper to get text content safely
const getText = (parent, selector) => {
    const el = parent.querySelector(selector);
    return el ? el.textContent.trim() : '';
};

// Process files 1.html to 21.html
for (let i = 1; i <= 21; i++) {
    const filename = `${i}.html`;
    const filePath = path.join(sourceDir, filename);

    if (fs.existsSync(filePath)) {
        console.log(`Processing ${filename}...`);
        const content = fs.readFileSync(filePath, 'utf8');
        const dom = new JSDOM(content);
        const doc = dom.window.document;

        const productEl = doc.querySelector('.nosto_product');
        if (productEl) {
            const product = {
                productId: getText(productEl, '.product_id'),
                name: getText(productEl, '.name'),
                imageUrl: getText(productEl, '.image_url'),
                price: parseFloat(getText(productEl, '.price')) || 0,
                currency: getText(productEl, '.price_currency_code'),
                availability: getText(productEl, '.availability'),
                categories: Array.from(productEl.querySelectorAll('.category')).map(el => el.textContent.trim()),
                description: getText(productEl, '.description'),
                brand: getText(productEl, '.brand'),
                listPrice: parseFloat(getText(productEl, '.list_price')) || 0,
                tags: {},
                customFields: {},
                skus: []
            };

            // Extract tags (e.g., tag1, tag2, etc.)
            Array.from(productEl.children).forEach(child => {
                if (child.className.startsWith('tag')) {
                    // Handle multiple tags with same class name if needed, but here we just collect them
                    // The structure in HTML is <span class="tag1">value</span>
                    // We can store them in an array under the tag name
                    if (!product.tags[child.className]) {
                        product.tags[child.className] = [];
                    }
                    product.tags[child.className].push(child.textContent.trim());
                }
            });

             // Extract custom fields
            const customFieldsEl = productEl.querySelector('.custom_fields');
            if (customFieldsEl) {
                 Array.from(customFieldsEl.children).forEach(child => {
                     product.customFields[child.className] = child.textContent.trim();
                 });
            }


            // Extract SKUs
            const skuEls = productEl.querySelectorAll('.nosto_sku');
            skuEls.forEach(skuEl => {
                const sku = {
                    id: getText(skuEl, '.id'),
                    name: getText(skuEl, '.name'),
                    price: parseFloat(getText(skuEl, '.price')) || 0,
                    listPrice: parseFloat(getText(skuEl, '.list_price')) || 0,
                    inventoryLevel: parseInt(getText(skuEl, '.inventory_level')) || 0,
                    url: getText(skuEl, '.url'),
                    imageUrl: getText(skuEl, '.image_url'),
                    availability: getText(skuEl, '.availability'),
                    customFields: {}
                };
                 const skuCustomFieldsEl = skuEl.querySelector('.custom_fields');
                if (skuCustomFieldsEl) {
                     Array.from(skuCustomFieldsEl.children).forEach(child => {
                         sku.customFields[child.className] = child.textContent.trim();
                     });
                }
                product.skus.push(sku);
            });

            products.push(product);
        }
    }
}

fs.writeFileSync(outputFile, JSON.stringify(products, null, 2));
console.log(`Extracted ${products.length} products to ${outputFile}`);

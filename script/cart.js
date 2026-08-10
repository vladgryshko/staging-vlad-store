// Simple cart helper for demo store
(function () {
  const CART_KEY = "demo-cart-items";
  const CART_TAGGING_ID = "nosto-cart-tagging";

  const readCart = () => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      console.warn("Unable to read cart from storage", e);
      return [];
    }
  };

  const writeCart = (items) => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateHeaderCount(items);
    // The cart changed, so the tagging must be re-rendered and re-sent.
    renderCartTagging(items);
    resendCartTagging();
  };

  const getText = (root, selector) => {
    const el = root.querySelector(selector);
    return el ? el.textContent.trim() : "";
  };

  const toNumber = (value) => {
    const num = parseFloat(String(value).replace(/[^0-9.,-]/g, "").replace(",", "."));
    return Number.isNaN(num) ? 0 : num;
  };

  const totalQuantity = (items) => items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const updateHeaderCount = (items = readCart()) => {
    const countEl = document.querySelector("[data-cart-count]");
    if (countEl) {
      countEl.textContent = String(totalQuantity(items));
    }
  };

  // --- Nosto cart tagging ----------------------------------------------------
  // This store is a classic (non-SPA) site that feeds Nosto through DOM tagging
  // (.nosto_product, .nosto_page_type, .nosto_category), so the cart is tagged
  // the same way: a hidden .nosto_cart block that must be present on *every*
  // page load. The Session API (setCart/viewCart) is the SPA equivalent and must
  // not be mixed in here — calling .viewCart() from a product page would report
  // a cart view that never happened.
  // https://docs.nosto.com/techdocs/implementing-nosto/implement-on-your-website/manual-implementation/cart-tagging

  const taggedSpan = (className, value) => {
    const el = document.createElement("span");
    el.className = className;
    el.textContent = String(value == null ? "" : value);
    return el;
  };

  // product_id and sku_id must match the product tagging, otherwise attribution
  // and statistics drift apart.
  const lineItemEl = (item) => {
    const row = document.createElement("div");
    row.className = "line_item";
    row.appendChild(taggedSpan("product_id", item.productId));
    row.appendChild(taggedSpan("sku_id", item.skuId));
    row.appendChild(taggedSpan("quantity", item.quantity));
    row.appendChild(taggedSpan("name", item.name));
    row.appendChild(taggedSpan("unit_price", Number(item.price || 0).toFixed(2)));
    row.appendChild(taggedSpan("price_currency_code", item.currency || "USD"));
    return row;
  };

  // An empty .nosto_cart element is meaningful: it tells Nosto the cart is empty
  // (e.g. after the last item was removed). Omitting it would leave the previous
  // cart contents standing in the session.
  const renderCartTagging = (items = readCart()) => {
    const parent = document.body || document.documentElement;
    if (!parent) return;

    let el = document.getElementById(CART_TAGGING_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = CART_TAGGING_ID;
      el.className = "nosto_cart";
      el.style.display = "none";
      el.setAttribute("translate", "no");
      parent.appendChild(el);
    }

    el.innerHTML = "";
    items.forEach((item) => el.appendChild(lineItemEl(item)));
  };

  // Pushes the freshly rendered tagging to Nosto. Only needed after a mid-page
  // cart change — on a normal page load the client script reads the tagging
  // itself. Safe to call before the Nosto script has loaded: nostojs queues the
  // callback and replays it once the client is ready.
  const resendCartTagging = () => {
    if (typeof window.nostojs !== "function") return;
    window.nostojs((api) => {
      if (typeof api.resendCartTagging === "function") {
        api.resendCartTagging();
      }
    });
  };

  // Attribution for products added straight from a recommendation. This only
  // reports *where* the addition came from; the cart contents themselves always
  // travel via the cart tagging above.
  const reportRecommendationAddToCart = (productId, slotId) => {
    if (!slotId || typeof window.nostojs !== "function") return;
    window.nostojs((api) => {
      if (typeof api.recommendedProductAddedToCart === "function") {
        api.recommendedProductAddedToCart(productId, slotId);
      }
    });
  };

  // Nosto placement the node sits in, if any, so additions from a
  // recommendation can be attributed to it.
  const slotIdFor = (node) => {
    const element = node && node.closest ? node.closest(".nosto_element") : null;
    return element ? element.id : null;
  };

  const addItemToCart = (item, slotId) => {
    const items = readCart();
    const existing = items.find(
      (entry) => entry.productId === item.productId && entry.skuId === item.skuId
    );
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.push(item);
    }
    writeCart(items);
    reportRecommendationAddToCart(item.productId, slotId);
  };

  const removeItemFromCart = (productId, skuId) => {
    const items = readCart().filter(
      (item) => !(item.productId === productId && item.skuId === skuId)
    );
    writeCart(items);
    renderCartPage();
  };

  const createHeader = () => {
    if (document.querySelector("[data-cart-header]")) {
      updateHeaderCount();
      return;
    }
    const header = document.createElement("div");
    header.dataset.cartHeader = "true";
    header.style.display = "flex";
    header.style.gap = "12px";
    header.style.alignItems = "center";
    header.style.marginBottom = "16px";

    const homeLink = document.querySelector("a[href='index.html']");
    if (!homeLink) {
      const fallbackHome = document.createElement("a");
      fallbackHome.href = "index.html";
      fallbackHome.textContent = "Home";
      header.appendChild(fallbackHome);
    }

    const cartLink = document.createElement("a");
    cartLink.href = "cart.html";
    cartLink.textContent = "Cart (";
    const count = document.createElement("span");
    count.dataset.cartCount = "true";
    count.textContent = "0";
    cartLink.appendChild(count);
    cartLink.appendChild(document.createTextNode(")"));
    header.appendChild(cartLink);

    document.body.insertBefore(header, document.body.firstChild);
    updateHeaderCount();
  };

  const parseProductInfo = () => {
    const productEl = document.querySelector(".nosto_product");
    if (!productEl) return null;
    return {
      productId: getText(productEl, ".product_id"),
      name: getText(productEl, ".name"),
      price: toNumber(getText(productEl, ".price")),
      currency: getText(productEl, ".price_currency_code") || "USD",
      url: getText(productEl, ".url") || window.location.href,
      image: getText(productEl, ".image_url"),
    };
  };

  const parseSkuInfo = (skuEl, productInfo) => {
    return {
      productId: productInfo.productId,
      skuId: getText(skuEl, ".id") || productInfo.productId,
      name: getText(skuEl, ".name") || productInfo.name,
      price: toNumber(getText(skuEl, ".price")) || productInfo.price,
      currency: getText(skuEl, ".price_currency_code") || productInfo.currency,
      image: getText(skuEl, ".image_url") || productInfo.image,
      url: getText(skuEl, ".url") || productInfo.url,
    };
  };

  const renderAddToCartButtons = () => {
    const productInfo = parseProductInfo();
    if (!productInfo) return;

    const skuEls = Array.from(document.querySelectorAll(".nosto_product .nosto_sku"));
    const hasSkus = skuEls.length > 0;
    const actionsWrap = document.createElement("div");
    actionsWrap.style.margin = "12px 0";
    actionsWrap.style.padding = "12px";
    actionsWrap.style.border = "1px solid #ddd";
    actionsWrap.style.borderRadius = "4px";

    const heading = document.createElement("strong");
    heading.textContent = "Add to cart";
    actionsWrap.appendChild(heading);

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "8px";

    if (hasSkus) {
      skuEls.forEach((skuEl) => {
        const sku = parseSkuInfo(skuEl, productInfo);
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `Add ${sku.name || "item"} to cart`;
        button.addEventListener("click", (event) =>
          addItemToCart(
            {
              productId: sku.productId,
              skuId: sku.skuId,
              name: sku.name,
              price: sku.price,
              currency: sku.currency,
              quantity: 1,
              image: sku.image,
              url: sku.url,
            },
            slotIdFor(event.currentTarget)
          )
        );
        list.appendChild(button);
      });
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Add ${productInfo.name || "item"} to cart`;
      button.addEventListener("click", (event) =>
        addItemToCart(
          {
            productId: productInfo.productId || productInfo.url,
            skuId: productInfo.productId || productInfo.url,
            name: productInfo.name,
            price: productInfo.price,
            currency: productInfo.currency,
            quantity: 1,
            image: productInfo.image,
            url: productInfo.url,
          },
          slotIdFor(event.currentTarget)
        )
      );
      list.appendChild(button);
    }

    actionsWrap.appendChild(list);
    const target = document.querySelector(".nosto_product");
    if (target) {
      target.parentNode.insertBefore(actionsWrap, target.nextSibling);
    } else {
      document.body.insertBefore(actionsWrap, document.body.firstChild);
    }
  };

  const renderCartPage = () => {
    const list = document.getElementById("cart-items");
    if (!list) return;

    const items = readCart();
    list.innerHTML = "";

    if (!items.length) {
      list.textContent = "Your cart is empty.";
      updateHeaderCount(items);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "12px";
      row.style.marginBottom = "10px";

      const name = document.createElement("div");
      name.textContent = `${item.name} (SKU: ${item.skuId})`;

      const qty = document.createElement("div");
      qty.textContent = `Qty: ${item.quantity}`;

      const price = document.createElement("div");
      price.textContent = `${item.currency || "USD"} ${(
        item.price * item.quantity
      ).toFixed(2)}`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () =>
        removeItemFromCart(item.productId, item.skuId)
      );

      row.appendChild(name);
      row.appendChild(qty);
      row.appendChild(price);
      row.appendChild(removeBtn);
      list.appendChild(row);
    });

    const summary = document.getElementById("cart-summary");
    if (summary) {
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      summary.textContent = `Items: ${totalQuantity(items)} | Total: ${total.toFixed(2)}`;
    }

    updateHeaderCount(items);
  };

  // Render the cart tagging immediately rather than on DOMContentLoaded: the
  // Nosto client script reads the page tagging once the DOM is ready, so the
  // .nosto_cart block has to exist before that. This is what makes the cart show
  // up on the very first page view instead of only after the next change.
  renderCartTagging();

  document.addEventListener("DOMContentLoaded", () => {
    createHeader();
    renderAddToCartButtons();
    renderCartPage();
  });

  // Let recommendation templates add to the cart and keep tagging in sync.
  window.DemoCart = {
    read: readCart,
    add: addItemToCart,
    remove: removeItemFromCart,
    resendTagging: resendCartTagging,
  };
})();

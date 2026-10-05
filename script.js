const productsUrl = "products.json";
const whatsappNumber = "201025491665";

const $ = (selector) => document.querySelector(selector);
const grid = $("#grid");
const empty = $("#empty");

async function loadProducts() {
  try {
    const response = await fetch(productsUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load products.");

    const products = await response.json();
    if (!Array.isArray(products)) throw new Error("Invalid products file.");

    return products;
  } catch {
    return Array.from({ length: 30 }, (_, index) => {
      const id = index + 1;

      return {
        id,
        image: `images/products/${id}.jpg`,
        price: id === 2 ? "450 جنيه" : "350 جنيه",
      };
    });
  }
}

function renderProducts(products) {
  let finished = 0;
  const cards = [];
  const frag = document.createDocumentFragment();

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "card";
    card.hidden = true;

    const btn = document.createElement("button");
    btn.className = "card__img";
    btn.type = "button";
    btn.setAttribute("aria-label", "عرض الصورة بحجم كبير");

    const img = new Image();
    img.loading = "eager";
    img.decoding = "async";
    img.alt = `إكسسوار نسائي - ${product.price}`;
    img.src = product.image;
    img.onload = () => {
      card.dataset.ok = "1";
      finished++;
      updateProductsView();
    };
    img.onerror = () => {
      finished++;
      card.remove();
      updateProductsView();
    };

    btn.append(img);
    btn.addEventListener("click", () => openLightbox(img.src, product.price, img.alt));

    const price = document.createElement("div");
    price.className = "card__price";
    price.innerHTML = `<span class="price">${product.price}</span>`;

    card.append(btn, price);
    frag.append(card);
    cards.push(card);
  });

  grid.append(frag);

  function updateProductsView() {
    let shown = 0;

    cards.forEach((card) => {
      const show = card.dataset.ok === "1";
      card.hidden = !show;
      if (show) shown++;
    });

    empty.hidden = shown > 0 || finished < products.length;
  }
}

const lb = $("#lightbox");
const lbImg = $("#lbImg");
const lbPrice = $("#lbPrice");
const lbClose = $("#lbClose");
let lastFocus;

function openLightbox(src, price, alt) {
  lastFocus = document.activeElement;
  lbImg.src = src;
  lbImg.alt = alt;
  lbPrice.textContent = price;
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add("is-open"));
  document.body.style.overflow = "hidden";
  lbClose.focus();
}

function closeLightbox() {
  lb.classList.remove("is-open");
  document.body.style.overflow = "";
  setTimeout(() => {
    lb.hidden = true;
    lbImg.src = "";
  }, 300);
  if (lastFocus) lastFocus.focus();
}

lb.addEventListener("click", (event) => {
  if (event.target === lb || event.target === lbClose) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !lb.hidden) closeLightbox();
});

const header = $("#header");
const nav = $("#nav");
const burger = $("#burger");

const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 10);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

function setMenu(open) {
  nav.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
}

burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
nav.addEventListener("click", (event) => {
  if (event.target.tagName === "A") setMenu(false);
});

["heroImg", "heroImg2"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("error", () => el.classList.add("is-missing"));
});

$("#wa").href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("مرحبا، أريد الاستفسار عن أحد المنتجات.")}`;
$("#year").textContent = new Date().getFullYear();

loadProducts().then(renderProducts);

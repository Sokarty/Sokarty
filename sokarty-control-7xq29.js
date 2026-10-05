const productsUrl = "products.json";
const draftStorageKey = "sokartyProductsDraft";

const adminGrid = document.querySelector("#adminGrid");
const statusEl = document.querySelector("#status");
const resetAll = document.querySelector("#resetAll");
const downloadJson = document.querySelector("#downloadJson");
const saveAllPrices = document.querySelector("#saveAllPrices");

let baseProducts = [];

function defaultProducts() {
  return Array.from({ length: 30 }, (_, index) => {
    const id = index + 1;

    return {
      id,
      image: `images/products/${id}.jpg`,
      price: id === 2 ? "450 جنيه" : "350 جنيه",
    };
  });
}

async function loadBaseProducts() {
  try {
    const response = await fetch(productsUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load products.");

    const products = await response.json();
    if (!Array.isArray(products)) throw new Error("Invalid products file.");

    return products;
  } catch {
    return defaultProducts();
  }
}

function loadDraftProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(draftStorageKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveDraftProducts(products) {
  try {
    localStorage.setItem(draftStorageKey, JSON.stringify(products));
    return true;
  } catch {
    setStatus("مساحة التخزين امتلأت. جربي صورة أصغر حجما.");
    return false;
  }
}

function mergedProducts() {
  const draft = loadDraftProducts();

  return baseProducts.map((product) => {
    const saved = draft.find((item) => item.id === product.id) || {};
    return { ...product, ...saved };
  });
}

function getProduct(id) {
  return mergedProducts().find((product) => product.id === id);
}

function upsertDraftProduct(id, changes) {
  const products = loadDraftProducts();
  const index = products.findIndex((product) => product.id === id);
  const current = index >= 0 ? products[index] : { id };
  const next = { ...current, ...changes };

  if (index >= 0) products[index] = next;
  else products.push(next);

  return saveDraftProducts(products);
}

function resetDraftImage(id) {
  const products = loadDraftProducts().map((product) => {
    if (product.id !== id) return product;
    const { image, ...rest } = product;
    return rest;
  });

  return saveDraftProducts(products.filter((product) => product.image || product.price));
}

function setStatus(message) {
  statusEl.textContent = message;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => {
    statusEl.textContent = "بعد الحفظ حملي ملف products.json وارفعيه مكان الملف القديم على الاستضافة.";
  }, 3400);
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fileToCompressedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 1400;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => reject(new Error("تعذر قراءة الصورة."));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error("تعذر رفع الملف."));
    reader.readAsDataURL(file);
  });
}

function buildCard(product) {
  const card = document.createElement("article");
  card.className = "admin-product";
  card.dataset.productId = product.id;
  card.innerHTML = `
    <div class="admin-product__image">
      <img src="${escapeAttr(product.image)}" alt="منتج رقم ${product.id}">
    </div>
    <div class="admin-product__body">
      <h2>منتج ${product.id}</h2>
      <label>
        السعر
        <span class="admin-price-field">
          <input class="admin-price" type="number" min="0" step="1" required value="${escapeAttr(String(product.price).replace(/[^\d.]/g, ""))}" inputmode="numeric" aria-label="سعر منتج ${product.id} بالجنيه">
          <span>جنيه</span>
        </span>
      </label>
      <label class="admin-file">
        تغيير الصورة
        <input class="admin-image" type="file" accept="image/*">
      </label>
      <div class="admin-actions">
        <button class="admin-save" type="button">حفظ الصورة</button>
        <button class="admin-reset" type="button">رجوع للصورة الأصلية</button>
      </div>
    </div>
  `;

  const img = card.querySelector("img");
  const priceInput = card.querySelector(".admin-price");
  const fileInput = card.querySelector(".admin-image");

  priceInput.addEventListener("change", () => {
    if (!priceInput.value || !priceInput.validity.valid) {
      setStatus(`أدخلي سعرًا صحيحًا لمنتج ${product.id}.`);
      priceInput.focus();
      return;
    }

    const saved = upsertDraftProduct(product.id, { price: `${priceInput.valueAsNumber} جنيه` });
    if (saved) setStatus(`تم حفظ سعر منتج ${product.id}.`);
  });

  card.querySelector(".admin-save").addEventListener("click", async () => {
    if (!priceInput.value || !priceInput.validity.valid) {
      setStatus(`أدخلي سعرًا صحيحًا لمنتج ${product.id}.`);
      priceInput.focus();
      return;
    }

    const changes = { price: `${priceInput.valueAsNumber} جنيه` };

    if (fileInput.files[0]) {
      try {
        changes.image = await fileToCompressedDataUrl(fileInput.files[0]);
        img.src = changes.image;
      } catch (error) {
        setStatus(error.message);
        return;
      }
    }

    const saved = upsertDraftProduct(product.id, changes);
    if (!saved) return;

    fileInput.value = "";
    setStatus(`تم حفظ منتج ${product.id}. حملي products.json وارفعيه ليظهر عند كل الزوار.`);
  });

  card.querySelector(".admin-reset").addEventListener("click", () => {
    const original = baseProducts.find((item) => item.id === product.id);
    const saved = resetDraftImage(product.id);
    if (!saved || !original) return;

    img.src = original.image;
    fileInput.value = "";
    setStatus(`تم رجوع صورة منتج ${product.id} للصورة الأصلية.`);
  });

  return card;
}

function renderAdmin() {
  adminGrid.textContent = "";
  const frag = document.createDocumentFragment();

  mergedProducts().forEach((product) => {
    frag.append(buildCard(product));
  });

  adminGrid.append(frag);
}

function downloadProductsFile() {
  const products = mergedProducts();
  const json = JSON.stringify(products, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "products.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  setStatus("تم تحميل products.json. ارفعيه على الاستضافة مكان الملف القديم.");
}

saveAllPrices.addEventListener("click", () => {
  const cards = [...adminGrid.querySelectorAll(".admin-product")];
  const invalidInput = cards
    .map((card) => card.querySelector(".admin-price"))
    .find((input) => !input.value || !input.validity.valid);

  if (invalidInput) {
    setStatus("راجعي الأسعار؛ لازم كل سعر يكون رقمًا صحيحًا أكبر من أو يساوي صفر.");
    invalidInput.focus();
    return;
  }

  const products = loadDraftProducts();
  cards.forEach((card) => {
    const id = Number(card.dataset.productId);
    const price = `${card.querySelector(".admin-price").valueAsNumber} جنيه`;
    const saved = products.find((product) => product.id === id);

    if (saved) saved.price = price;
    else products.push({ id, price });
  });

  if (saveDraftProducts(products)) setStatus("تم حفظ كل الأسعار. حمّلي products.json ليظهر التعديل لكل الزوار.");
});

resetAll.addEventListener("click", () => {
  const ok = confirm("هل تريد مسح كل تعديلات الصور والأسعار غير المرفوعة؟");
  if (!ok) return;

  localStorage.removeItem(draftStorageKey);
  renderAdmin();
  setStatus("تم مسح المسودة المحلية.");
});

downloadJson.addEventListener("click", downloadProductsFile);

loadBaseProducts().then((products) => {
  baseProducts = products;
  renderAdmin();
});

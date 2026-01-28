// ---------- PARALLAX (any .section.parallax) ----------
(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const sections = document.querySelectorAll(".section.parallax");
    if (!sections.length) return;

    let ticking = false;

    function update(){
        ticking = false;
        const viewH = window.innerHeight;

        sections.forEach(section => {
            const bg = section.querySelector(".section-bg");
            if (!bg) return;

            const rect = section.getBoundingClientRect();
            if (rect.bottom < -200 || rect.top > viewH + 200) return;

            const progress = (viewH - rect.top) / (viewH + rect.height);
            const y = (progress - 0.5) * 70;

            bg.style.transform = `translateY(${y}px) scale(1.08)`;
        });
    }

    function onScroll(){
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
})();





// ---------- NAV ----------
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

hamburger?.addEventListener("click", () => {
    navLinks.classList.toggle("open");
});

document.getElementById("year").textContent = new Date().getFullYear();

// ---------- LIGHTBOX ----------
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

document.getElementById("results")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".result");
    if (!btn) return;
    const src = btn.getAttribute("data-full");
    if (!src) return;
    lightboxImg.src = src;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
});

function closeLightbox(){
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
}
lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

// ---------- CART STATE ----------
const cartBtn = document.getElementById("cartBtn");
const drawer = document.getElementById("drawer");
const closeDrawer = document.getElementById("closeDrawer");
const cartItemsEl = document.getElementById("cartItems");
const drawerEmpty = document.getElementById("drawerEmpty");

const cartCount = document.getElementById("cartCount");
const drawerTotal = document.getElementById("drawerTotal");
const drawerDeposit = document.getElementById("drawerDeposit");

const cartTotalEl = document.getElementById("cartTotal");
const depositDueEl = document.getElementById("depositDue");

const payDepositBtn = document.getElementById("payDeposit");
const openCartInline = document.getElementById("openCartInline");
const openCartFromBook = document.getElementById("openCartFromBook");
const clearCartBtn = document.getElementById("clearCart");

let cart = [];
// item shape: { id, name, price, deposit, qty }

function money(n){ return `$${Number(n).toFixed(0)}`; }

function calcTotals(){
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    // Deposit rule:
    // - use sum of per-item deposit * qty
    // - also clamp deposit to not exceed 30% of estimated total (optional safety)
    let deposit = cart.reduce((sum, i) => sum + i.deposit * i.qty, 0);

    const maxDeposit = Math.round(total * 0.30);
    if (deposit > maxDeposit) deposit = maxDeposit;

    return { total, deposit };
}

function updatePaymentLink(deposit){
    // TODO: Replace with Stripe Payment Link or Checkout session URL
    // Example Stripe Payment Link would be static; Checkout would be dynamic w/ backend.
    // This mock just builds a placeholder URL with amount.
    const placeholder = `https://example.com/pay-deposit?amount=${deposit}`;
    payDepositBtn.href = deposit > 0 ? placeholder : "#";
    payDepositBtn.setAttribute("aria-disabled", deposit > 0 ? "false" : "true");
}

function renderCart(){
    cartCount.textContent = cart.reduce((s,i)=>s+i.qty,0);

    const { total, deposit } = calcTotals();
    drawerTotal.textContent = money(total);
    drawerDeposit.textContent = money(deposit);

    cartTotalEl.textContent = money(total);
    depositDueEl.textContent = money(deposit);

    updatePaymentLink(deposit);

    cartItemsEl.innerHTML = "";

    if (cart.length === 0){
        drawerEmpty.style.display = "block";
        return;
    }
    drawerEmpty.style.display = "none";

    cart.forEach(item => {
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div class="meta">Est. ${money(item.price)} • Deposit ${money(item.deposit)}</div>
      </div>
      <div class="actions">
        <div class="qty">
          <button data-dec="${item.id}">−</button>
          <strong>${item.qty}</strong>
          <button data-inc="${item.id}">+</button>
        </div>
        <button class="remove" data-remove="${item.id}">Remove</button>
      </div>
    `;
        cartItemsEl.appendChild(row);
    });
}

function openDrawer(){
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden","false");
}
function closeDrawerFn(){
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden","true");
}

cartBtn?.addEventListener("click", openDrawer);
openCartInline?.addEventListener("click", openDrawer);
openCartFromBook?.addEventListener("click", openDrawer);
closeDrawer?.addEventListener("click", closeDrawerFn);
drawer?.addEventListener("click", (e) => { if (e.target === drawer) closeDrawerFn(); });

clearCartBtn?.addEventListener("click", () => {
    cart = [];
    renderCart();
});

// Add package buttons
document.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-add");
        const price = Number(btn.getAttribute("data-price") || 0);
        const deposit = Number(btn.getAttribute("data-deposit") || 0);
        const id = name.toLowerCase().replace(/\s+/g,"-");

        const existing = cart.find(i => i.id === id);
        if (existing) existing.qty += 1;
        else cart.push({ id, name, price, deposit, qty: 1 });

        renderCart();
        openDrawer();
        syncServiceSelect();
    });
});

// Cart item actions
cartItemsEl?.addEventListener("click", (e) => {
    const inc = e.target.getAttribute("data-inc");
    const dec = e.target.getAttribute("data-dec");
    const rem = e.target.getAttribute("data-remove");

    if (inc){
        const item = cart.find(i => i.id === inc);
        if (item) item.qty += 1;
    }
    if (dec){
        const item = cart.find(i => i.id === dec);
        if (item){
            item.qty -= 1;
            if (item.qty <= 0) cart = cart.filter(i => i.id !== dec);
        }
    }
    if (rem){
        cart = cart.filter(i => i.id !== rem);
    }

    renderCart();
    syncServiceSelect();
});

// ---------- SERVICE SELECT ----------
const serviceSelect = document.getElementById("serviceSelect");

function syncServiceSelect(){
    if (!serviceSelect) return;

    // keep base services + cart items
    const base = [
        "Consultation",
        "Touch-up",
        "Custom Design (Quote)"
    ];

    const cartServices = cart.map(i => i.name);

    const options = ["Select a service", ...new Set([...cartServices, ...base])];

    // preserve selection if possible
    const current = serviceSelect.value;

    serviceSelect.innerHTML = options.map(v => {
        if (v === "Select a service") return `<option value="">Select a service</option>`;
        return `<option value="${v}">${v}</option>`;
    }).join("");

    if (options.includes(current)) serviceSelect.value = current;
}

syncServiceSelect();

// ---------- BOOKING FORM ----------
const form = document.getElementById("bookingForm");
const formMsg = document.getElementById("formMsg");

form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());

    const { total, deposit } = calcTotals();
    const cartLines = cart.length
        ? cart.map(i => `- ${i.name} x${i.qty} (Est ${money(i.price)} ea, Deposit ${money(i.deposit)} ea)`).join("\n")
        : "- (No package selected)";

    const subject = encodeURIComponent(`Precise Ink Booking Request - ${payload.name}`);
    const body = encodeURIComponent(
        `Name: ${payload.name}
Contact: ${payload.contact}
Service: ${payload.service}
Preferred date: ${payload.date}

Notes:
${payload.notes}

Cart:
${cartLines}

Estimated Total: ${money(total)}
Deposit Due: ${money(deposit)}
`
    );

    // TODO: Replace with business email
    const businessEmail = "preciseink@example.com";
    const mailto = `mailto:${businessEmail}?subject=${subject}&body=${body}`;

    formMsg.textContent = "Opening email draft to send booking request...";
    window.location.href = mailto;
});

// initial render
renderCart();



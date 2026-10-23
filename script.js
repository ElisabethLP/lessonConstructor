// ========== НАСТРОЙКИ ==========
const API_URL = "https://lessonconstructor-krasnopolii-xckr.onreza.app/techniques";
const ADMIN_PASSWORD = "88888888";

let allTechniques = [];
let lastGenerated = [];
let currentFilter = "all";
let sortByRating = false;
let searchQuery = ""; 

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("toast-hide");
        toast.addEventListener("animationend", () => toast.remove());
    }, 3500);
}

// ========== ТЕМА ==========
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem("theme", theme);
}
function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved) applyTheme(saved);
    else applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
function toggleTheme() {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
}

// ========== ЗАГРУЗКА ИЗ ONREZA ==========
async function loadTechniques() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "flex";

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Ошибка сети");
        let loaded = await response.json();

        if (!Array.isArray(loaded) || loaded.length === 0) {
            allTechniques = [];
            showToast("База пуста. Добавьте первый приём!", "success");
        } else {
            allTechniques = loaded.map((t, i) => ({
                id: t.id || (Date.now() + i),
                name: t.name || "Без названия",
                category: t.category || "основной этап",
                description: t.description || "",
                details: t.details || "",
                link: t.link || "",
                base: t.base === true,
                rating: Number(t.rating) || 0,
                votes: Number(t.votes) || 0
            }));
        }
        
        updateTechniquesCount();
        if (document.getElementById("all-techniques-container").style.display === "block") displayAllTechniques();

    } catch (e) {
        console.warn("Ошибка загрузки:", e);
        showToast("Ошибка сервера. Проверьте подключение.", "error");
    } finally {
        if (loader) loader.style.display = "none";
    }
}

// ========== ГЕНЕРАЦИЯ ==========
function getWeightedRandomTechnique(pool) {
    const getWeight = (tech) => {
        const effectiveRating = (tech.votes || 0) < 3 ? 2.5 : (tech.rating || 0);
        return Math.pow(effectiveRating + 1, 2);
    };
    const totalWeight = pool.reduce((sum, tech) => sum + getWeight(tech), 0);
    let random = Math.random() * totalWeight;
    for (const tech of pool) {
        const weight = getWeight(tech);
        if (random < weight) return tech;
        random -= weight;
    }
    return pool[0];
}

function generateLessonStructure() {
    if (allTechniques.length === 0) return showToast("Список приёмов пуст.", "error");
    const categories = ["актуализация", "основной этап", "закрепление", "рефлексия"];
    const selected = [];
    const usedIds = new Set();

    categories.forEach(cat => {
        const pool = allTechniques.filter(t => t.category === cat && !usedIds.has(t.id));
        if (pool.length > 0) {
            const pick = getWeightedRandomTechnique(pool);
            selected.push(pick);
            usedIds.add(pick.id);
        }
    });

    if (Math.random() < 0.5) {
        const fiz = allTechniques.filter(t => t.category === "физкультминутка" && !usedIds.has(t.id));
        if (fiz.length > 0) selected.splice(2, 0, getWeightedRandomTechnique(fiz));
    }
    if (selected.length < 3) {
        const rest = allTechniques.filter(t => !usedIds.has(t.id));
        while (selected.length < 3 && rest.length > 0) selected.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    }

    lastGenerated = selected;
    displayLessonStructure(selected);
    document.getElementById("result-actions").style.display = "flex";
}

// ========== ОТОБРАЖЕНИЕ СГЕНЕРИРОВАННОГО УРОКА ==========
function displayLessonStructure(techniques) {
    const container = document.getElementById("lesson-structure-container");
    container.innerHTML = "";
    if (!techniques.length) return;

    const ul = document.createElement("ul");
    techniques.forEach((tech, index) => {
        const li = document.createElement("li");
        
        // Генерируем скрытый блок с деталями для урока
        let detailsHTML = "";
        if (tech.details || tech.link) {
            let linkHTML = tech.link ? `<a href="${tech.link}" target="_blank" class="btn-resource-link">🔗 Полезный материал</a>` : "";
            detailsHTML = `<div class="tech-details-block" id="lesson-details-${tech.id}"><p>${tech.details || ""}</p>${linkHTML}</div>`;
        }
        let toggleBtn = (tech.details || tech.link) 
            ? `<button class="btn-toggle-details" onclick="toggleDetails('lesson-details-${tech.id}', this)">Подробнее ▾</button>` 
            : "";

        li.innerHTML = `
            <span class="category-tag">${capitalize(tech.category)}</span>
            <strong>${index + 1}. ${tech.name}</strong>
            <div>${tech.description || "Нет описания"}</div>
            ${toggleBtn}
            ${detailsHTML}
        `;
        ul.appendChild(li);
    });
    container.appendChild(ul);
}

// ========== ОТОБРАЖЕНИЕ ВСЕХ ПРИЁМОВ (с деталями) ==========
function displayAllTechniques() {
    const container = document.getElementById("all-techniques-container");
    container.style.display = "block";
    container.innerHTML = "";

    let list = allTechniques;
    
    if (currentFilter !== "all") list = list.filter(t => t.category === currentFilter);

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(t => 
            t.name.toLowerCase().includes(q) || 
            t.description.toLowerCase().includes(q) || 
            t.category.toLowerCase().includes(q)
        );
    }

    if (sortByRating) {
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (list.length === 0) {
        container.innerHTML = "<p>По вашему запросу ничего не найдено.</p>";
        return;
    }

    const ul = document.createElement("ul");
    list.forEach((tech) => {
        const li = document.createElement("li");
        let ratingHTML = (tech.votes > 0) 
            ? `<span class="rating-badge">★ ${Number(tech.rating).toFixed(1)}</span>` 
            : `<span class="rating-badge" style="opacity:0.6">Пока нет оценок</span>`;

        // Генерируем скрытый блок с деталями для общего списка
        let detailsHTML = "";
        if (tech.details || tech.link) {
            let linkHTML = tech.link ? `<a href="${tech.link}" target="_blank" class="btn-resource-link">🔗 Полезный материал</a>` : "";
            detailsHTML = `<div class="tech-details-block" id="all-details-${tech.id}"><p>${tech.details || ""}</p>${linkHTML}</div>`;
        }
        let toggleBtn = (tech.details || tech.link) 
            ? `<button class="btn-toggle-details" onclick="toggleDetails('all-details-${tech.id}', this)">Подробнее ▾</button>` 
            : "";

        li.innerHTML = `
            <div class="tech-header">
                <div class="tech-title">
                    <span class="category-tag">${capitalize(tech.category)}</span>
                    <strong>${tech.name}</strong>
                    ${ratingHTML}
                </div>
                <div class="tech-actions">
                    <button class="delete-btn" data-id="${tech.id}">✕ Удалить</button>
                </div>
            </div>
            <div>${tech.description || "Нет описания"}</div>
            
            <!-- НОВОЕ: Кнопка "Подробнее" и скрытый блок -->
            ${toggleBtn}
            ${detailsHTML}

            <div class="stars" data-id="${tech.id}">
                <span class="star" data-score="1">★</span><span class="star" data-score="2">★</span><span class="star" data-score="3">★</span><span class="star" data-score="4">★</span><span class="star" data-score="5">★</span>
            </div>
        `;
        ul.appendChild(li);

        const starsContainer = li.querySelector('.stars');
        const stars = starsContainer.querySelectorAll('.star');
        let voted = JSON.parse(localStorage.getItem('voted') || '{}');

        if (voted[tech.id]) {
            starsContainer.style.opacity = '0.5';
            starsContainer.title = "Вы уже оценили этот приём";
        } else {
            stars.forEach((star, index) => {
                star.addEventListener('mouseenter', () => stars.forEach((s, i) => s.classList.toggle('hovered', i <= index)));
                star.addEventListener('click', (e) => {
                    e.stopPropagation();
                    rateTechnique(tech.id, Number(star.dataset.score));
                });
            });
            starsContainer.addEventListener('mouseleave', () => stars.forEach(s => s.classList.remove('hovered')));
        }
    });
    container.appendChild(ul);
    document.querySelectorAll(".delete-btn").forEach(btn => btn.addEventListener("click", handleDeleteTechnique));
}

// ========== УНИВЕРСАЛЬНАЯ ФУНКЦИЯ РАСКРЫТИЯ ==========
window.toggleDetails = function(id, btn) {
    const block = document.getElementById(id);
    if (block) {
        block.classList.toggle("active");
        btn.textContent = block.classList.contains("active") ? "Скрыть ▴" : "Подробнее ▾";
    }
}

// ========== РЕЙТИНГ ==========
async function rateTechnique(id, score) {
    let voted = JSON.parse(localStorage.getItem('voted') || '{}');
    if (voted[id]) return showToast("Вы уже оценили этот приём!", "error");

    const tech = allTechniques.find(t => String(t.id) === String(id));
    if (!tech) return;

    const currentVotes = Number(tech.votes) || 0;
    const currentRating = Number(tech.rating) || 0;
    const newVotes = currentVotes + 1;
    const newRating = ((currentRating * currentVotes) + score) / newVotes;

    try {
        const response = await fetch(`${API_URL}/${id}/rate`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newRating: newRating, newVotes: newVotes })
        });
        if (!response.ok) throw new Error("Ошибка сервера");

        tech.rating = newRating;
        tech.votes = newVotes;
        voted[id] = true;
        localStorage.setItem('voted', JSON.stringify(voted));
        showToast("Спасибо за оценку!");
        displayAllTechniques();
    } catch (e) {
        showToast("Не удалось сохранить оценку", "error");
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
function plural(n, forms) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
}
function updateTechniquesCount() {
    const el = document.getElementById("techniques-count");
    if (!el) return;
    const total = allTechniques.length;
    el.textContent = `В базе ${total} ${plural(total, ["приём", "приёма", "приёмов"])}`;
}
function copyStructure() {
    if (!lastGenerated.length) return showToast("Сначала создайте структуру.", "error");
    const text = lastGenerated.map((t, i) => {
        let str = `${i + 1}. [${capitalize(t.category)}] ${t.name} — ${t.description || "без описания"}`;
        if (t.details) str += `\n   Подробнее: ${t.details}`;
        if (t.link) str += `\n   Ссылка: ${t.link}`;
        return str;
    }).join("\n\n");
    navigator.clipboard.writeText(text).then(() => showToast("Скопировано!"));
}
function toggleAllTechniques() {
    const container = document.getElementById("all-techniques-container");
    const mainBtn = document.getElementById("show-all-button");
    const closeWrapper = document.getElementById("close-list-wrapper");
    if (container.style.display === "block") {
        container.style.display = "none"; closeWrapper.style.display = "none"; mainBtn.textContent = "Показать все приёмы";
    } else {
        displayAllTechniques(); closeWrapper.style.display = "block"; mainBtn.textContent = "Скрыть список";
    }
}
function hideAllTechniques() {
    document.getElementById("all-techniques-container").style.display = "none";
    document.getElementById("close-list-wrapper").style.display = "none";
    document.getElementById("show-all-button").textContent = "Показать все приёмы";
}
function setFilter(category) {
    currentFilter = category;
    sortByRating = false; 
    document.getElementById("sort-by-rating").classList.remove("active");
    document.querySelectorAll(".filter-btn").forEach(btn => {
        if(btn.id !== "sort-by-rating") btn.classList.toggle("active", btn.dataset.category === category);
    });
    if (document.getElementById("all-techniques-container").style.display === "block") displayAllTechniques();
}
function toggleSortByRating() {
    sortByRating = !sortByRating;
    document.getElementById("sort-by-rating").classList.toggle("active", sortByRating);
    if (document.getElementById("all-techniques-container").style.display === "block") displayAllTechniques();
}
async function handleDeleteTechnique(event) {
    const password = prompt("Введите пароль администратора:");
    if (password !== ADMIN_PASSWORD) return showToast("Неверный пароль.", "error");
    const id = event.target.dataset.id;
    const tech = allTechniques.find(t => String(t.id) === String(id));
    if (!tech || !confirm(`Удалить приём «${tech.name}»?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error();
        allTechniques = allTechniques.filter(t => String(t.id) !== String(id));
        updateTechniquesCount(); displayAllTechniques(); showToast("Приём удалён.");
    } catch (e) { showToast("Ошибка удаления.", "error"); }
}
function toggleAddForm(show) {
    const form = document.getElementById("add-technique-form");
    const btn = document.getElementById("show-add-form-button");
    form.style.display = show ? "block" : "none";
    btn.style.display = show ? "none" : "inline-block";
    if (!show) {
        document.getElementById("technique-name").value = "";
        document.getElementById("technique-description").value = "";
        document.getElementById("technique-details").value = "";
        document.getElementById("technique-link").value = "";
        document.getElementById("technique-category").value = "";
    }
}
async function handleAddTechnique(event) {
    event.preventDefault();
    const name = document.getElementById("technique-name").value.trim();
    const category = document.getElementById("technique-category").value;
    const description = document.getElementById("technique-description").value.trim();
    const details = document.getElementById("technique-details").value.trim();
    const link = document.getElementById("technique-link").value.trim();

    if (!name) return showToast("Введите название.", "error");
    if (!category) return showToast("Выберите категорию.", "error");

    const newTech = {
        id: Date.now().toString(),
        name: name, category: category, description: description, details: details, link: link, base: false
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTech)
        });
        if (!response.ok) throw new Error();
        newTech.rating = 0; newTech.votes = 0;
        allTechniques.push(newTech);
        updateTechniquesCount(); toggleAddForm(false); showToast("Приём добавлен!");
        if (document.getElementById("all-techniques-container").style.display === "block") displayAllTechniques();
    } catch (e) { showToast("Не удалось сохранить.", "error"); }
}
function isLowPowerDevice() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    return (cores <= 2 || memory <= 2 || window.innerWidth < 360);
}

// ========== ЗАПУСК ==========
document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    if (isLowPowerDevice()) document.body.classList.add("reduced-motion");

    await loadTechniques();

    document.getElementById("generate-button").addEventListener("click", generateLessonStructure);
    document.getElementById("regenerate-button").addEventListener("click", generateLessonStructure);
    document.getElementById("copy-button").addEventListener("click", copyStructure);
    document.getElementById("show-all-button").addEventListener("click", toggleAllTechniques);
    document.getElementById("hide-all-button").addEventListener("click", hideAllTechniques);
    document.getElementById("show-add-form-button").addEventListener("click", () => toggleAddForm(true));
    document.getElementById("cancel-add-button").addEventListener("click", () => toggleAddForm(false));
    document.getElementById("add-technique-form").addEventListener("submit", handleAddTechnique);
    document.getElementById("sort-by-rating").addEventListener("click", toggleSortByRating);

    document.getElementById("search-input").addEventListener("input", (e) => {
        searchQuery = e.target.value;
        if (document.getElementById("all-techniques-container").style.display === "block") {
            displayAllTechniques();
        }
    });

    document.querySelectorAll(".filter-btn").forEach(btn => {
        if (btn.id !== "sort-by-rating") {
            btn.addEventListener("click", () => setFilter(btn.dataset.category));
        }
    });
});
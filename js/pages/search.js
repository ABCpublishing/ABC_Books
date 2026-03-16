// ===== Search Page JavaScript =====

let allBooks = [];
let searchResults = [];
let currentView = 'grid';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Get search query from URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const language = urlParams.get('language');
    const subcategory = urlParams.get('subcategory');
    const section = urlParams.get('section');

    if (query) {
        document.getElementById('searchInput').value = query;
    }

    // If section param is provided (e.g., ?section=bestseller), load that section
    if (section) {
        const sectionLabels = {
            'bestseller': 'Bestsellers',
            'trending': 'Trending Now',
            'featured': 'Featured Books',
            'newReleases': 'New Releases',
            'editors': "Editor's Choice"
        };
        const label = sectionLabels[section] || section;
        const qEl = document.getElementById('searchQuery');
        if (qEl) qEl.innerHTML = `Browsing: <strong>${label}</strong>`;
        document.title = `${label} | ABC Books`;

        loadSectionBooks(section);
        // Skip normal search flow
    } else {
        // If language param is provided, pre-check appropriate category
        if (language) {
            // Uncheck "All Categories" and check the matching language
            const allCatCheckbox = document.querySelector('input[name="category"][value="all"]');
            if (allCatCheckbox) allCatCheckbox.checked = false;

            const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
            categoryCheckboxes.forEach(cb => {
                if (cb.value !== 'all' && cb.value.toLowerCase() === language.toLowerCase()) {
                    cb.checked = true;
                } else if (cb.value !== 'all') {
                    cb.checked = false;
                }
            });

            // Update the header text
            const qEl = document.getElementById('searchQuery');
            if (qEl) {
                qEl.innerHTML = `Browsing: <strong>${language}</strong>${subcategory ? ` → <strong>${subcategory}</strong>` : ''}`;
            }
            document.title = `${language}${subcategory ? ' - ' + subcategory : ''} | ABC Books`;
        }

        // Perform search (also applies language/subcategory filters from URL)
        performSearch(query || '', language, subcategory);
    }

    // Search on Enter
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const newQuery = document.getElementById('searchInput').value.trim();
            if (newQuery) {
                window.location.href = `search.html?q=${encodeURIComponent(newQuery)}`;
            }
        }
    });

    // ===== Category Checkbox Listeners =====
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    categoryCheckboxes.forEach(cb => {
        cb.addEventListener('change', handleCategoryChange);
    });

    // ===== Rating Radio Listeners =====
    const ratingRadios = document.querySelectorAll('input[name="rating"]');
    ratingRadios.forEach(radio => {
        radio.addEventListener('change', applyAllFilters);
    });

    // ===== Price Filter: Enter key handling & Apply button ID =====
    const minInput = document.getElementById('minPrice');
    const maxInput = document.getElementById('maxPrice');
    const applyBtn = document.querySelector('.btn-apply-price');
    if (minInput) {
        minInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyPriceFilter();
        });
    }
    if (maxInput) {
        maxInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyPriceFilter();
        });
    }
    if (applyBtn) applyBtn.id = 'applyPriceBtn';
});

// Handle category checkbox change
function handleCategoryChange(e) {
    const allCheckbox = document.querySelector('input[name="category"][value="all"]');
    const otherCheckboxes = document.querySelectorAll('input[name="category"]:not([value="all"])');

    if (e.target.value === 'all') {
        // If "All Categories" is checked, uncheck all others
        if (e.target.checked) {
            otherCheckboxes.forEach(cb => cb.checked = false);
        }
    } else {
        // If a specific category is checked, uncheck "All Categories"
        if (e.target.checked) {
            allCheckbox.checked = false;
        }

        // If no specific category is checked, re-check "All Categories"
        const anyChecked = Array.from(otherCheckboxes).some(cb => cb.checked);
        if (!anyChecked) {
            allCheckbox.checked = true;
        }
    }

    applyAllFilters();
}

// ===== Master Filter Function =====
// Applies ALL filters together: category + price + rating
function applyAllFilters() {
    let filtered = [...allBooks];

    // 1. Category Filter
    const allCheckbox = document.querySelector('input[name="category"][value="all"]');
    if (!allCheckbox || !allCheckbox.checked) {
        const checkedCategories = Array.from(
            document.querySelectorAll('input[name="category"]:checked')
        ).map(cb => cb.value.toLowerCase());

        if (checkedCategories.length > 0) {
            filtered = filtered.filter(book => {
                const bookLang = (book.language || '').toLowerCase();
                const bookCat = (book.category || '').toLowerCase();

                return checkedCategories.some(cat => {
                    if (cat === 'urdu') return bookLang === 'urdu';
                    if (cat === 'english') return bookLang === 'english';
                    if (cat === 'arabic') return bookLang === 'arabic';
                    if (cat === 'kashmiri') return bookLang === 'kashmiri';
                    if (cat === 'islamic') return bookCat === 'islamic' || bookLang === 'urdu' || bookLang === 'arabic';
                    return bookLang.includes(cat) || bookCat.includes(cat);
                });
            });
        }
    }

    // 2. Price Filter
    const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseInt(document.getElementById('maxPrice').value) || Infinity;
    if (minPrice > 0 || maxPrice < Infinity) {
        filtered = filtered.filter(book => {
            const price = parseFloat(book.price) || 0;
            return price >= minPrice && price <= maxPrice;
        });
    }

    // 3. Rating Filter
    const selectedRating = document.querySelector('input[name="rating"]:checked');
    if (selectedRating) {
        const minRating = parseInt(selectedRating.value);
        filtered = filtered.filter(book => {
            return (parseFloat(book.rating) || 0) >= minRating;
        });
    }

    // Apply sorting if a sort option is selected
    const sortBy = document.getElementById('sortBy')?.value;
    if (sortBy && sortBy !== 'relevance') {
        if (sortBy === 'priceLow') {
            filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        } else if (sortBy === 'priceHigh') {
            filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        } else if (sortBy === 'rating') {
            filtered.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
        } else if (sortBy === 'newest') {
            filtered.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
        }
    }

    searchResults = filtered;
    renderResults();
}

// Perform search
async function performSearch(query, language, subcategory) {
    const container = document.getElementById('searchResults');
    const loadingHtml = `
        <div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
            <p>Searching our collection...</p>
        </div>
    `;

    if (container) container.innerHTML = loadingHtml;

    try {
        let response;
        if (typeof API !== 'undefined' && API.Books) {
            response = await API.Books.getAll({ search: query, limit: 200 });
        } else {
            console.error('API not found');
            response = { books: [] };
        }

        allBooks = response.books || [];

        // Apply URL-based language/subcategory filter on initial load
        if (language) {
            allBooks = allBooks.filter(book => {
                const bookLang = (book.language || '').toLowerCase();
                return bookLang === language.toLowerCase();
            });
        }
        if (subcategory) {
            allBooks = allBooks.filter(book => {
                const bookSub = (book.subcategory || '').toLowerCase();
                return bookSub === subcategory.toLowerCase();
            });
        }

        searchResults = [...allBooks];

        // Update UI
        if (query && !language) {
            document.title = `"${query}" - Search Results | ABC Books`;
            const qEl = document.getElementById('searchQuery');
            if (qEl) qEl.innerHTML = `Showing results for: <strong>"${query}"</strong>`;
        } else if (!language) {
            const qEl = document.getElementById('searchQuery');
            if (qEl) qEl.innerHTML = 'Browse All Books';
        }

        // Apply any pre-set filters (e.g., from URL language params that set checkboxes)
        applyAllFilters();

    } catch (error) {
        console.error('Search error:', error);
        if (container) container.innerHTML = `<p class="error-msg">Error loading results. Please try again.</p>`;
    }
}

// Render results
function renderResults() {
    const container = document.getElementById('searchResults');
    const noResults = document.getElementById('noResults');
    const countEl = document.getElementById('resultsCount');

    if (!container || !noResults) return;

    if (searchResults.length === 0) {
        container.style.display = 'none';
        noResults.style.display = 'block';
        if (countEl) countEl.textContent = 'No results found';
        return;
    }

    container.style.display = currentView === 'grid' ? 'grid' : 'flex';
    container.className = currentView === 'grid' ? 'results-grid' : 'results-list';
    noResults.style.display = 'none';
    if (countEl) countEl.textContent = `Showing ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`;

    if (currentView === 'grid') {
        container.innerHTML = searchResults.map(book => createGridCard(book)).join('');
    } else {
        container.innerHTML = searchResults.map(book => createListCard(book)).join('');
    }
}

// Create grid card HTML
function createGridCard(book) {
    const price = parseFloat(book.price) || 0;
    const originalPrice = parseFloat(book.originalPrice || book.original_price) || price;
    const discount = originalPrice > price
        ? Math.floor(((originalPrice - price) / originalPrice) * 100)
        : 0;

    const imageSrc = book.image || 'https://via.placeholder.com/200x300?text=No+Image';

    return `
        <div class="result-card" onclick="viewBook('${book.id}')">
            <div class="book-image">
                ${discount > 0 ? `<span class="discount-tag">-${discount}%</span>` : ''}
                <div class="quick-actions">
                    <button onclick="event.stopPropagation(); handleAddToWishlist('${book.id}')" title="Add to Wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                    <button onclick="event.stopPropagation(); handleAddToCart('${book.id}')" title="Add to Cart">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
                <img src="${imageSrc}" alt="${book.title}"
                    onerror="this.src='https://via.placeholder.com/200x300?text=Cover+Not+Found'">
            </div>
            <div class="book-info">
                <h3 class="book-title" title="${book.title}">${book.title}</h3>
                <p class="book-author">${book.author || 'Unknown Author'}</p>
                <div class="book-rating">
                    ${generateStars(book.rating || 4.5)}
                    <span>(${book.rating || 4.5})</span>
                </div>
                <div class="book-price">
                    <span class="current-price">₹${book.price}</span>
                    ${book.original_price ? `<span class="original-price">₹${book.original_price}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Create list card HTML
function createListCard(book) {
    const imageSrc = book.image || 'https://via.placeholder.com/200x300?text=No+Image';

    return `
        <div class="result-card-list" onclick="viewBook('${book.id}')">
            <div class="book-image">
                <img src="${imageSrc}" alt="${book.title}"
                    onerror="this.src='https://via.placeholder.com/200x300?text=Cover+Not+Found'">
            </div>
            <div class="book-details">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">by ${book.author || 'Unknown Author'}</p>
                <p class="book-description">${book.description ? book.description.substring(0, 150) + '...' : 'No description available.'}</p>
                <div class="book-meta">
                    <div class="book-price">
                        <span class="current-price">₹${book.price}</span>
                        ${book.original_price ? `<span class="original-price">₹${book.original_price}</span>` : ''}
                    </div>
                    <div class="book-actions">
                        <button class="btn-add-cart" onclick="event.stopPropagation(); handleAddToCart('${book.id}')">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate star rating
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = fullStars + (halfStar ? 1 : 0); i < 5; i++) {
        stars += '<i class="far fa-star"></i>';
    }

    return stars;
}

// View book details
function viewBook(bookId) {
    window.location.href = `book-detail.html?id=${bookId}`;
}

// Toggle view
function toggleView(view) {
    currentView = view;
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    renderResults();
}

// Sort results (Client Side)
function sortResults() {
    // Just re-apply all filters, which will now also apply the selected sort
    applyAllFilters();
}

// Load books by section (e.g., bestseller, trending)
async function loadSectionBooks(section) {
    const container = document.getElementById('searchResults');
    const loadingHtml = `
        <div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
            <p>Loading books...</p>
        </div>
    `;
    if (container) container.innerHTML = loadingHtml;

    try {
        let books = [];
        if (typeof API !== 'undefined' && API.Books) {
            const response = await API.Books.getBySection(section);
            books = response.books || [];
        }

        allBooks = books;
        searchResults = [...allBooks];

        const countEl = document.getElementById('resultsCount');
        if (countEl) countEl.textContent = `Showing ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`;

        renderResults();

        // If no books in section, show a helpful message
        if (searchResults.length === 0) {
            const noResults = document.getElementById('noResults');
            if (noResults) {
                noResults.style.display = 'block';
                noResults.querySelector('h2').textContent = 'No Bestsellers Yet';
                noResults.querySelector('p').textContent = 'Bestsellers will appear here once the admin marks books as bestsellers.';
            }
        }
    } catch (error) {
        console.error('Section load error:', error);
        if (container) container.innerHTML = `<p class="error-msg">Error loading books. Please try again.</p>`;
    }
}

// Apply price filter - calls master filter
function applyPriceFilter() {
    applyAllFilters();
}

// Clear filters
function clearFilters() {
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';

    // Reset category: check "All", uncheck others
    const allCheckbox = document.querySelector('input[name="category"][value="all"]');
    if (allCheckbox) allCheckbox.checked = true;
    document.querySelectorAll('input[name="category"]:not([value="all"])').forEach(cb => cb.checked = false);

    // Reset rating
    document.querySelectorAll('input[name="rating"]').forEach(r => r.checked = false);

    searchResults = [...allBooks];
    renderResults();
}

// Wishlist/cart integration using global books-data.js functions
function handleAddToWishlist(bookId) {
    const book = searchResults.find(b => String(b.id) === String(bookId));
    if (book && typeof addToWishlist === 'function') {
        addToWishlist(bookId, book);
    } else {
        console.warn('addToWishlist function not available or book not found');
    }
}

function handleAddToCart(bookId) {
    const book = searchResults.find(b => String(b.id) === String(bookId));
    if (book && typeof addToCart === 'function') {
        addToCart(bookId, book);
    } else {
        console.warn('addToCart function not available or book not found');
    }
}


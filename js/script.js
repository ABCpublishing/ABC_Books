// ===== Hero Books Carousel =====
// ===== Hero Books Section (Dynamic) =====
async function renderHeroBooks() {
    console.log('ℹ️ Hero section dynamic replacement is disabled to keep static design.');
    // Function kept for compatibility but logic removed to prioritize static illustration
}

// ===== Dynamic Homepage Sections =====
async function renderHomePageSections() {
    const safeRenderSection = async (sectionKey, containerId) => {
        try {
            const books = await getBooksForSection(sectionKey);
            const container = document.getElementById(containerId);
            if (container && books.length > 0) {
                container.innerHTML = books.map(book => createBookCard(book)).join('');
            } else if (container) {
                container.innerHTML = '<p class="no-data" style="text-align: center; width: 100%; color: #888; padding: 20px;">No books available in this section yet.</p>';
            }
        } catch (error) {
            console.warn(`Failed to render ${sectionKey}:`, error);
        }
    };

    await Promise.allSettled([
        safeRenderSection('newArrivals', 'newArrivalsBooks'),
        safeRenderSection('bestSellers', 'bestSellersBooks'),
        safeRenderSection('editorsChoice', 'editorsChoiceBooks'),
        safeRenderSection('childrenCorner', 'childrenCornerBooks'),
        safeRenderSection('comicBooks', 'comicBooksBooks'),
        safeRenderSection('boxSets', 'boxSetsBooks'),
        safeRenderSection('examBooks', 'examBooksBooks')
    ]);

    // Initialize all sliders!
    setupSlider('.new-arrivals-track', '.new-arrivals-prev', '.new-arrivals-next');
    setupSlider('.best-sellers-track', '.best-sellers-prev', '.best-sellers-next');
    setupSlider('.editors-choice-track', '.editors-choice-prev', '.editors-choice-next');
    setupSlider('.children-corner-track', '.children-corner-prev', '.children-corner-next');
    setupSlider('.comic-books-track', '.comic-books-prev', '.comic-books-next');
    setupSlider('.box-sets-track', '.box-sets-prev', '.box-sets-next');
    setupSlider('.exam-books-track', '.exam-books-prev', '.exam-books-next');
}


// ===== Slider Functions =====

function initializeHeroSlider() {
    const track = document.getElementById('heroBooks');
    const prevBtn = document.querySelector('.hero-books-slider .prev');
    const nextBtn = document.querySelector('.hero-books-slider .next');
    const dotsContainer = document.getElementById('heroDots');
    const sliderContainer = document.querySelector('.hero-books-slider');

    if (!track || !prevBtn || !nextBtn) {
        console.error('Carousel elements not found');
        return;
    }

    let originalCards = Array.from(track.querySelectorAll('.book-card'));
    if (originalCards.length === 0) {
        console.warn('No books found for carousel');
        return;
    }

    console.log(`🎠 Initializing carousel with ${originalCards.length} books`);

    const cardWidth = originalCards[0].offsetWidth + 15;
    const visibleCards = Math.floor(track.parentElement.offsetWidth / cardWidth);

    // Only use infinite scroll if we have enough books (at least 8)
    const useInfiniteScroll = originalCards.length >= 8;
    let currentIndex = 0;
    let isTransitioning = false;
    let autoScrollInterval;
    let allCards = originalCards;

    if (useInfiniteScroll) {
        console.log('✅ Using infinite scroll mode');
        // Clone slides for infinite effect
        const clonesToAdd = Math.min(3, Math.floor(originalCards.length / 2));
        const firstClones = originalCards.slice(0, clonesToAdd).map(card => card.cloneNode(true));
        const lastClones = originalCards.slice(-clonesToAdd).map(card => card.cloneNode(true));

        lastClones.forEach(clone => track.insertBefore(clone, track.firstChild));
        firstClones.forEach(clone => track.appendChild(clone));

        allCards = Array.from(track.querySelectorAll('.book-card'));
        currentIndex = clonesToAdd;

        // Set initial position
        track.style.transition = 'none';
        track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
        track.offsetHeight;
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

        // Handle infinite loop
        track.addEventListener('transitionend', function handleTransitionEnd() {
            isTransitioning = false;

            if (currentIndex <= clonesToAdd - 1) {
                currentIndex = originalCards.length + clonesToAdd - 1;
                track.style.transition = 'none';
                track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
                track.offsetHeight;
                track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            } else if (currentIndex >= clonesToAdd + originalCards.length) {
                currentIndex = clonesToAdd;
                track.style.transition = 'none';
                track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
                track.offsetHeight;
                track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            }
        });
    } else {
        console.log('⚠️ Using simple scroll mode (not enough books for infinite)');
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    // Create dots
    if (dotsContainer) {
        const dotCount = Math.ceil(originalCards.length / visibleCards);
        dotsContainer.innerHTML = Array(dotCount).fill(0).map((_, i) =>
            `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
        ).join('');

        dotsContainer.querySelectorAll('.dot').forEach((dot, index) => {
            dot.addEventListener('click', () => {
                if (isTransitioning) return;
                if (useInfiniteScroll) {
                    currentIndex = (index * visibleCards) + (originalCards.length >= 8 ? Math.min(3, Math.floor(originalCards.length / 2)) : 0);
                } else {
                    currentIndex = Math.min(index * visibleCards, originalCards.length - visibleCards);
                }
                updateSlider();
                resetAutoScroll();
            });
        });
    }

    function updateSlider() {
        track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

        // Update dots
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.dot');
            const realIndex = useInfiniteScroll ? currentIndex - Math.min(3, Math.floor(originalCards.length / 2)) : currentIndex;
            const activeDot = Math.floor(realIndex / visibleCards);
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === activeDot);
            });
        }

        // Update button states (only for non-infinite mode)
        if (!useInfiniteScroll) {
            const maxScroll = Math.max(0, originalCards.length - visibleCards);
            prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
            prevBtn.style.cursor = currentIndex === 0 ? 'not-allowed' : 'pointer';
            nextBtn.style.opacity = currentIndex >= maxScroll ? '0.5' : '1';
            nextBtn.style.cursor = currentIndex >= maxScroll ? 'not-allowed' : 'pointer';
        }
    }

    function nextSlide() {
        if (isTransitioning) return;

        if (useInfiniteScroll) {
            isTransitioning = true;
            currentIndex++;
            updateSlider();
        } else {
            const maxScroll = Math.max(0, originalCards.length - visibleCards);
            if (currentIndex < maxScroll) {
                currentIndex++;
                updateSlider();
            } else {
                currentIndex = 0; // Loop to start
                updateSlider();
            }
        }
    }

    function prevSlide() {
        if (isTransitioning) return;

        if (useInfiniteScroll) {
            isTransitioning = true;
            currentIndex--;
            updateSlider();
        } else {
            if (currentIndex > 0) {
                currentIndex--;
                updateSlider();
            } else {
                const maxScroll = Math.max(0, originalCards.length - visibleCards);
                currentIndex = maxScroll; // Loop to end
                updateSlider();
            }
        }
    }

    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoScroll();
    });

    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoScroll();
    });

    // Auto-scroll
    function startAutoScroll() {
        autoScrollInterval = setInterval(nextSlide, 3500);
    }

    function stopAutoScroll() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
        }
    }

    function resetAutoScroll() {
        stopAutoScroll();
        startAutoScroll();
    }

    // Pause on hover
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', stopAutoScroll);
        sliderContainer.addEventListener('mouseleave', startAutoScroll);
    }

    startAutoScroll();
    updateSlider();

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const newCardWidth = allCards[0].offsetWidth + 15;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${currentIndex * newCardWidth}px)`;
            track.offsetHeight;
            track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        }, 250);
    });

    console.log('✅ Carousel initialized successfully');
}

function initializeTrendingSlider() {
    setupSlider('.trending-books-track', '.trending-prev', '.trending-next');
}

function initializeReleasesSlider() {
    setupSlider('.new-releases-track', '.releases-prev', '.releases-next');
}

function initializeChildrenSlider() {
    setupSlider('.children-books-track', '.children-prev', '.children-next');
}

function setupSlider(trackSelector, prevSelector, nextSelector) {
    const track = document.querySelector(trackSelector);
    const prevBtn = document.querySelector(prevSelector);
    const nextBtn = document.querySelector(nextSelector);

    if (!track || !prevBtn || !nextBtn) return;

    const cards = track.querySelectorAll('.book-card');
    if (cards.length === 0) return;

    // Force overflow hidden on parent so translateX works properly
    track.style.overflow = 'hidden';
    track.style.scrollSnapType = 'none';

    // Create inner wrapper for transform
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '15px';
    wrapper.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    wrapper.style.willChange = 'transform';

    // Move cards into wrapper
    while (track.firstChild) {
        wrapper.appendChild(track.firstChild);
    }
    track.appendChild(wrapper);

    let currentIndex = 0;

    function getMetrics() {
        const cardEl = wrapper.querySelector('.book-card');
        if (!cardEl) return { cardWidth: 235, visibleCards: 3, maxIndex: 0 };
        const style = window.getComputedStyle(cardEl);
        const cardWidth = cardEl.offsetWidth + 15; // card + gap
        const visibleCards = Math.floor(track.offsetWidth / cardWidth) || 1;
        const maxIndex = Math.max(0, cards.length - visibleCards);
        return { cardWidth, visibleCards, maxIndex };
    }

    function updateSlider() {
        const { cardWidth, maxIndex } = getMetrics();
        currentIndex = Math.min(currentIndex, maxIndex);
        currentIndex = Math.max(currentIndex, 0);
        wrapper.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

        // Update button states
        prevBtn.style.opacity = currentIndex === 0 ? '0.3' : '1';
        prevBtn.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
        nextBtn.style.opacity = currentIndex >= maxIndex ? '0.3' : '1';
        nextBtn.style.pointerEvents = currentIndex >= maxIndex ? 'none' : 'auto';
    }

    nextBtn.addEventListener('click', () => {
        const { maxIndex } = getMetrics();
        if (currentIndex < maxIndex) {
            currentIndex++;
            updateSlider();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateSlider();
        }
    });

    // Handle resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateSlider, 200);
    });

    updateSlider();
}

// ===== Category Strip Scroll =====
function initializeCategoryStrip() {
    const strip = document.getElementById('categoriesStrip');
    const prevBtn = document.querySelector('.strip-prev');
    const nextBtn = document.querySelector('.strip-next');

    if (!strip || !prevBtn || !nextBtn) return;

    prevBtn.addEventListener('click', () => {
        strip.scrollBy({ left: -300, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        strip.scrollBy({ left: 300, behavior: 'smooth' });
    });
}

// ===== Top 100 Modal =====
function initializeTop100Modal() {
    const modal = document.getElementById('top100Modal');
    const trigger = document.getElementById('top100Trigger');
    const closeBtn = document.getElementById('closeTop100');

    if (!modal || !trigger || !closeBtn) return;

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
}

// ===== Search Functionality =====
function initializeSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-btn');

    if (!searchInput || !searchBtn) return;

    function handleSearch() {
        const query = searchInput.value.trim();
        if (query.length === 0) return;

        // ALWAYS use absolute path from root for search
        const searchPath = '/pages/search.html';
        window.location.href = `${searchPath}?q=${encodeURIComponent(query)}`;
    }

    searchBtn.addEventListener('click', handleSearch);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

// ===== Wishlist & Cart Functionality =====
function initializeInteractions() {
    // Add to cart buttons
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.add-to-cart-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.add-to-cart-btn');
            const bookCard = btn.closest('.book-card');

            // Get book data from the card
            const bookId = bookCard.dataset.bookId || Math.floor(Math.random() * 1000); // Fallback ID
            const bookData = {
                title: bookCard.querySelector('.book-title')?.textContent || bookCard.querySelector('h3')?.textContent || 'Unknown',
                author: bookCard.querySelector('.book-author')?.textContent || 'Unknown',
                price: parseFloat(bookCard.querySelector('.price-current')?.textContent.replace('₹', '')) || 0,
                image: bookCard.querySelector('img')?.src || ''
            };

            // Call the addToCart function which checks for login
            await addToCart(bookId, bookData);
        }

        // Wishlist buttons
        if (e.target.closest('.wishlist-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.wishlist-btn');
            const bookCard = btn.closest('.book-card');
            const icon = btn.querySelector('i');

            // Get book data from the card
            const bookId = bookCard.dataset.bookId || Math.floor(Math.random() * 1000);
            const bookData = {
                title: bookCard.querySelector('.book-title')?.textContent || bookCard.querySelector('h3')?.textContent || 'Unknown',
                author: bookCard.querySelector('.book-author')?.textContent || 'Unknown',
                price: parseFloat(bookCard.querySelector('.price-current')?.textContent.replace('₹', '')) || 0,
                image: bookCard.querySelector('img')?.src || ''
            };

            // Check if already in wishlist (filled heart)
            if (icon.classList.contains('far')) {
                // Add to wishlist
                await addToWishlist(bookId, bookData);
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#c0392b';
            } else {
                // Remove from wishlist (would need API call)
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
            }
        }
    });
}

// Update badge count (relative change)
function updateCartBadge(change = 0) {
    const badge = document.getElementById('cartCount');
    if (badge) {
        const current = parseInt(badge.textContent) || 0;
        const finalCount = current + (parseInt(change) || 0);
        badge.textContent = Math.max(0, finalCount);
    }
}

function updateWishlistBadge(change = 0) {
    const badge = document.getElementById('wishlistCount');
    if (badge) {
        const current = parseInt(badge.textContent) || 0;
        const finalCount = current + (parseInt(change) || 0);
        badge.textContent = Math.max(0, finalCount);
    }
}

// ===== Proceed to Checkout =====
// Function removed to allow user-auth-api.js version to handle validation.


// ===== Newsletter Form =====
function initializeNewsletter() {
    const form = document.querySelector('.newsletter-form');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const email = input.value.trim();

        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert(`Thank you for subscribing with ${email}!`);
            input.value = '';
        } else {
            alert('Please enter a valid email address');
        }
    });
}

// ===== Loading Indicator =====
function showLoading() {
    // 1. Check for persistent cache - if it exists and is fresh, skip the blocking loader
    const PERSISTENT_CACHE_KEY = 'abc_books_data_cache';
    const PERSISTENT_CACHE_TTL = 30 * 60 * 1000;
    const stored = localStorage.getItem(PERSISTENT_CACHE_KEY);

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Date.now() - parsed.timestamp < PERSISTENT_CACHE_TTL) {
                console.log('⚡ Skipping loader due to fresh cache');
                return; // Don't show the full-screen loader
            }
        } catch (e) { }
    }

    const loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            flex-direction: column;
            backdrop-filter: blur(5px);
        ">
            <i class="fas fa-book-open" style="font-size: 48px; color: #8B0000; animation: pulse 1.5s infinite;"></i>
            <p style="margin-top: 20px; color: #8B0000; font-size: 18px; font-weight: 600;">Loading Amazing Books...</p>
        </div>
    `;
    document.body.appendChild(loader);

    // 2. SAFETY TIMEOUT: Force hide the loader after 2.5 seconds no matter what
    setTimeout(() => {
        if (document.getElementById('page-loader')) {
            console.warn('🕒 Loader safety timeout reached (2.5s)');
            hideLoading();
        }
    }, 2500);
}

function hideLoading() {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.remove();
    }
}

// ===== Dynamic Menus =====
async function renderDynamicMenus() {
    try {
        if (!window.API || !window.API.Categories) return;
        
        const res = await API.Categories.getAll();
        const categories = res.categories;
        const allCategories = res.all || [];
        
        if (!categories || categories.length === 0) return;

        // 1. Desktop Menu
        const desktopAnchor = document.getElementById('dynamicDesktopCategories');
        if (desktopAnchor) {
            desktopAnchor.innerHTML = categories.map(lang => {
                const icon = lang.icon || 'fa-book';
                let color = '#333';
                if (lang.name.toLowerCase() === 'urdu') color = '#8B0000';
                if (lang.name.toLowerCase() === 'english') color = '#2c3e50';
                if (lang.name.toLowerCase() === 'arabic') color = '#27ae60';
                if (lang.name.toLowerCase() === 'kashmiri') color = '#8e44ad';

                let mySubcats = lang.subcategories || [];
                // Fallback for flat categories created without parent_id in admin panel
                if (mySubcats.length === 0) {
                    mySubcats = allCategories.filter(c => !c.is_language && c.name.toLowerCase().includes(lang.name.toLowerCase()));
                }

                let subHTML = '';
                if (mySubcats.length > 0) {
                    subHTML = mySubcats.map(sub => {
                        let displayName = sub.name.replace(new RegExp(`^${lang.name}\\s*`, 'i'), '').trim();
                        displayName = displayName.replace(new RegExp(`\\s*${lang.name}$`, 'i'), '').trim();
                        if (displayName === '') displayName = sub.name;
                        
                        // Add icon for beautiful styling
                        return `<a href="/pages/search.html?language=${encodeURIComponent(lang.name)}&subcategory=${encodeURIComponent(sub.name)}"><i class="fas fa-angle-right"></i> ${displayName}</a>`;
                    }).join('');
                } else {
                    subHTML = `<a href="/pages/search.html?language=${encodeURIComponent(lang.name)}" style="color: #888; font-style: italic;"><i class="fas fa-info-circle"></i> No subcategories</a>`;
                }

                return `
                    <li class="nav-dropdown-item">
                        <a href="/pages/search.html?language=${encodeURIComponent(lang.name)}" class="nav-link">${lang.name} <i class="fas fa-chevron-down" style="font-size: 10px; margin-left: 4px;"></i></a>
                        <div class="nav-dropdown-menu">
                            ${subHTML}
                        </div>
                    </li>
                `;
            }).join('');
        }

        // 2. Mobile Menu
        const mobileAnchor = document.getElementById('dynamicMobileCategories');
        if (mobileAnchor) {
            mobileAnchor.innerHTML = categories.map(lang => {
                const icon = lang.icon || 'fa-book';
                let color = '#333';
                if (lang.name.toLowerCase() === 'urdu') color = '#8B0000';
                if (lang.name.toLowerCase() === 'english') color = '#2c3e50';
                if (lang.name.toLowerCase() === 'arabic') color = '#27ae60';
                if (lang.name.toLowerCase() === 'kashmiri') color = '#8e44ad';

                let mySubcats = lang.subcategories || [];
                if (mySubcats.length === 0) {
                    mySubcats = allCategories.filter(c => !c.is_language && c.name.toLowerCase().includes(lang.name.toLowerCase()));
                }

                let subHTML = '';
                if (mySubcats.length > 0) {
                    subHTML = mySubcats.map(sub => {
                        let displayName = sub.name.replace(new RegExp(`^${lang.name}\\s*`, 'i'), '').trim();
                        displayName = displayName.replace(new RegExp(`\\s*${lang.name}$`, 'i'), '').trim();
                        if (displayName === '') displayName = sub.name;
                        
                        return `<li><a href="/pages/search.html?language=${encodeURIComponent(lang.name)}&subcategory=${encodeURIComponent(sub.name)}">${displayName}</a></li>`;
                    }).join('');
                } else {
                    subHTML = `<li><a href="/pages/search.html?language=${encodeURIComponent(lang.name)}" style="color: #888; font-style: italic;">No subcategories</a></li>`;
                }

                return `
                    <li class="mobile-has-submenu">
                        <a href="#" class="mobile-nav-link" onclick="event.preventDefault(); toggleMobileSubmenu(this)" style="color: ${color}; font-weight: bold;">
                            <i class="fas ${icon}"></i> ${lang.name} <i class="fas fa-chevron-down"></i>
                        </a>
                        <ul class="mobile-submenu">
                            ${subHTML}
                        </ul>
                    </li>
                `;
            }).join('');
        }
    } catch (e) {
        console.error('Failed to render dynamic menus:', e);
    }
}

// ===== Initialize Everything =====
async function initializeWebsite() {
    showLoading();

    try {
        // 0. Render dynamic menus from database
        await renderDynamicMenus();

        // 1. Render all homepage sections correctly
        await renderHomePageSections();
        
        // 2. Load other modal sections in background (Non-blocking)
        if (typeof renderTop100Books === 'function') {
            renderTop100Books().then(() => {
                initializeTop100Modal();
            }).catch(console.warn);
        }

        // 3. Hide loader and enable UI
        hideLoading();
        initializeSearch();
        initializeInteractions();
        initializeCategoryStrip();

        // Initialize Modern Hero Animations
        const heroText = document.querySelector('.hero-text');
        if (heroText) {
            heroText.style.opacity = '1';
            const children = heroText.children;
            Array.from(children).forEach((child, index) => {
                child.style.opacity = '0';
                child.style.animation = `fadeInUp 0.8s ${index * 0.1}s forwards`;
            });
        }

        console.log('🚀 ABC Books initial content ready!');
        initializeNewsletter();

    } catch (error) {
        console.error('Error initializing website:', error);
        hideLoading();
        console.warn('⚠️ Some content may not have loaded. The page should still be usable.');
    }
}

// ===== DOM Content Loaded =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebsite);
} else {
    initializeWebsite();
}

// Add pulse animation for loading
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
    }
`;
document.head.appendChild(style);

// ===== Global UI Utilities =====

// Show notification
function showNotification(message, type = 'success') {
    // Remove existing notifications to prevent stacking too many
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    let icon = 'fa-check-circle';
    let bg = 'linear-gradient(135deg, #27ae60, #2ecc71)'; // Green

    if (type === 'error') {
        icon = 'fa-exclamation-circle';
        bg = 'linear-gradient(135deg, #e74c3c, #c0392b)'; // Red
    } else if (type === 'info') {
        icon = 'fa-info-circle';
        bg = 'linear-gradient(135deg, #3498db, #2980b9)'; // Blue
    }

    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${bg};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 250px;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Mobile menu functions are in mobile-menu.js

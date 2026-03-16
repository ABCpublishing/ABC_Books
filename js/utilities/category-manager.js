// Category Management Functions
// This file handles all category-related operations in the admin panel using the database API

// Initialize categories
async function initializeCategories() {
    await loadCategoriesTable();
}

// Show Add Category Modal
async function showAddCategoryModal() {
    document.getElementById('categoryModalTitle').textContent = 'Add New Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';

    // Populate parent category dropdown (only for subcategories)
    await populateParentCategories();

    document.getElementById('categoryModal').classList.add('active');
}

async function populateParentCategories() {
    try {
        const response = await API.Categories.getLanguages();
        const languages = response.languages || [];
        const parentSelect = document.getElementById('categoryType'); // Reusing this select for Parent if needed, but wait

        // Actually, let's keep the 'categoryType' for now but maybe rename its purpose or labels
        // For the new schema, we have 'Language' (is_language=true) or 'Subcategory' (parent_id set)
    } catch (e) {
        console.error('Error loading languages for parent selection', e);
    }
}

// Handle category type change (Legacy/UI compatibility)
function handleCategoryTypeChange() {
    const type = document.getElementById('categoryType').value;
    const subcategoriesGroup = document.getElementById('subcategoriesGroup');
    const bookCountGroup = document.getElementById('bookCountGroup');

    // This UI logic is legacy but we'll adapt it
    if (type === 'dropdown') {
        subcategoriesGroup.style.display = 'block';
        bookCountGroup.style.display = 'none';
    } else if (type === 'showcase') {
        subcategoriesGroup.style.display = 'none';
        bookCountGroup.style.display = 'block';
    } else {
        subcategoriesGroup.style.display = 'none';
        bookCountGroup.style.display = 'none';
    }
}

// Close Category Modal
function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('iconPickerDropdown').style.display = 'none';
}

// Toggle Icon Picker
function toggleIconPicker() {
    const dropdown = document.getElementById('iconPickerDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// Icon Picker Selection
document.addEventListener('DOMContentLoaded', function () {
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(option => {
        option.addEventListener('click', function () {
            // Remove previous selection
            iconOptions.forEach(opt => opt.classList.remove('selected'));

            // Add selection to clicked icon
            this.classList.add('selected');

            // Set the icon value
            const iconClass = this.getAttribute('data-icon');
            document.getElementById('categoryIcon').value = iconClass;

            // Hide dropdown
            document.getElementById('iconPickerDropdown').style.display = 'none';
        });
    });
});

// Save Category
document.addEventListener('DOMContentLoaded', function () {
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveCategory();
        });
    }
});

async function saveCategory() {
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();
    const type = document.getElementById('categoryType').value;
    const icon = document.getElementById('categoryIcon').value;
    const visible = document.getElementById('categoryVisible').checked;

    if (!name || !icon) {
        alert('Please fill in all required fields');
        return;
    }

    // Map the UI "Type" to database fields if needed, or just use name/slug
    // For now, let's treat Languages as "dropdown" type from old UI
    const categoryData = {
        name,
        icon,
        visible,
        is_language: type === 'dropdown',
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    };

    try {
        if (id) {
            await API.Categories.update(id, categoryData);
            alert('Category updated successfully!');
        } else {
            await API.Categories.create(categoryData);
            alert('Category added successfully!');
        }
        closeCategoryModal();
        loadCategoriesTable();
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error saving category: ' + error.message);
    }
}

// Load Categories Table
async function loadCategoriesTable() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-spinner fa-spin"></i> Loading categories from database...</td></tr>';

    try {
        const response = await API.Categories.getAll();
        const categories = response.all || [];

        if (categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No categories found in database</td></tr>';
            return;
        }

        tbody.innerHTML = categories.map(cat => `
            <tr>
                <td><i class="fas ${cat.icon || 'fa-book'}" style="font-size: 20px; color: var(--primary-color);"></i></td>
                <td><strong>${cat.name}</strong></td>
                <td><span class="badge">${cat.is_language ? 'Language' : 'Subcategory'}</span></td>
                <td>${cat.slug}</td>
                <td>
                    <label class="checkbox-label">
                        <input type="checkbox" ${cat.visible ? 'checked' : ''} onchange="toggleCategoryVisibility('${cat.id}')">
                        <span>${cat.visible ? 'Visible' : 'Hidden'}</span>
                    </label>
                </td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn edit" onclick="editCategory('${cat.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn delete" onclick="deleteCategory('${cat.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error: ${error.message}</td></tr>`;
    }
}

// Edit Category
async function editCategory(id) {
    try {
        const response = await API.Categories.getById(id);
        const category = response.category;

        if (!category) return;

        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryType').value = category.is_language ? 'dropdown' : '';
        document.getElementById('categoryIcon').value = category.icon;
        document.getElementById('categoryVisible').checked = category.visible;

        document.getElementById('categoryModal').classList.add('active');
    } catch (error) {
        alert('Error loading category details');
    }
}

// Delete Category
async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
        await API.Categories.delete(id);
        alert('Category deleted successfully!');
        loadCategoriesTable();
    } catch (error) {
        alert('Error deleting category: ' + error.message);
    }
}

// Toggle Category Visibility
async function toggleCategoryVisibility(id) {
    try {
        const response = await API.Categories.getById(id);
        const category = response.category;
        if (category) {
            await API.Categories.update(id, {
                ...category,
                visible: !category.visible
            });
            loadCategoriesTable();
        }
    } catch (error) {
        console.error('Error toggling visibility:', error);
    }
}

// Category Tab Switching
document.addEventListener('DOMContentLoaded', function () {
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            categoryTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const filterType = this.getAttribute('data-tab');
            filterCategoriesByType(filterType);
        });
    });
});

async function filterCategoriesByType(type) {
    // Basic mapping for legacy tabs
    try {
        const response = await API.Categories.getAll();
        const allCategories = response.all || [];

        let filtered = [];
        if (type === 'dropdown') {
            filtered = allCategories.filter(c => c.is_language);
        } else if (type === 'strip') {
            filtered = allCategories.filter(c => !c.is_language);
        } else {
            filtered = allCategories;
        }

        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="no-data">No categories found for this filter</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(cat => `
            <tr>
                <td><i class="fas ${cat.icon || 'fa-book'}" style="font-size: 20px; color: var(--primary-color);"></i></td>
                <td><strong>${cat.name}</strong></td>
                <td><span class="badge">${cat.is_language ? 'Language' : 'Subcategory'}</span></td>
                <td>${cat.slug}</td>
                <td>
                    <label class="checkbox-label">
                        <input type="checkbox" ${cat.visible ? 'checked' : ''} onchange="toggleCategoryVisibility('${cat.id}')">
                        <span>${cat.visible ? 'Visible' : 'Hidden'}</span>
                    </label>
                </td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn edit" onclick="editCategory('${cat.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn delete" onclick="deleteCategory('${cat.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

// Initialize categories when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCategories);
} else {
    initializeCategories();
}

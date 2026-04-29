// ===== CATEGORY MANAGER =====
// Handles the CRUD operations for Categories in the Admin Dashboard

// Load logic for Categories table
async function loadCategoriesTable() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-spinner fa-spin"></i> Loading categories...</td></tr>';

    try {
        const response = await API.Categories.getAll();
        const categories = response.all || [];

        if (categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No categories yet. Click Add Category to create one.</td></tr>';
            return;
        }

        tbody.innerHTML = categories.map(cat => `
            <tr>
                <td><i class="fas ${cat.icon || 'fa-folder'}"></i></td>
                <td><strong>${cat.name}</strong><br><small style="color: #888;">/${cat.slug}</small></td>
                <td>${cat.is_language ? '<span class="badge" style="background:#3498db">Language/Main</span>' : '<span class="badge" style="background:#e67e22">Subcategory</span>'}</td>
                <td>${cat.type || 'strip'}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" onchange="toggleCategoryVisibility(${cat.id}, this.checked)" ${cat.visible ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn edit" onclick="editCategory(${cat.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete" onclick="deleteCategory(${cat.id})" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading categories:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="no-data" style="color:red;">Error loading categories: ' + error.message + '</td></tr>';
    }
}

// Global scope bindings
window.loadCategoriesTable = loadCategoriesTable;

// Show Add Modal
window.showAddCategoryModal = async function() {
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryModalTitle').textContent = 'Add New Category';
    
    // Load parent categories for the dropdown
    await loadParentCategories();
    
    document.getElementById('categoryModal').classList.add('active');
};

window.closeCategoryModal = function() {
    document.getElementById('categoryModal').classList.remove('active');
};

window.handleCategoryTypeChange = function() {
    const type = document.getElementById('categoryType').value;
    const parentGroup = document.getElementById('parentCategoryGroup');
    if (type === 'strip') {
        parentGroup.style.display = 'block';
        document.getElementById('categoryParentId').required = true;
    } else {
        parentGroup.style.display = 'none';
        document.getElementById('categoryParentId').required = false;
    }
};

async function loadParentCategories() {
    const parentSelect = document.getElementById('categoryParentId');
    parentSelect.innerHTML = '<option value="">Loading...</option>';
    try {
        const res = await API.Categories.getLanguages();
        const languages = res.languages || [];
        parentSelect.innerHTML = '<option value="">-- Select Parent Language/Category --</option>';
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.id;
            option.textContent = lang.name;
            parentSelect.appendChild(option);
        });
    } catch (e) {
        parentSelect.innerHTML = '<option value="">Error loading</option>';
    }
}

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('categoryId').value;
            const name = document.getElementById('categoryName').value;
            const type = document.getElementById('categoryType').value;
            const parentId = document.getElementById('categoryParentId').value;
            const icon = document.getElementById('categoryIcon')?.value || 'fa-folder';
            const visible = document.getElementById('categoryVisible')?.checked ?? true;
            
            const isLang = type === 'dropdown';
            const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            const data = {
                name,
                slug,
                icon,
                is_language: isLang,
                parent_id: type === 'strip' ? (parseInt(parentId) || null) : null,
                visible,
                type: type || 'dropdown'
            };

            try {
                if (id) {
                    await API.Categories.update(id, data);
                    alert('Category updated successfully!');
                } else {
                    await API.Categories.create(data);
                    alert('Category created successfully!');
                }
                closeCategoryModal();
                loadCategoriesTable();
                if (window.initializeCategoriesForBooks) window.initializeCategoriesForBooks();
            } catch (error) {
                alert('Error saving category: ' + error.message);
            }
        });
    }
});

window.editCategory = async function(id) {
    try {
        const res = await API.Categories.getById(id);
        const cat = res.category;
        if (!cat) return;

        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('categoryId').value = cat.id;
        document.getElementById('categoryName').value = cat.name;
        document.getElementById('categoryType').value = cat.is_language ? 'dropdown' : 'strip';
        if (document.getElementById('categoryIcon')) document.getElementById('categoryIcon').value = cat.icon || 'fa-folder';
        if (document.getElementById('categoryVisible')) document.getElementById('categoryVisible').checked = cat.visible;

        await loadParentCategories();
        handleCategoryTypeChange();

        if (!cat.is_language && cat.parent_id) {
            document.getElementById('categoryParentId').value = cat.parent_id;
        }

        document.getElementById('categoryModal').classList.add('active');
    } catch (e) {
        alert('Error loading category details: ' + e.message);
    }
};

window.deleteCategory = async function(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
        await API.Categories.delete(id);
        alert('Category deleted!');
        loadCategoriesTable();
        if (window.initializeCategoriesForBooks) window.initializeCategoriesForBooks();
    } catch (error) {
        alert('Error deleting category: ' + (error.message || 'Unknown error'));
    }
};

window.toggleCategoryVisibility = async function(id, visible) {
    try {
        await API.Categories.update(id, { visible: visible });
    } catch (error) {
        alert('Error updating visibility: ' + error.message);
        loadCategoriesTable(); // Revert toggle visually
    }
};

// CSS for slider switch inside Categories table
const style = document.createElement('style');
style.innerHTML = \`
.switch { position: relative; display: inline-block; width: 34px; height: 20px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: #27ae60; }
input:checked + .slider:before { transform: translateX(14px); }
\`;
document.head.appendChild(style);

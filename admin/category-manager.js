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
window.showAddCategoryModal = function() {
    // Basic prompt implementation for now, ideally an HTML modal
    const name = prompt('Enter Category Name: (e.g. Urdu, Academic, Literature)');
    if (!name) return;
    
    const slug = prompt('Enter Category Slug (e.g. urdu, academic-books):', name.toLowerCase().replace(/\\s+/g, '-'));
    if (!slug) return;

    const isLang = confirm('Is this a Main Language Category? (OK for Yes, Cancel for Subcategory)');
    
    let parentId = null;
    if (!isLang) {
        let parentIdStr = prompt('Enter Parent Language Category ID (Leave blank if none):');
        parentId = parseInt(parentIdStr) || null;
    }

    createCategory({
        name: name,
        slug: slug,
        icon: 'fa-book',
        is_language: isLang,
        parent_id: parentId,
        visible: true
    });
};

async function createCategory(data) {
    try {
        await API.Categories.create(data);
        alert('Category created successfully!');
        loadCategoriesTable();
    } catch (error) {
        alert('Error creating category: ' + error.message);
    }
}

window.editCategory = async function(id) {
    const name = prompt('Enter new name for this category:');
    if (!name) return;
    try {
        await API.Categories.update(id, { name: name, slug: name.toLowerCase().replace(/\\s+/g, '-') });
        loadCategoriesTable();
    } catch(e) {
        alert('Error: ' + e.message);
    }
};

window.deleteCategory = async function(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
        const res = await API.Categories.delete(id);
        alert('Category deleted!');
        loadCategoriesTable();
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

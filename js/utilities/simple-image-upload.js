// ===== Simple Image Upload Handler =====
// Simplified approach: Just paste any image URL!

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeSimpleImageUpload();
});

function initializeSimpleImageUpload() {
    // Handle URL input
    const urlInput = document.getElementById('imgbbImage');
    const localInput = document.getElementById('localFileInput');
    const dropzone = document.getElementById('dropzone');

    if (urlInput) {
        urlInput.addEventListener('input', function () {
            const url = this.value.trim();
            if (url && isValidImageUrl(url)) {
                // Auto-preview when valid URL is entered
                testAndPreviewImage(url);
            }
        });
    }

    // Handle local file upload
    if (localInput) {
        localInput.addEventListener('change', handleLocalFileUpload);
    }

    // Handle drag & drop
    if (dropzone) {
        dropzone.addEventListener('dragover', handleDragOver);
        dropzone.addEventListener('dragleave', handleDragLeave);
        dropzone.addEventListener('drop', handleDrop);
    }
}

// Check if URL looks like an image
function isValidImageUrl(url) {
    // Direct image extension
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url)) {
        return true;
    }
    // Common image hosting services
    if (url.includes('i.ibb.co') ||
        url.includes('imgur.com') ||
        url.includes('iili.io') ||
        url.includes('media-amazon.com') ||
        url.includes('drive.google.com') ||
        url.includes('cloudinary.com') ||
        url.includes('unsplash.com')) {
        return true;
    }
    return false;
}

// Test if image URL works and show preview
function testAndPreviewImage(url) {
    const testImg = new Image();
    testImg.onload = function () {
        // Image loaded successfully
        document.getElementById('bookImage').value = url;
        showImagePreview(url);
    };
    testImg.onerror = function () {
        // Image failed to load - might need conversion
        console.log('Direct load failed, trying conversions...');
    };
    testImg.src = url;
}

// Main function to use the image link
function useImageLink() {
    const urlInput = document.getElementById('imgbbImage');
    const bookImageInput = document.getElementById('bookImage');
    let url = urlInput.value.trim();

    if (!url) {
        showSimpleNotification('Please paste an image URL first!', 'error');
        return;
    }

    // Process the URL
    let finalUrl = processImageUrl(url);

    if (finalUrl) {
        // Test if the URL actually loads an image
        const testImg = new Image();
        testImg.onload = function () {
            bookImageInput.value = finalUrl;
            showImagePreview(finalUrl);
            showSimpleNotification('✅ Image added successfully!', 'success');
        };
        testImg.onerror = function () {
            showSimpleNotification('❌ Image URL is not accessible. Please check the link.', 'error');
        };
        testImg.src = finalUrl;
    } else {
        showSimpleNotification('❌ Invalid image URL. Please use a direct image link.', 'error');
    }
}

// Process different URL types
function processImageUrl(url) {
    try {
        // Google Drive conversion
        if (url.includes('drive.google.com')) {
            return convertGoogleDriveUrl(url);
        }

        // ImgBB - ensure it's direct link
        if (url.includes('ibb.co')) {
            if (url.includes('i.ibb.co')) {
                return url; // Already direct
            }
            showSimpleNotification('⚠️ Use the "Direct links" option in ImgBB dropdown!', 'warning');
            return null;
        }

        // Freeimage.host
        if (url.includes('iili.io')) {
            return url;
        }

        // Imgur
        if (url.includes('imgur.com')) {
            // Convert imgur page link to direct link
            if (!url.includes('i.imgur.com')) {
                const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
                if (match) {
                    return `https://i.imgur.com/${match[1]}.jpg`;
                }
            }
            return url;
        }

        // Amazon images (already work)
        if (url.includes('m.media-amazon.com') || url.includes('images-amazon.com')) {
            return url;
        }

        // Direct image URLs
        if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url)) {
            return url;
        }

        // Return as-is for other URLs
        return url;

    } catch (error) {
        console.error('Error processing URL:', error);
        return null;
    }
}

// Convert Google Drive link to direct image
function convertGoogleDriveUrl(url) {
    // Extract file ID
    let fileId = null;

    // Format: /file/d/FILE_ID/
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) fileId = match1[1];

    // Format: ?id=FILE_ID
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (!fileId && match2) fileId = match2[1];

    if (fileId) {
        // Use thumbnail endpoint with large size
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }

    return null;
}

// Handle local file upload
function handleLocalFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processLocalFile(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processLocalFile(file);
    }
}

// Process local file to base64
function processLocalFile(file) {
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showSimpleNotification('⚠️ File too large! Please use an image under 2MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64 = e.target.result;
        document.getElementById('bookImage').value = base64;
        showImagePreview(base64);
        showSimpleNotification('✅ Image uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
}

// Show image preview
function showImagePreview(imageUrl) {
    const previewContainer = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (previewContainer && previewImg) {
        previewImg.src = imageUrl;
        previewImg.onload = function () {
            previewContainer.style.display = 'block';
        };
        previewImg.onerror = function () {
            previewContainer.style.display = 'none';
        };
    }
}

// Remove image preview
function removeImagePreview() {
    const previewContainer = document.getElementById('imagePreview');
    const bookImageInput = document.getElementById('bookImage');
    const urlInput = document.getElementById('imgbbImage');

    if (previewContainer) previewContainer.style.display = 'none';
    if (bookImageInput) bookImageInput.value = '';
    if (urlInput) urlInput.value = '';
}

// Simple notification
function showSimpleNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.simple-notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `simple-notification ${type}`;
    notification.innerHTML = message;

    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 10px;
        font-weight: 600;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10001;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const animStyles = document.createElement('style');
animStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .dropzone.dragover {
        border-color: #27ae60 !important;
        background: rgba(39, 174, 96, 0.1) !important;
    }
`;
document.head.appendChild(animStyles);

// Export functions
window.useImageLink = useImageLink;
window.removeImagePreview = removeImagePreview;
window.showImagePreview = showImagePreview;

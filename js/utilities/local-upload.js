// ===== Local File Upload Handler =====

// Initialize local file upload with drag and drop
function initializeLocalUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('localFileInput');

    if (!dropzone || !fileInput) {
        console.log('Dropzone or file input not found');
        return;
    }

    console.log('Local upload initialized');

    // File input change handler
    fileInput.addEventListener('change', function (e) {
        handleFileSelect(e.target.files);
    });

    // Drag and drop handlers
    dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');

        const files = e.dataTransfer.files;
        handleFileSelect(files);
    });

    // Click to browse (but not when clicking the label)
    dropzone.addEventListener('click', function (e) {
        if (e.target.id !== 'localFileInput' && !e.target.closest('label')) {
            fileInput.click();
        }
    });
}

// Handle file selection
function handleFileSelect(files) {
    if (files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file (JPG, PNG, WEBP)', 'error');
        return;
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        showNotification('Image size must be less than 2MB', 'error');
        return;
    }

    // Read and convert to base64
    const reader = new FileReader();

    reader.onloadstart = function () {
        const dropzone = document.getElementById('dropzone');
        if (dropzone) dropzone.classList.add('uploading');
        showNotification('Processing image...', 'info');
    };

    reader.onload = function (e) {
        const base64Data = e.target.result;

        // Compress image if needed
        compressImage(base64Data, function (compressedData) {
            const bookImageInput = document.getElementById('bookImage');
            if (bookImageInput) {
                bookImageInput.value = compressedData;
            }

            showImagePreview(compressedData);

            const dropzone = document.getElementById('dropzone');
            if (dropzone) dropzone.classList.remove('uploading');

            showNotification('Image uploaded successfully! ✓', 'success');
        });
    };

    reader.onerror = function () {
        const dropzone = document.getElementById('dropzone');
        if (dropzone) dropzone.classList.remove('uploading');
        showNotification('Error reading file. Please try again.', 'error');
    };

    reader.readAsDataURL(file);
}

// Compress image to reduce size
function compressImage(base64Data, callback) {
    const img = new Image();

    img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate new dimensions (max 800px width while maintaining aspect ratio)
        let width = img.width;
        let height = img.height;
        const maxWidth = 800;

        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression (0.8 quality)
        const compressedData = canvas.toDataURL('image/jpeg', 0.8);
        callback(compressedData);
    };

    img.onerror = function () {
        // If compression fails, use original
        callback(base64Data);
    };

    img.src = base64Data;
}

// Initialize when tabs are set up
document.addEventListener('DOMContentLoaded', function () {
    // Wait a bit for other scripts to load
    setTimeout(initializeLocalUpload, 500);
});

// Export for use in terabox-handler.js
window.initializeLocalUpload = initializeLocalUpload;
window.handleFileSelect = handleFileSelect;

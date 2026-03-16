// ===== Terabox Upload Functions =====

// Initialize upload tabs
function initializeUploadTabs() {
    const uploadTabs = document.querySelectorAll('.upload-tab');

    uploadTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabType = this.getAttribute('data-tab');

            // Remove active class from all tabs
            document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.upload-content').forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');
            document.getElementById(tabType + 'Tab').classList.add('active');
        });
    });

    // Add input listeners for image preview
    const bookImageInput = document.getElementById('bookImage');
    const teraboxImageInput = document.getElementById('teraboxImage');

    if (bookImageInput) {
        bookImageInput.addEventListener('input', function () {
            showImagePreview(this.value);
        });
    }

    if (teraboxImageInput) {
        teraboxImageInput.addEventListener('input', function () {
            showImagePreview(this.value);
        });
    }
}

// Convert Terabox link to direct image URL using API
async function convertTeraboxLink() {
    const teraboxInput = document.getElementById('teraboxImage');
    const bookImageInput = document.getElementById('bookImage');
    const convertBtn = document.querySelector('.btn-convert');
    const url = teraboxInput.value.trim();

    if (!url) {
        showNotification('Please paste a Terabox link first', 'error');
        return;
    }

    // Validate TeraBox URL
    if (!url.includes('terabox.com') && !url.includes('1024tera.com')) {
        showNotification('Please enter a valid TeraBox URL', 'error');
        return;
    }

    // Show loading state
    const originalBtnText = convertBtn.innerHTML;
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';

    try {
        // TeraBox Direct Link Generator API
        const apiUrl = `https://terabox-dl.qtcloud.workers.dev/api/get-info?shorturl=${encodeURIComponent(url)}`;

        showNotification('Converting TeraBox link... Please wait', 'info');

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.ok && data.list && data.list.length > 0) {
            // Get the first file's direct download link
            const directUrl = data.list[0].dlink || data.list[0].thumbs?.url3;

            if (directUrl) {
                // Update the main image input
                bookImageInput.value = directUrl;

                // Show preview
                showImagePreview(directUrl);

                showNotification('✅ TeraBox link converted successfully!', 'success');
            } else {
                throw new Error('No direct link found in response');
            }
        } else {
            throw new Error(data.error || 'Failed to convert link');
        }

    } catch (error) {
        console.error('Error converting link:', error);

        // Fallback: Try alternative method
        showNotification('Primary conversion failed. Trying alternative method...', 'info');

        try {
            // Alternative: Use the link as-is with modifications
            let convertedUrl = url;

            // Try to extract file ID from URL
            const fileIdMatch = url.match(/\/s\/([a-zA-Z0-9_-]+)/);
            if (fileIdMatch) {
                // Use a different converter API
                const altApiUrl = `https://terabox-downloader.vercel.app/api?url=${encodeURIComponent(url)}`;
                const altResponse = await fetch(altApiUrl);
                const altData = await altResponse.json();

                if (altData.directLink) {
                    bookImageInput.value = altData.directLink;
                    showImagePreview(altData.directLink);
                    showNotification('✅ Converted using alternative method!', 'success');
                } else {
                    throw new Error('Alternative method also failed');
                }
            } else {
                throw new Error('Invalid TeraBox URL format');
            }
        } catch (altError) {
            console.error('Alternative method failed:', altError);
            showNotification(`❌ Failed to convert TeraBox link. Please try one of these options:
            
1. Use a direct image hosting service (imgur.com, imgbb.com)
2. Use the "Upload from Computer" option instead
3. Make sure your TeraBox link is publicly accessible
4. Try copying the image URL directly from TeraBox (right-click → Copy image address)`, 'error');
        }
    } finally {
        // Restore button state
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalBtnText;
    }
}

// Show/hide hosting guide (ImgBB, Google Drive, or Freeimage)
function showHostingGuide(type) {
    // Update buttons
    document.querySelectorAll('.hosting-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.hosting-btn').classList.add('active');

    // Update guides
    document.querySelectorAll('.hosting-guide').forEach(guide => {
        guide.classList.remove('active');
    });

    if (type === 'imgbb') {
        document.getElementById('imgbbGuide').classList.add('active');
    } else if (type === 'gdrive') {
        document.getElementById('gdriveGuide').classList.add('active');
    } else if (type === 'freeimage') {
        document.getElementById('freeimageGuide').classList.add('active');
    }
}

// Use ImgBB or Google Drive link
function useImageLink() {
    const imgbbInput = document.getElementById('imgbbImage');
    const bookImageInput = document.getElementById('bookImage');
    let url = imgbbInput.value.trim();

    if (!url) {
        showNotification('Please paste a link first', 'error');
        return;
    }

    try {
        let finalUrl = url;
        let source = '';

        // Check if it's a Google Drive link
        if (url.includes('drive.google.com')) {
            finalUrl = convertGoogleDriveLink(url);
            source = 'Google Drive';

            if (!finalUrl) {
                showNotification('❌ Invalid Google Drive link. Make sure you copied the share link.', 'error');
                return;
            }
        }
        // Check if it's an ImgBB link
        else if (url.includes('ibb.co')) {
            // Check if it's a viewer link (wrong) vs direct link (correct)
            if (url.includes('i.ibb.co')) {
                // Correct direct link
                finalUrl = url;
                source = 'ImgBB';
            } else {
                // Wrong - viewer link
                showNotification('❌ Wrong link type! Please change dropdown to "Direct links" in ImgBB, not "Viewer links"', 'error');
                return;
            }
        }
        // Check if it's a Freeimage.host link (iili.io)
        else if (url.includes('iili.io') || url.includes('freeimage.host')) {
            // Freeimage.host direct links work directly
            if (url.includes('iili.io') && url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                finalUrl = url;
                source = 'Freeimage.host';
            } else if (url.includes('freeimage.host/i/')) {
                // This is a viewer link, not direct
                showNotification('❌ Wrong link! Copy the "Image URL" field (starts with iili.io), not "Image link"', 'error');
                return;
            } else {
                finalUrl = url;
                source = 'Freeimage.host';
            }
        }
        // Other image URLs (direct links ending in image extensions)
        else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes('imgur.com')) {
            finalUrl = url;
            source = 'Direct URL';
        }
        else {
            showNotification('❌ Unrecognized link format. Please use a direct image URL ending in .jpg, .png, etc.', 'error');
            return;
        }

        // Update the main image input
        bookImageInput.value = finalUrl;

        // Show preview
        showImagePreview(finalUrl);

        // Show success message
        showNotification(`✅ ${source} link added successfully!`, 'success');

    } catch (error) {
        console.error('Error using image link:', error);
        showNotification('Failed to process link. Please check the URL.', 'error');
    }
}

// Convert Google Drive share link to direct image link
function convertGoogleDriveLink(url) {
    try {
        let fileId = '';

        // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileMatch) {
            fileId = fileMatch[1];
        }

        // Format: https://drive.google.com/open?id=FILE_ID
        const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (!fileId && openMatch) {
            fileId = openMatch[1];
        }

        if (fileId) {
            // Return direct download URL
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        }

        return null;
    } catch (error) {
        console.error('Error converting Google Drive link:', error);
        return null;
    }
}

// Keep old function for backwards compatibility
function useImgbbLink() {
    useImageLink();
}


// Show image preview
function showImagePreview(imageUrl) {
    if (!imageUrl) return;

    const previewContainer = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (previewContainer && previewImg) {
        previewImg.src = imageUrl;
        previewImg.onerror = function () {
            showNotification('Failed to load image. Please check the URL.', 'error');
            previewContainer.style.display = 'none';
        };
        previewImg.onload = function () {
            previewContainer.style.display = 'block';
        };
    }
}

// Remove image preview
function removeImagePreview() {
    const previewContainer = document.getElementById('imagePreview');
    const bookImageInput = document.getElementById('bookImage');
    const teraboxImageInput = document.getElementById('teraboxImage');

    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    if (bookImageInput) {
        bookImageInput.value = '';
    }

    if (teraboxImageInput) {
        teraboxImageInput.value = '';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add to document
    document.body.appendChild(notification);

    // Add CSS for notification if not exists
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 10000;
                animation: slideInRight 0.3s ease;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .notification-success {
                border-left: 4px solid #4caf50;
                color: #4caf50;
            }
            
            .notification-error {
                border-left: 4px solid #f44336;
                color: #f44336;
            }
            
            .notification-info {
                border-left: 4px solid #2196f3;
                color: #2196f3;
            }
            
            .notification i {
                font-size: 20px;
            }
            
            .notification span {
                color: #333;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export the function to global scope
window.convertTeraboxLink = convertTeraboxLink;
window.useImgbbLink = useImgbbLink;
window.useImageLink = useImageLink;
window.showHostingGuide = showHostingGuide;
window.convertGoogleDriveLink = convertGoogleDriveLink;
window.removeImagePreview = removeImagePreview;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUploadTabs);
} else {
    initializeUploadTabs();
}

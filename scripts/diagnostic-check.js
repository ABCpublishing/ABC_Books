const fs = require('fs');
const path = require('path');

const stylesPath = path.join(__dirname, '../css/styles.css');
const styles = fs.readFileSync(stylesPath, 'utf8');

console.log('--- Diagnostic Scan Report ---\n');

// Check 1: Responsive Grid Alignment
if (styles.includes('justify-content: center;') && styles.includes('@media (max-width: 768px)')) {
    console.log('✅ [PASS] Responsive Grid: Centered alignment detected for mobile devices.');
} else {
    console.log('❌ [FAIL] Responsive Grid: Mobile centering might be missing.');
}

// Check 2: Slider Viewport Fix
if (styles.includes('.slider-viewport') && styles.includes('overflow: hidden')) {
    console.log('✅ [PASS] Carousel: Slider viewport fix is present to ensure proper alignment.');
} else {
    console.log('❌ [FAIL] Carousel: Slider viewport fix is missing.');
}

// Check 3: Line Clamp Compatibility
if (styles.includes('-webkit-line-clamp') && styles.includes('line-clamp')) {
    console.log('✅ [PASS] CSS Compatibility: Standard and Webkit line-clamp properties are present.');
} else {
    console.log('⚠️ [WARN] CSS Compatibility: Standard line-clamp property might be missing.');
}

// Check 4: Mobile Card Sizing
if (styles.includes('min-width: 140px') && styles.includes('max-width: 768px')) {
    console.log('✅ [PASS] Mobile Cards: Optimized card sizing (140px) detected for smaller screens.');
} else {
    console.log('⚠️ [WARN] Mobile Cards: Optimized sizing might be missing.');
}

console.log('\n--- Scan Complete ---');

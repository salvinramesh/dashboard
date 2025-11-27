import { colorThemes } from '../config/systems';

export const isHexColor = (color) => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
};

export const hexToRgba = (hex, alpha = 1) => {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
    }
    return hex;
};

export const getSystemTheme = (color) => {
    // If it's a predefined theme key
    if (colorThemes[color]) {
        return {
            isLegacy: true,
            ...colorThemes[color]
        };
    }

    // It's a custom hex or unknown
    const hex = isHexColor(color) ? color : '#3b82f6'; // Default to blue if invalid

    return {
        isLegacy: false,
        primary: { backgroundColor: hex },
        // primaryHover is tricky with inline styles, we might just use opacity
        light: { backgroundColor: hexToRgba(hex, 0.1), color: hex },
        border: { borderColor: hexToRgba(hex, 0.3) },
        text: { color: hex },
        hex: hex
    };
};

/**
 * QR Code Generator for Pearl Verse
 * Handles QR code generation using qrcode.js library
 * Provides utilities for generating, downloading, and managing QR codes
 */

class QRGenerator {
    constructor() {
        // Default options without library dependency
        this.baseOptions = {
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            margin: 4
        };
        
        console.log('🎯 QRGenerator initialized');
    }

    // Get default options with library-specific settings
    getDefaultOptions() {
        const options = { ...this.baseOptions };
        
        // QRious library uses different options
        if (typeof window.QRious !== 'undefined') {
            options.level = 'H'; // High error correction for logo overlay
            options.background = options.colorLight;
            options.foreground = options.colorDark;
            options.size = options.width; // QRious uses 'size' instead of width/height
        }
        
        return options;
    }

    /**
     * Generate QR code on canvas element
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     * @param {string} text - Text to encode in QR code
     * @param {Object} options - QR generation options
     * @returns {Promise<boolean>} Success status
     */
    async generateQR(canvas, text, options = {}) {
        try {
            console.log('🔄 Starting QR generation for:', text);
            
            // Get canvas element if string ID provided
            const canvasElement = typeof canvas === 'string' ? 
                document.getElementById(canvas) : canvas;
            
            if (!canvasElement) {
                throw new Error('Canvas element not found');
            }
            
            if (!text || text.trim() === '') {
                throw new Error('Text content is required');
            }

            // Merge options with defaults
            const qrOptions = { ...this.getDefaultOptions(), ...options };
            
            console.log('⚙️ QR Options:', qrOptions);

            // Check if QRious library is available
            if (typeof window.QRious !== 'undefined') {
                // Create canvas element if container is not a canvas
                let targetCanvas = canvasElement;
                if (canvasElement.tagName !== 'CANVAS') {
                    targetCanvas = document.createElement('canvas');
                    targetCanvas.width = qrOptions.size || qrOptions.width;
                    targetCanvas.height = qrOptions.size || qrOptions.height;
                    canvasElement.appendChild(targetCanvas);
                }
                
                // Create QRious instance
                const qr = new QRious({
                    element: targetCanvas,
                    value: text,
                    size: qrOptions.size || qrOptions.width,
                    background: qrOptions.background || qrOptions.colorLight,
                    foreground: qrOptions.foreground || qrOptions.colorDark,
                    level: qrOptions.level || 'M'
                });
                
                console.log('QRious instance created:', qr);
                
                // Apply rainbow gradient and pearl logo after QR generation
                await this.applyRainbowGradient(targetCanvas);
                await this.addPearlLogo(targetCanvas);
                
            } else {
                throw new Error('QRious library not available');
            }

            console.log('✅ QR code generated successfully with rainbow gradient and pearl logo');
            return true;
            
        } catch (error) {
            console.error('❌ QR generation failed:', error);
            this.showQRError(canvas, error.message);
            return false;
        }
    }

    /**
     * Generate QR code and return as data URL
     * @param {string} text - Text to encode
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Data URL of QR code
     */
    async generateQRDataURL(text, options = {}) {
        try {
            // Create temporary canvas
            const tempCanvas = document.createElement('canvas');
            const qrOptions = { ...this.getDefaultOptions(), ...options };
            
            tempCanvas.width = qrOptions.width;
            tempCanvas.height = qrOptions.height;
            
            // Generate QR code
            const success = await this.generateQR(tempCanvas, text, options);
            
            if (success) {
                return tempCanvas.toDataURL('image/png');
            }
            
            throw new Error('Failed to generate QR code');
            
        } catch (error) {
            console.error('❌ QR data URL generation failed:', error);
            return null;
        }
    }

    /**
     * Download QR code as PNG file
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     * @param {string} filename - Download filename (optional)
     */
    downloadQR(canvas, filename) {
        try {
            const canvasElement = typeof canvas === 'string' ? 
                document.getElementById(canvas) : canvas;
            
            if (!canvasElement) {
                throw new Error('Canvas element not found');
            }

            // Generate filename if not provided
            const downloadName = filename || `pearl-wallet-qr-${Date.now()}.png`;
            
            console.log('📥 Downloading QR code as:', downloadName);

            // Create download link
            const link = document.createElement('a');
            link.download = downloadName;
            link.href = canvasElement.toDataURL('image/png', 1.0);
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ QR code download initiated');
            return true;
            
        } catch (error) {
            console.error('❌ QR download failed:', error);
            return false;
        }
    }

    /**
     * Copy QR code to clipboard (if supported)
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     */
    async copyQRToClipboard(canvas) {
        try {
            if (!navigator.clipboard || !navigator.clipboard.write) {
                throw new Error('Clipboard API not supported');
            }

            const canvasElement = typeof canvas === 'string' ? 
                document.getElementById(canvas) : canvas;
            
            if (!canvasElement) {
                throw new Error('Canvas element not found');
            }

            // Convert canvas to blob
            return new Promise((resolve, reject) => {
                canvasElement.toBlob(async (blob) => {
                    try {
                        if (!blob) {
                            throw new Error('Failed to create blob from canvas');
                        }

                        const clipboardItem = new ClipboardItem({
                            'image/png': blob
                        });

                        await navigator.clipboard.write([clipboardItem]);
                        console.log('✅ QR code copied to clipboard');
                        resolve(true);
                        
                    } catch (error) {
                        console.error('❌ Clipboard copy failed:', error);
                        reject(error);
                    }
                }, 'image/png', 1.0);
            });
            
        } catch (error) {
            console.error('❌ QR clipboard copy not supported:', error);
            return false;
        }
    }

    /**
     * Share QR code using Web Share API (if supported)
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     * @param {string} walletAddress - Wallet address for share text
     */
    async shareQR(canvas, walletAddress) {
        try {
            if (!navigator.share) {
                throw new Error('Web Share API not supported');
            }

            const canvasElement = typeof canvas === 'string' ? 
                document.getElementById(canvas) : canvas;
            
            if (!canvasElement) {
                throw new Error('Canvas element not found');
            }

            // Convert canvas to blob and create file
            return new Promise((resolve, reject) => {
                canvasElement.toBlob(async (blob) => {
                    try {
                        if (!blob) {
                            throw new Error('Failed to create blob from canvas');
                        }

                        const file = new File([blob], 'pearl-wallet-qr.png', { 
                            type: 'image/png' 
                        });
                        
                        const shareData = {
                            title: 'Pearl Wallet QR Code',
                            text: `Send Pearls to: ${walletAddress}`,
                            files: [file]
                        };

                        // Check if sharing is supported with files
                        if (navigator.canShare && !navigator.canShare(shareData)) {
                            // Fallback to text sharing
                            await navigator.share({
                                title: shareData.title,
                                text: shareData.text
                            });
                        } else {
                            await navigator.share(shareData);
                        }
                        
                        console.log('✅ QR code shared successfully');
                        resolve(true);
                        
                    } catch (error) {
                        console.error('❌ QR share failed:', error);
                        reject(error);
                    }
                }, 'image/png', 1.0);
            });
            
        } catch (error) {
            console.error('❌ QR share not supported:', error);
            return false;
        }
    }

    /**
     * Show error message in QR display area
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     * @param {string} message - Error message
     */
    showQRError(canvas, message) {
        try {
            const canvasElement = typeof canvas === 'string' ? 
                document.getElementById(canvas) : canvas;
            
            if (!canvasElement) return;

            // Get parent container to show error
            const container = canvasElement.parentElement;
            if (!container) return;

            // Create error display
            const errorDiv = document.createElement('div');
            errorDiv.className = 'qr-error';
            errorDiv.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    color: #ef4444;
                    text-align: center;
                    font-size: 14px;
                ">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p style="margin: 0; font-weight: 600;">QR Generation Failed</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">${message}</p>
                </div>
            `;

            // Hide canvas and show error
            canvasElement.style.display = 'none';
            
            // Remove existing error if any
            const existingError = container.querySelector('.qr-error');
            if (existingError) {
                existingError.remove();
            }
            
            container.appendChild(errorDiv);
            
        } catch (error) {
            console.error('Failed to show QR error:', error);
        }
    }

    /**
     * Clear QR display area
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     */
    clearQR(canvas) {
        try {
            const canvasElement = typeof canvas === 'string' ? 
                document.getElementById(canvas) : canvas;
            
            if (!canvasElement) return;

            // Clear canvas
            const ctx = canvasElement.getContext('2d');
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            // Remove any error displays
            const container = canvasElement.parentElement;
            if (container) {
                const errorDiv = container.querySelector('.qr-error');
                if (errorDiv) {
                    errorDiv.remove();
                }
            }
            
            // Show canvas
            canvasElement.style.display = 'block';
            
        } catch (error) {
            console.error('Failed to clear QR:', error);
        }
    }

    /**
     * Validate text for QR generation
     * @param {string} text - Text to validate
     * @returns {boolean} Is valid
     */
    validateText(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }
        
        // Check length (QR codes have limits)
        if (text.length > 2953) { // Alphanumeric limit for Level L
            console.warn('⚠️ Text too long for QR code generation');
            return false;
        }
        
        return true;
    }

    /**
     * Get recommended QR options based on text length
     * @param {string} text - Text to encode
     * @returns {Object} Recommended options
     */
    getRecommendedOptions(text) {
        const baseOptions = { ...this.getDefaultOptions() };
        
        if (!text) return baseOptions;
        
        // Adjust error correction based on text length if QRCode library is available
        if (typeof window.QRCode !== 'undefined' && window.QRCode.CorrectLevel) {
            if (text.length > 1000) {
                baseOptions.correctLevel = window.QRCode.CorrectLevel.L; // Low error correction for long text
            } else if (text.length < 100) {
                baseOptions.correctLevel = window.QRCode.CorrectLevel.H; // High error correction for short text
            }
        }
        
        return baseOptions;
    }

    /**
     * Apply rainbow gradient to QR code
     * @param {HTMLCanvasElement} canvas - Canvas with QR code
     */
    async applyRainbowGradient(canvas) {
        try {
            console.log('🌈 Applying rainbow gradient to QR code');
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Create rainbow gradient colors
            const rainbowColors = [
                [255, 0, 0],     // Red
                [255, 127, 0],   // Orange
                [255, 255, 0],   // Yellow
                [0, 255, 0],     // Green
                [0, 0, 255],     // Blue
                [75, 0, 130],    // Indigo
                [148, 0, 211]    // Violet
            ];
            
            // Function to get color based on position
            const getRainbowColor = (x, y) => {
                const angle = Math.atan2(y - canvas.height/2, x - canvas.width/2);
                const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
                const colorIndex = normalizedAngle * (rainbowColors.length - 1);
                const lowerIndex = Math.floor(colorIndex);
                const upperIndex = Math.ceil(colorIndex);
                const t = colorIndex - lowerIndex;
                
                const lowerColor = rainbowColors[lowerIndex] || rainbowColors[0];
                const upperColor = rainbowColors[upperIndex] || rainbowColors[rainbowColors.length - 1];
                
                return [
                    Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * t),
                    Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * t),
                    Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * t)
                ];
            };
            
            // Apply rainbow gradient to black pixels (QR code modules)
            for (let i = 0; i < data.length; i += 4) {
                const pixelIndex = i / 4;
                const x = pixelIndex % canvas.width;
                const y = Math.floor(pixelIndex / canvas.width);
                
                // Check if this is a dark pixel (part of QR code)
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const alpha = data[i + 3];
                
                // If it's a dark pixel (close to black), apply rainbow color
                if (r < 128 && g < 128 && b < 128 && alpha > 0) {
                    const [newR, newG, newB] = getRainbowColor(x, y);
                    data[i] = newR;
                    data[i + 1] = newG;
                    data[i + 2] = newB;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            console.log('✅ Rainbow gradient applied successfully');
            
        } catch (error) {
            console.error('❌ Failed to apply rainbow gradient:', error);
        }
    }

    /**
     * Add pearl logo to center of QR code
     * @param {HTMLCanvasElement} canvas - Canvas with QR code
     */
    async addPearlLogo(canvas) {
        try {
            console.log('💎 Adding pearl logo to QR code center');
            
            const ctx = canvas.getContext('2d');
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const logoSize = canvas.width * 0.25; // 25% of QR code size
            
            // Create a white background circle for the logo
            ctx.save();
            
            // Draw white background circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, logoSize / 2 + 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            // Draw border around the background
            ctx.beginPath();
            ctx.arc(centerX, centerY, logoSize / 2 + 8, 0, 2 * Math.PI);
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw pearl logo
            this.drawPearlLogo(ctx, centerX, centerY, logoSize);
            
            ctx.restore();
            console.log('✅ Pearl logo added successfully');
            
        } catch (error) {
            console.error('❌ Failed to add pearl logo:', error);
        }
    }

    /**
     * Draw pearl logo at specified position
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} size - Logo size
     */
    drawPearlLogo(ctx, x, y, size) {
        const radius = size / 2;
        
        // Create gradient for pearl effect
        const gradient = ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
        );
        
        // Pearl gradient colors
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.1, '#f8f9ff');
        gradient.addColorStop(0.3, '#e6f3ff');
        gradient.addColorStop(0.6, '#b3d9ff');
        gradient.addColorStop(0.8, '#80bfff');
        gradient.addColorStop(1, '#4da6ff');
        
        // Draw main pearl circle
        ctx.beginPath();
        ctx.arc(x, y, radius - 4, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add highlight
        const highlightGradient = ctx.createRadialGradient(
            x - radius * 0.4, y - radius * 0.4, 0,
            x - radius * 0.4, y - radius * 0.4, radius * 0.3
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, 2 * Math.PI);
        ctx.fillStyle = highlightGradient;
        ctx.fill();
        
        // Add outer rim
        ctx.beginPath();
        ctx.arc(x, y, radius - 4, 0, 2 * Math.PI);
        ctx.strokeStyle = '#3399ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add text "P" in the center
        ctx.fillStyle = '#2980b9';
        ctx.font = `bold ${size * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', x, y);
        
        // Add text shadow for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('P', x - 1, y - 1);
    }
}

// Create global instance
window.QRGenerator = new QRGenerator();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRGenerator;
}

console.log('📦 QR Generator module loaded successfully');

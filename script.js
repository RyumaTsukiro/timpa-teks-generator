document.addEventListener('DOMContentLoaded', () => {
    // GANTI DENGAN URL VERCEL ANDA SETELAH DEPLOY BACKEND
    const BACKEND_URL = 'https://timpa-teks-api.vercel.app/api/generate-ai';

    const imageLoader = document.getElementById('imageLoader');
    const canvas = document.getElementById('editorCanvas');
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('placeholder');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const textInput = document.getElementById('textInput');
    const fontSizeInput = document.getElementById('fontSize');
    const fontColorInput = document.getElementById('fontColor');
    const fontFamilySelect = document.getElementById('fontFamily');
    const undoButton = document.getElementById('undoButton');
    const downloadButton = document.getElementById('downloadButton');
    const aiGenerateButton = document.getElementById('aiGenerateButton');

    let image = null;
    let rectangles = [];
    let text = { content: '', x: 50, y: 80, size: 40, color: '#FFFFFF', font: 'Anton' };
    let isDrawing = false, isDragging = false;
    let startX, startY, dragOffsetX, dragOffsetY;

    function redrawCanvas() {
        if (!image) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        rectangles.forEach(rect => { ctx.fillRect(rect.x, rect.y, rect.width, rect.height); });
        if (text.content) {
            ctx.font = `${text.size}px ${text.font}`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(text.content, text.x, text.y);
        }
    }

    imageLoader.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            image = new Image();
            image.onload = () => {
                const maxWidth = document.querySelector('.canvas-container').clientWidth;
                const scale = Math.min(1, maxWidth / image.width);
                canvas.width = image.width * scale;
                canvas.height = image.height * scale;
                placeholder.style.display = 'none';
                rectangles = []; text.content = '';
                redrawCanvas();
            };
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    aiGenerateButton.addEventListener('click', async () => {
        if (!image) { alert("Upload gambar terlebih dahulu!"); return; }
        loadingSpinner.style.display = 'block';
        try {
            const imageData = canvas.toDataURL('image/jpeg');
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: imageData })
            });
            if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
            const result = await response.json();
            rectangles.push(result.bbox);
            text.content = result.new_text;
            text.x = result.bbox.x + 10;
            text.y = result.bbox.y + 10;
            textInput.value = result.new_text;
            redrawCanvas();
        } catch (error) {
            console.error('Error saat memanggil AI:', error);
            alert('Gagal menghasilkan konten dengan AI. Cek URL backend atau coba lagi.');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });

    textInput.addEventListener('input', e => { text.content = e.target.value; redrawCanvas(); });
    fontSizeInput.addEventListener('input', e => { text.size = parseInt(e.target.value); redrawCanvas(); });
    fontColorInput.addEventListener('input', e => { text.color = e.target.value; redrawCanvas(); });
    fontFamilySelect.addEventListener('change', e => { text.font = e.target.value; redrawCanvas(); });
    canvas.addEventListener('mousedown', e => {
        const mousePos = getMousePos(canvas, e);
        if (isMouseOverText(mousePos)) { isDragging = true; dragOffsetX = mousePos.x - text.x; dragOffsetY = mousePos.y - text.y; } 
        else { isDrawing = true; startX = mousePos.x; startY = mousePos.y; }
    });
    canvas.addEventListener('mousemove', e => {
        const mousePos = getMousePos(canvas, e);
        if (isDragging) { text.x = mousePos.x - dragOffsetX; text.y = mousePos.y - dragOffsetY; redrawCanvas(); } 
        else if (isDrawing) { redrawCanvas(); ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(startX, startY, mousePos.x - startX, mousePos.y - startY); }
    });
    canvas.addEventListener('mouseup', e => {
        const mousePos = getMousePos(canvas, e);
        if (isDrawing) { isDrawing = false; rectangles.push({ x: Math.min(startX, mousePos.x), y: Math.min(startY, mousePos.y), width: Math.abs(mousePos.x - startX), height: Math.abs(mousePos.y - startY) }); redrawCanvas(); }
        isDragging = false;
    });
    canvas.addEventListener('click', e => { const mousePos = getMousePos(canvas, e); if (!isMouseOverText(mousePos) && text.content) { text.x = mousePos.x; text.y = mousePos.y; redrawCanvas(); } });
    undoButton.addEventListener('click', () => { if (rectangles.length > 0) { rectangles.pop(); redrawCanvas(); } });
    downloadButton.addEventListener('click', () => { if (!image) return alert("Upload gambar terlebih dahulu!"); const link = document.createElement('a'); link.download = 'timpa-teks-hasil.png'; link.href = canvas.toDataURL('image/png'); link.click(); });
    function getMousePos(canvas, evt) { const rect = canvas.getBoundingClientRect(); return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }; }
    function isMouseOverText(mousePos) { if (!text.content) return false; ctx.font = `${text.size}px ${text.font}`; const textWidth = ctx.measureText(text.content).width; return (mousePos.x > text.x && mousePos.x < text.x + textWidth && mousePos.y > text.y && mousePos.y < text.y + text.size); }
});

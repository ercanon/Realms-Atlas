document.getElementById('shareBtn').addEventListener('click', async () =>
{
    try {
        if (navigator.share) {
            await navigator.share({
                title: "Realms' Atlas",
                text: "¡Explora mundos interactivos en Realms' Atlas!",
                url: window.location.href,
            });
        }
        else
            navigator.clipboard.writeText(window.location.href);
    }
    catch (error) {
        console.error("Error al compartir:", error);
        alert("No se pudo compartir el enlace.");
    }
});

document.getElementById('uploadImg').addEventListener('change', async function ()
{
    loadImg(this.files[0]);
})

document.getElementById('imgUrl').addEventListener('change', async function ()
{
    const response = await fetch(this.value.trim());
    if (!response.ok)
        alert(`Failed to fetch image from URL: ${response.statusText}`);
    else
        loadImg(await response.blob());
})

const mapRender = document.getElementById('mapRender');
const fileInput = document.getElementById('fileInput');
async function loadImg(inputFile)
{
    if (!inputFile)
        return alert("Please, upload an image or submit a valid url.");

    mapRender.innerHTML = "";

    const zoomLevels = [
        [0, 256],
        [1, 512]];

    try
    {
        loadMap(await imgTiler(inputFile, zoomLevels), zoomLevels);

        mapRender.style.display = 'block';
        fileInput.style.display = 'none';
    }
    catch (error)
    {
        console.error('Error processing image:', error);
    }
}

async function imgTiler(inputFile, zoomLevels)
{
    const tileCache = {};
    for (const [zoomLevel, dimension] of zoomLevels) {
        const paddedImage = addPadding(await createImageBitmap(inputFile), dimension);

        const rows = Math.ceil(paddedImage.width / dimension);
        const cols = Math.ceil(paddedImage.height / dimension);

        let counter = 0;
        for (let x = 0; x < rows; x++) {
            for (let y = 0; y < cols; y++) {
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = dimension;
                tileCanvas.height = dimension;
                
                tileCanvas.getContext('2d').drawImage(
                    paddedImage,
                    x * dimension, y * dimension, dimension, dimension,
                    0, 0, dimension, dimension
                );
                
                const tileURL = URL.createObjectURL(await new Promise(resolve => tileCanvas.toBlob(resolve)));

                if (!tileCache[zoomLevel]) tileCache[zoomLevel] = {};
                if (!tileCache[zoomLevel][x]) tileCache[zoomLevel][x] = {};
                tileCache[zoomLevel][x][y] = tileURL;
            }
        }
    }

    return tileCache;
}

function addPadding(imageBitmap, dimension) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = imageBitmap.width + getPadding(imageBitmap.width, dimension);
    canvas.height = imageBitmap.height + getPadding(imageBitmap.height, dimension);

    ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageBitmap, 0, 0);

    return canvas;
}

function getPadding(dimension, cropDimension) {
    if (dimension % cropDimension === 0) return 0;
    return cropDimension - (dimension % cropDimension);
}

function loadMap(tileCache, zoomLevels) {
    const map = L.map(mapRender, {
        crs: L.CRS.Simple,
        minZoom: zoomLevels[0][0],
        maxZoom: zoomLevels[zoomLevels.length - 1][0]
    }).setView([0, 0], zoomLevels[0][0]);

    L.tileLayer('', {
        attribution: 'Image Tiler Based on github.com/Simperfy/img2-Leaftlet-Tile',
        tileSize: zoomLevels[0][1],
        maxZoom: zoomLevels.length - 1,
        getTileUrl(coords)
        {
            const { z, x, y } = coords;
            tileCache[z]?.[x]?.[y] ?? '';
        }
    }).addTo(map);
}
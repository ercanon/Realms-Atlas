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

//const dataBase = new DataBase('TileDataBase');
const mapRender = document.getElementById('mapRender');
const fileInput = document.getElementById('fileInput');
async function loadImg(inputFile)
{
    if (!inputFile)
        return alert("Please, upload an image or submit a valid url.");

    mapRender.innerHTML = "";

    const zoomSettings = { lvl: 4, res: 256};
    try
    {
        await imgTiler(inputFile, zoomSettings);

        mapRender.style.display = 'block';
        fileInput.style.display = 'none';
    }
    catch (error)
    {
        console.error('Error processing image:', error);
    }
}

async function imgTiler(inputFile, zoomSettings)
{
    const tileCache = {};
    let resPow = zoomSettings.res/2;
    const imgBitmap = await createImageBitmap(inputFile);

    for (let z = 0; z <= zoomSettings.lvl; z++)
    {
        resPow *= 2;
        const paddedImg = addPadding(imgBitmap, resPow);

        const rows = Math.ceil(paddedImg.width  / resPow);
        const cols = Math.ceil(paddedImg.height / resPow);

        tileCache[z] = {};
        for (let x = 0; x < rows; x++) {
            for (let y = 0; y < cols; y++)
            {
                const tileCanvas  = document.createElement('canvas');
                tileCanvas.width  = resPow;
                tileCanvas.height = resPow;
                
                tileCanvas.getContext('2d').drawImage(
                    paddedImg,
                    x * resPow, y * resPow, resPow, resPow,
                    0, 0, resPow, resPow
                );
                
                tileCache[z][`${x}_${y}`] = tileCanvas;
            }
        }
    }

    loadMap(tileCache, zoomSettings, [-imgBitmap.height, imgBitmap.width]);
}
function addPadding(imgBitmap, dimension) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = imgBitmap.width + getPadding(imgBitmap.width, dimension);
    canvas.height = imgBitmap.height + getPadding(imgBitmap.height, dimension);

    ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgBitmap, 0, 0);

    return canvas;
}
function getPadding(dimension, cropDimension) {
    if (dimension % cropDimension === 0) return 0;
    return cropDimension - (dimension % cropDimension);
}

function loadMap(tileCache, zoomSettings, imgSize) {
    const map = L.map(mapRender, {
        crs: L.CRS.Simple,
        maxBounds: [[0, 0], imgSize],
        maxBoundsViscosity: 1.0,
        noWrap: true
    }).setView([imgSize[0] / 2, imgSize[1] / 2], 0);

    const CustomGridLayer = L.GridLayer.extend({
        createTile: function (coords) {
            const { x, y, z } = coords;
            return tileCache[z][`${x}_${y}`] ?? document.createElement('canvas');
        }
    });

    new CustomGridLayer({
        attribution: 'Image Tiler Based on github.com/Simperfy/img2-Leaftlet-Tile',
        maxZoom: zoomSettings.lvl
    }).addTo(map);
}
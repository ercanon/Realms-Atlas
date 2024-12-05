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
        return showError("No se pudo compartir el enlace.", error);
    }
});

document.getElementById('uploadImg').addEventListener('change', async function ()
{
    const file = this.files[0];
    if (!file)
        return showError('No file selected.');

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload  = (event) => loadImg(event.target.result);
    reader.onerror = (event) => { return showError('An error occurred while reading the file.', event.target.error); }
})
document.getElementById('imgUrl').addEventListener('change', async function ()
{
    const url = this.value.trim();
    if (!url)
        return showError('Please, provide a valid image URL.');

    try {
        const response = await fetch(url);
        if (!response.ok)
            return showError(`Failed to fetch image from URL: ${response.statusText}`);

        loadImg(response.url);
    }
    catch (error) {
        return showError('An error occurred while fetching the image.', error);
    }
})



/*>--------------- { ImageHandeler } ---------------<*/
//const dataBase = new DataBase('TileDataBase');
const mapRender = document.getElementById('mapRender');
const inputRender = document.getElementById('fileInput');
function loadImg(inputsrc)
{
    if (!inputsrc)
        return showError("Please, upload an image or submit a valid url.");

    mapRender.innerHTML = "";
    const zoomSettings = { lvl: 2, res: 256};
    try {
        const img = new Image();
        img.src = inputsrc;
        img.onload = () => loadLayer(img, zoomSettings);

        mapRender.style.display = 'block';
        inputRender.style.display = 'none';
    }
    catch (error) {
        return showError('Error loading the image.', error);
    }
}

function showError(message, error = null) {
    console.error(message, error);
    alert(message);
}



/*>--------------- { MapHandeler } ---------------<*/
const CanvasLayer = L.GridLayer.extend({
    options: {
        // The minimum zoom level down to which this layer will be displayed (inclusive).
        minZoom: 0,

        // The maximum zoom level up to which this layer will be displayed (inclusive).
        maxZoom: 18,

        // The zoom number used in tile URLs will be offset with this value.
        zoomOffset: 0,

        // If `true`, inverses Y axis numbering for tiles (turn this on for [TMS](https://en.wikipedia.org/wiki/Tile_Map_Service) services).
        tms: false,

        // If set to true, the zoom number used in tile URLs will be reversed (`maxZoom - zoom` instead of `zoom`)
        zoomReverse: false,

        //Image to be tiled and rendered in the map
        img: null
    },
    createTile: function (coords, done) {
        const { x, y, z } = coords;
        const resTile = this.options.tileSize * Math.pow(2, this.options.maxNativeZoom - z);

        const tileCanvas = L.DomUtil.create('canvas', 'leaflet-tile');
        tileCanvas.width = tileCanvas.height = resTile;

        this._getTile(x, y, resTile).then(tile => { 
            if (tile) 
                tileCanvas.getContext('2d').drawImage(tile, 0, 0);
            done(null, tileCanvas);
        }).catch(error => {
            showError("Error generating tiles.", error);
            done(error, null);
        });
        return tileCanvas;
    },
    _getTile: async function (x, y, resTile)
    {
        const img = this.options.img;

        const tileX = x * resTile;
        const tileY = y * resTile;

        if (tileX >= img.width || tileY >= img.height || tileX < 0 || tileY < 0)
            return null;

        return await createImageBitmap(
            img,
            tileX,
            tileY,
            resTile,
            resTile
        );
    }
});
function loadLayer(img, zoomSettings)
{
    const map = L.map(mapRender, {
        crs: L.CRS.Simple,
        maxBoundsViscosity: 1.0,
        noWrap: true,
    }).setView([0, 0], 0);

    new CanvasLayer({
        attribution: 'Image Tiler Based on <a href="https://github.com/Simperfy/img2-Leaftlet-Tile" target="_blank">Simperfy/img2-Leaftlet-Tile</a>',
        maxNativeZoom: zoomSettings.lvl,
        bounds: [[0, 0], [-img.height, img.width]],
        img: img
    }).addTo(map);
}
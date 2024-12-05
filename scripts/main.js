document.getElementById('shareBtn').addEventListener('click', async () =>
{
    try {
        if (navigator.share) {
            await navigator.share({
                title: "Realms' Atlas",
                text: "¡Explore interactive maps in Realms' Atlas!",
                url: window.location.href,
            });
        }
        else
            navigator.clipboard.writeText(window.location.href);
    }
    catch (error) {
        return showError("Could not share the url.", error);
    }
});

document.getElementById('uploadImg').addEventListener('change', async function ()
{
    const file = this.files[0];
    if (!file)
        return showError('No file selected.');

    const reader = new FileReader();

    reader.onload  = (event) => loadImg(event.target.result);
    reader.onerror = (event) => { return showError('An error occurred while reading the file.', event.target.error); }
    reader.readAsDataURL(file);
})
document.getElementById('imgUrl').addEventListener('change', async function ()
{
    const url = this.value.trim();
    if (!url)
        return showError('Please, provide a valid image URL.');

    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok)
            return showError(`Failed to fetch image from URL: ${response.statusText}`);

        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.startsWith('image/'))
            return showError('The URL does not point to a valid image.');

        loadImg(url);
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
    const zoomSettings = { lvl: 5, res: 256 };

    try {
        const img = new Image();
        img.onload = () => loadLayer(img, zoomSettings);
        img.src = inputsrc;

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
        maxZoom: 15,

        //Image to be tiled and rendered in the map
        img: null
    },
    createTile: function (coords, done) {
        const { x, y, z } = coords;
        const resTile = this.options.tileSize * Math.pow(2, this.options.maxNativeZoom - z);

        const tileCanvas = L.DomUtil.create('canvas', 'leaflet-tile');
        tileCanvas.width = tileCanvas.height = resTile;

        this._getDims(x, y, resTile).then(dims => {
            if (dims)
                tileCanvas.getContext('2d').drawImage(this.options.img, ...dims);
            done(null, tileCanvas);
        }).catch(error => {
            showError("Error generating tiles.", error);
            done(error, null);
        });
        return tileCanvas;
    },
    _getDims: async function (x, y, resTile)
    {
        const img = this.options.img;

        const tileX = x * resTile;
        const tileY = y * resTile;

        if (tileX >= img.width || tileY >= img.height || tileX < 0 || tileY < 0)
            return null;

        return [tileX, tileY, resTile, resTile, 0, 0, resTile, resTile];
    }
});

let map = null;
function createMap()
{
    return L.map(mapRender, {
        crs: L.CRS.Simple,
        zoomSnap: 0.5,
        zoomDelta: 0.5, 
        maxBoundsViscosity: 1.0,
        noWrap: true,
    }).setView([0, 0], 0);
}
function loadLayer(img, zoomSettings)
{
    if (!map)
        map = createMap();

    new CanvasLayer({
        attribution: 'Image Tiler Based on <a href="https://github.com/Simperfy/img2-Leaftlet-Tile" target="_blank">Simperfy/img2-Leaftlet-Tile</a>',
        tileSize: zoomSettings.res,
        maxNativeZoom: zoomSettings.lvl,
        img: img
    }).addTo(map);
    const bounds = [[0, 0], [-img.height / Math.pow(2, zoomSettings.lvl), img.width / Math.pow(2, zoomSettings.lvl)]];
    map.setMaxBounds(bounds);
    map.fitBounds(bounds);
}
/*>--------------- { ImageHandeler } ---------------<*/
//const dataBase = new DataBase("TileDataBase");
const mapRender = document.getElementById("mapRender");
const inputRender = document.getElementById("fileInput");
function loadImg(inputsrc)
{
    if (!inputsrc)
        return showError("Please, upload an image or submit a valid url.");

    mapRender.innerHTML = "";
    const zoomSettings = { lvl: 5, res: 256 };

    try {
        const img = new Image();
        img.onload = () => {
            loadLayer(img, zoomSettings);

        }
        img.src = inputsrc;

        mapRender.style.display = "block";
        inputRender.style.display = "none";
    }
    catch (error) {
        return showError("Error loading the image.", error);
    }
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

        const tileCanvas = L.DomUtil.create("canvas", "leaflet-tile");
        tileCanvas.width = tileCanvas.height = resTile;

        this._getDims(x, y, resTile).then(dims => {
            if (dims)
                tileCanvas.getContext("2d").drawImage(this.options.img, ...dims);
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
        attribution: "Image Tiler Based on <a href='https://github.com/Simperfy/img2-Leaftlet-Tile' target=_blank'>Simperfy/img2-Leaftlet-Tile</a>",
        tileSize: zoomSettings.res,
        maxNativeZoom: zoomSettings.lvl,
        img: img
    }).addTo(map);
    const bounds = [[0, 0], [-img.height / Math.pow(2, zoomSettings.lvl), img.width / Math.pow(2, zoomSettings.lvl)]];
    map.setMaxBounds(bounds);
    map.fitBounds(bounds);
}
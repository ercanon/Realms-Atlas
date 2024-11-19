document.getElementById('processImage').addEventListener('click', function () {
    const input = document.getElementById('uploadImage');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');

    if (input.files && input.files[0]) {
        const img = new Image();
        img.src = URL.createObjectURL(input.files[0]);
        
        img.onload = function () {
            // Configurar canvas con el tamaño de la imagen
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Configurar Leaflet
            const map = L.map('map', {
                crs: L.CRS.Simple,
                minZoom: -5,
                maxZoom: 5
            }).setView([0, 0], 0);

            const tileSize = 256; // Tamaño de cada tile
            const tiles = [];

            // Dividir la imagen en tiles
            const cols = Math.ceil(img.width / tileSize);
            const rows = Math.ceil(img.height / tileSize);

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const tileCanvas = document.createElement('canvas');
                    tileCanvas.width = tileSize;
                    tileCanvas.height = tileSize;
                    const tileCtx = tileCanvas.getContext('2d');

                    tileCtx.drawImage(
                        img,
                        x * tileSize,
                        y * tileSize,
                        tileSize,
                        tileSize,
                        0,
                        0,
                        tileSize,
                        tileSize
                    );

                    // Convertir cada tile a DataURL
                    const tileData = tileCanvas.toDataURL();
                    tiles.push({ x, y, data: tileData });
                }
            }

            // Cargar tiles en Leaflet
            const customTileLayer = L.GridLayer.extend({
                createTile: function (coords) {
                    const tile = document.createElement('img');
                    const tileInfo = tiles.find(t => t.x === coords.x && t.y === coords.y);
                    if (tileInfo) {
                        tile.src = tileInfo.data;
                    }
                    return tile;
                }
            });

            var customLayer = new CustomTileLayer('', {
              tileSize: 256, // Tamaño de cada tile
              maxZoom: 5 // Zoom máximo
            }).addTo(map);
        };
    }
});

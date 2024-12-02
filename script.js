document.getElementById('shareBtn').addEventListener('click', async () => 
{
    try 
    {
        if (navigator.share) 
        {
          await navigator.share({
            title: "Realms' Atlas",
            text: "¡Explora mundos interactivos en Realms' Atlas!",
            url: window.location.href,
          });
        } 
        else 
          navigator.clipboard.writeText(window.location.href);
    } 
    catch (error) 
    {
        console.error("Error al compartir:", error);
        alert("No se pudo compartir el enlace.");
    }
});

const displayArea = document.getElementById('mapRender');
document.getElementById('loadImgBtn').addEventListener('click', () => 
{
    const file = document.getElementById('uploadImg').files[0];
    const url = document.getElementById('imgUrl').value;

    if (file) //From upload
    {
        const reader = new FileReader();
        reader.onload = (e) => {
            displayMap(e.target.result);
        };
        reader.readAsDataURL(file);
    } 
    else if (url) //From URL
        displayMap(url);
    else //Null
        alert("Por favor, sube una imagen o ingresa un enlace.");
});

function displayMap(imgSrc) 
{
    displayArea.innerHTML = "";
    displayArea.style.display = 'block';
    document.getElementById('imgInput').style.display = 'none';

    const image = new Image();
    image.src = imgSrc;
    image.onload = () => {
        const tileDim = 256;
        const tileURLs = tileImg(image, tileDim);

        const map = L.map(displayArea, {
            crs: L.CRS.Simple,
            minZoom: -5,
            maxZoom: 2,
        });
    
        const tileLayer = L.tileLayer('', {
          tileSize: tileDim,
          noWrap: true,
        });

        tileLayer.getTileUrl = function (coords) {
          const { x, y } = coords;
          const key = `${x}-${y}`;
          return tileURLs[key] || null;
        };

        map.addLayer(tileLayer);

        const bounds = [[0, 0], [image.height, image.width]];
        map.setMaxBounds(bounds);
        map.fitBounds(bounds);*/
    };
}
    
function tileImg(img, tileSize)
{
    const rows = Math.ceil(img.height / tileSize);
    const cols = Math.ceil(img.width /  tileSize);
    const tileURLs = {}; 
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const canvas = document.createElement('canvas');
            
            const currentTileWidth = Math.min(tileSize, img.width - col * tileSize);
            const currentTileHeight = Math.min(tileSize, img.height - row * tileSize);
            canvas.width = currentTileWidth;
            canvas.height = currentTileHeight;

            tileURLs[`${col}-${row}`] = canvas.toDataURL();
        }
    }

    return tileURLs;
}

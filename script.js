document.getElementById('shareBtn').addEventListener('click', async () => {
    try {
        if (navigator.share) {
          await navigator.share({
            title: "Realms' Atlas",
            text: "¡Explora mundos interactivos en Realms' Atlas!",
            url: window.location.href,
          });
          alert("¡Enlace compartido exitosamente!");
        } else {
          // Fallback if Web Share API is not supported
          navigator.clipboard.writeText(window.location.href);
          alert("El enlace se ha copiado al portapapeles.");
        }
    } catch (error) {
        console.error("Error al compartir:", error);
        alert("No se pudo compartir el enlace.");
    }
});

const displayArea = document.getElementById('displayArea');
document.getElementById('loadImageButton').addEventListener('click', () => {
    const file = document.getElementById('uploadImage').files[0];
    const url = document.getElementById('imageUrl').value;

    if (file) {
        // Cargar imagen desde el dispositivo
        const reader = new FileReader();
        reader.onload = (e) => {
            displayImage(e.target.result);
        };
        reader.readAsDataURL(file);
    } else if (url) {
        // Cargar imagen desde un enlace
        displayImage(url);
    } else {
        alert("Por favor, sube una imagen o ingresa un enlace.");
    }
});
function displayImage(imageSrc) {
    // Mostrar la imagen en el área de visualización
    displayArea.innerHTML = `<img src="${imageSrc}" alt="Imagen cargada" style="max-width: 100%; max-height: 100%;" />`;

    // Cambiar al mapa después de 3 segundos
    setTimeout(() => {
        displayMap();
    }, 3000);
}
function displayMap() {
    // Limpiar el contenedor y mostrar el mapa
    displayArea.innerHTML = "";
    displayArea.style.border = "none";

    // Crear un mapa usando Leaflet.js
    const map = L.map(displayArea).setView([51.505, -0.09], 13);

    // Añadir un tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
}

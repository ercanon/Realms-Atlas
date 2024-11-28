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

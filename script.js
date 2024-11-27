document.getElementById('shareBtn').addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: 'Realms\' Atlas',
            url: window.location.href
        }).then(() => {
            console.log('Enlace compartido exitosamente');
        }).catch((error) => {
            console.error('Error al compartir el enlace:', error);
        });
    } else {
        alert('Tu navegador no soporta la función de compartir');
    }
});

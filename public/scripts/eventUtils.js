/*>--------------- { EventListeners } ---------------<*/
window.addEventListener('open', function (event) {
    console.log('New window opened with URL: ' + event.target.location.href);
});

document.getElementById("shareBtn").addEventListener("click", async () => {
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

document.getElementById("uploadImg").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file)
        return showError("No file selected.");

    const reader = new FileReader();

    reader.onload = (event) => loadImg(event.target.result);
    reader.onerror = (event) => { return showError("An error occurred while reading the file.", event.target.error); }
    reader.readAsDataURL(file);
})
document.getElementById("imgUrl").addEventListener("change", async function () {
    const url = this.value.trim();
    if (!url)
        return showError("Please, provide a valid image URL.");

    try {
        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok)
            return showError(`Failed to fetch image from URL: ${response.statusText}`);

        const contentType = response.headers.get("Content-Type");
        if (!contentType || !contentType.startsWith("image/"))
            return showError("The URL does not point to a valid image.");

        loadImg(url);
    }
    catch (error) {
        return showError("An error occurred while fetching the image.", error);
    }
})



/*>--------------- { Utilities } ---------------<*/
function showError(message, error = null) {
    console.error(message, error);
    alert(message);
}
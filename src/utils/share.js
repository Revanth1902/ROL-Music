export const shareSong = async (song) => {
    if (!song) return

    const shareData = {
        title: `Listen to ${song.title}`,
        text: `Playing ${song.title} by ${song.artistName} on ROL Music`,
        url: `${window.location.origin}/song/${song.id}`
    }

    if (navigator.share) {
        try {
            await navigator.share(shareData)
        } catch (err) {
            console.warn("Share cancelled or failed:", err)
            // Fallback if they cancel, we don't necessarily need to copy, but just in case:
        }
    } else {
        // Fallback for browsers without Web Share API (e.g. older desktop browsers)
        try {
            await navigator.clipboard.writeText(shareData.url)
            alert("Link copied to clipboard!")
        } catch (err) {
            console.error("Failed to copy text: ", err)
        }
    }
}

export const shareSong = (song) => {
    if (!song) return;
    window.dispatchEvent(new CustomEvent('rol_open_share_modal', { detail: song }));
};

function injectNotes() {
    const cards = document.querySelectorAll('[href*="/listing/"]');

    cards.forEach(card => {
        const match = card.href.match(/listing\/(\d+)/);
        if (!match) return;
        const id = match[1];

        // Skip if badge already exists
        if (card.querySelector('.trademe-note-badge')) return;
        
        chrome.storage.local.get([id], result => {
            const note = result[id];
            if (note) {
                const badge = document.createElement('div');
                badge.className = 'trademe-note-badge';
                
                // Get the appropriate emoji for predefined options
                const emoji = getEmojiForNote(note);
                badge.textContent = note + " " + emoji;
                
                badge.title = note;
                badge.style.color = 'white';
                badge.style.position = 'absolute';
                badge.style.bottom = '100px';
                badge.style.right = '5px';
                badge.style.background = '#007acd';
                badge.style.padding = '6px 10px';
                badge.style.fontSize = '13px';
                badge.style.fontWeight = '500';
                badge.style.borderRadius = '24px';
                badge.style.zIndex = '1000';
                badge.style.cursor = 'pointer';
                card.style.position = 'relative';
                card.appendChild(badge);
            }
        });
    });
}

function extractPropertyAddress() {
    return document.title;
}

// Store property address
function storePropertyData() {
    const match = window.location.href.match(/listing\/(\d+)/);
    if (!match) return;
    
    const listingId = match[1];
    const address = extractPropertyAddress();
    
    chrome.storage.local.set({
        [`address_${listingId}`]: address
    });
}

function getEmojiForNote(note) {
    const emojiMap = {
        'Too expensive': '💰',
        'Flood Zone': '🌊',
        'Bad Area': '🚫',
        'Bad Zoning': '🏗️',
        'Attached': '📎',
        'Shared Drive': '🚗'
    };
    
    return emojiMap[note] || '📝';
}

// Run address extraction when page loads
setTimeout(() => storePropertyData(), 500);

// Watch for page changes (for SPA navigation)
const observer = new MutationObserver(() => {
    injectNotes();
    // Extract address after page changes
    setTimeout(() => storePropertyData(), 1000);
});
observer.observe(document.body, { childList: true, subtree: true });
injectNotes();

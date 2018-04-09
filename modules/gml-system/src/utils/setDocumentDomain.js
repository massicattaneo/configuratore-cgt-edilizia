export default function () {
    // set document domain to match the main domain
    let replacement;
    // Hack for Beatrix release (slots.com)
    if (/games/.test(window.location.origin)) {
        replacement = 'games.';
    } else {
        // Site ID 5 using document domain with www. so in this case we don't replace it.
        replacement = /siteId=5/.test(window.location.search) ? '' : 'www.';
    }
    try {
        document.domain = window.location.host.replace(replacement, '');
    } catch (ex) {
    }
}

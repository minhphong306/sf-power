function getClickHandler() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {name: "share_admin_url"}, function(response) {
            console.log(response);
        });
    });
};

/**
 * Create a context menu which will only show up for admin url.
 */

chrome.contextMenus.create({
    "title": "Chia sẻ link này",
    "type": "normal",
    "contexts": ["page"],
    "onclick": getClickHandler
});





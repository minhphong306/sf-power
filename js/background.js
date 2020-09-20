function getClickHandler() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {name: "debug_discount"}, function(response) {
            console.log(response);
        });
    });
};

/**
 * Create a context menu which will only show up for admin url.
 */

chrome.contextMenus.create({
    "title": "Debug discount",
    "type": "normal",
    "contexts": ["page"],
    "onclick": getClickHandler
});





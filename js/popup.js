document.getElementById('btn').onclick = function(){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {greeting: "hello"}, function(response) {
            document.getElementById('msg').innerText = JSON.stringify(response)
        });
    });
}
const runButton = document.querySelector('#run');
//const clearButton = document.querySelector('#clear'); CLEAR BUTTON
const outputContentScraped = document.querySelector('#output-scraped');
const outputAPIResult = document.querySelector('#output-api-result');

let isFactChecked = false;
let contentLength = 0;
let factCheckText;
let isReal;
let isApiFailed = false;
let newsScore = 0;

runButton.addEventListener('click', async() => {

    if (!isFactChecked) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        // the path specified in files is relative to the root directory
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['inject.js'] });
        runButton.innerText = 'FACT CHECK';
        isFactChecked = true;
    } else {
        if (!factCheckText && isReal && !isApiFailed && contentLength > 0) {
            factCheckText = document.createElement('p');
            factCheckText.id = 'fact-check-text-success-real';
            factCheckText.innerText = `RESULT:\nREAL NEWS (${newsScore}%)`;

            factCheckText.style.display= "flex";
            factCheckText.style.justifyContent= "center";
            factCheckText.style.alignItems="center";
            factCheckText.style.textAlign= "center";
            factCheckText.style.backgroundColor = 'green';
            factCheckText.style.borderRadius = "8px";
            factCheckText.style.fontFamily = "Haas Grot Text R Web, Helvetica Neue, Helvetica, Arial, sans-serif";
            factCheckText.style.fontSize ="16px";
            factCheckText.style.fontWeight ="bold";
            factCheckText.style.width = "175px";
            factCheckText.style.font ="Arial";
            factCheckText.style.color= "white";
            factCheckText.style.height = "45.5px";
            factCheckText.style.padding = "1px";
            factCheckText.style.margin ="0 1px";
            factCheckText.style.position = "relative";

            runButton.parentNode.insertBefore(factCheckText, runButton.nextSibling);
            runButton.innerText = 'CLEAR';
        } else if (!factCheckText && !isReal && !isApiFailed && contentLength > 0) {
            factCheckText = document.createElement('p');
            factCheckText.id = 'fact-check-text-success-fake';
            factCheckText.innerText = `RESULT:\nFAKE NEWS (${newsScore}%)`;

            factCheckText.style.display= "flex";
            factCheckText.style.justifyContent= "center";
            factCheckText.style.alignItems="center";
            factCheckText.style.textAlign= "center";
            factCheckText.style.backgroundColor = 'red';
            factCheckText.style.borderRadius = "8px";
            factCheckText.style.fontFamily = "Haas Grot Text R Web, Helvetica Neue, Helvetica, Arial, sans-serif";
            factCheckText.style.fontSize ="16px";
            factCheckText.style.fontWeight ="bold";
            factCheckText.style.width = "175px";
            factCheckText.style.font ="Arial";
            factCheckText.style.color= "white";
            factCheckText.style.height = "45.5px";
            factCheckText.style.padding = "1px";
            factCheckText.style.margin ="0 1px";
            factCheckText.style.position = "relative";

            runButton.parentNode.insertBefore(factCheckText, runButton.nextSibling);
            runButton.innerText = 'CLEAR';
        } else if (!factCheckText && !isReal && !isApiFailed && contentLength <= 0) {
            factCheckText = document.createElement('p');
            factCheckText.id = 'fact-check-text-success-fake';
            factCheckText.innerText = `ERROR: NO CONTENT`;

            factCheckText.style.display= "flex";
            factCheckText.style.justifyContent= "center";
            factCheckText.style.alignItems="center";
            factCheckText.style.textAlign= "center";
            factCheckText.style.backgroundColor = 'orange';
            factCheckText.style.borderRadius = "8px";
            factCheckText.style.fontFamily = "Haas Grot Text R Web, Helvetica Neue, Helvetica, Arial, sans-serif";
            factCheckText.style.fontSize ="16px";
            factCheckText.style.fontWeight ="bold";
            factCheckText.style.width = "175px";
            factCheckText.style.font ="Arial";
            factCheckText.style.color= "white";
            factCheckText.style.height = "45.5px";
            factCheckText.style.padding = "1px";
            factCheckText.style.margin ="0 1px";
            factCheckText.style.position = "relative";

            runButton.parentNode.insertBefore(factCheckText, runButton.nextSibling);
            runButton.innerText = 'CLEAR';
        }  else if (!factCheckText && isApiFailed) {
            factCheckText = document.createElement('p');
            factCheckText.id = 'fact-check-text-error';
            factCheckText.innerText = 'ERROR:\nREFRESH PAGE';

            factCheckText.style.display= "flex";
            factCheckText.style.justifyContent= "center";
            factCheckText.style.alignItems="center";
            factCheckText.style.textAlign= "center";
            factCheckText.style.backgroundColor = 'orange';
            factCheckText.style.borderRadius = "8px";
            factCheckText.style.fontFamily = "Haas Grot Text R Web, Helvetica Neue, Helvetica, Arial, sans-serif";
            factCheckText.style.fontSize ="16px";
            factCheckText.style.fontWeight ="bold";
            factCheckText.style.width = "175px";
            factCheckText.style.font ="Arial";
            factCheckText.style.color= "white";
            factCheckText.style.height = "45.5px";
            factCheckText.style.padding = "1px";
            factCheckText.style.margin ="0 1px";
            factCheckText.style.position = "relative";

            runButton.parentNode.insertBefore(factCheckText, runButton.nextSibling);
            runButton.innerText = 'CLEAR';
        } else {
            outputContentScraped.innerHTML = 'No content loaded.';
            factCheckText.style.display = 'none';
            runButton.innerText = 'Get Content';
            isFactChecked = false;
            factCheckText.remove();
            factCheckText = null;
        }
    }
});

chrome.runtime.onMessage.addListener(
    /**
     * Don't have the types unless typescript is set up
     * @param {any} request
     * @param {any} sender
     * @param {any} sendResponse
     */
    (request, _sender, _sendResponse) => {
        switch(request['status']) {
            // these are examples on how to handle messages from the injected script
            case 'success-content-scraped':
                let { postedBy, content } = request['payload'];
                contentLength = content.length;
                outputContentScraped.innerHTML = `
                <h2 class="author">By: ${postedBy}</h2>
                <p class="content">${content}</p>
                `;
                break;

            case 'failed-content-scraped':
                outputContentScraped.innerHTML = `
                <h2>No Post Found</h2>
                <p>Unfortunately, no content could be found.</p>
                `;
                break;

            case 'pending-api-request':
                outputAPIResult.innerHTML = 'ERROR: The request is pending. Refresh page.';
                break;

            case 'success-api-request':
                let { isRealNews, highestScore } = request['payload']
                isReal = isRealNews;
                newsScore = highestScore;
                outputAPIResult.innerHTML = `SUCCESS: The API request is successful`;
                break;

            case 'failed-api-request':
                outputAPIResult.innerHTML = 'ERROR: The request failed. Refresh page.';
                isApiFailed = true;
                break;

            case 'failed-network':
                outputAPIResult.innerHTML = 'ERROR: Bad network. Refresh Page.';
                isApiFailed = true;
                break;

            default:
                break;
        }
    });

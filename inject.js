/**
 * This script is meant to be injected and ran when we use the popup. This is the entrypoint.
 */
async function main() {
    const post = scrapeFacebookPost();

    if (post.retrieved) {
        // we want to send that the content was successfully scraped
        await chrome.runtime.sendMessage({ 'status': 'success-content-scraped', 'payload': post });
        
        try {
            await chrome.runtime.sendMessage({ 'status': 'pending-api-request' });

            // this is the fake news API
            const response = await fetch('https://api-inference.huggingface.co/models/jvictoryliner/Fake-News-Bert-Detect',
                {
                    method: 'POST',
                    headers: { Authorization: 'Bearer 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' },
                    body: JSON.stringify({ 'inputs': post.content }),
                }
            );

            // this means that the API doesn't respond with a 200 even though it connects
            if (!response.ok) return chrome.runtime.sendMessage({ 'status': 'failed-api-request' });
            const result = await response.json();

            const scoreOne = result[0][0].score;
            const scoreTwo = result[0][1].score;

            let isRealNews = false;
            const fakeIsFirst = result[0][0].label === "LABEL_0";

            if (fakeIsFirst) {
                isRealNews = scoreOne < scoreTwo;
            } else {
                isRealNews = scoreOne > scoreTwo;
            }

            const highestScore = (Math.max(scoreOne, scoreTwo) * 100).toFixed(2);

            // we send the result if it's a faker news or not
            await chrome.runtime.sendMessage({ 'status': 'success-api-request', 'payload': {
                    'isRealNews': isRealNews,
                    'highestScore': highestScore
                } });
        } catch (error) {
            console.log(error)
            // we also want to send a message if there is a network failure (certain status codes trigger this)
            await chrome.runtime.sendMessage({ 'status': 'failed-network' });
        }

    } else {
        await chrome.runtime.sendMessage({ 'status': 'failed-content-scraped' });
    }
}

/**
 * This scrapes the current facebook post opened.
 * @returns an object with a postedBy and content property both of which could be strings or null
 */
function scrapeFacebookPost() {
     // IMPORTANT: this query sequence works specifically when you open a facebook post
     let matches = matchElementsOfQuerySequence([
        'a svg image',      // profile picture - not text
        'h2 span a',        // profile name
        'span a span',      // post time
        'div span',         // unknown - skippable
        'div span',         // post privacy
        'div span',         // post content
        'div span',         // unknown - skippable
    ], document, true);     // true means this array will only have at most 1 element

    if (matches.length > 0) return { postedBy: matches[0][1].textContent, content: matches[0][5].textContent, retrieved: true }
    
    // if the first sequence doesn't work, there is another sequence we could try
    // it seems this works for ad posts
    if (matches.length === 0) {
        matches = matchElementsOfQuerySequence([
            'a div a svg',          // profile picture
            'div span h2',          // profile name
            'div div > svg + div',  // more button
            'div[data-ad-preview]'  // post content
        ], document, true);

        return { postedBy: matches[0][1].textContent, content: matches[0][3].textContent, retrieved: true };
    }

    return { postedBy: null, content: null, retrieved: false };
}

/**
 * The function that will find elements that are siblings or cousins of one another based on the sequence of queries.
 * @param {String[]} matchPatternsOfQueries  - An array of queries where the resulting elements should be "siblings" or "cousins".
 * @param {Document} document - An HTML Document.
 * @param {boolean} [firstMatchOnly=false] - indicates if the algorithm includes all matches.
 * @returns {Element[][]} The array of results following the matched pattern.
 */
function matchElementsOfQuerySequence (matchPatternsOfQueries, document, firstMatchOnly=false) {
    const basis = document.querySelectorAll(matchPatternsOfQueries[0]);
    const flatList = flattenDocumentDepthFirst(document);
    let results = [];

    for (let first of basis) {
        const parent = first.parentNode;
        if (!parent) continue;

        let initialMatches = new Array(matchPatternsOfQueries.length).fill(null);
        initialMatches[0] = first;

        let sequence = findFirstElementSequenceRecursive(matchPatternsOfQueries, first, parent, initialMatches, 1, flatList);
        
        if (sequence.every(element => element != null)) {
            results.push(sequence);
            if (firstMatchOnly) break;
        }
    }

    return results;
}

/**
 * The recursive function which returns a sequence of elements according to the queries.
 * @param {String[]} queries - the queries given, doesn't change
 * @param {Element} first - very first element, doesn't change
 * @param {Element} parent - current parent
 * @param {Element[]} matches - current matches
 * @param {Number} index - current index in the queries
 * @param {Element[]} flatList - the flat list of DOM elements for sequence checks
 */
function findFirstElementSequenceRecursive(queries, first, parent, matches, index, flatList) {
    if (index >= queries.length) return matches;
    let targetElements = parent.querySelectorAll(queries[index]);

    if (targetElements.length > 0) {
        for (let targetElement of targetElements) {
            if ( matches.some(element => {
                    if (element === null) return false;

                    return (
                        element === targetElement       || 
                        element.contains(targetElement) || 
                        targetElement.contains(element) ||
                        flatList.indexOf(element) >= flatList.indexOf(targetElement)
                    );
                })
            ) continue; 

            matches[index] = targetElement;
            matches = findFirstElementSequenceRecursive(queries, first, parent, matches, index + 1, flatList);
        }
    } else if (parent.parentNode) {
        matches = findFirstElementSequenceRecursive(queries, first, parent.parentNode, matches, index, flatList);
    }
    return matches;
}

/**
 * Flatten document into an array using a DFS algorithm.
 * @param {Document} document - The document object.
 * @param {Element} element - The current element, used in recursion.
 * @param {Element[]} elements - The current elements, used in recursion
 * @returns {Element[]} The elements in the flattened document.
 */
function flattenDocumentDepthFirst(document, element=null, elements=[]) {
    if (!element) element = document.body;
    elements.push(element);
  
    for (let children of element.children) {
        flattenDocumentDepthFirst(document, children, elements);
    }
  
    return elements;
}

main();
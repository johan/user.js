// ==UserScript==
// @name          Show layout version on groupon sites
// @namespace     http://github.com/johan/
// @description   When visiting a groupon page (regardless of URL) highlight its layout version on top, and whether it's current or not (colour)
// @match         https://*/*
// @match         http://*/*
// ==/UserScript==

try {
  var layout = document.doctype.nextSibling.nodeValue;
} catch(e) {}

if (layout && /@v[\d.]{3,}/.test(layout)) {
  var col = /✔/.test(layout) ? '#82b548' : '#e35205'; // ✘
  var div = document.createElement('div');
  div.textContent = layout;
  div.style.cssText = 'text-align:center;width:100%;z-index:20000;text-shadow:'+
    '-1px -1px #000,-1px 0 #000,-1px 1px #000,0 -1px #000,0 1px #000,'+
    '1px -1px #000,1px 0 #000,1px 1px #000;position:absolute;font-size:10px;'+
    'color:' + col;
  document.body.insertBefore(div, document.body.firstChild);
}

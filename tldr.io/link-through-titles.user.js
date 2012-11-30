// ==UserScript==
// @name          Link through tl;dr titles
// @namespace     https://github.com/johan/user.js
// @require       https://gist.github.com/raw/3957352/d6a2ef12f034816848632131a1783daca55361dd/on.js
// @description   Make tl;dr link through
// @match         http://tldr.io/tldr/*
// ==/UserScript==

on({ dom: { title: 'css div.tldr-header'
          , link:  'css a[href]#read-full-article'
          }
   , path_re: '^/tldrs/[0-9a-f]+'
   , ready: linkify
   });

function linkify(dom) {
  var t = dom.title, a = document.createElement('a');
  a.className = t.className;
  a.href = dom.link.href;
  while (t.firstChild)
    a.appendChild(t.firstChild);

  t.parentNode.replaceChild(a, t);
}

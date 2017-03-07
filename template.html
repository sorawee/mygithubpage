@(define path-prefix
  (cond
    [(string-contains (symbol->string here) "books/") "../../../"]
    [(string-contains (symbol->string here) "tags/") "../../"] ; TODO: find a better way
    [(string-contains (symbol->string here) "/") "../"]
    [else "/"]))
@(define source-file (select-from-metas 'here-path metas))
@(define pollen-source-listing
  (string-append "https://github.com/sorawee/my-website/blob/master/"
                 (path->string (get-markup-source here))))

@(define type (or (select 'type metas)
                  (car (regexp-match #rx"^[^/]*" (symbol->string here)))))
@(define (get-navbar) @ids{
  <nav><ul>
    @when/splice[(and (previous here) (not (eq? (parent here) (previous here))))]{
      <li><a href="@|path-prefix|@|(previous here)|">&larr; Previous</a></li>
    }
    @when/splice[(not (eq? here 'index.html))]{
      <li><a href="@|path-prefix|">&uarr; Home</a></li>
    }
    @when/splice[(and (next here) (member (next here) (siblings here)))]{
      <li><a href="@|path-prefix|@|(next here)|">Next &rarr;</a></li>
    }
    @when/splice[(pdfable? source-file)]{
      <li>
        <a href="@pdfname[source-file]">
          <img src="@|path-prefix|css/pdficon.png" width="15" height="15" alt="Download PDF" />
          <span class="caps" style="font-style: normal">PDF</span>
        </a>
      </li>
    }
    <li style="width: auto;">
      <a href="@|pollen-source-listing|" title="View the Pollen source for this file"
         class="sourcelink code">&loz; Pollen Source
      </a>
    </li>
  </ul></nav>})
@(define (get-comment path)
  @ids{
<div id="disqus_thread"></div>
<script>
var disqus_config = function () {
this.page.identifier = "@path"; // Replace PAGE_IDENTIFIER with your page's unique identifier variable
};
(function() { // DON'T EDIT BELOW THIS LINE
var d = document, s = d.createElement('script');
s.src = '//sorawee.disqus.com/embed.js';
s.setAttribute('data-timestamp', +new Date());
(d.head || d.body).appendChild(s);
})();
</script>
<noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>})

<html>
<head>
  <meta charset="UTF-8">
  <title>
    @(if (equal? "index" type)
         super-title
         (string-append (or (select 'title metas) (select 'special-title metas)) " — " super-title))
  </title>
  <link rel="stylesheet" href="https://code.cdn.mozilla.net/fonts/fira.css">
  <link href="https://afeld.github.io/emoji-css/emoji.css" rel="stylesheet">
  <link rel="stylesheet" type="text/css" media="all" href="@|path-prefix|css/styles.css" />
  <link rel="stylesheet" type="text/css" media="all" href="@|path-prefix|css/normalize.css" />
  <link rel="stylesheet" type="text/css" media="all" href="@|path-prefix|css/styles-github.css" />
  <script type="text/javascript"
    src="https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_CHTML">
  </script>
  <script type="text/x-mathjax-config">
    MathJax.Hub.Config({
      tex2jax: {inlineMath: [['$','$']]},
      TeX: {
        Macros: {
          seq: ["{\\langle #1 \\rangle}", 1],
          set: ["{\\{ #1 \\}}", 1],
          setof: ["{\\{ #1 \\ | \\ #2 \\}}", 2],
          N: "{\\mathbb N}",
          R: "{\\mathbb R}",
          Z: "{\\mathbb Z}",
          Q: "{\\mathbb Q}",
          floor: ["{\\lfloor #1 \\rfloor}", 1],
          ceil: ["{\\lceil #1 \\rceil}", 1],
        }
      }
    });
  </script>
  @(->html (make-highlight-css))
</head>
<body>
  @(case type
    [("blog") (get-navbar)]
    [else ""])
  <section class="page-header">
    <h1 class="project-name">
      <a href="@|path-prefix|">@|super-title|</a>
    </h1>
    <h2 class="project-tagline"></h2>
    <a href="@|path-prefix|" class="btn">Blog</a>
    <a href="@|path-prefix|books.html" class="btn">Books</a>
    <a href="@|path-prefix|feed.xml" class="btn">RSS</a>
    <a href="@|path-prefix|about.html" class="btn">About Me</a>
  </section>
  <section class="main-content" id="the-main">
    <div id="real-content">
      @(->html
        (case type
          [("index" "tag") (! (list `(h1 ,(hash-ref metas 'special-title)) (splice-top doc)))]
          [("blog") (! (list `(h1 ,(hash-ref metas 'title)) (make-post here #:header #f)))]
          [("books") (! (list `(h1 ,(hash-ref metas 'title)) (get-doc here)))]
          [else "Under Construction!"]))
    </div>
    @(case type
      [("blog" "books") (get-comment (symbol->string here))]
      [else ""])
  </section>
</body>
</html>

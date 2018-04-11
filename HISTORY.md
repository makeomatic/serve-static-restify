2.1.0 / 2018-04-11

* ensure restify 7.x.x works
* backport serve-static updates

2.0.0 / 2017-08-24
==================

* major: upgrade to restify@5.x.x & backport express changes

1.13.2 / 2018-02-07
===================

  * Fix incorrect end tag in redirects
  * deps: encodeurl@~1.0.2
    - Fix encoding `%` as last character
  * deps: send@0.16.2
    - deps: depd@~1.1.2
    - deps: encodeurl@~1.0.2
    - deps: statuses@~1.4.0

1.13.1 / 2017-09-29
===================

  * Fix regression when `root` is incorrectly set to a file
  * deps: send@0.16.1

1.13.0 / 2017-09-27
===================

  * deps: send@0.16.0
    - Add 70 new types for file extensions
    - Add `immutable` option
    - Fix missing `</html>` in default error & redirects
    - Set charset as "UTF-8" for .js and .json
    - Use instance methods on steam to check for listeners
    - deps: mime@1.4.1
    - perf: improve path validation speed

1.12.6 / 2017-09-22
===================

  * deps: send@0.15.6
    - deps: debug@2.6.9
    - perf: improve `If-Match` token parsing
  * perf: improve slash collapsing

1.12.5 / 2017-09-21
===================

  * deps: parseurl@~1.3.2
    - perf: reduce overhead for full URLs
    - perf: unroll the "fast-path" `RegExp`
  * deps: send@0.15.5
    - Fix handling of modified headers with invalid dates
    - deps: etag@~1.8.1
    - deps: fresh@0.5.2

1.12.4 / 2017-08-05
===================

  * deps: send@0.15.4
    - deps: debug@2.6.8
    - deps: depd@~1.1.1
    - deps: http-errors@~1.6.2

1.12.3 / 2017-05-16
===================

  * deps: send@0.15.3
    - deps: debug@2.6.7

1.12.2 / 2017-04-26
===================

  * deps: send@0.15.2
    - deps: debug@2.6.4

1.12.1 / 2017-03-04
===================

  * deps: send@0.15.1
    - Fix issue when `Date.parse` does not return `NaN` on invalid date
    - Fix strict violation in broken environments

1.12.0 / 2017-02-25
===================

  * Send complete HTML document in redirect response
  * Set default CSP header in redirect response
  * deps: send@0.15.0
    - Fix false detection of `no-cache` request directive
    - Fix incorrect result when `If-None-Match` has both `*` and ETags
    - Fix weak `ETag` matching to match spec
    - Remove usage of `res._headers` private field
    - Support `If-Match` and `If-Unmodified-Since` headers
    - Use `res.getHeaderNames()` when available
    - Use `res.headersSent` when available
    - deps: debug@2.6.1
    - deps: etag@~1.8.0
    - deps: fresh@0.5.0
    - deps: http-errors@~1.6.1

1.11.2 / 2017-01-23
===================

  * deps: send@0.14.2
    - deps: http-errors@~1.5.1
    - deps: ms@0.7.2
    - deps: statuses@~1.3.1

1.11.1 / 2016-06-10
===================

  * Fix redirect error when `req.url` contains raw non-URL characters
  * deps: send@0.14.1

1.11.0 / 2016-06-07
===================

  * Use status code 301 for redirects
  * deps: send@0.14.0
    - Add `acceptRanges` option
    - Add `cacheControl` option
    - Attempt to combine multiple ranges into single range
    - Correctly inherit from `Stream` class
    - Fix `Content-Range` header in 416 responses when using `start`/`end` options
    - Fix `Content-Range` header missing from default 416 responses
    - Ignore non-byte `Range` headers
    - deps: http-errors@~1.5.0
    - deps: range-parser@~1.2.0
    - deps: statuses@~1.3.0
    - perf: remove argument reassignment

1.10.3 / 2016-05-30
===================

  * deps: send@0.13.2
    - Fix invalid `Content-Type` header when `send.mime.default_type` unset

1.10.2 / 2016-01-19
===================

  * deps: parseurl@~1.3.1
    - perf: enable strict mode

1.10.1 / 2016-01-16
===================

1.0.0 / 2016-02-15
===================

  * feat: port to restify middleware

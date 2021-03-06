var restify = require('restify')
var assert = require('assert')
var path = require('path')
var request = require('supertest')
var errors = require('restify-errors')
var ResourceNotFoundError = errors.ResourceNotFoundError
var serveStatic = require('..')

var fixtures = path.join(__dirname, '/fixtures')
var relative = path.relative(process.cwd(), fixtures)

var skipRelative = ~relative.indexOf('..') || path.resolve(relative) === relative

describe('serveStatic()', function () {
  describe('basic operations', function () {
    var server
    before(function () {
      server = createServer()
    })

    it('should require root path', function () {
      assert.throws(serveStatic.bind(), /root path required/)
    })

    it('should require root path to be string', function () {
      assert.throws(serveStatic.bind(null, 42), /root path.*string/)
    })

    it('should serve static files', function (done) {
      request(server)
        .get('/todo.txt')
        .expect(200, '- groceries', done)
    })

    it('should support nesting', function (done) {
      request(server)
        .get('/users/tobi.txt')
        .expect(200, 'ferret', done)
    })

    it('should set Content-Type', function (done) {
      request(server)
        .get('/todo.txt')
        .expect('Content-Type', 'text/plain; charset=UTF-8')
        .expect(200, done)
    })

    it('should set Last-Modified', function (done) {
      request(server)
        .get('/todo.txt')
        .expect('Last-Modified', /\d{2} \w{3} \d{4}/)
        .expect(200, done)
    })

    it('should default max-age=0', function (done) {
      request(server)
        .get('/todo.txt')
        .expect('Cache-Control', 'public, max-age=0')
        .expect(200, done)
    })

    it('should support urlencoded pathnames', function (done) {
      request(server)
        .get('/foo%20bar')
        .parse(parseAsText)
        .expect(200, 'baz', done)
    })

    it('should not choke on auth-looking URL', function (done) {
      request(server)
        .get('//todo@txt')
        .expect(404, done)
    })

    it('should support index.html', function (done) {
      request(server)
        .get('/users/')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect('<p>tobi, loki, jane</p>', done)
    })

    it('should support ../', function (done) {
      request(server)
        .get('/users/../todo.txt')
        .expect(200, '- groceries', done)
    })

    it('should support HEAD', function (done) {
      request(server)
        .head('/todo.txt')
        .expect(200, undefined, done)
    })

    it('should skip POST requests', function (done) {
      request(server)
        .post('/todo.txt')
        .expect(404, format404Error('/todo.txt'), done)
    })

    it('should support conditional requests', function (done) {
      request(server)
        .get('/todo.txt')
        .end(function (err, res) {
          if (err) throw err
          request(server)
            .get('/todo.txt')
            .set('If-None-Match', res.headers.etag)
            .expect(304, done)
        })
    })

    it('should support precondition checks', function (done) {
      request(server)
        .get('/todo.txt')
        .set('If-Match', '"foo"')
        .expect(412, done)
    })

    it('should serve zero-length files', function (done) {
      request(server)
        .get('/empty.txt')
        .expect(200, '', done)
    })

    it('should ignore hidden files', function (done) {
      request(server)
        .get('/.hidden')
        .expect(404, done)
    })
  });

  (skipRelative ? describe.skip : describe)('current dir', function () {
    var server
    before(function () {
      server = createServer('.')
    })

    it('should be served with "."', function (done) {
      var dest = relative.split(path.sep).join('/')
      request(server)
        .get('/' + dest + '/todo.txt')
        .expect(200, '- groceries', done)
    })
  })

  describe('acceptRanges', function () {
    describe('when false', function () {
      it('should not include Accept-Ranges', function (done) {
        request(createServer(fixtures, {'acceptRanges': false}))
          .get('/nums')
          .parse(parseAsText)
          .expect(shouldNotHaveHeader('Accept-Ranges'))
          .expect(200, '123456789', done)
      })

      it('should ignore Rage request header', function (done) {
        request(createServer(fixtures, {'acceptRanges': false}))
          .get('/nums')
          .set('Range', 'bytes=0-3')
          .parse(parseAsText)
          .expect(shouldNotHaveHeader('Accept-Ranges'))
          .expect(shouldNotHaveHeader('Content-Range'))
          .expect(200, '123456789', done)
      })
    })

    describe('when true', function () {
      it('should include Accept-Ranges', function (done) {
        request(createServer(fixtures, {'acceptRanges': true}))
          .get('/nums')
          .parse(parseAsText)
          .expect('Accept-Ranges', 'bytes')
          .expect(200, '123456789', done)
      })

      it('should obey Rage request header', function (done) {
        request(createServer(fixtures, {'acceptRanges': true}))
          .get('/nums')
          .set('Range', 'bytes=0-3')
          .parse(parseAsText)
          .expect('Accept-Ranges', 'bytes')
          .expect('Content-Range', 'bytes 0-3/9')
          .expect(206, '1234', done)
      })
    })
  })

  describe('cacheControl', function () {
    describe('when false', function () {
      it('should not include Cache-Control', function (done) {
        request(createServer(fixtures, {'cacheControl': false}))
          .get('/nums')
          .parse(parseAsText)
          .expect(shouldNotHaveHeader('Cache-Control'))
          .expect(200, '123456789', done)
      })

      it('should ignore maxAge', function (done) {
        request(createServer(fixtures, {'cacheControl': false, 'maxAge': 12000}))
          .get('/nums')
          .parse(parseAsText)
          .expect(shouldNotHaveHeader('Cache-Control'))
          .expect(200, '123456789', done)
      })
    })

    describe('when true', function () {
      it('should include Cache-Control', function (done) {
        request(createServer(fixtures, {'cacheControl': true}))
          .get('/nums')
          .parse(parseAsText)
          .expect('Cache-Control', 'public, max-age=0')
          .expect(200, '123456789', done)
      })
    })
  })

  describe('extensions', function () {
    it('should be not be enabled by default', function (done) {
      var server = createServer(fixtures)

      request(server)
        .get('/todo')
        .expect(404, done)
    })

    it('should be configurable', function (done) {
      var server = createServer(fixtures, {'extensions': 'txt'})

      request(server)
        .get('/todo')
        .expect(200, '- groceries', done)
    })

    it('should support disabling extensions', function (done) {
      var server = createServer(fixtures, {'extensions': false})

      request(server)
        .get('/todo')
        .expect(404, done)
    })

    it('should support fallbacks', function (done) {
      var server = createServer(fixtures, {'extensions': ['htm', 'html', 'txt']})

      request(server)
        .get('/todo')
        .expect(200, '<li>groceries</li>', done)
    })

    it('should 404 if nothing found', function (done) {
      var server = createServer(fixtures, {'extensions': ['htm', 'html', 'txt']})

      request(server)
        .get('/bob')
        .expect(404, done)
    })
  })

  describe('fallthrough', function () {
    it('should default to true', function (done) {
      request(createServer())
        .get('/does-not-exist')
        .expect(404, format404Error('/does-not-exist'), done)
    })

    describe('when true', function () {
      before(function () {
        this.server = createServer(fixtures, {'fallthrough': true})
      })

      it('should fall-through when OPTIONS request', function (done) {
        request(this.server)
          .options('/todo.txt')
          .expect(404, format404Error('/todo.txt'), done)
      })

      it('should fall-through when URL malformed', function (done) {
        request(this.server)
          .get('/%')
          .expect(404, format404Error('/%'), done)
      })

      it('should fall-through when traversing past root', function (done) {
        request(this.server)
          .get('/users/../../todo.txt')
          .expect(404, format404Error('/users/../../todo.txt'), done)
      })

      it('should fall-through when URL too long', function (done) {
        request(this.server)
          .get('/' + Array(8192).join('foobar'))
          .expect(404, format404Error('/' + Array(8192).join('foobar')), done)
      })

      describe('with redirect: true', function () {
        before(function () {
          this.server = createServer(fixtures, {'fallthrough': true, 'redirect': true})
        })

        it('should fall-through when directory', function (done) {
          request(this.server)
            .get('/pets/')
            .expect(404, format404Error('/pets/'), done)
        })

        it('should redirect when directory without slash', function (done) {
          request(this.server)
            .get('/pets')
            .expect(301, /Redirecting/, done)
        })
      })

      describe('with redirect: false', function () {
        before(function () {
          this.server = createServer(fixtures, {'fallthrough': true, 'redirect': false})
        })

        it('should fall-through when directory', function (done) {
          request(this.server)
            .get('/pets/')
            .expect(404, format404Error('/pets/'), done)
        })

        it('should fall-through when directory without slash', function (done) {
          request(this.server)
            .get('/pets')
            .expect(404, format404Error('/pets'), done)
        })
      })
    })

    describe('when false', function () {
      before(function () {
        this.server = createServer(fixtures, {'fallthrough': false})
      })

      it('should 405 when OPTIONS request', function (done) {
        request(this.server)
          .options('/todo.txt')
          .expect('Allow', 'GET, HEAD')
          .expect(405, done)
      })

      it('should 400 when URL malformed', function (done) {
        request(this.server)
          .get('/%')
          .expect(404, format404Error('/%'), done)
      })

      it('should 403 when traversing past root', function (done) {
        request(this.server)
          .get('/users/../../todo.txt')
          .expect(403, /Forbidden/, done)
      })

      it('should 404 when URL too long', function (done) {
        request(this.server)
          .get('/' + Array(8192).join('foobar'))
          .expect(404, /ENAMETOOLONG/, done)
      })

      describe('with redirect: true', function () {
        before(function () {
          this.server = createServer(fixtures, {'fallthrough': false, 'redirect': true})
        })

        it('should 404 when directory', function (done) {
          request(this.server)
            .get('/pets/')
            .expect(404, /Not Found|ENOENT/, done)
        })

        it('should redirect when directory without slash', function (done) {
          request(this.server)
            .get('/pets')
            .expect(301, /Redirecting/, done)
        })
      })

      describe('with redirect: false', function () {
        before(function () {
          this.server = createServer(fixtures, {'fallthrough': false, 'redirect': false})
        })

        it('should 404 when directory', function (done) {
          request(this.server)
            .get('/pets/')
            .expect(404, /Not Found|ENOENT/, done)
        })

        it('should 404 when directory without slash', function (done) {
          request(this.server)
            .get('/pets')
            .expect(404, /Not Found|ENOENT/, done)
        })
      })
    })
  })

  describe('hidden files', function () {
    var server
    before(function () {
      server = createServer(fixtures, {'dotfiles': 'allow'})
    })

    it('should be served when dotfiles: "allow" is given', function (done) {
      request(server)
        .get('/.hidden')
        .parse(parseAsText)
        .expect(200, 'I am hidden', done)
    })
  })

  describe('immutable', function () {
    it('should default to false', function (done) {
      request(createServer(fixtures))
        .get('/nums')
        .expect('Cache-Control', 'public, max-age=0', done)
    })

    it('should set immutable directive in Cache-Control', function (done) {
      request(createServer(fixtures, {'immutable': true, 'maxAge': '1h'}))
        .get('/nums')
        .expect('Cache-Control', 'public, max-age=3600, immutable', done)
    })
  })

  describe('lastModified', function () {
    describe('when false', function () {
      it('should not include Last-Modifed', function (done) {
        request(createServer(fixtures, {'lastModified': false}))
          .get('/nums')
          .parse(parseAsText)
          .expect(shouldNotHaveHeader('Last-Modified'))
          .expect(200, '123456789', done)
      })
    })

    describe('when true', function () {
      it('should include Last-Modifed', function (done) {
        request(createServer(fixtures, {'lastModified': true}))
          .get('/nums')
          .parse(parseAsText)
          .expect('Last-Modified', /^\w{3}, \d+ \w+ \d+ \d+:\d+:\d+ \w+$/)
          .expect(200, '123456789', done)
      })
    })
  })

  describe('maxAge', function () {
    it('should accept string', function (done) {
      request(createServer(fixtures, {'maxAge': '30d'}))
        .get('/todo.txt')
        .expect('cache-control', 'public, max-age=' + (60 * 60 * 24 * 30))
        .expect(200, done)
    })

    it('should be reasonable when infinite', function (done) {
      request(createServer(fixtures, {'maxAge': Infinity}))
        .get('/todo.txt')
        .expect('cache-control', 'public, max-age=' + (60 * 60 * 24 * 365))
        .expect(200, done)
    })
  })

  describe('redirect', function () {
    var server
    before(function () {
      server = createServer(fixtures, null, '/*', function (req, res) {
        req.url = req.url.replace(/\/snow(\/|$)/, '/snow \u2603$1')
      })
    })

    it('should redirect directories', function (done) {
      request(server)
        .get('/users')
        .expect('Location', '/users/')
        .expect(301, done)
    })

    it('should include HTML link', function (done) {
      request(server)
        .get('/users')
        .expect('Location', '/users/')
        .expect(301, /<a href="\/users\/">/, done)
    })

    it('should redirect directories with query string', function (done) {
      request(server)
        .get('/users?name=john')
        .expect('Location', '/users/?name=john')
        .expect(301, done)
    })

    it('should not redirect to protocol-relative locations', function (done) {
      request(server)
        .get('//users')
        .expect('Location', '/users/')
        .expect(301, done)
    })

    it('should ensure redirect URL is properly encoded', function (done) {
      request(server)
        .get('/snow')
        .expect('Location', '/snow%20%E2%98%83/')
        .expect('Content-Type', /html/)
        .expect(301, />Redirecting to <a href="\/snow%20%E2%98%83\/">\/snow%20%E2%98%83\/<\/a></, done)
    })

    it('should respond with default Content-Security-Policy', function (done) {
      request(server)
        .get('/users')
        .expect('Content-Security-Policy', "default-src 'self'")
        .expect(301, done)
    })

    it('should not redirect incorrectly', function (done) {
      request(server)
        .get('/')
        .expect(404, done)
    })

    describe('when false', function () {
      var server
      before(function () {
        server = createServer(fixtures, {'redirect': false})
      })

      it('should disable redirect', function (done) {
        request(server)
          .get('/users')
          .expect(404, done)
      })
    })
  })

  describe('setHeaders', function () {
    it('should reject non-functions', function () {
      assert.throws(serveStatic.bind(null, fixtures, {'setHeaders': 3}), /setHeaders.*function/)
    })

    it('should get called when sending file', function (done) {
      var server = createServer(fixtures, {'setHeaders': function (res) {
        res.setHeader('x-custom', 'set')
      }})

      request(server)
        .get('/nums')
        .expect('x-custom', 'set')
        .expect(200, done)
    })

    it('should not get called on 404', function (done) {
      var server = createServer(fixtures, {'setHeaders': function (res) {
        res.setHeader('x-custom', 'set')
      }})

      request(server)
        .get('/bogus')
        .expect(shouldNotHaveHeader('x-custom'))
        .expect(404, done)
    })

    it('should not get called on redirect', function (done) {
      var server = createServer(fixtures, {'setHeaders': function (res) {
        res.setHeader('x-custom', 'set')
      }})

      request(server)
        .get('/users')
        .expect(shouldNotHaveHeader('x-custom'))
        .expect(301, done)
    })
  })

  describe('when traversing past root', function () {
    before(function () {
      this.server = createServer(fixtures, {'fallthrough': false})
    })

    it('should catch urlencoded ../', function (done) {
      request(this.server)
        .get('/users/%2e%2e/%2e%2e/todo.txt')
        .expect(403, done)
    })

    it('should not allow root path disclosure', function (done) {
      request(this.server)
        .get('/users/../../fixtures/todo.txt')
        .expect(403, done)
    })
  })

  describe('when request has "Range" header', function () {
    var server
    before(function () {
      server = createServer()
    })

    it('should support byte ranges', function (done) {
      request(server)
        .get('/nums')
        .parse(parseAsText)
        .set('Range', 'bytes=0-4')
        .expect('12345', done)
    })

    it('should be inclusive', function (done) {
      request(server)
        .get('/nums')
        .set('Range', 'bytes=0-0')
        .parse(parseAsText)
        .expect('1', done)
    })

    it('should set Content-Range', function (done) {
      request(server)
        .get('/nums')
        .set('Range', 'bytes=2-5')
        .parse(parseAsText)
        .expect('Content-Range', 'bytes 2-5/9', done)
    })

    it('should support -n', function (done) {
      request(server)
        .get('/nums')
        .set('Range', 'bytes=-3')
        .parse(parseAsText)
        .expect('789', done)
    })

    it('should support n-', function (done) {
      request(server)
        .get('/nums')
        .set('Range', 'bytes=3-')
        .parse(parseAsText)
        .expect('456789', done)
    })

    it('should respond with 206 "Partial Content"', function (done) {
      request(server)
        .get('/nums')
        .set('Range', 'bytes=0-4')
        .parse(parseAsText)
        .expect(206, done)
    })

    it('should set Content-Length to the # of octets transferred', function (done) {
      request(server)
        .get('/nums')
        .set('Range', 'bytes=2-3')
        .expect('Content-Length', '2')
        .parse(parseAsText)
        .expect(206, '34', done)
    })

    describe('when last-byte-pos of the range is greater than current length', function () {
      it('is taken to be equal to one less than the current length', function (done) {
        request(server)
          .get('/nums')
          .set('Range', 'bytes=2-50')
          .parse(parseAsText)
          .expect('Content-Range', 'bytes 2-8/9', done)
      })

      it('should adapt the Content-Length accordingly', function (done) {
        request(server)
          .get('/nums')
          .set('Range', 'bytes=2-50')
          .expect('Content-Length', '7')
          .parse(parseAsText)
          .expect(206, done)
      })
    })

    describe('when the first- byte-pos of the range is greater than the current length', function () {
      it('should respond with 416', function (done) {
        request(server)
          .get('/nums')
          .set('Range', 'bytes=9-50')
          .parse(parseAsText)
          .expect(416, done)
      })

      it('should include a Content-Range header of complete length', function (done) {
        request(server)
          .get('/nums')
          .set('Range', 'bytes=9-50')
          .parse(parseAsText)
          .expect('Content-Range', 'bytes */9')
          .expect(416, done)
      })
    })

    describe('when syntactically invalid', function () {
      it('should respond with 200 and the entire contents', function (done) {
        request(server)
          .get('/nums')
          .set('Range', 'asdf')
          .parse(parseAsText)
          .expect('123456789', done)
      })
    })
  })

  describe('when index at mount point', function () {
    var server
    before(function () {
      server = createServer(fixtures + '/users', { pathParam: '*' }, ['/users', '/users/*'])
    })

    it('should redirect correctly', function (done) {
      request(server)
        .get('/users')
        .expect('Location', '/users/')
        .expect(301, done)
    })
  })

  describe('when mounted', function () {
    var server
    before(function () {
      server = createServer(fixtures, { pathParam: '*' }, ['/static', '/static/*'])
    })

    it('should redirect relative to the originalUrl', function (done) {
      request(server)
        .get('/static/users')
        .expect('Location', '/static/users/')
        .expect(301, done)
    })

    it('should not choke on auth-looking URL', function (done) {
      request(server)
        .get('//todo@txt')
        .expect(404, done)
    })
  })

  //
  // NOTE: This is not a real part of the API, but
  //       over time this has become something users
  //       are doing, so this will prevent unseen
  //       regressions around this use-case.
  //
  describe('when mounted "root" as a file', function () {
    var server
    before(function () {
      server = createServer(fixtures + '/todo.txt', { pathParam: '*' }, '/todo')
    })

    it('should load the file when on trailing slash', function (done) {
      request(server)
        .get('/todo')
        .expect(200, '- groceries', done)
    })

    it('should 404 when trailing slash', function (done) {
      request(server)
        .get('/todo/')
        .expect(404, done)
    })
  })

  describe('when responding non-2xx or 304', function () {
    var server
    before(function () {
      var n = 0
      server = createServer(fixtures, null, '/*', function (req, res) {
        if (n++) res.statusCode = 500
      })
    })

    it('should respond as-is', function (done) {
      request(server)
        .get('/todo.txt')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err
          request(server)
            .get('/todo.txt')
            .set('If-None-Match', res.headers.etag)
            .expect(500, '- groceries', done)
        })
    })
  })

  describe('when index file serving disabled', function () {
    var server
    before(function () {
      server = createServer(fixtures, {index: false, pathParam: '*'}, ['/static', '/static/*'])
    })

    it('should next() on directory', function (done) {
      request(server)
        .get('/static/users/')
        .expect(404, format404Error('/static/users/'), done)
    })

    it('should redirect to trailing slash', function (done) {
      request(server)
        .get('/static/users')
        .expect('Location', '/static/users/')
        .expect(301, done)
    })

    it('should next() on mount point', function (done) {
      request(server)
        .get('/static/')
        .expect(404, format404Error('/static/'), done)
    })

    it('should redirect to trailing slash mount point', function (done) {
      request(server)
        .get('/static')
        .expect('Location', '/static/')
        .expect(301, done)
    })
  })
})

function format404Error (path) {
  return '{"code":"ResourceNotFound","message":"' + path + ' does not exist"}'
}

function createServer (dir, opts, mountPoint = '/*', fn) {
  dir = dir || fixtures

  var _serve = serveStatic(dir, opts)
  var server = restify.createServer() // so that its 6.x compatible

  if (fn) {
    server.pre(function applyFn (req, res, next) {
      fn(req, res)
      next()
    })
  }

  var paths = Array.isArray(mountPoint) ? mountPoint : [mountPoint]
  paths.forEach(function mountRoute (mountPoint) {
    // regular routes
    server.get(mountPoint, _serve, serve404)
    server.head(mountPoint, _serve, serve404)

    // for testing that POST methods are returned as 405
    server.post(mountPoint, _serve, serve404)
    // for testing that OPTIONS fall-through when needed
    server.opts(mountPoint, _serve, serve404)
  })

  return server
}

function serve404 (req, res, next) {
  next(new ResourceNotFoundError('%s does not exist', req.path()))
}

function shouldNotHaveHeader (header) {
  return function (res) {
    assert.ok(!(header.toLowerCase() in res.headers), 'should not have header ' + header)
  }
}

function parseAsText (res, fn) {
  res.text = ''
  res.setEncoding('utf8')
  res.on('data', function (chunk) { res.text += chunk })
  res.on('end', fn)
}

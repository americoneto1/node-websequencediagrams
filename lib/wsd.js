var url = require('url');
var http = require('http');
var querystring = require('querystring');

exports.root = "http://www.websequencediagrams.com";
exports.styles = ["default",
                  "earth",
                  "modern-blue",
                  "mscgen",
                  "omegapple",
                  "qsd",
                  "rose",
                  "roundgreen",
                  "napkin"];

function getImg(frag, cb) {
    var u = url.parse(exports.root + "/" + frag);
    http.get(u, function(res) {
        if (res.statusCode != 200) {
            cb("HTTP Error: " + res.statusCode);
            return;
        }
        var size = parseInt(res.headers['content-length']);
        var buf = new Buffer(size);
        buf.fill(0);
        var offset = 0;

        res.on('data', function (chunk) {
            chunk.copy(buf, offset);
            offset += chunk.length;
        });

        res.on('error', function (er) {
            cb(er.message);
        });
        res.on('end', function () {
            cb(null, buf, res.headers['content-type']);
        });
    });
}

exports.diagram = function(description, style, format, cb) {
    if (!cb) {
        throw "cb is required";
    }

    if (!style) {
        style = "default";
    } else if (exports.styles.indexOf(style) === -1) {
        cb("Unknown style: " + style);
        return;
    }
    if (!format) {
        format = "png";
    } else if (["png", "pdf", "svg"].indexOf(format) === -1) {
        cb("Unknown format: " + format);
        return;
    }

    if (description instanceof Buffer) {
        description = description.toString('utf8');
    }
    var query = {
        'style': style,
        'message': description,
        'apiVersion': '1',
        'format': format
    };
    var querys = querystring.stringify(query);

    var u = url.parse(exports.root + "/index.php");
    u.method = 'POST';
    u.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': querys.length
    };

    var req = http.request(u, function(res) {

        if (res.statusCode != 200) {
            cb("HTTP Error: " + res.statusCode);
            return;
        }
        var size = parseInt(res.headers['content-length']);
        var buf = new Buffer(size);
        buf.fill(0);
        var offset = 0;

        res.on('data', function (chunk) {
            chunk.copy(buf, offset);
            offset += chunk.length;
        });

        res.on('error', function (er) {
            cb(er.message);
        });
        res.on('end', function () {
            var jres;
            try {
                jres = JSON.parse(buf);
            } catch (e) {
                cb("JSON Syntax error: " + e.message);
                return;
            }
            if (!jres.errors) {
                cb("Invalid JSON response: " + jres);
            }

            if (jres.errors.length > 0) {
                cb(jres.errors);
            }

            getImg(jres.img, cb);
        });
    });
    req.on('error', function(er) {
        cb(er.message);
    });
    req.write(querys);
    req.end();
};
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _child_process = require('child_process');

var _events = require('events');

var _portfinder = require('portfinder');

var _portfinder2 = _interopRequireDefault(_portfinder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* AutoSSH class
*/

var AutoSSH = function (_EventEmitter) {
  _inherits(AutoSSH, _EventEmitter);

  function AutoSSH() {
    var conf = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, AutoSSH);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AutoSSH).call(this));

    _this.host = conf.host;
    _this.username = conf.username || 'root';
    _this.remotePort = conf.remotePort;
    _this.localPort = conf.localPort || 'auto';

    _this.pollCount = 0;
    _this.maxPollCount = 25;
    _this.pollTimeout = 50;

    setImmediate(function () {
      var confErrors = _this.getConfErrors(conf);

      if (confErrors.length) return confErrors.forEach(function (err) {
        return _this.emit('error', err);
      });

      var port = _this.localPort === 'auto' ? _this.generateRandomPort() : _this.localPort;

      _portfinder2.default.getPort({ port: port }, function (err, freePort) {
        if (err) return _this.emit('error', 'Port error: ' + err);
        if (_this.localPort !== 'auto' && _this.localPort !== freePort) return _this.emit('error', 'Port ' + _this.localPort + ' is not available');

        _this.localPort = freePort;

        _this.execTunnel(function () {
          _this.pollConnection(function () {
            _this.emit('connect', {
              kill: _this.kill,
              pid: _this.currentProcess.pid,
              host: _this.host,
              username: _this.username,
              remotePort: _this.remotePort,
              localPort: _this.localPort
            });
          });
        });
      });
    });

    process.on('exit', function () {
      _this.kill();
    });
    return _this;
  }

  _createClass(AutoSSH, [{
    key: 'pollConnection',
    value: function pollConnection(cb) {
      var _this2 = this;

      if (this.pollCount >= this.maxPollCount) {
        this.emit('error', 'Max poll count reached. Aborting...');
        return this.kill();
      }

      this.isConnectionEstablished(function (result) {
        if (result) return cb();
        setTimeout(function () {
          _this2.pollCount++;
          _this2.pollConnection(cb);
        }, _this2.pollTimeout);
      });
    }
  }, {
    key: 'isConnectionEstablished',
    value: function isConnectionEstablished(cb) {
      var _this3 = this;

      _portfinder2.default.getPort({ port: this.localPort }, function (err, freePort) {
        if (err) return cb(false);

        if (_this3.localPort === freePort) return cb(false);else return cb(true);
      });
    }
  }, {
    key: 'getConfErrors',
    value: function getConfErrors(conf) {
      var errors = [];
      if (!conf.localPort) errors.push('Missing localPort');else if (typeof conf.localPort !== 'number' && conf.localPort !== 'auto') errors.push('Invalid localPort');

      if (!conf.host) errors.push('Missing host');else if (typeof conf.host !== 'string') errors.push('host must be type "string". was given ' + _typeof(conf.host));

      if (!conf.username) errors.push('Missing username');else if (typeof conf.username !== 'string') errors.push('username must be type "string". was given ' + _typeof(conf.username));

      if (!conf.remotePort) errors.push('Missing remotePort');else if (typeof conf.remotePort !== 'number') errors.push('remotePort must be type "number". was given ' + _typeof(conf.remotePort));

      return errors;
    }
  }, {
    key: 'generateRandomPort',
    value: function generateRandomPort() {
      var minPort = 3000;
      var maxPort = 65535;
      return Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
    }
  }, {
    key: 'generateExecString',
    value: function generateExecString() {
      var bindAddress = this.localPort + ':localhost:' + this.remotePort;
      var userAtHost = this.username + '@' + this.host;
      var exitOnFailure = '-o "ExitOnForwardFailure yes"';
      return 'ssh -NL ' + bindAddress + ' ' + exitOnFailure + ' ' + userAtHost;
    }
  }, {
    key: 'execTunnel',
    value: function execTunnel(cb) {
      var _this4 = this;

      this.currentProcess = (0, _child_process.exec)(this.generateExecString(), function (err, stdout, stderr) {
        if (/Address already in use/i.test(stderr)) {
          _this4.kill();
          return _this4.emit('error', stderr);
        }

        if (err) _this4.emit('error', err);

        if (!_this4.killed) _this4.execTunnel(function () {
          return console.log('Restarting autossh...');
        });
      });

      if (typeof cb === 'function') setImmediate(function () {
        return cb();
      });
    }
  }, {
    key: 'kill',
    value: function kill() {
      this.killed = true;
      if (this.currentProcess && typeof this.currentProcess.kill === 'function') this.currentProcess.kill();
      return this;
    }
  }]);

  return AutoSSH;
}(_events.EventEmitter);

/* Export
*/


module.exports = function (conf) {
  var autossh = new AutoSSH(conf);

  /* Create interface object
      A new object creates an abstraction from class implementation
  */
  var autosshInterface = {
    on: function on(evt) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      autossh.on.apply(autossh, [evt].concat(args));
      return this;
    },
    kill: function kill() {
      autossh.kill();
      return this;
    }
  };

  Object.defineProperty(autosshInterface, 'pid', {
    get: function get() {
      return autossh.currentProcess.pid;
    }
  });

  return autosshInterface;
};
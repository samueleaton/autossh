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

  /*
  */

  function AutoSSH() {
    var conf = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, AutoSSH);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AutoSSH).call(this));

    _this.host = conf.host;
    _this.username = conf.username || 'root';
    _this.remotePort = conf.remotePort;
    _this.localPort = conf.localPort || 'auto';

    _this.pollCount = 0;
    _this.maxPollCount = conf.maxPollCount || 30;
    _this.pollTimeout = 75;

    _this.serverAliveInterval = typeof conf.serverAliveInterval === 'number' ? conf.serverAliveInterval : 120;

    _this.serverAliveCountMax = typeof conf.serverAliveCountMax === 'number' ? conf.serverAliveCountMax : 1;

    _this.sshPort = conf.sshPort || 22;
    _this.privateKey = conf.privateKey || null;

    setImmediate(function () {
      var confErrors = _this.getConfErrors(conf);

      if (confErrors.length) return confErrors.forEach(function (confErr) {
        return _this.emit('error', confErr);
      });

      return _this.connect(conf);
    });

    process.on('exit', function () {
      _this.kill();
    });
    return _this;
  }

  /*
  */


  _createClass(AutoSSH, [{
    key: 'connect',
    value: function connect(conf) {
      var _this2 = this;

      var port = this.localPort === 'auto' ? this.generateRandomPort() : this.localPort;

      _portfinder2.default.getPort({ port: port }, function (portfinderErr, freePort) {
        if (portfinderErr) _this2.emit('error', 'Port error: ' + portfinderErr);
        if (_this2.localPort !== 'auto' && _this2.localPort !== freePort) _this2.emit('error', 'Port ' + _this2.localPort + ' is not available');else {
          _this2.localPort = freePort;
          // creates tunnel and then polls port until connection is established
          _this2.execTunnel(function () {
            _this2.pollConnection();
          });
        }
      });
    }

    /* fired when connection established
    */

  }, {
    key: 'emitConnect',
    value: function emitConnect() {
      var _this3 = this;

      this.emit('connect', {
        kill: function kill() {
          return _this3.kill;
        },
        pid: this.currentProcess.pid,
        host: this.host,
        username: this.username,
        remotePort: this.remotePort,
        localPort: this.localPort,
        execString: this.execString
      });
    }

    /* starts polling the port to see if connection established
    */

  }, {
    key: 'pollConnection',
    value: function pollConnection() {
      var _this4 = this;

      if (this.maxPollCount && this.pollCount >= this.maxPollCount) {
        this.emit('error', 'Max poll count reached. Aborting...');
        this.kill();
      } else {
        this.isConnectionEstablished(function (result) {
          if (result) _this4.emitConnect();else {
            setTimeout(function () {
              _this4.pollCount++;
              _this4.pollConnection();
            }, _this4.pollTimeout);
          }
        });
      }
    }

    /* checks if connection is established at port
    */

  }, {
    key: 'isConnectionEstablished',
    value: function isConnectionEstablished(connEstablishedCb) {
      var _this5 = this;

      _portfinder2.default.getPort({ port: this.localPort }, function (portfinderErr, freePort) {
        if (portfinderErr) return connEstablishedCb(false);

        if (_this5.localPort === freePort) return connEstablishedCb(false);else return connEstablishedCb(true);
      });
    }

    /* parses the conf for errors
    */

  }, {
    key: 'getConfErrors',
    value: function getConfErrors(conf) {
      var errors = [];
      if (!conf.localPort) errors.push('Missing localPort');else if (isNaN(parseInt(conf.localPort)) && conf.localPort !== 'auto') errors.push('Invalid localPort');

      if (!conf.host) errors.push('Missing host');else if (typeof conf.host !== 'string') {
        errors.push('host must be type "string". was given "' + _typeof(conf.host) + '"');
      }

      if (!conf.username) errors.push('Missing username');else if (typeof conf.username !== 'string') {
        errors.push('username must be type "string". was given "' + _typeof(conf.username) + '"');
      }

      if (!conf.remotePort) errors.push('Missing remotePort');else if (isNaN(parseInt(conf.remotePort))) {
        errors.push('remotePort must be type "number". was given "' + _typeof(conf.remotePort) + '"');
      }

      if (conf.sshPort && isNaN(parseInt(conf.sshPort))) {
        errors.push('sshPort must be type "number". was given "' + _typeof(conf.sshPort) + '"');
      }

      return errors;
    }

    /*
    */

  }, {
    key: 'generateRandomPort',
    value: function generateRandomPort() {
      var minPort = 3000;
      var maxPort = 65535;
      return Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
    }

    /*
    */

  }, {
    key: 'generateDefaultOptions',
    value: function generateDefaultOptions() {
      var exitOnFailure = '-o ExitOnForwardFailure=yes';
      var strictHostCheck = '-o StrictHostKeyChecking=no';
      return exitOnFailure + ' ' + strictHostCheck;
    }

    /*
    */

  }, {
    key: 'generateServerAliveOptions',
    value: function generateServerAliveOptions() {
      var serverAliveInterval = '-o ServerAliveInterval=' + this.serverAliveInterval;
      var serverAliveCountMax = '-o ServerAliveCountMax=' + this.serverAliveCountMax;
      return serverAliveInterval + ' ' + serverAliveCountMax;
    }

    /*
    */

  }, {
    key: 'generateExecOptions',
    value: function generateExecOptions() {
      var serverAliveOpts = this.generateServerAliveOptions();
      var defaultOpts = this.generateDefaultOptions();
      var privateKey = this.privateKey ? '-i ' + this.privateKey : '';
      var sshPort = this.sshPort ? '-p ' + this.sshPort : '';

      return defaultOpts + ' ' + serverAliveOpts + ' ' + privateKey + ' ' + sshPort;
    }

    /*
    */

  }, {
    key: 'generateExecString',
    value: function generateExecString() {
      var bindAddress = this.localPort + ':localhost:' + this.remotePort;
      var options = this.generateExecOptions();
      var userAtHost = this.username + '@' + this.host;

      return 'ssh -NL ' + bindAddress + ' ' + options + ' ' + userAtHost;
    }

    /*
    */

  }, {
    key: 'execTunnel',
    value: function execTunnel(execTunnelCb) {
      var _this6 = this;

      this.execString = this.generateExecString();
      this.currentProcess = (0, _child_process.exec)(this.execString, function (execErr, stdout, stderr) {
        if (/Address already in use/i.test(stderr)) {
          _this6.kill();
          _this6.emit('error', stderr);
          return;
        }

        if (execErr) _this6.emit('error', execErr);

        if (!_this6.killed) _this6.execTunnel(function () {
          return console.log('Restarting autossh...');
        });
      });

      if (typeof execTunnelCb === 'function') setImmediate(function () {
        return execTunnelCb();
      });
    }

    /*
    */

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
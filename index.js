'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _child_process = require('child_process');

var _events = require('events');

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
    _this.username = conf.username;
    _this.remotePort = conf.remotePort;
    _this.localPort = conf.localPort;

    setImmediate(function () {
      if (!conf.host) return _this.emit('error', 'Missing host');
      if (!conf.username) return _this.emit('error', 'Missing username');
      if (!conf.remotePort) return _this.emit('error', 'Missing remotePort');
      if (!conf.localPort) return _this.emit('error', 'Missing localPort');

      _this.execTunnel();
      _this.emit('init', { kill: _this.kill, pid: _this.currentProcess.pid });
    });

    process.on('exit', function () {
      _this.kill();
    });
    return _this;
  }

  _createClass(AutoSSH, [{
    key: 'execTunnel',
    value: function execTunnel() {
      var _this2 = this;

      var bindAddress = this.localPort + ':localhost:' + this.remotePort;
      var userAtHost = this.username + '@' + this.host;
      var exitOnFailure = '-o "ExitOnForwardFailure yes"';
      var execString = 'ssh -NL ' + bindAddress + ' ' + exitOnFailure + ' ' + userAtHost;
      console.log('execString: ', execString);
      this.currentProcess = (0, _child_process.exec)(execString, function (err, stdout, stderr) {
        if (/Address already in use/i.test(stderr)) {
          _this2.kill();
          return _this2.emit('error', stderr);
        }

        if (err) _this2.emit('error', err);

        if (!_this2.killed) {
          console.log('Restarting autossh...');
          _this2.execTunnel();
        }
      });
    }
  }, {
    key: 'kill',
    value: function kill() {
      this.killed = true;
      this.currentProcess.kill();
      return this;
    }
  }]);

  return AutoSSH;
}(_events.EventEmitter);

function autoSSH(conf) {
  var newAutoSSH = new AutoSSH(conf);
  var returnObj = {
    on: function on(evt) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      newAutoSSH.on.apply(newAutoSSH, [evt].concat(args));
      return this;
    },
    kill: function kill() {
      newAutoSSH.kill();
      return this;
    }
  };
  Object.defineProperty(returnObj, 'pid', {
    get: function get() {
      return newAutoSSH.currentProcess.pid;
    }
  });
  return returnObj;
}

module.exports = autoSSH;
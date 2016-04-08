'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _child_process = require('child_process');

var _events = require('events');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SshTunnel = function (_EventEmitter) {
  _inherits(SshTunnel, _EventEmitter);

  function SshTunnel() {
    var conf = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var cb = arguments[1];

    _classCallCheck(this, SshTunnel);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SshTunnel).call(this));

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
      _this.emit('init');
      process.on('exit', function () {
        _this.kill();
      });
    });
    return _this;
  }

  _createClass(SshTunnel, [{
    key: 'execTunnel',
    value: function execTunnel() {
      var _this2 = this;

      var host = this.host;
      var username = this.username;
      var localPort = this.localPort;
      var remotePort = this.remotePort;
      this.currentProcess = (0, _child_process.exec)('ssh -NL ' + localPort + ':localhost:' + remotePort + ' ' + username + '@' + host, function (err, stdout, stderr) {
        console.log('\nerr:', err);
        console.log('\nstdout:', stdout);
        console.log('\nstderr:', stderr);

        if (err) _this2.emit('error', err);

        if (!_this2.killed) _this2.execTunnel();
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

  return SshTunnel;
}(_events.EventEmitter);

function autoSSH(conf, cb) {
  return new SshTunnel(conf, cb);
}

module.exports = autoSSH;

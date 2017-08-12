import { exec } from 'child_process';
import { EventEmitter } from 'events';
import portfinder from 'portfinder';

/* AutoSSH class
*/
class AutoSSH extends EventEmitter {
  /*
  */
  constructor(conf = {}) {
    super();

    this.configure(conf);

    setImmediate(() => {
      const confErrors = this.getConfErrors(conf);

      if (confErrors.length)
        return confErrors.forEach(confErr => this.emit('error', confErr));

      return this.connect(conf);
    });

    process.on('exit', () => {
      this.kill();
    });
  }

  configure(conf) {
    this.host = conf.host;
    this.localHost = conf.localHost || 'localhost';
    this.reverse = conf.reverse === true || (this.localHost !== 'localhost');

    this.username = conf.username || 'root';
    this.remotePort = conf.remotePort;

    if (this.reverse)
      this.localPort = parseInt(conf.localPort) || 22;
    else
      this.localPort = conf.localPort || 'auto';

    this.pollCount = 0;
    this.maxPollCount = parseInt(conf.maxPollCount) || 30;
    this.pollTimeout = parseInt(conf.pollTimeout) || 75;

    this.serverAliveInterval = typeof conf.serverAliveInterval === 'number' ?
      conf.serverAliveInterval : 120;

    this.serverAliveCountMax = typeof conf.serverAliveCountMax === 'number' ?
      conf.serverAliveCountMax : 1;

    this.sshPort = conf.sshPort || 22;
    this.privateKey = conf.privateKey || null;
  }

  /*
  */
  connect(conf) {
    const port = this.localPort === 'auto' ? this.generateRandomPort() : this.localPort;
    if (this.reverse || this.localHost !== 'localhost') {
      this.execTunnel(() => {
        this.pollConnection();
      });
    }
    else {
      portfinder.getPort({ port }, (portfinderErr, freePort) => {
        if (this.killed)
          return;
        if (portfinderErr)
          this.emit('error', 'Port error: ' + portfinderErr);
        if (this.localPort !== 'auto' && this.localPort !== freePort)
          this.emit('error', `Port ${this.localPort} is not available`);
        else {
          this.localPort = freePort;
          // creates tunnel and then polls port until connection is established
          this.execTunnel(() => {
            this.pollConnection();
          });
        }
      });
    }
  }

  /*
  */
  getConnectionInfo() {
    const infoObj = {
      kill: () => this.kill,
      pid: null,
      host: this.host || null,
      localHost: this.localHost || null,
      username: this.username || null,
      remotePort: parseInt(this.remotePort),
      localPort: parseInt(this.localPort),
      execString: this.execString || null
    };

    if (this.currentProcess)
      infoObj.pid = this.currentProcess.pid;
    if (!infoObj.localPort)
      infoObj.localPort = null;
    if (!infoObj.remotePort)
      infoObj.remotePort = null;

    return infoObj;
  }

  /* fired when connection established
  */
  emitConnect() {
    this.emit('connect', this.getConnectionInfo());
  }

  /* fired when timeout error occurs
  */
  emitTimeout() {
    this.emit('timeout', {
      kill: () => this.kill,
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
  pollConnection() {
    if (this.killed)
      return;

    if (this.maxPollCount && this.pollCount >= this.maxPollCount) {
      this.emit('error', 'Max poll count reached. Aborting...');
      this.kill();
    }
    else {
      this.isConnectionEstablished(result => {
        if (result)
          this.emitConnect();
        else {
          setTimeout(() => {
            this.pollCount++;
            this.pollConnection();
          }, this.pollTimeout);
        }
      });
    }
  }

  /* checks if connection is established at port
  */
  isConnectionEstablished(connEstablishedCb) {
    if (this.localHost !== 'localhost' || this.reverse) {
      connEstablishedCb(true);
      return;
    }

    portfinder.getPort({ port: this.localPort }, (portfinderErr, freePort) => {
      if (portfinderErr)
        return connEstablishedCb(false);

      if (this.localPort === freePort)
        return connEstablishedCb(false);
      else
        return connEstablishedCb(true);
    });

    return;
  }

  /* parses the conf for errors
  */
  getConfErrors(conf) {
    const errors = [];
    if (!conf.localPort)
      errors.push('Missing localPort');
    if (conf.reverse === true && (conf.localPort === 'auto' || isNaN(parseInt(conf.localPort))))
      errors.push('Invalid value for localPort');
    else if (isNaN(parseInt(conf.localPort)) && conf.localPort !== 'auto')
      errors.push('Invalid value for localPort');

    if (!conf.host)
      errors.push('Missing host');
    else if (typeof conf.host !== 'string') {
      errors.push(
        'host must be type "string". was given "' + typeof conf.host + '"'
      );
    }

    if (!conf.username)
      errors.push('Missing username');
    else if (typeof conf.username !== 'string') {
      errors.push(
        'username must be type "string". was given "' + typeof conf.username + '"'
      );
    }

    if (!conf.remotePort)
      errors.push('Missing remotePort');
    else if (isNaN(parseInt(conf.remotePort))) {
      errors.push(
        'remotePort must be type "number". was given "' + typeof conf.remotePort + '"'
      );
    }

    if (conf.sshPort && isNaN(parseInt(conf.sshPort))) {
      errors.push(
        'sshPort must be type "number". was given "' + typeof conf.sshPort + '"'
      );
    }

    return errors;
  }

  /*
  */
  generateRandomPort() {
    const minPort = 3000;
    const maxPort = 65535;
    return Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
  }

  /*
  */
  generateDefaultOptions() {
    const exitOnFailure = '-o ExitOnForwardFailure=yes';
    const strictHostCheck = `-o StrictHostKeyChecking=no`;
    return `${exitOnFailure} ${strictHostCheck}`;
  }

  /*
  */
  generateServerAliveOptions() {
    const serverAliveInterval = `-o ServerAliveInterval=${this.serverAliveInterval}`;
    const serverAliveCountMax = `-o ServerAliveCountMax=${this.serverAliveCountMax}`;
    return `${serverAliveInterval} ${serverAliveCountMax}`;
  }

  /*
  */
  generateExecOptions() {
    const serverAliveOpts = this.generateServerAliveOptions();
    const defaultOpts = this.generateDefaultOptions();
    const privateKey = this.privateKey ? `-i ${this.privateKey}` : '';
    const sshPort = this.sshPort === 22 ? '' : `-p ${this.sshPort}`;
    const gatewayPorts = this.localHost === 'localhost' ? '' : '-o GatewayPorts=yes';

    return `${defaultOpts} ${serverAliveOpts} ${gatewayPorts} ${privateKey} ${sshPort}`;
  }

  /*
  */
  generateExecString() {
    const startPort = this.reverse ? this.remotePort : this.localPort;
    const endPort = this.reverse ? this.localPort : this.remotePort;
    const bindAddress = `${startPort}:${this.localHost}:${endPort}`;
    const options = this.generateExecOptions();
    const userAtHost = `${this.username}@${this.host}`;
    const method = this.reverse ? 'R' : 'L';

    return `ssh -N${method} ${bindAddress} ${options} ${userAtHost}`;
  }

  /*
  */
  execTunnel(execTunnelCb) {
    this.execString = this.generateExecString();
    this.currentProcess = exec(this.execString, (execErr, stdout, stderr) => {
      if (this.killed)
        return;

      if (/Address already in use/i.test(stderr)) {
        this.kill();
        this.emit('error', stderr);
        return;
      }

      if (execErr) {
        if ((/(timeout)|(timed out)/i).test(stderr))
          this.emitTimeout();
        else
          this.emit('error', execErr);
      }

      if (!this.killed)
        this.execTunnel(() => console.log('Restarting autossh...'));
    });

    if (typeof execTunnelCb === 'function')
      setImmediate(() => execTunnelCb());
  }

  /*
  */
  kill() {
    this.killed = true;
    if (this.currentProcess && typeof this.currentProcess.kill === 'function')
      this.currentProcess.kill();
    return this;
  }
}


/* Export
*/
module.exports = function(conf) {
  const autossh = new AutoSSH(conf);

  /* Create interface object
      A new object creates an abstraction from class implementation
  */
  const autosshInterface = {
    on(evt, ...args) {
      autossh.on(evt, ...args);
      return this;
    },

    kill() {
      autossh.kill();
      return this;
    }
  };

  Object.defineProperty(autosshInterface, 'info', {
    get: () => autossh.getConnectionInfo()
  });

  Object.defineProperty(autosshInterface, 'pid', {
    get: () => {
      if (autossh.currentProcess)
        return autossh.currentProcess.pid;
      else
        return null;
    }
  });

  return autosshInterface;
};

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

    this.host = conf.host;
    this.username = conf.username || 'root';
    this.remotePort = conf.remotePort;
    this.localPort = conf.localPort || 'auto';

    this.pollCount = 0;
    this.maxPollCount = conf.maxPollCount || 30;
    this.pollTimeout = 75;

    this.serverAliveInterval = typeof conf.serverAliveInterval === 'number' ?
      conf.serverAliveInterval : 120;

    this.serverAliveCountMax = typeof conf.serverAliveCountMax === 'number' ?
      conf.serverAliveCountMax : 1;

    this.sshPort = conf.sshPort || 22;
    this.privateKey = conf.privateKey || null;

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

  /*
  */
  connect(conf) {
    const port = this.localPort === 'auto' ? this.generateRandomPort() : this.localPort;

    portfinder.getPort({ port }, (portfinderErr, freePort) => {
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

  /* fired when connection established
  */
  emitConnect() {
    this.emit('connect', {
      kill: this.kill,
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
    portfinder.getPort({ port: this.localPort }, (portfinderErr, freePort) => {
      if (portfinderErr)
        return connEstablishedCb(false);

      if (this.localPort === freePort)
        return connEstablishedCb(false);
      else
        return connEstablishedCb(true);
    });
  }

  /* parses the conf for errors
  */
  getConfErrors(conf) {
    const errors = [];
    if (!conf.localPort)
      errors.push('Missing localPort');
    else if (isNaN(parseInt(conf.localPort)) && conf.localPort !== 'auto')
      errors.push('Invalid localPort');

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
    const sshPort = this.sshPort ? `-p ${this.sshPort}` : '';

    return `${defaultOpts} ${serverAliveOpts} ${privateKey} ${sshPort}`;
  }

  /*
  */
  generateExecString() {
    const bindAddress = `${this.localPort}:localhost:${this.remotePort}`;
    const options = this.generateExecOptions();
    const userAtHost = `${this.username}@${this.host}`;

    return `ssh -NL ${bindAddress} ${options} ${userAtHost}`;
  }

  /*
  */
  execTunnel(execTunnelCb) {
    this.execString = this.generateExecString();
    this.currentProcess = exec(this.execString, (execErr, stdout, stderr) => {
      if (/Address already in use/i.test(stderr)) {
        this.kill();
        this.emit('error', stderr);
        return;
      }

      if (execErr)
        this.emit('error', execErr);

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

  Object.defineProperty(autosshInterface, 'pid', {
    get: () => autossh.currentProcess.pid
  });

  return autosshInterface;
};

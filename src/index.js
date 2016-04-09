import { exec } from 'child_process';
import { EventEmitter } from 'events';
import portfinder from 'portfinder';

/* AutoSSH class
*/
class AutoSSH extends EventEmitter {
  constructor(conf = {}) {
    super();

    this.host = conf.host;
    this.username = conf.username || 'root';
    this.remotePort = conf.remotePort;
    this.localPort = conf.localPort || 'auto';

    setImmediate(() => {
      const confErrors = this.getConfErrors(conf);
      
      if (confErrors.length)
        return confErrors.forEach(err => this.emit('error', err));

      const port = this.localPort === 'auto' ? this.generateRandomPort() : this.localPort;
      console.log('checkpoint 1');
      portfinder.getPort({ port }, (err, freePort) => {
        if (err)
          return this.emit('error', 'Port error: ' + err);
        if (this.localPort !== 'auto' && this.localPort !== freePort)
          return this.emit('error', `Port ${this.localPort} is not available`);

        this.localPort = freePort;

        this.execTunnel(() => {
          this.emit('connect', {
            kill: this.kill,
            pid: this.currentProcess.pid,
            host: this.host,
            username: this.username,
            remotePort: this.remotePort,
            localPort: this.localPort
          });
        });

      });
    });

    process.on('exit', () => {
      this.kill();
    });
  }

  getConfErrors(conf) {
    const errors = [];
    if (!conf.localPort)
      errors.push('Missing localPort');
    else if (typeof conf.localPort !== 'number' && conf.localPort !== 'auto')
      errors.push('Invalid localPort');
    
    if (!conf.host)
      errors.push('Missing host');
    else if (typeof conf.host !== 'string')
      errors.push('host must be type "string". was given ' + typeof conf.host);
    
    if (!conf.username)
      errors.push('Missing username');
    else if (typeof conf.username !== 'string')
      errors.push('username must be type "string". was given ' + typeof conf.username);
    
    if (!conf.remotePort)
      errors.push('Missing remotePort');
    else if (typeof conf.remotePort !== 'number')
      errors.push('remotePort must be type "number". was given ' + typeof conf.remotePort);
    
    return errors;
  }

  generateRandomPort() {
    const minPort = 3000;
    const maxPort = 65535;
    return Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
  }

  generateExecString() {
    const bindAddress = `${this.localPort}:localhost:${this.remotePort}`;
    const userAtHost = `${this.username}@${this.host}`;
    const exitOnFailure = '-o "ExitOnForwardFailure yes"'
    return `ssh -NL ${bindAddress} ${exitOnFailure} ${userAtHost}`;
  }

  execTunnel(cb) {
    this.currentProcess = exec(this.generateExecString(), (err, stdout, stderr) => {
      if (/Address already in use/i.test(stderr)) {
        this.kill();
        return this.emit('error', stderr);
      }

      if (err)
        this.emit('error', err);

      if (!this.killed)
        this.execTunnel(() => console.log('Restarting autossh...'));
    });
    
    if (typeof cb === 'function')
      setImmediate(() => cb());
  }

  kill() {
    this.killed = true;
    if (this.currentProcess && typeof this.currentProcess.kill === 'function')
      this.currentProcess.kill();
    return this;
  }
}

module.exports = function (conf) {
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
}

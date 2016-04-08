import { exec } from 'child_process';
import { EventEmitter } from 'events';
import portfinder from 'portfinder';

/* AutoSSH class
*/
class AutoSSH extends EventEmitter {
  constructor(conf = {}) {
    super();

    this.host = conf.host;
    this.username = conf.username;
    this.remotePort = conf.remotePort;
    this.localPort = conf.localPort;

    portfinder.getPort({port: this.localPort === 'auto' ? 8000 : this.localPort}, (err, freePort) => {
      console.log('Error: ', err);
      if (this.localPort !== 'auto' && this.localPort !== freePort) {
        return console.error(`Port ${this.localPort} is not available`);
      }
      this.localPort = result;

      setImmediate(() => {
        if (!conf.host)
          return this.emit('error', 'Missing host');
        if (!conf.username)
          return this.emit('error', 'Missing username');
        if (!conf.remotePort)
          return this.emit('error', 'Missing remotePort');
        if (!conf.localPort)
          return this.emit('error', 'Missing localPort');

        this.execTunnel();

        this.emit('init', {
          kill: this.kill,
          pid: this.currentProcess.pid,
          host: this.host,
          username: this.username,
          remotePort: this.remotePort,
          localPort: this.localPort,
        });
      });
    });
    

    process.on('exit', () => {
      this.kill();
    });
  }

  execTunnel() {
    const bindAddress = `${this.localPort}:localhost:${this.remotePort}`;
    const userAtHost = `${this.username}@${this.host}`;
    const exitOnFailure = '-o "ExitOnForwardFailure yes"'
    const execString = `ssh -NL ${bindAddress} ${exitOnFailure} ${userAtHost}`;
    console.log('execString: ', execString);
    this.currentProcess = exec(execString, (err, stdout, stderr) => {
      if (/Address already in use/i.test(stderr)) {
        this.kill();
        return this.emit('error', stderr);
      }

      if (err)
        this.emit('error', err);

      if (!this.killed) {
        console.log('Restarting autossh...');
        this.execTunnel();
      }
    });
  }

  kill() {
    this.killed = true;
    this.currentProcess.kill();
    return this;
  }
}

function autoSSH(conf) {
  const newAutoSSH = new AutoSSH(conf);
  const returnObj = {
    on(evt, ...args) {
      newAutoSSH.on(evt, ...args);
      return this;
    },
    kill() {
      newAutoSSH.kill();
      return this;
    }
  };
  Object.defineProperty(returnObj, 'pid', {
    get: () => newAutoSSH.currentProcess.pid
  });
  return returnObj;
}

module.exports = autoSSH;

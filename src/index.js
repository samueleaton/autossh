import { exec } from 'child_process';
import { EventEmitter } from 'events';

class SshTunnel extends EventEmitter {
  constructor(conf = {}, cb) {
    super();
    this.host = conf.host;
    this.username = conf.username;
    this.remotePort = conf.remotePort;
    this.localPort = conf.localPort;

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
      this.emit('init');
      process.on('exit', () => {
        this.kill();
      });
    });
  }

  execTunnel() {
    const host = this.host;
    const username = this.username;
    const localPort = this.localPort;
    const remotePort = this.remotePort;
    this.currentProcess = exec(`ssh -NL ${localPort}:localhost:${remotePort} ${username}@${host}`,
      (err, stdout, stderr) => {
        console.log('\nerr:', err);
        console.log('\nstdout:', stdout);
        console.log('\nstderr:', stderr);

        if (err) this.emit('error', err);

        if (!this.killed)
          this.execTunnel();
      }
    );
  }

  kill() {
    this.killed = true;
    this.currentProcess.kill();
    return this;
  }
}

function autoSSH(conf, cb) {
  return new SshTunnel(conf, cb);
}

module.exports = autoSSH;

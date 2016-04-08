# autossh

Persistent SSH tunnels

### Install

Using npm

```
npm i -S autossh
```

### Usage

#### To Start

``` javascript
const autossh = require('autossh');

autossh({
  host: '111.22.333.444',
  username: 'root',
  localPort: 64444,
  remotePort: 5432
})
.on('error', err => {
  console.error('ERROR: ', err);
})
.on('connect', connection => {
  console.log('connected. Tunnel established on port ' + connection.localPort);
  console.log('pid: ' + connection.pid);
});
```

...is equivalent to...

``` bash
ssh -NL 64444:localhost:5432 -o "ExitOnForwardFailure yes" root@111.22.333.444
```

#### Generate Dynamic Local Port

If you want to dynamically/randomly generate a port number, provide a string `auto` for the `localPort`.

Port conflicts will automatically be avoided and the generated port will not be in use.

See `demo.js` for an example.

#### Killing the Autossh Process

The autossh process will automatically die if the node process is closed, but you can manually kill the process using `kill`.

If you try to kill the ssh process from the command line while the node process is active, a new ssh tunnel will be established (which is the point of autossh). You will need to kill the node process first or call the `kill` method on the instance.

**Example 1**

``` javascript
const myAutossh = autossh({
  host: '111.22.333.444',
  username: 'root',
  localPort: 64444,
  remotePort: 5432
})
.on('connect', connection => {
  console.log('connected: ', connection);
});

myAutossh.kill();
```

**Example 2**

``` javascript
const myAutossh = autossh({
  host: '111.22.333.444',
  username: 'root',
  localPort: 64444,
  remotePort: 5432
})
.on('connect', connection => {
  console.log('connected: ', connection);
  connection.kill();
});
```

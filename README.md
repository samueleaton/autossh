# autossh

Persistent SSH tunnels for Node.js

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
});
```

...is equivalent to...

``` bash
ssh -NL 64444:localhost:5432 -o "ExitOnForwardFailure yes" root@111.22.333.444
```

#### Event Listeners

Autossh inherits from node.js's EventEmitter, and implements two events: `error`, `connect`

**error**

The `error` event will fire anytime there is an error throughout the life of the `autossh` process.

**connect**

The `connect` event will fire only once when the initial ssh connection is made

``` javascript
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
  console.log('Tunnel established on port ' + connection.localPort);
  console.log('pid: ' + connection.pid);
});
```

#### Generate Dynamic Local Port

If you want to dynamically/randomly generate a port number, provide a string `auto` for the `localPort`.

The major benefit is that port conflicts will automatically be avoided--the generated port will not have been in use.

The generated `localPort` can be accessed from the connection object as `localPort`.

``` javascript
const myAutossh = autossh({
  host: '111.22.333.444',
  username: 'root',
  localPort: 64444,
  remotePort: 5432
})
.on('connect', connection => {
  console.log('connected: ', connection);
  console.log('localPort: ', connection.localPort);
});
```

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
autossh({
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

#### Adjusting/Disabling Max Poll Count

When first trying to establish the ssh tunnel, `autoshh` will poll the local port until the connection has been established. The default max poll count is `30`.

**Adjusting the max poll count**

Set the `maxPollCount` property in the object passed to `autossh`:

```javascript
const myAutossh = autossh({
  host: '111.22.333.444',
  username: 'root',
  localPort: 'auto',
  remotePort: 5432,
  maxPollCount: 50
})
.on('connect', connection => {
  console.log('connected: ', connection);
});
```

**Disabling the max poll count**

Set the `maxPollCount` property to `0` or `false` in the object passed to `autossh`:

```javascript
const myAutossh = autossh({
  host: '111.22.333.444',
  username: 'root',
  localPort: 'auto',
  remotePort: 5432,
  maxPollCount: false
})
.on('connect', connection => {
  console.log('connected: ', connection);
});
```

**Warning:** The max poll count is there to prevent `autossh` from infinitely polling the local port. Rather than disabling it, it may be wise to set it to a high number (e.g. `500`).
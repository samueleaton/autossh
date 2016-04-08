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
.on('init', () => {
  console.log('connected. Ready to do other stuff.');
});
```

...is equivalent to...

``` bash
ssh -NL 64444:localhost:5432 root@111.22.333.444
```

#### To Kill

The autossh process will automatically die if the node process is closed, but you can manually kill the process using `kill`.

**Example**

``` javascript
const myAutossh = autossh({
  host: '111.22.333.444',
  username: 'root',
  localPort: 64444,
  remotePort: 5432
})
.on('error', err => {
  console.error('ERROR: ', err);
})
.on('init', () => {
  console.log('connected. Ready to do other stuff.');
});

myAutossh.kill();
```

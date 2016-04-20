'use strict';
const autossh = require('./index.js');

// open 5 ssh tunnels
// for (let i = 0; i < 5; i++) {

  // set up config
  autossh({
    host: 'xyz.xy.xyz.yz', // enter host address
    username: 'root', // enter username
    localPort: 'auto', // 'auto' or port number
    remotePort: 5432
  })
  // listen for errors
  .on('error', err => {
    console.error('ERROR: ', err);
  })
  // listen for connection
  .on('connect', connection => {
    console.log('\n**connected**');
    console.log('localPort: \t' + connection.localPort);
    console.log('pid: \t\t' + connection.pid);
    console.log(`tunnel established from localhost:${connection.localPort} to ${connection.host}:${connection.remotePort} as ${connection.username}`);
  });

// }

/* Possible output example (localPort results are be random)

**connected**
localPort:  39570
pid:        7477
tunnel established from localhost:39570 to xyz.xy.xyz.yz:5432 as root

**connected**
localPort:  53139
pid:        7478
tunnel established from localhost:53139 to xyz.xy.xyz.yz:5432 as root

**connected**
localPort:  56421
pid:        7479
tunnel established from localhost:56421 to xyz.xy.xyz.yz:5432 as root

**connected**
localPort:  5360
pid:        7480
tunnel established from localhost:5360 to xyz.xy.xyz.yz:5432 as root

**connected**
localPort:  40321
pid:        7481
tunnel established from localhost:40321 to xyz.xy.xyz.yz:5432 as root
*/

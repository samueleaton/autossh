'use strict';
const autossh = require('./index.js');


autossh({
  host: '104.131.150.215',
  username: 'same',
  localPort: 60001,
  remotePort: 5432
})
.on('error', err => {
  console.error('ERROR: ', err);
})
.on('init', connection => {
  console.log('connected.');
});


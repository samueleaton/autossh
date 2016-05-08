/*
  connecting to a remote postgres database using autossh
*/

const autossh = require('autossh');
const pg = require('pg').native; // install pg AND pg-native

/********** CONFIG *************/
const autosshConfig = {
  host: parsedForm.sshHost,
  username: parsedForm.sshUsername,
  localPort: 'auto',
  remotePort: parsedForm.connectionPort,
  sshPort: parsedForm.sshPort,
  privateKey: parsedForm.sshPrivateKey
};

const pgConfig = {
  user: 'my_name',
  database: 'my_database',
  password: 'my_password',
  host: 'localhost',
  port: '5432'
};


/********** CONNECTION **********/
const autosshConnection = autossh(autosshConfig);

autosshConnection.on('error', autosshErr => {
  console.error('SSH Error: ', autosshErr);
});

autosshConnection.on('connect', connection => {
  const pgClient = new pg.Client(pgConfig);

  pgClient.connect(pgError => {
    if (pgError) {
      autosshConnection.kill();
      console.error('DATABASE ERROR');
      return;
    }
    console.log('CONNECTED TO DATABASE');
  });
});

db.teams.ensureIndex( { name: 1 }, { unique: true } );
db.graphs.ensureIndex( { name: 1 }, { unique: true } );
db.attempts.ensureIndex( { team: 1, graph: 1 }, { unique: true } );

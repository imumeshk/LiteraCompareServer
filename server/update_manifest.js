const Database = require('better-sqlite3');
const db = new Database('data/litera-compare.db');
db.prepare("UPDATE manifest_settings SET support_url = 'support@example.com', group_id = 'AddInGroup', taskpane_id = 'TaskpaneID' WHERE id = 1").run();
console.log('Done');

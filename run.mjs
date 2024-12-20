import * as mod from 'module';
import * as path from 'path';
const require = mod.createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;
const client = new Client();
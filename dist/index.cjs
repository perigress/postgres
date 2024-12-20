"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PostgresSource = void 0;
var _core = require("@perigress/core");
var _khipu = require("@perigress/khipu");
var mod = _interopRequireWildcard(require("module"));
var _sift = _interopRequireDefault(require("sift"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const _require = mod.createRequire(_require('url').pathToFileURL(__filename).toString());
const pg = _require('pg');
const handleAutoInit = async (err, queryBuilder, client, typeDefinition, autoinitialize, noRecurse, handler) => {
  const matches = err.message.match(/relation "(.*?)" does not exist/);
  if (matches && matches[1] === typeDefinition.name && !noRecurse && autoinitialize) {
    const initStatements = await queryBuilder.buildInitializationStatement(typeDefinition);
    const create = initStatements[0];
    await new Promise((resolve, reject) => {
      client.query(create, [], async (err, res) => {
        if (err) return reject(err);
        try {
          resolve(await handler());
        } catch (ex) {
          reject(ex);
        }
      });
    });
    return true;
  }
  return false;
};
class PostgresSource extends _core.Perigress.Source {
  constructor(options = {}) {
    super(options);
    this.options = options;
    this.client = new pg.Client(options);
    //this.ready = this.client.connect()
    this.queryOptions = {
      output: 'SQL',
      autoinitialize: true,
      prepared: true
    };
    this.queryBuilder = new _khipu.Khipu(this.queryOptions);
    this.index = {};
    // eslint-disable-next-line no-async-promise-executor
    this.loaded = new Promise(async resolve => {
      await this.client.connect();
      resolve();
    });
  }
  async loadObjects() {}
  types() {
    return Object.keys(this.index);
  }
  async create(type, typeDefinition, object, noRecurse = false) {
    // eslint-disable-next-line no-async-promise-executor
    return await new Promise(async (resolve, reject) => {
      const statements = await this.queryBuilder.buildCreateStatement(typeDefinition, [object]);
      const singleStatement = statements[0];
      //$1::text
      this.client.query(singleStatement.sql, singleStatement.values, async (err, res) => {
        if (err) {
          const handled = await handleAutoInit(err, this.queryBuilder, this.client, typeDefinition, this.queryOptions.autoinitialize, noRecurse, async () => {
            //recurse once for autoincrement
            await this.create(type, typeDefinition, object, true);
          });
          if (!handled) {
            reject(err);
          }
        }
        resolve(res);
      });
    });
  }
  async read(type, typeDefinition, criteria, noRecurse = false) {
    const statements = await this.queryBuilder.buildReadStatement(typeDefinition, criteria);
    const singleStatement = statements[0];
    const results = new Promise((resolve, reject) => {
      this.client.query(singleStatement.sql, singleStatement.values, async (err, res) => {
        if (err) {
          const handled = await handleAutoInit(err, this.queryBuilder, this.client, typeDefinition, this.queryOptions.autoinitialize, noRecurse, async () => {
            //recurse once for autoincrement
            resolve([]);
          });
          if (!handled) {
            reject(err);
          }
        } else {
          resolve(res.rows);
        }
      });
    });
    return results;
  }
  async update(type, typeDefinition, object) {
    //replaceId(object, this.index[type]);
    return JSON.parse(JSON.stringify(object));
  }
  async delete(type, typeDefinition, object) {
    //removeId(object, this.index[type]);
    return JSON.parse(JSON.stringify(object));
  }

  //return a complex batch according to criteria
  async search(type, typeDefinition, criteria) {
    const filter = (0, _sift.default)(criteria);
    const results = (this.index[type] || []).filter(filter);
    return results;
  }
  join() {}
}
exports.PostgresSource = PostgresSource;
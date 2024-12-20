postgres
============================
A [postgres](https://www.postgresql.org) driver for [perigress](https://github.com/perigress)

Usage
-----

Independently it looks like:
```js
const source = new PostgresSource({
    user: process.env.TEST_PG_USER,
    password: process.env.TEST_PG_PASSWORD,
    host: 'localhost',
    port: 5334,
    database: 'test_db'
});
```
And as part of a Perigress configuration:
```js
const api = new Perigress.API({
    auth: new HttpLocalAuth({
        id : ['user.handle', 'user.email'],
        password : ['user.password'],
        issuer: 'server.domain.tld',
        audience: 'domain.tld',
        secret: 'a-test-secret'
        //hash : ()=>{}
    }),
    id:{ //make default (uses uuids)
        field: 'id',
        postfix: '_id',
        type: 'string'
    },
    audit: {
        data: audit,
        set: (object, context)=>{
            const user = context.currentUser();
            const now = Date.now();
            if(!object.createdBy_id) object.createdBy_id = user.id;
            if(!object.createdAt) object.createdAt = now;
            object.modifiedBy_id = user.id;
            object.modifiedAt = now;
        }
    },
    schema: [
        './data/schema/apikey.schema.json',
        './data/schema/message.schema.json',
        './data/schema/user.schema.json'
    ],
    data: [ JsonSchemaData ],
    format: new JSendFormat(),
    transit: new HttpTransit(),
    source: new PostgresSource({
        user: process.env.TEST_PG_USER,
        password: process.env.TEST_PG_PASSWORD,
        host: 'localhost',
        port: 5334,
        database: 'test_db'
    })
});
```

Testing
-------

Run the es module tests to test the root modules
```bash
npm run import-test
```
to run the same test inside the browser:

```bash
npm run browser-test
```
to run the same test headless in chrome:
```bash
npm run headless-browser-test
```

to run the same test inside docker:
```bash
npm run container-test
```

Run the commonjs tests against the `/dist` commonjs source (generated with the `build-commonjs` target).
```bash
npm run require-test
```

Development
-----------
All work is done in the .mjs files and will be transpiled on commit to commonjs and tested.

If the above tests pass, then attempt a commit which will generate .d.ts files alongside the `src` files and commonjs classes in `dist`


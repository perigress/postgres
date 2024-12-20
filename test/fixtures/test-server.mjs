import { Fixture } from '@open-automaton/moka';
import { HttpLocalAuth } from '@perigress/core/http-local-auth';
import { JSendFormat } from '@perigress/core/jsend';
import { JsonSchemaData } from '@perigress/core/json-schema';
import { HttpTransit } from '@perigress/core/http';
import { Perigress } from '@perigress/core';
import { PostgresSource } from '../../src/index.mjs';
import express from 'express';
import cors from "cors";
import audit from '../data/audit.schema.json' assert { type: 'json' };

export class TestFixture extends Fixture{
    async createFixture(){
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
                host: 'localhost',
                database: 'test_db'
            })
        });
        await api.loaded;
        const results = await api.read('user', { //check for test user
            handle: {$eq:'alibaba'},
            password: {$eq:'opensesame'}
        });
        if(results.length === 0){
            await api.create('user', { //stuff a user to login as
                handle: 'alibaba',
                password: 'opensesame',
                email: 'foo@bar.com'
            });
        }
        api.transit.app.use(cors());
        api.transit.get('/hello', (req, res, next)=>{
            respond('world');
        });
        // if you give this a string ending with '+' it increments the port each time
        this.options.port = Fixture.makePort(this.options.port);
        const result = await api.start({
            port: this.options.port
        });
        return result;
    }
}
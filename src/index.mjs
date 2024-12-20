import { Perigress } from '@perigress/core';
import { Khipu } from '@perigress/khipu';
import * as mod from 'module';
const require = mod.createRequire(import.meta.url);
const pg = require('pg');
import sift from 'sift';

const handleAutoInit = async (err, queryBuilder, client, typeDefinition, autoinitialize, noRecurse, handler)=>{
    const matches = err.message.match(/relation "(.*?)" does not exist/);
    if(
        matches &&
        matches[1] === typeDefinition.name && 
        (!noRecurse) && 
        autoinitialize
    ){
        const initStatements = await queryBuilder.buildInitializationStatement(
            typeDefinition
        );
        const create = initStatements[0];
        await new Promise((resolve, reject)=>{
            client.query(create, [], async (err, res)=>{
                if(err) return reject(err);
                try{
                    resolve(await handler());
                }catch(ex){
                    reject(ex);
                }
            });
        });
        return true;
    }
    return false;
};

export class PostgresSource extends Perigress.Source{
    
    constructor(options={}){
        super(options);
        this.options= options;
        this.client = new pg.Client(options);
        //this.ready = this.client.connect()
        this.queryOptions = {
            output: 'SQL',
            autoinitialize: true,
            prepared: true
        };
        this.queryBuilder = new Khipu(this.queryOptions);
        this.index = {};
        // eslint-disable-next-line no-async-promise-executor
        this.loaded = new Promise(async (resolve)=>{ 
            await this.client.connect();
            resolve(); 
        });
    }
    
    async loadObjects(){ }
    
    types(){
        return Object.keys(this.index);
    }
    
    async create(type, typeDefinition, object, noRecurse=false){
        // eslint-disable-next-line no-async-promise-executor
        return await new Promise(async (resolve, reject)=>{
            const statements = await this.queryBuilder.buildCreateStatement(
                typeDefinition, [object]
            );
            const singleStatement = statements[0];
            //$1::text
            this.client.query(singleStatement.sql, singleStatement.values, async (err, res)=>{
                if(err){
                    const handled = await handleAutoInit(
                        err, 
                        this.queryBuilder,
                        this.client,
                        typeDefinition, 
                        this.queryOptions.autoinitialize, 
                        noRecurse, 
                        async ()=>{ //recurse once for autoincrement
                            await this.create(
                                type, 
                                typeDefinition, 
                                object, 
                                true
                            );
                        }
                    );
                    if(!handled){
                        reject(err);
                    }
                }
                resolve(res);
            });
        });
    }
    
    async read(type, typeDefinition, criteria, noRecurse=false){
        const statements = await this.queryBuilder.buildReadStatement(
            typeDefinition, criteria
        );
        const singleStatement = statements[0];
        const results = new Promise((resolve, reject)=>{
            this.client.query(
                singleStatement.sql, 
                singleStatement.values, 
                async (err, res)=>{
                    if(err){
                        const handled = await handleAutoInit(
                            err, 
                            this.queryBuilder,
                            this.client,
                            typeDefinition, 
                            this.queryOptions.autoinitialize, 
                            noRecurse, 
                            async ()=>{ //recurse once for autoincrement
                                resolve([]);
                            }
                        );
                        if(!handled){
                            reject(err);
                        }
                    }else{
                        resolve(res.rows);
                    }
                }
            );
        });
        return results;
    }
    
    async update(type, typeDefinition, object){
        //replaceId(object, this.index[type]);
        return JSON.parse(JSON.stringify(object));
    }
    
    async delete(type, typeDefinition, object){
        //removeId(object, this.index[type]);
        return JSON.parse(JSON.stringify(object));
    }
    
    //return a complex batch according to criteria
    async search(type, typeDefinition, criteria){
        const filter = sift(criteria);
        const results = (this.index[type] || []).filter(filter);
        return results;
    }
    
    join(){
        
    }
}
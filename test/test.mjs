/* global describe:false */
import { chai } from '@environment-safe/chai';
import { it, fixture } from '@open-automaton/moka';
const should = chai.should();

describe('module', ()=>{
    fixture('test-server', { port: '8086+' }, (context, config)=>{
        it('loads', async ()=>{
            const auth = await (await fetch(
                `http://localhost:${config.port}/login`, postRequest({
                    data: { handle: 'alibaba', password: 'opensesame' }
                })
            )).json();
            console.log(auth);
            should.exist(auth.status);
        });
    });
});

const postRequest = (request, headers={})=>{
    const postHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    const keys = Object.keys(headers);
    for(let lcv=0; lcv < keys.length; lcv++){
        postHeaders[keys[lcv]] = headers[keys[lcv]];
    }
    return {
        method: 'post',
        headers: postHeaders,
        body: (
            typeof request !== 'string'?
                JSON.stringify(request):
                request
        )
    };
};


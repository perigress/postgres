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
            should.exist(auth.status);
        });
        
        it('logs in and can request a static endpoint with audit columns', async ()=>{
            try{
                const transfer = await fetch(
                    `http://localhost:${config.port}/login`, postRequest({
                        data: {
                            handle: 'alibaba',
                            password: 'opensesame'
                        }
                    })
                );
                const result = await transfer.text();
                should.exist(result);
                const data = JSON.parse(result);
                const staticTransfer = await fetch(
                    `http://localhost:${config.port}/data/user/${data.userId}`, {
                        headers: { Authorization: data.token }
                    }
                );
                const staticResult = await (staticTransfer).json();
                should.exist(staticResult.status);
                staticResult.status.should.equal('success');
                should.exist(staticResult.data);
                should.exist(staticResult.data.user);
                should.exist(staticResult.data.user.handle);
                staticResult.data.user.handle.should.equal('alibaba');
                should.exist(staticResult.data.user.email);
                staticResult.data.user.email.should.equal('foo@bar.com');
            }catch(ex){
                console.log(ex);
                should.not.exist(ex);
            }
        });
        
        it('saves an authed new object then retreives it with audit columns', async ()=>{
            try{
                const auth = await (await fetch(
                    `http://localhost:${config.port}/login`, postRequest({
                        data: {
                            handle: 'alibaba',
                            password: 'opensesame'
                        }
                    })
                )).json();
                const fullName = 'Edward Beggler';
                const birthdate = Date.now();
                const email = 'ed@beggler.net';
                const  handle = 'robblerauser';
                const result = await (await fetch(
                    `http://localhost:${config.port}/data/user/create`, postRequest({
                        data: {
                            user: {
                                fullName,
                                birthdate,
                                email,
                                handle
                            }
                        }
                    }, { Authorization: auth.token })
                )).json();
                should.exist(result);
                should.exist(result.status);
                result.status.should.equal('success');
                should.exist(result.data);
                should.exist(result.data.user);
                should.exist(result.data.user.id);
                const subsequentResult = await (await fetch(
                    `http://localhost:${config.port}/data/user/${result.data.user.id}`, 
                    postRequest({ data: {} }, { Authorization: auth.token })
                )).json();
                should.exist(subsequentResult);
                should.exist(subsequentResult.status);
                subsequentResult.status.should.equal('success');
                should.exist(subsequentResult.data);
                should.exist(subsequentResult.data.user);
                subsequentResult.data.user.id.should.equal(result.data.user.id);
                subsequentResult.data.user.fullName.should.equal(fullName);
                //todo: investigate the stringification here
                subsequentResult.data.user.birthdate.toString().should.equal(birthdate.toString());
                subsequentResult.data.user.email.should.equal(email);
                subsequentResult.data.user.handle.should.equal(handle);
                
            }catch(ex){
                console.log(ex);
                should.not.exist(ex);
            }
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


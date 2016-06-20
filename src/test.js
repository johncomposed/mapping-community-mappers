'use strict';

const expect = require('expect.js');
const levelup = require('level');
const levelgraph = require('levelgraph');
const u = require('./utils');

const db = levelgraph(levelup(u.db_path));




/*
*
* Ok 
*
*
*/

console.log(u.db_path);

describe('test suite', function() {


  it('The list should not be undefined', (done) => {
    db.get({}, (err, list) => {
      expect(list).to.be.empty();

      done();
    });

  });
    
})

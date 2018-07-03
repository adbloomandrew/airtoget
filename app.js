const express = require('express');
var request = require('request');
const app = express();
const PORT = process.env.PORT || 5000

var Airtable = require('airtable');
var base = new Airtable({apiKey: 'keyJCRRojtU1jYCBB'}).base('appMm7V8XWifHqCja');

var array = [];
var fields = ['full_name', 'email', 'continuation_url', 'cid', 'country', 'state', 'IP'];

function getDataFromAirtable() {
  // Clear current fetched data array
  array = [];

  // Fetch data from Airtable
  base('QKids').select({
    // select options here
    fields: fields
  }).eachPage(function page(records, fetchNextPage) {
    // This function (`page`) will get called for each page of records.

    records.forEach(function (record) {
      // console.log('Retrieved', record.get('country'));
      let newItem = {};
      for (let idx in fields) {
        const field = fields[idx];
        const value = record.get(field);
        newItem[field] = value !== undefined ? value : '';
      }
      array.push(newItem);
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(err) {
    if (err) { console.error(err); return; }
    postDataToGetresponse();
  });
}

function postDataToGetresponse() {
  console.log('Post data to Getresponse')
  postContact(0);
}

function postContact(idx) {
  if (idx === array.length) {
    return;
  }

  const contact = array[idx];

  const headers = {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'api-key 46374eecbb4807ce3997154dbe9f7c1a'
  };
  var customFieldValues = [];
  if (contact.continuation_url !== '') {
    customFieldValues.push({
      customFieldId: 'NWLAP',
      value: [
        contact.continuation_url
      ]
    });
  }
  if (contact.cid !== '') {
    customFieldValues.push({
      customFieldId: 'NWuC7',
      value: [
        contact.cid
      ]
    });
  }
  if (contact.country !== '') {
    customFieldValues.push({
      customFieldId: 'NyvWw',
      value: [
        contact.country
      ]
    });
  }
  if (contact.state !== '') {
    customFieldValues.push({
      customFieldId: 'NyvBo',
      value: [
        contact.state
      ]
    });
  }
  const body = {
    name: contact.full_name,
    email: contact.email,
    campaign: {
      campaignId: '6FQmX'
    },
  };
  if (customFieldValues.length !== 0) {
    body.customFieldValues = customFieldValues;
  }
  if (contact.IP !== '') {
    body.ipAddress = contact.IP;
  }
  // console.log(JSON.stringify(body))
  // console.log(' ')
  const options = {
    headers: headers,
    body: JSON.stringify(body)
  };

  request.post('https://api.getresponse.com/v3/contacts', options);

  setTimeout(postContact, 200, idx + 1);
}

getDataFromAirtable();

// Call `getDataFromAirtable` function every 1 min (60s).
setInterval(getDataFromAirtable, 1000 * 60);

app.get('/', (req, res) => {
  res.send('v1.1')
})

app.listen(PORT, () => console.log('App listening on port ', PORT))
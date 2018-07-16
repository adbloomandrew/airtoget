const express = require('express');
var request = require('request');
const app = express();
const PORT = process.env.PORT || 5000

var Airtable = require('airtable');
var base = new Airtable({apiKey: 'keyJCRRojtU1jYCBB'}).base('appMm7V8XWifHqCja');

var array = {};
var fields = ['full_name', 'email', 'continuation_url', 'cid', 'state', 'ip', 'User state'];
const CONTACT_STATUS = {
  'Incomplete': 'incomplete',
  'Basic Info Complete': 'basic_info_complete',
  'Video Complete': 'video_complete',
  'Complete': 'completed'
}

function getDataFromAirtable(view, aryname, done) {
  // Clear current fetched data array
  array[aryname] = [];

  // Fetch data from Airtable
  base('QKids').select({
    // select options here
    fields: fields,
    view: view
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
      array[aryname].push(newItem);
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, done);
}

function postDataToGetresponse() {
  console.log('Posting data to Getresponse...')
  // console.log(array['main'][0])
  postContact(0);
}

function postContact(idx) {
  if (idx === array['main'].length) {
    console.log('Data posted to Getresponse');
    return;
  }

  const contact = array['main'][idx];

  createContact(contact);

  setTimeout(postContact, 200, idx + 1);
}

function generateCustomFields(contact) {
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
  if (contact.state !== '') {
    customFieldValues.push({
      customFieldId: 'NyvBo',
      value: [
        contact.state
      ]
    });
  }
  customFieldValues.push({
    customFieldId: 'N2fYw',
    value: [
      CONTACT_STATUS[contact['User state']]
    ]
  });
  return customFieldValues;
}

function createContact(contact) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'api-key 46374eecbb4807ce3997154dbe9f7c1a'
  };
  var customFieldValues = generateCustomFields(contact);
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
  if (contact.ip !== '') {
    body.ipAddress = contact.ip;
  }
  const options = {
    headers: headers,
    body: JSON.stringify(body)
  };
  request.post('https://api.getresponse.com/v3/contacts', options);
}

function updateContact(contactId, contact) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'api-key 46374eecbb4807ce3997154dbe9f7c1a'
  };
  var customFieldValues = generateCustomFields(contact);
  const body = {
    name: contact.full_name,
    campaign: {
      campaignId: '6FQmX'
    },
  };
  if (customFieldValues.length !== 0) {
    body.customFieldValues = customFieldValues;
  }
  const options = {
    headers: headers,
    body: JSON.stringify(body)
  };
  const apiUrl = 'https://api.getresponse.com/v3/contacts/' + contactId;
  request.post(apiUrl, options);
}

function refreshGetResponse(aryname, idx, callback = () => {}) {
  if (idx === array[aryname].length) {
    console.log(aryname + ' Refreshed');
    callback();
    return;
  }

  const contact = array[aryname][idx];
  const headers = {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'api-key 46374eecbb4807ce3997154dbe9f7c1a'
  };
  let apiUrl = 'https://api.getresponse.com/v3/contacts?query[email]=' + contact.email + '&fields=contactId';
  request.get(apiUrl, {
    headers: headers
  }, (err, res, body) => {
    if (err) { console.log(err); return; }
    const contacts = JSON.parse(body);
    if (contacts.length !== 0) {
      if (contacts[0] === undefined) {
        console.log('bug here!');
        console.log(body)
      }
      updateContact(contacts[0].contactId, contact);
    } else {
      createContact(contact);
    }
  })
  setTimeout(refreshGetResponse, 200, aryname, idx + 1, callback);
}

getDataFromAirtable('Incomplete', 'main', (err) => {
  if (err) { console.error(err); return; }
  postDataToGetresponse();

  setTimeout(() => {
    refresh();
    setInterval(refresh, 5 * 60000);
  }, 250 * array['main'].length);
});

// Call `getDataFromAirtable` function every 1 min (60s).
setInterval(getDataFromAirtable, 1000 * 60, 'Incomplete', 'main', (err) => {
  if (err) { console.error(err); return; }
  postDataToGetresponse();
});

function refresh() {
  console.log('Start refreshing...');
  getDataFromAirtable('Basic Info Complete', 'basic', (err) => {
    if (err) { console.error(err); return; }
    refreshGetResponse('basic', 0, () => {
      getDataFromAirtable('Video Complete', 'video', (err) => {
        if (err) { console.error(err); return; }
        refreshGetResponse('video', 0, () => {
          getDataFromAirtable('Completed', 'completed', (err) => {
            if (err) { console.error(err); return; }
            refreshGetResponse('completed', 0);
          });
        });
      });
    });
  });
}

app.get('/', (req, res) => {
  res.send('v1.1')
})

app.listen(PORT, () => console.log('App listening on port ', PORT))
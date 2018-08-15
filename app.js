const express = require('express');
var request = require('request');
const app = express();
const PORT = process.env.PORT || 5000

var Airtable = require('airtable');
var base = new Airtable({apiKey: 'keyJCRRojtU1jYCBB'}).base('appMm7V8XWifHqCja');

var updateCount = 0, refreshCount = 0;
var _refresh = 0;
var array = {};
var fields = ['full_name', 'email', 'continuation_url', 'cid', 'state', 'ip', 'User state'];
const CONTACT_STATUS = {
  'Incomplete (basic info missing)': 'incomplete',
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
      //console.log('Retrieved ', record.get('country'), record.get("email"));
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
    console.log('Data posted ', idx, ' to Getresponse');
    updateCount++;
    return;
  }
  if (idx % 100 === 0) {
    console.log("postContact ", idx, "/", array['main'].length);
  }
  const contact = array['main'][idx];
  if(typeof(contact) !== "undefined") {
    createContact(contact);
  } else {
    console.log("Undefined Contact at array['main'][", idx, "]");
  }
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

function handleResponse(err, res, body) {
  if(err) { return console.log(err); }
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
  request.post('https://api.getresponse.com/v3/contacts', options, handleResponse);
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
  request.post(apiUrl, options, handleResponse);
}

function refreshGetResponse(aryname, idx, callback = () => {}) {
  if (idx === array[aryname].length) {
    console.log(aryname, array[aryname].length, 'Refreshed');
    callback();
    return;
  }
  if(idx % 100 === 0) {
    console.log('Refresh getResponse', idx, "/", array[aryname].length);
  }
  const contact = array[aryname][idx];
  if(typeof(contact) !== "undefined") {
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
  } else {
    console.log("Undefined contact at array[" + aryname + "][" + idx + "]");
  }
  setTimeout(refreshGetResponse, 200, aryname, idx + 1, callback);
}

console.log("Initial Airtable fetch");
getDataFromAirtable('Incomplete', 'main', (err) => {
  console.log(".. getDataFromAirtable 'Incomplete'");
  if (err) { console.error(err); return; }
  postDataToGetresponse();

  console.log(".. postDataToGetResponse 'Incomplete'");
  // if (_refresh === 0) {
    setTimeout(() => {
      refresh();
    }, 225 * array['main'].length);
  // }
  // _refresh = (_refresh + 1) % 5;
});

// Call `getDataFromAirtable` function every 5 min (300s).
setInterval(getDataFromAirtable, 1000 * 60 * 60, 'Incomplete', 'main', (err) => {
  console.log(".. getDataFromAirtable 'Incomplete' (setInterval)")
  if (err) { console.error(err); return; }
  postDataToGetresponse();
  console.log(".. postDataToGetResponse 'Incomplete'");
  // if (_refresh === 0) {
    setTimeout(() => {
      refresh();
    }, 225 * array['main'].length);
  // }
  // _refresh = (_refresh + 1) % 5;
});

function refresh() {
  console.log('Start refreshing...');
  getDataFromAirtable('Basic Info Complete', 'basic', (err) => {
    console.log(".. getDataFromAirtable 'Basic Info Complete'");
    if (err) { console.error(err); return; }
    refreshGetResponse('basic', 0, () => {
      console.log(".. refreshGetResponse 'basic'");
      getDataFromAirtable('Video Complete', 'video', (err) => {
        console.log(".. getDataFromAirtable 'Video'");
        if (err) { console.error(err); return; }
        refreshGetResponse('video', 0, () => {
          console.log(".. refreshGetResponse 'video'");
          getDataFromAirtable('Completed', 'completed', (err) => {
            console.log(".. getDataFromAirtable 'Completed'");
            if (err) { console.error(err); return; }
            refreshGetResponse('completed', 0, () => {
              console.log(".. refreshGetResponse 'completed'");
              refreshCount++;
            });
          });
        });
      });
    });
  });
}

app.get('/', (req, res) => {
  res.send('Updated : ' + updateCount + ' times.\tRefreshed : ' + refreshCount + ' times.');
})

app.listen(PORT, () => console.log('App listening on port ', PORT))

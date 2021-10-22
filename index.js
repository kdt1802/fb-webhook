// Sets server port and logs message on success
const express = require('express');
const cors = require('cors');
const axios = require('axios').default;
const app = express();
app.use(express.json());
app.use(cors());
app.options('*', cors());
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origins: '*'
  }
});
const port = process.env.PORT || 3000;
const GRAPH_API_URL = 'https://congty6.mobifone.vn/qss/graph';
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// io.on('connection', (socket) => {
//   socket.on('chat message', (msg) => {
//     io.emit('chat message', msg);
//   });
// });

// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      io.emit('FB_message', webhook_event);
      // console.log(webhook_event);
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = '123456aA@';

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

app.post('/ghtk', (req, res) => {
  const url = req.body.url;
  const token = req.body.token ? req.body.token : '';
  const method = req.body.method;
  const params = req.body.params ? req.body.params : {};
  const data = req.body.data ? req.body.data : {};
  axios({
    url: url,
    method: method,
    headers: {
      Token: token
    },
    params: params,
    data: data
  })
    .then((response) => {
      console.log(response.data);

      if (response.data.success) {
        res.status(200);
      } else {
        res.status(400);
      }
      res.send(response.data);
    })
    .catch((error) => {
      console.error(error);
      res.status(400).send(error.message);
    });

  // axios.get(GHTK_URL + '/services/address/getAddressLevel4', {
  //   params: req.body
  // });
});

const GHTK_WEBHOOK_SECRET = '123456aA@';
app.post('/ghtkWebhook', (req, res) => {
  let receivedParams = req.query;
  if (receivedParams.hash != GHTK_WEBHOOK_SECRET) {
    res.status(400).send('Mã Hash không chính xác');
  } else {
    let receivedBody = req.body;
    let forwardBody = {
      secret_key: GHTK_WEBHOOK_SECRET,
      label_id: receivedBody.label_id ? receivedBody.label_id : '',
      partner_id: receivedBody.label_id ? receivedBody.partner_id : '',
      status_id: receivedBody.label_id ? receivedBody.status_id : '',
      action_time: receivedBody.label_id ? receivedBody.action_time : '',
      reason_code: receivedBody.label_id ? receivedBody.reason_code : '',
      reason: receivedBody.label_id ? receivedBody.reason : '',
      weight: receivedBody.label_id ? receivedBody.weight : '',
      fee: receivedBody.label_id ? receivedBody.fee : '',
      pick_money: receivedBody.label_id ? receivedBody.pick_money : '',
      return_part_package: receivedBody.label_id ? receivedBody.return_part_package : ''
    };

    axios({
      url: GRAPH_API_URL + '/ghtkWebhook?json=' + encodeURIComponent(JSON.stringify(forwardBody)),
      method: 'post'
    })
      .then((response) => {
        if (response.data.CODE == '200') {
          res.status(200);
        } else {
          res.status(500);
        }
        res.send(response.data.MESSAGE);
      })
      .catch((err) => {
        res.status(500).send('Có lỗi chuyển tiếp thông tin');
      });
  }
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});

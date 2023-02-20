const express = require('express');
const app = express();
const cors = require('cors')
app.use(cors())
const server = require('http').Server(app);
const io = require('socket.io')(server);

/*
structure of messages is 
message = {
  "user1":{
    "user2" : [
      {
        content:string, 
        wasEdited:boolean,
        create_date:date
        sender: "user2"
      },
    ],
    "user3" : [
      {
        content:string, 
        wasEdited:boolean,
        create_date:date
        sender: "user2"
      },
    ]
  }
}

*/
const messages = {
  "user1":{
    "messenger":[
      {
        content: "Hey From Messanger", 
        wasEdited: false,
        create_date: new Date(),
        sender: "messenger"
      },
    ]
  }
};
const users = {
  "user1" : "1234",
  "user3" : "1245",
}

let activeUser = "";

app.use(express.json());

app.post('/register',(req, res) => {
  const { username, password } = req.body;
  if (users.hasOwnProperty(username)) {
    res.status(400).json({message: "Username Already Exists!"})
  }else{
    users[username] = password;
    messages[username] = {
      "messenger": [
        {
          content: "Hey From Messanger", 
          wasEdited: false,
          create_date: new Date(),
          sender: "messenger"
        },
      ]
    }
    res.status(201).json({ message: "Username successfully Created!"})
  }
})

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.hasOwnProperty(username) && users[username] === password;
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  activeUser = username;
  let initialChat = [];
  
  if (messages.hasOwnProperty(username)){
    Object.keys(messages[username]).forEach(key=>{
      initialChat.push({username: key, lastMessage: messages[username][key][0]})
    })
  }
  res.json({ initialChat });
});

io.use((socket, next) => {
    if(activeUser === "") {
      return next(new Error('Authentication error'));
    }
    socket.user = activeUser;
    next();
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user} connected with socket ID ${socket.id}`);

  socket.on('previousMessages', (msg) => {
    // message should contain targetUser
    const user = socket.user;
    const { targetUser} = msg;
    const messages = messages[user][targetUser]
    io.emit('previousMessages', {messages});
  });

  socket.on('sendMessage', (msg) => {
    // message should contain targetUser, content
    const user = socket.user;
    const { targetUser, content} = msg;
    const newMessage =  {
      content: content, 
      wasEdited: false,
      create_date: new Date(),
      sender: user
    }
    messages[user][targetUser].push(newMessage);
    io.emit('newMessage', {targetUser,newMessage});
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.user} disconnected with socket ID ${socket.id}`);
  });
});

server.listen(5500, () => {
  console.log('Server listening on port 5500');
});

const express = require("express");
const http = require("http");
const {
    Server
} = require("socket.io");
const { ExpressPeerServer } = require("peer");


const app = express();
const server = http.createServer(app);
const NEXTJS_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";


const PORT= process.env.PORT || 4000

// The path "/" means the server will handle requests at the mount point
// Since we mount at "/peerjs", the server will be accessible at "/peerjs"
const peerServer = ExpressPeerServer(server, {
    path: "/",
    key: "peerjs", // Default key, can be omitted but explicit is clearer
    allow_discovery: true,
    proxied: true,
    debug: true,
    ssl: false,
});

app.use("/peerjs", peerServer);

const io = new Server(server, {
    cors: {
        origin: "*"
    },
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

   
    socket.on("join_conversation", (conversationId) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
        socket.leave(conversationId);
        console.log(`Socket ${socket.id} left conversation: ${conversationId}`);
    });

    socket.on("join_user", (userId) => {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined user room: ${userId}`);
    });

    socket.on("send_message", async (msg) => {
        console.log("Message received:", msg);

        try {
            const res = await fetch(`${NEXTJS_API_URL}/api/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    senderId: msg.userId,
                    conversationId: msg.conversation_id,
                    text: msg.content_text,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to save message");
            }

            const savedMessage = await res.json();

            io.to(msg.conversation_id).emit("receive_message", savedMessage);
            io.to(msg.conversation_id).emit("read_message", savedMessage);

            console.log(`Message saved & sent to room: ${msg.conversation_id}`);
        } catch (err) {
            console.error("Error saving message:", err.message);
            socket.emit("message_error", {
                error: "Failed to save message"
            });
        }
    });
    socket.on("message_read", async (obj) => {
        try {
             await fetch(`${NEXTJS_API_URL}/api/messages/read`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: obj.reciver_id,
                    conversationId: obj.conversation_id
                }),
            });
            socket.emit("messages_read",obj.reciver_id);
        } catch (error) {
            console.error("Error reading message:", error.message);
        }
    })
    socket.on("call-user",(obj)=>{
        io.to(obj.receiverId).emit("send_call_request",{senderId:obj.senderId,receiverId:obj.receiverId});
    })
    socket.on("reject_call",(obj)=>{
        io.to(obj.senderId).emit("call_rejected",{senderId:obj.senderId,receiverId:obj.receiverId});
    })
    socket.on("call_ended", async (obj) => {
        try {
            
            const conversationRes = await fetch(`${NEXTJS_API_URL}/api/conversation`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    senderId: obj.senderId,
                    receiverId: obj.receiverId
                }),
            });

            if (!conversationRes.ok) {
                throw new Error("Failed to get conversation");
            }

            const conversationData = await conversationRes.json();
            const conversationId = conversationData.conversation?.id;

            if (!conversationId) {
                throw new Error("No conversation ID");
            }

            
            const senderRes = await fetch(`${NEXTJS_API_URL}/api/user?userID=${obj.senderId}`);
            let senderUsername = "Unknown";
            if (senderRes.ok) {
                const senderData = await senderRes.json();
                senderUsername = senderData.data?.username || "Unknown";
            }

            
            const messageRes = await fetch(`${NEXTJS_API_URL}/api/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    senderId: obj.senderId,
                    conversationId: conversationId,
                    text: `Missed Call From ${senderUsername}`,
                }),
            });

            if (!messageRes.ok) {
                throw new Error("Failed to save missed call message");
            }

            const savedMessage = await messageRes.json();

            // Emit only to receiver's user room (not conversation room)
            // This way only the receiver sees the missed call message
            io.to(obj.receiverId).emit("receive_message", savedMessage);
            io.to(obj.receiverId).emit("read_message", savedMessage);
            io.to(obj.senderId).emit("no-response",{senderId:obj.senderId,receiverId:obj.receiverId});

            console.log(`Missed call message saved for conversation: ${conversationId}`);
        } catch (err) {
            console.error("Error handling call_ended:", err.message);
        }
    })

    socket.on("accept_call", async (obj) => {
        try {
            // Get receiver's username
            const receiverRes = await fetch(`${NEXTJS_API_URL}/api/user?userID=${obj.receiverId}`);
            let receiverUsername = "Unknown";
            if (receiverRes.ok) {
                const receiverData = await receiverRes.json();
                receiverUsername = receiverData.data?.username || "Unknown";
            }

            const content = `${receiverUsername} joined the call`;
            const capacity = 2;

            const callAcceptedData = {
                senderId: obj.senderId,
                receiverId: obj.receiverId,
                content: content,
                capacity: capacity
            };

            // Send call_accepted to sender immediately
            io.to(obj.senderId).emit("call_accepted", callAcceptedData);
            
            // Send call_accepted to receiver after a small delay 
            setTimeout(() => {
                io.to(obj.receiverId).emit("call_accepted", callAcceptedData);
            }, 500);
        } catch (err) {
            console.error("Error handling accept_call:", err.message);
        }
    })

    socket.on("end_call", (obj) => {
        // Notify both users that the call has ended
        const callEndedData = {
            senderId: obj.currentUserId,
            receiverId: obj.otherUserId
        };
        
        // Send to both users so both windows close
        io.to(obj.currentUserId).emit("call_ended_by_user", callEndedData);
        io.to(obj.otherUserId).emit("call_ended_by_user", callEndedData);
        
        console.log(`Call ended by user: ${obj.currentUserId}`);
    })

    socket.on("send_peer_id", (data) => {
        io.to(data.toUserId).emit("receive_peer_id", {
            userId: data.fromUserId,
            peerId: data.peerId
        });
    })

    socket.on("disconnect", () => {
        console.log(" User disconnected:", socket.id);
    });
});

server.listen(PORT,"0.0.0.0",() => {
    console.log("socket.io server running on http://localhost:4000");
    console.log("peerjs server running on http://localhost:4000/peerjs");
});
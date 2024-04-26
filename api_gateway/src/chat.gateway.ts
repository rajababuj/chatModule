import {WebSocketGateway,OnGatewayConnection,WebSocketServer,SubscribeMessage,MessageBody} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { MessageStatus } from '../utils/enum';
import { v4 as uuidv4 } from 'uuid';
import { catchError, throwError } from 'rxjs';
import { Injectable, Inject, HttpException, HttpStatus, Controller } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { AppConstants } from 'utils/appconstants';

@Injectable()
@Controller("something")
@WebSocketGateway(83)
export class ChatGateway implements OnGatewayConnection {

  @WebSocketServer() server: Server;

  private readonly connectedUsers: Map<string, any> = new Map();
  private readonly userMap: Map<string, any[]> = new Map();

  constructor(@Inject('CHAT_MICROSERVICE') private readonly chatClient: ClientProxy) { }

  handleConnection(client: Socket) {
    const userId = client.handshake.query['user_id']?.toString() ?? '0';
    const clientId = client.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      client.disconnect(); // Close the connection
      return;
    }

    // Store the connected client
    this.connectedUsers.set(clientId, userId);
    if (this.userMap[userId] === undefined) this.userMap[userId] = []

    if (!this.userMap[userId].includes(clientId)) {
      this.userMap[userId].push(clientId)
    }

    client.on('disconnect', () => {
      let userId = this.connectedUsers.get(client.id)

      let socketIndex = this.userMap[userId]?.findIndex((value: any) => value === client.id);
      if (socketIndex !== -1) {
        this.userMap[userId].splice(socketIndex);
      }

      this.chatClient.send({ cmd: 'isOffline' }, { userId }).subscribe({
        next: (result) => {
          // console.log(result);
          client.emit("confirmDisconnect", result)
        },
        error: (error) => {
          console.log('Error sending message:', error);
          client.disconnect(); // Close the connection
          return;
        },
      })

      this.connectedUsers.delete(clientId);
      client.disconnect(true);

    });

    /**
     *  @description Create Conversation between users
     * */
    client.on("createConversation", async (data, ack) => {

      let userId = this.connectedUsers.get(client.id)
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      console.log("data:", JSON.stringify(data, null, 2));
      let from = data.from ?? "0"
      let convType = data.convType // 1 for user, 2 for group, 3 for broadcast
      let to = data.to ?? "0"

      if (from == "0" || to == "0") {
        return false;
      }

      try {

        this.chatClient.send({ cmd: 'create_conversation' }, data)
          .subscribe({
            next: (result) => {
              ack(result);
            },
            error: (error) => {
              console.log('Error creating conversation:', error);
            },
          });

      } catch (e) {
        console.log(e);
      }

    });

    /**
     *  @description chat message 
     * */
    client.on("chatMessage", async (data, ack) => {

      if (typeof data == 'string') data = JSON.parse(data)

      let to = data.to ?? "0"
      // let broadcastMessageId = data.broadcastMessageId ?? ""
      let from = data.from ?? "0"
      let json = data.json
      let conv_type = data.conv_type
      // let text = data.message ?? ""

      // let message_type = data.message_type ?? ""
      // let chatId = data.chatId ?? "0"
      // let mId = data.mId ?? ""

      if (to == 0 || from == 0 || json == "") {
        return false;
      }

      try {
        this.chatClient.send({ cmd: 'chat_message' }, data)
          .subscribe({
            next: (result) => {
              const sIds = this.userMap[result.receiverId?.toString()];
              if (sIds && sIds.length) {
                // client.to(sIds)?.emit("chatMessage", result);
                sIds.map((sId: string) => {
                  this.server.sockets.sockets.get(sId)?.emit("chatMessage", result);
                });
              } else {
                this.chatClient.send({ cmd: 'offline_store' }, { result: { "from": result.senderId, "to": result.receiverId }, data: result, type: AppConstants.SYNC_TYPE_MESSAGE }).subscribe({});
              }
              ack(result);
            },
            error: (error) => {
              console.log('Error sending message:', error);
            },
          });

      } catch (e: any) {
        console.log("CHATTTT ", e.message)
      }
    });

    /**
     *  @description deliver message
     * */
    client.on('deliverMessage', async (data, ack) => {
      
      if (typeof data == 'string') data = JSON.parse(data)

      let mId = data.m_id ?? "" // Chat table primary Id
      let userId = data.to ?? "0"  // To User Id

      this.chatClient.send({ cmd: 'deliver_message' }, data)
        .subscribe({
          next: (result) => {

            const sIds = this.userMap[result?.from?.toString()];
            
            let emitData = {
              "mId": result._id,
              "from": result.from,
              "to": result.to,
              "time": result.deliver[result.deliver.length - 1].time
            }

            if (sIds && sIds.length) {
              sIds.map((sId: string) => {
                this.server.sockets.sockets.get(sId)?.emit("messageDelivered", emitData);
              });
            } else {
              this.chatClient.send({ cmd: 'offline_store' }, {
                result: { "from": result.to, "to": result.from },
                data: emitData, 
                type: AppConstants.SYNC_TYPE_DELIVERY
              }).subscribe({});
            }
          },
          error: (error) => {
            console.log('Error deliver message:', error);
          },
        });
    });

    /**
     *  @description Typing message...
     * */
    client.on('typingMessage', async data => {
      if (typeof data == 'string') data = JSON.parse(data)

      let userId = data.from ?? "0"  // To User Id
      let to = data.to ?? "0"  // To User Id
      let type = data.type ?? "0"  // To User Id

      client.broadcast.emit(`${userId}_typingMessage`, data);
    });


    /*
    *  @description Block User
    * */
    client.on('blockUser', async (data, ack) => {
      if (typeof data == 'string') data = JSON.parse(data)
      let userId = data.from ?? "0"  // To User Id
      let to = data.to ?? "0"  // To User Id

      this.chatClient.send({ cmd: 'block_user' }, data)
        .subscribe({
          next: (result) => {
            console.log({ result });

            const sIds = this.userMap[result?.to?.toString()];

            if (sIds && sIds.length) {
              sIds.map((sId: string) => {
                this.server.sockets.sockets.get(sId)?.emit("blockUser", result);
              });
            }
            ack(result);
          },
          error: (error) => {
            console.log('Error block user:', error);
          },
        });
    })


    /**
     *  @description read message
     * */
    client.on('readMessage', async (data, ack) => {
      if (typeof data == 'string') data = JSON.parse(data)

      let mId = data.m_id ?? ""
      // let chatId = data.chatId ?? ""
      let userId = data.userId ?? "0"
      let convType = data.convType

      this.chatClient.send({ cmd: 'read_message' }, data)
        .subscribe({
          next: (result) => {
            console.log("read result", result);

            const sIds = this.userMap[data.from?.toString()];
            let emitData = {
              "mId": result._id,
              "from": result.from,
              "to": result.to,
              "time": result.read[result.read.length - 1].time
            }
            if (sIds && sIds.length) {
              sIds.map((sId: string) => {
                this.server.sockets.sockets.get(sId)?.emit("messageRead", emitData);
              });
            }
            ack(emitData)
          },
          error: (error) => {
            console.log('Error read message:', error);
          },
        });
    });

    /**
     *  @description read all messages
     * */
    client.on('readAllMessages', async (data, ack) => {
      if (typeof data == 'string') data = JSON.parse(data)

      // let chatId = data.chatId ?? ""
      // let userId = data.userId ?? "0"

      let to = data.to ?? "0" //login id
      let from = data.from ?? "0"

      this.chatClient.send({ cmd: 'read_all_messages' }, data)
        .subscribe({
          next: (result) => {
            console.log("RESULT", data.to);

            const sIds = this.userMap[data.to?.toString()];
            let emitData = {
              "from": data.from,
              "to": data.to,
            }
            if (sIds && sIds.length) {
              sIds.map((sId: string) => {
                this.server.sockets.sockets.get(sId)?.emit("readAllMessages", emitData);
              });
              console.log("emitData", emitData);

              // ack(emitData)
            } else {
              this.chatClient.send({ cmd: 'offline_store' }, {
                result: { "from": result.to, "to": result.from },
                data: emitData,
                type: AppConstants.SYNC_TYPE_READ
              }).subscribe({});
            }
          },
          error: (error) => {
            console.log('Error read all message:', error);
          },
        });
    });

    /**
     *  @description Delete message
     * */
    client.on('deleteMessage', async (data, ack) => {

      /**
       *   deleteType : 1 - delete for me, 2 - delete for both
       *   userId(senderID) : xx
       * 
       *   status - 1,2,3,4
       *   1 - Delete for sender
       *   2 - Delete for receiver
       *   3 - Delete for both
       *   4 - both side deleted
       *
       *
       * */

      if (typeof data == 'string') data = JSON.parse(data)
      let convType = data.convType // 1 for user, 2 for group, 3 for broadcast
      let deleteType = (data.deleteType?.toString() ?? "1")
      let userId = data.userId?.toString() ?? "0"
      let mId = data.mId ?? []

      this.chatClient.send({ cmd: 'delete_message' }, data)
        .subscribe({
          next: (result) => {
            if (result && result?.length) {
              result.map((message) => {
                const sIds = this.userMap[message.receiverId?.toString()];
                if (sIds && sIds.length) {
                  sIds.map((sId: string) => {
                    this.server.sockets.sockets.get(sId)?.emit("messageDeleted", message);
                  });
                } else {
                  this.chatClient.send({ cmd: 'offline_store' }, {
                    result: { "from": message.senderId, "to": message.receiverId },
                    data: message,
                    type: AppConstants.SYNC_TYPE_DELETE
                  }).subscribe({});
                }
              });
            }
            // ack(result)
          },
          error: (error) => {
            console.log('Error deliver message:', error);
          },
        });
    })

    /**
     *  @description edit message 
     *  convType 1 for chat, 2 for group, 3 for broadcast
     * */
    client.on("editMessage", async (data, ack) => {

      if (typeof data == 'string') data = JSON.parse(data)
      let convType = data.convType // 1 for user, 2 for group, 3 for broadcast
      let userId = data.userId?.toString() ?? "0"
      let mId = data.mId ?? ""
      let text = data.text ?? ""

      try {
        this.chatClient.send({ cmd: 'edit_message' }, data)
          .subscribe({
            next: (result) => {
              const sIds = this.userMap[result?.receiverId?.toString()];
              // client.to(result.receiverId?.toString())?.emit("editMessage", result);

              if (sIds && sIds.length) {
                // client.to(sIds)?.emit("editMessage", result);
                sIds.map((sId: string) => {
                  this.server.sockets.sockets.get(sId)?.emit("messageEdited", result);
                });
              } else {
                this.chatClient.send({ cmd: 'offline_store' }, {
                  result: { "from": result.senderId, "to": result.receiverId },
                  data: result,
                  type: AppConstants.SYNC_TYPE_EDIT
                }).subscribe({});
              }
              // ack(result);
            },
            error: (error) => {
              console.log('Error editing message:', error);
            },
          });

      } catch (e: any) {
        console.log("CHATTTT ", e.message)
      }
    });

    /**
     *  @description reply message 
     *  convType 1 for chat, 2 for group, 3 for broadcast
     * */
    client.on("replyMessage", async (data, ack) => {

      if (typeof data == 'string') data = JSON.parse(data)

      let to = data.to ?? "0"
      let from = data.from ?? "0"
      let json = data.json
      let mId = data.mId ?? ""
      let convType = data.convType

      if (to == 0 || from == 0 || json == "") {
        return false;
      }

      try {

        this.chatClient.send({ cmd: 'reply_message' }, data)
          .subscribe({
            next: (result) => {
              const sIds = this.userMap[result.receiverId?.toString()];
              // client.to(result.receiverId?.toString())?.emit("chatMessage", result);

              if (sIds && sIds.length) {
                // client.to(sIds)?.emit("chatMessage", result);
                sIds.map((sId: string) => {
                  this.server.sockets.sockets.get(sId)?.emit("messageReply", result);
                });
              } else {
                this.chatClient.send({ cmd: 'offline_store' }, { result: { "from": result.senderId, "to": result.receiverId }, data: result, type: AppConstants.SYNC_TYPE_MESSAGE_REPLY }).subscribe({});
              }
              // ack(result);
            },
            error: (error) => {
              console.log('Error sending message:', error);
            },
          });

      } catch (e: any) {
        console.log("CHATTTT ", e.message)
      }
    });

    /**
     *  @description List of conversations   
     * */
    client.on("inboxList", async (data: any, ack: any) => {

      let userId = this.connectedUsers.get(client.id)

      this.chatClient.send({ cmd: 'inbox_list' }, { userId })
        .subscribe({
          next: (result) => {
            // ack(result);
          },
          error: (error) => {
            console.log('Error inbox list:', error);
          },
        });
    });

    /**
     *  @description Delete conversations   
     * */
    client.on('deleteConversation', async (data, ack) => {
      if (typeof data == 'string') data = JSON.parse(data)

      let from = data.from ?? "0"
      let to = data.to ?? "0"
      // let convType = data.convType

      this.chatClient.send({ cmd: 'delete_conversation' }, data)
        .subscribe({
          next: (result) => {
            ack({ ...data, ...result });
          },
          error: (error) => {
            console.log('Error deleting conversation:', error);
          },
        });
    });

    /**
     *  @description Clear conversations   
     * */
    client.on('clearMessage', async (data, ack) => {
      if (typeof data == 'string') data = JSON.parse(data)

      let from = data.from ?? "0"
      let to = data.to ?? "0"
      // let convType = data.convType

      this.chatClient.send({ cmd: 'clear_message' }, data)
        .subscribe({
          next: (result) => {
            ack(result);
          },
          error: (error) => {
            console.log('Error clear message:', error);
          },
        });
    });

    /**
     *  @description Get Messages
     * */
    client.on('getMessages', async (data, ack) => {
      if (typeof data == 'string') data = JSON.parse(data)

      let from = data.from ?? "0"
      let to = data.to ?? "0"
      let lastId = data.lastId ?? ""
      let convType = data.convType

      this.chatClient.send({ cmd: 'get_messages' }, data)
        .subscribe({
          next: (result) => {
            ack(result);
          },
          error: (error) => {
            console.log('Error get messages:', error);
          },
        });
    });

    /**
     *  @description create group
     * */

    client.on('createGroup', async (data, ack) => {
      if (typeof data == 'string') data = JSON.parse(data)
      this.chatClient.send({ cmd: 'create_group' }, data)
        .subscribe({
          next: (result) => {
            ack(result);
          },
          error: (error) => {
            console.log('Error create group:', error);
          },
        });
    });

    /**
   *  @description add member to group
   * */

    client.on('addMember', async (data, ack) => {
      if (typeof data == 'string') data = JSON.parse(data)

      this.chatClient.send({ cmd: 'add_member' }, data)
        .subscribe({
          next: (result) => {
            ack(result);
          },
          error: (error) => {
            console.log('Error add member:', error);
          },
        });
    });



  }
}

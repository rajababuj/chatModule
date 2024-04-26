import { Controller, Req, Res, UseGuards, UseFilters, UploadedFile, UseInterceptors, SetMetadata } from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { User } from './entities/user.entity';
import mongoose from "mongoose";
import { ObjectId } from 'mongodb';
import { FileUploadService } from './file-upload.service';
import { MiddlewareBuilder } from '@nestjs/core';
import { AuthGuard } from '../middleware/verifyToken.middleware';
import { ExceptionFilter } from './rpc-exception.filter';
import * as log4js from 'log4js';
const logger = log4js.getLogger();
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from './role.guard';
import { WebSocketGateway } from "@nestjs/websockets";
import * as config from 'config';
import { Role } from './role.enum';
import { Roles } from './role.decorator';
import { DecryptDataGuard } from '../middleware/decryptData.middleware';
import encryptData from '../middleware/encryptData.middleware'
import commonutils from 'src/utils/commonutils';
import { ConvType } from 'src/utils/enum';
import { AppConstants } from 'src/utils/appconstants';

@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    // private readonly fileUploadService: FileUploadService,
  ) { }

  @MessagePattern({ cmd: 'create_conversation' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async createConversation(@Payload() message: any, req: Request, res: Response) {
    try {
      // don't create conversation if user not exist
      console.log("payload", message);
      
      let fromUser = await this.chatService.getUserById(message.from);
      let toUser = await this.chatService.getUserById(message.to);
      if (!fromUser || !toUser) {
        return false
      }

      const convCount: any = await this.chatService.getInboxCount({
        from: new mongoose.Types.ObjectId(message.from),
        to: new mongoose.Types.ObjectId(message.to),
        conv_type: message.conv_type
      });

      const convCountOther: any = await this.chatService.getInboxCount({
        from: new mongoose.Types.ObjectId(message.to),
        to: new mongoose.Types.ObjectId(message.from),
        conv_type: message.conv_type
      });

      if (convCount === 0) {
        await this.chatService.createInbox({
          from: new mongoose.Types.ObjectId(message.from),
          to: new mongoose.Types.ObjectId(message.to),
          conv_type: message.conv_type
        });
      }

      if (convCountOther === 0) {
        await this.chatService.createInbox({
          from: new mongoose.Types.ObjectId(message.to),
          to: new mongoose.Types.ObjectId(message.from),
          conv_type: message.conv_type
        });
      }

      let conversation = await this.chatService.getInbox(message);
      let createdConv = commonutils.formatConversation(conversation)

      return createdConv;
    } catch (error) {
      logger.info("chat create_conversation");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'chat_message' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async chatMessage(@Payload() message: any, req: Request, res: Response) {
    try {
      console.log(message,'1111');
      
      let chatMessage = await this.chatService.createChat({
        from: new mongoose.Types.ObjectId(message.from),
        to: new mongoose.Types.ObjectId(message.to),
        messageData: message.json
      });

      //update last message in both conversation
      await this.chatService.updateInbox({
        from: new mongoose.Types.ObjectId(message.from),
        to: new mongoose.Types.ObjectId(message.to),
      }, {
        $set: { lastMessageId: chatMessage._id, isDeleted: 0 } // set isDeleted 0 if conv deleted and sender send message
      });

      await this.chatService.updateInbox({
        from: new mongoose.Types.ObjectId(message.to),
        to: new mongoose.Types.ObjectId(message.from),
      }, {
        $set: { lastMessageId: chatMessage._id, isDeleted: 0 }
      });

      let sender = await this.chatService.getUserProfile(chatMessage.from);
      chatMessage = JSON.parse(JSON.stringify(chatMessage));
      chatMessage.sender = sender;
      let messageData = commonutils.formatChatMessage(chatMessage)

      return messageData;
    } catch (error) {
      logger.info("chat chat_message");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'deliver_message' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async deliverMessage(@Payload() message: any, req: Request, res: Response) {
    try {
      console.log({ message });

      let chatMessage = await this.chatService.updateChat({
        _id: new mongoose.Types.ObjectId(message.mId),
        to: new mongoose.Types.ObjectId(message.to)
      }, {
        $push: { deliver: { userId: new mongoose.Types.ObjectId(message.to), time: new Date() } },
        // $push: { deliver: { [message.to] : new Date() } },
        // $set: {class: 3} // Additional fields to update
      });

      return chatMessage;
    } catch (error) {
      logger.info("chat deliver_message");
      logger.info(error);
      throw error;
    }
  }

  // @MessagePattern({ cmd: 'deliver_all_messages' })
  // // @UseGuards(AuthGuard, RolesGuard)
  // // @Roles(Role.User)
  // async deliverAllMessages(@Payload() message: any, req: Request, res: Response) {
  //   try {
  //     console.log({ message });

  //     let chatMessage = await this.chatService.updateChat({
  //       // _id: new mongoose.Types.ObjectId(message.mId),
  //       to: new mongoose.Types.ObjectId(message.userId)
  //     }, {
  //       $push: { deliver: { _id: new mongoose.Types.ObjectId(message.to), time: new Date() } },
  //       // $push: { deliver: { [message.to] : new Date() } },
  //       // $set: {class: 3} // Additional fields to update
  //     });

  //     return chatMessage;
  //   } catch (error) {
  //     logger.info("chat deliver_message");
  //     logger.info(error);
  //     throw error;
  //   }
  // }

  @MessagePattern({ cmd: 'read_message' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async readMessage(@Payload() message: any, req: Request, res: Response) {
    try {

      let chatMessage = await this.chatService.updateChat({
        _id: new mongoose.Types.ObjectId(message.mId),
        to: new mongoose.Types.ObjectId(message.userId)
      }, {
        $push: { read: { userId: new mongoose.Types.ObjectId(message.userId), time: new Date() } },
        // $push: { read: { [message.userId] : new Date() } },
        // $set: {class: 3} // Additional fields to update
      });
      console.log(chatMessage);

      return chatMessage;
    } catch (error) {
      logger.info("chat read_message");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'read_all_messages' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async readAllMessages(@Payload() message: any, req: Request, res: Response) {
    try {

      let chatMessage = await this.chatService.updateManyChats({
        to: new mongoose.Types.ObjectId(message.to),
        from: new mongoose.Types.ObjectId(message.from),
        "read.userId": { $ne: new mongoose.Types.ObjectId(message.to) } //except which already read
      }, {
        $push: { read: { userId: new mongoose.Types.ObjectId(message.to), time: new Date() } },
      });
      console.log(chatMessage.modifiedCount);

      return chatMessage.modifiedCount ? message : {};
    } catch (error) {
      logger.info("chat read_all_messages");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'delete_message' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async deleteMessage(@Payload() message: any, req: Request, res: Response) {
    try {
      let convType = message.conv_type // 1 for user, 2 for group, 3 for broadcast
      let deleteType = (message.deleteType?.toString() ?? "1")
      let userId = message.userId?.toString() ?? "0"
      let mId = message.mId ?? []

      /**
       *   type : 1 - delete for me, 2 - delete for both
       *   userId(senderID) : xx
       *
       *   status - 1,2,3,4
       *   1 - Delete for sender
       *   2 - Delete for receiver
       *   3 - Delete for both
       *   4 - both side deleted
       *
       * */

      let chatMessages = await this.chatService.getChats({ _id: { $in: mId } });

      if (chatMessages.length) {

        let updatedMessages: any = [];
        await Promise.all(chatMessages.map(async (data) => {

          // let status = type === "1" ? (userId == data.senderId ? 1 : 2) : 3;

          //   await Chats.update({
          //     deleteStatus: data.deleteStatus === 0 ? status : 4
          // }, {
          //     where: {
          //         id: data.id
          //     }
          // });

          let status = deleteType !== "1" ? (userId == data.from.toString() ? 2 : 1) : 1;

          // await Chats.update({
          //     deleteStatus: data.deleteStatus === 0 ? status : 4
          // }, {
          //     where: {
          //         id: data.id
          //     }
          // });


          if (convType == ConvType.USER.valueOf()) {
            let messageUpdated = await this.chatService.updateChat({
              _id: new mongoose.Types.ObjectId(data.id)
            }, {
              $push: { deleted: { userId: new mongoose.Types.ObjectId(userId), time: new Date() } },
              // $push: { deleted: { [userId]: new Date() } },
              $set: { deleteType: status }
            });
            // console.log(messageUpdated);
            updatedMessages.push({
              "mId": data.id,
              "deleteType": messageUpdated.deleteType,
              // "chatId": data.chatId,
              "receiverId": messageUpdated.to,
              "senderId": messageUpdated.from,
              "message": messageUpdated.messageData
            });
            // updatedMessage = {
            //   "mId": data.id,
            //   "deleteType": messageUpdated.deleteType,
            //   // "chatId": data.chatId,
            //   "message": messageUpdated.messageData
            // }

            // const resId: any = AppConstants.userMap[messageUpdated?.receiverId?.toString()]?.socket_id;
            // if (resId) {
            //   io.sockets.sockets.get(resId)?.emit("deleteMessage", updatedMessage)
            // } else {
            //   let syncInfo = new SyncInfo()
            //   syncInfo.loginId = Number(userId)
            //   syncInfo.userId = messageUpdated.receiverId
            //   syncInfo.data = JSON.stringify(updatedMessage)
            //   syncInfo.chatId = messageUpdated.chatId
            //   syncInfo.type = AppConstants.SYNC_TYPE_DELETE // delete status

            //   await syncInfo.save()
            // }
          }

          // if (convType == ConvType.GROUP.valueOf() || convType == ConvType.BROADCAST.valueOf()) {
          //   if (type !== "1") {
          //     let hiringMember = await HiringMember.findAll({
          //       where: {
          //         hiringId: messageUpdated?.receiverId,
          //         type: convType
          //       }
          //     })

          //     await Promise.all(hiringMember.map(async (value: any) => {
          //       const resId: any = AppConstants.userMap[value.userId?.toString()]?.socket_id;
          //       if (resId) {
          //         io.sockets.sockets.get(resId)?.emit("deleteMessage", updatedMessage)
          //       } else {
          //         let syncInfo = new SyncInfo()
          //         syncInfo.loginId = Number(userId)
          //         syncInfo.userId = value.userId
          //         syncInfo.data = JSON.stringify(updatedMessage)
          //         syncInfo.chatId = messageUpdated.chatId
          //         syncInfo.type = AppConstants.SYNC_TYPE_DELETE // delete status

          //         await syncInfo.save()
          //       }
          //     }))
          //   }
          // }

        }))
        return updatedMessages;
        // ack(updatedMessage)
      }


    } catch (error) {
      logger.info("chat delete_message");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'edit_message' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async editMessage(@Payload() message: any, req: Request, res: Response) {
    try {
      let mId = message.mId ?? ""
      let text = message.text ?? ""
      let userId = message.userId ?? ""
      let messageData = {};
      let oldChatMessage = await this.chatService.findChatById(mId);
      // console.log(oldChatMessage.messageData.text);
      if (oldChatMessage && oldChatMessage.from == userId) {
        let updateMessage = [];
        if (!oldChatMessage.editedAt) {
          updateMessage.push({ time: oldChatMessage.createdAt, text: oldChatMessage.messageData.text })
        }
        updateMessage.push({ time: new Date(), text: text })

        // $push: { 
        //   editedAt: { $each: [{ time: new Date(), text: text }, { time: new Date(), text: anotherText }] } 
        // },

        let messageUpdated = await this.chatService.updateChat({
          _id: new mongoose.Types.ObjectId(mId)
        }, {
          $push: { editedAt: { $each: updateMessage } },
          $set: { messageData: { ...oldChatMessage.messageData, text: text } }
        });


        let sender = await this.chatService.getUserProfile(messageUpdated.from);
        messageUpdated = JSON.parse(JSON.stringify(messageUpdated));
        messageUpdated.sender = sender;
        messageData = commonutils.formatChatMessage(messageUpdated)

      }
      return messageData;
    } catch (error) {
      logger.info("chat edit_message");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'reply_message' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async replyMessage(@Payload() message: any, req: Request, res: Response) {
    try {

      // create message
      let chatMessage = await this.chatService.createChat({
        from: new mongoose.Types.ObjectId(message.from),
        to: new mongoose.Types.ObjectId(message.to),
        messageData: message.json,
        reply: new mongoose.Types.ObjectId(message.mId)
      });

      //update last message in both conversation
      await this.chatService.updateInbox({
        from: new mongoose.Types.ObjectId(message.from),
        to: new mongoose.Types.ObjectId(message.to),
      }, {
        $set: { lastMessageId: chatMessage._id }
      });

      await this.chatService.updateInbox({
        from: new mongoose.Types.ObjectId(message.to),
        to: new mongoose.Types.ObjectId(message.from),
      }, {
        $set: { lastMessageId: chatMessage._id }
      });

      let sender = await this.chatService.getUserProfile(chatMessage.from);
      chatMessage = JSON.parse(JSON.stringify(chatMessage));
      chatMessage.sender = sender;
      let messageData = commonutils.formatChatMessage(chatMessage)

      return messageData;
    } catch (error) {
      logger.info("chat reply_message");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'inbox_list' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async inboxList(@Payload() message: any, req: Request, res: Response) {
    try {
      console.log({ message });

      let conversation = await this.chatService.getInboxList(message);
      return conversation;

    } catch (error) {
      logger.info("chat inbox_list");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'offline_sync' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async offlineSync(@Payload() message: any, req: Request, res: Response) {
    try {
      let { userId } = message
      let userExist = await this.chatService.getUserById(userId);
      if (userExist) {


        /**
         *  Undelivered Messages to user
         */
        const searchAges = [1, 6];

        let pendingMessages = await this.chatService.getSyncInfos({ to: new mongoose.Types.ObjectId(userId), type: { $in: searchAges } });

        /**
         *  Delivery Status of sent messages
         */
        let undeliveredMessages = await this.chatService.getSyncInfos({ to: new mongoose.Types.ObjectId(userId), type: AppConstants.SYNC_TYPE_DELIVERY });

        /**
          *  Read Status of delivered messages
          */
        let readStatus = await this.chatService.getSyncInfos({ to: new mongoose.Types.ObjectId(userId), type: AppConstants.SYNC_TYPE_READ });

        /**
         *  Delete message
         */
        let deleteMessage = await this.chatService.getSyncInfos({ to: new mongoose.Types.ObjectId(userId), type: AppConstants.SYNC_TYPE_DELETE });

        let offlineData = {
          "data": {
            "messages": pendingMessages?.map(value => value.data) ?? [],
            "undelivered": undeliveredMessages?.map(value => value.data) ?? [],
            // "delivery": deliveryStatus?.map(value1 => value1.data) ?? [],
            "read": readStatus?.map(value1 => value1.data) ?? [],
            // "profile": profileSync?.map(value => value.data) ?? [],
            // "callRequest": callRejectSync?.map(value => value.data) ?? [],
            // "reactionMessage": reactionMessage?.map(value => value.data) ?? [],
            "deleteMessage": deleteMessage?.map(value => value.data) ?? [],
            // "blockUser": blockUserSync?.map(value => value.data) ?? [],
            // "deleteBroadcastMessage": deleteBroadcastMessage?.map(value => value.data) ?? [],
            // "uploadStorySync": uploadStorySync?.map(value => value.data) ?? [],
            // "deleteStorySync": deleteStorySync?.map(value => value.data) ?? [],
            // "closeHiringChatSync": closeHiringChatSync?.map(value => value.data) ?? [],
            // "disputeChatSync": disputeChatSync?.map(value => value.data) ?? [],
            // "removeMemberSync": removeMemberSync?.map(value => value.data) ?? [],
            // "completedDisputeChatSync": completedDisputeChatSync?.map(value => value.data) ?? []
          }

        }

        // let syncedData = undeliveredMessages?.map(value1 => value1.id) ?? [];
        let syncedData = (pendingMessages?.map(value1 => value1.id) ?? []).concat(undeliveredMessages?.map(value1 => value1.id) ?? [],
          readStatus?.map(value1 => value1.id) ?? [],
          //   profileSync?.map(value => value.id) ?? [],
          //   callRejectSync?.map(value => value.id) ?? [],
          // reactionMessage?.map(value => value.id) ?? [],
          deleteMessage?.map(value => value.id) ?? [],
          //   blockUserSync?.map(value => value.id) ?? [],
          //   deleteBroadcastMessage?.map(value => value.id) ?? [],
          //   uploadStorySync?.map(value => value.id) ?? [],
          //   deleteStorySync?.map(value => value.id) ?? [],
          //   closeHiringChatSync?.map(value => value.id) ?? [],
          //   disputeChatSync?.map(value => value.id) ?? [],
          //   removeMemberSync?.map(value => value.id) ?? [],
          //   completedDisputeChatSync?.map(value => value.id) ?? []
        )

        if (syncedData && syncedData.length > 0) {
          await this.chatService.deleteSyncInfos({ _id: { $in: syncedData } })
        }
        return offlineData;

        // syncInfo.loginId = from
        // syncInfo.userId = to
      } else {
        throw new RpcException({ message: "User not found" });
      }
    } catch (error) {
      logger.info("chat offline_sync");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'offline_store' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async offlineStore(@Payload() message: any, req: Request, res: Response) {
    try {
      let conversation = await this.chatService.createSyncInfo({
        from: new mongoose.Types.ObjectId(message?.result.from),
        to: new mongoose.Types.ObjectId(message?.result.to),
        data: message.data,
        type: message.type
      });
      return conversation;
    } catch (error) {
      logger.info("chat offline_store");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'delete_conversation' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async deleteConversation(@Payload() message: any, req: Request, res: Response) {
    try {
      return await this.chatService.updateInbox({
        from: new mongoose.Types.ObjectId(message?.from),
        to: new mongoose.Types.ObjectId(message?.to)
      }, {
        $set: { isDeleted: 1, clearedAt: new Date(), lastMessageId: null }
      });
    } catch (error) {
      logger.info("chat delete_conversation");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'clear_message' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async clearMessage(@Payload() message: any, req: Request, res: Response) {
    try {
      await this.chatService.updateInbox({
        from: new mongoose.Types.ObjectId(message?.from),
        to: new mongoose.Types.ObjectId(message?.to)
      }, {
        $set: { clearedAt: new Date(), lastMessageId: null }
      });
    } catch (error) {
      logger.info("chat clear_message");
      logger.info(error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_messages' })
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User)
  async getMessages(@Payload() message: any, req: Request, res: Response) {
    try {
      let { lastId, from, to, conv_type } = message
      const convCount: any = await this.chatService.getInboxCount({
        from: new mongoose.Types.ObjectId(from),
        to: new mongoose.Types.ObjectId(to),
        conv_type: conv_type
      });

      let chatMessages
      let messages: any[]
      console.log(lastId);

      if (convCount) {

        let andFilter = {
          $or: [
            {
              from: new mongoose.Types.ObjectId(from),
              to: new mongoose.Types.ObjectId(to)
            }, {
              to: new mongoose.Types.ObjectId(from),
              from: new mongoose.Types.ObjectId(to)
            }
          ],
          // convType: conv_type
        }

        if (lastId) {
          andFilter = {
            ...andFilter, ...{
              // @ts-ignore
              _id: {
                $lt: new mongoose.Types.ObjectId(lastId)
              }
            }
          }
        }

        let filterPipeline = [
          {
            $match: {
              $and: [andFilter]
            }
          }, {
            $sort: {
              createdAt: -1
            }
          }, {
            $limit: 10
          },
          {
            $lookup: {
              from: "profiles",
              foreignField: "_id",
              localField: "from",
              as: "sender",
            }
          },
          {
            $unwind: {
              path: '$sender',
              preserveNullAndEmptyArrays: true
            }
          }
        ]

        const chatMessages = await this.chatService.getChatMessages(filterPipeline)

        messages = await Promise.all(chatMessages.map(async (value: any) => {
          return commonutils.formatChatMessage(value)
        }))
        console.log(messages);

        /*       if (lastId == 0) {
                chatMessages = await Chats.findAll({
                  where: {
                    createdAt: { [Op.gte]: moment.utc(conversation.clearedAt ?? conversation.createdAt).format('yyyy-MM-DD HH:mm:ss.SSS') },
                    chatId: chatId
                  },
                  // where: {
                  //     createdAt: { [Op.gte]: value.clearedAt ?? value.createdAt },
                  //     chatId: value?.chatId,
                  //     [Op.or]: [
                  //         { senderId: Number(userId) },
                  //         { receiverId: value?.loginId },
                  //     ],
                  // },
                  order: [["createdAt", "DESC"]],
                  limit: 10
                })
      
              } else {
                chatMessages = await Chats.findAll({
                  where: {
                    [Op.and]: [
                      { createdAt: { [Op.gte]: moment.utc(conversation.clearedAt ?? conversation.createdAt).format('YYYY-MM-DD HH:mm:ss.SSS') } },
                      { chatId: chatId },
                      {
                        id: {
                          [Op.lt]: Number(lastId)
                        }
                      },
                    ]
                  },
                  order: [["createdAt", "DESC"]],
                  limit: 10
                })
              }
      
              messages = await Promise.all(chatMessages.map(async (value: any) => {
      
                let chat = await Chats.findOne({
                  where: {
                    [Op.and]: [
                      { id: value.id },
                      // { senderId: value.senderId },
                      // { receiverId: value.receiverId }
                    ]
                  }
                })
      
                return commonutils.formatChatMessage(value, chat)
              })) */
      } else {
        messages = []
      }
      return messages
    } catch (error) {
      logger.info("chat get_messages");
      logger.info(error);
      throw error;
    }
  }
}

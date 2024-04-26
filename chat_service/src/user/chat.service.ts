import { Injectable, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './entities/user.entity';
import { Controller, Get, HttpStatus } from '@nestjs/common';
import mongoose, { ObjectId } from 'mongoose';
import { Response, Request } from 'express';
import redisClient from '../utils/redisHelper';
import { RpcException } from '@nestjs/microservices';
import * as config from 'config';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Profile } from './entities/profile.entity';
const nodemailer = require('nodemailer');
import { Socket } from 'socket.io';
import { MessageStatus } from '../utils/enum';
import { Inbox } from './entities/inbox.entity';
import { Chat } from './entities/chat.entity';
import { SyncInfo } from './entities/syncinfo.entity';
import commonutils from 'src/utils/commonutils';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(User.name, 'authdb') private readonly userModel: Model<User>,
    @InjectModel(Profile.name, 'chatdb') private readonly profileModel: Model<Profile>,
    @InjectModel(Inbox.name, 'chatdb') private readonly inboxModel: Model<Inbox>,
    @InjectModel(Chat.name, 'chatdb') private readonly chatModel: Model<Chat>,
    @InjectModel(SyncInfo.name, 'chatdb') private readonly syncInfoModel: Model<SyncInfo>,
  ) { }

  async getInboxCount(condition: object): Promise<number> {
    const inboxCount = await this.inboxModel.countDocuments(condition);
    return inboxCount;
  }

  async createInbox(data: object): Promise<object> {
    const inbox = new this.inboxModel(data);
    return await inbox.save();
  }

  async upInbox(filter: object): Promise<object> {
    return await this.inboxModel.deleteOne(filter);
  }

  async updateInbox(filter: any, update: any): Promise<object> {
    return await this.inboxModel.findOneAndUpdate(filter, update, { new: true });
  }

  async getInbox(data: any): Promise<any> {

    const inbox = await this.inboxModel.aggregate([
      {
        $match: {
          from: new mongoose.Types.ObjectId(data.from),
          to: new mongoose.Types.ObjectId(data.to),
          conv_type: data.conv_type
        },
      },
      {
        $lookup: {
          from: "profiles",
          foreignField: "_id",
          localField: "to",
          as: "user",
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "chats",
          foreignField: "_id",
          localField: "lastMessageId",
          as: "chats",
        }
      },
      {
        $unwind: {
          path: "$chats",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    return inbox ? inbox[0] : inbox;
  }

  async getInboxList(data: any): Promise<any> {
    // console.log(data);

    let inbox = await this.inboxModel.aggregate([
      {
        $match: {
          from: new mongoose.Types.ObjectId(data.userId),
          isDeleted: 0,
        }
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
        $lookup: {
          from: "chats",
          let: { clearedAt: "$clearedAt", from: "$from", to: "$to" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $gt: ["$createdAt", "$$clearedAt"] },
                    {
                      $or: [
                        { $and: [{ $eq: ["$from", "$$from"] }, { $eq: ["$to", "$$to"] }] },
                        { $and: [{ $eq: ["$from", "$$to"] }, { $eq: ["$to", "$$from"] }] }
                      ]
                    }
                  ]
                }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
          ],
          as: "chatMessages"
        }
      },
      {
        $unwind: {
          path: '$sender',
          preserveNullAndEmptyArrays: true
        }
      }
    ]);
    inbox = await Promise.all(inbox.map(async (value: any) => {
      return {
        id: value._id,
        senderId: value?.from,
        receiverId: value?.to,
        createdAt: value?.createdAt,
        updatedAt: value.updatedAt,
        clearedAt: value.clearedAt ?? null,
        conv_type: value?.conv_type,
        // unreadCount: value?.unreadCount ?? "",

        // "lastMessage": value?.message ? { ...value?.message.messageData, "lastMessageDate": value?.message.createdAt, "mId": value.message?.mId } : null,
        "user": {
          "id": value.sender._id,
          "image": "",
          "name": (value.sender.data.first_name + " " + value.sender.data.last_name).trim(),
        },
        chatMessages: await Promise.all(value?.chatMessages.map(async (chatMesg: any) => {
          chatMesg.sender = value.sender
          return commonutils.formatChatMessage(chatMesg)
        })),

        // value?.chatMessages,
        // "readStatus": value.message?.readStatus,
        // "deletedStatus": value.message?.deletedStatus,
        // "messageSenderId": value.message?.senderId,
        // "messageReceiverId": value.message?.receiverId,
        // "isForwarded": value.message?.isForwarded,
        // },
        ...{
          id: value._id,
          // online: !!userMap[value.receiverId] || !!userMapMobile[value.receiverId]
        }
      }
    }))

    return inbox;
  }

  async createChat(data: object): Promise<any> {
    console.log(data, "======");
    
    const message = new this.chatModel(data);
    await message.save();

    // const chat = await this.chatModel.aggregate([
    //   {
    //     $match: {
    //       _id: new mongoose.Types.ObjectId(message?._id),
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profiles",
    //       foreignField: "_id",
    //       localField: "from",
    //       as: "sender",
    //     }
    //   },
    //   {
    //     $unwind: {
    //       path: "$sender",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $project: {
    //       chatModel: "$$ROOT",
    //       // _id: 1,
    //       // from: 1,
    //       // json: 1,
    //       // deleteType: 1,
    //       // createdAt: {
    //       //   $dateToString: {
    //       //     format: "%Y-%m-%d %H:%M:%S", // Customize the format here
    //       //     date: "$createdAt"
    //       //   }
    //       // },
    //       sender: "$sender.data",
    //     }
    //   }
    // ]);
    // console.log(chat);

    // let sender = await this.getUserProfile(message.from);
    // console.log({ message, sender: sender.data })
    // return false
    return message
  }

  async getUserProfile(id: any): Promise<any> {
    return (await this.profileModel.findOne({ _id: id }).select('data.first_name data.last_name').lean()) ?? null;
  }

  async updateChat(filter: any, update: any): Promise<any> {
    return await this.chatModel.findOneAndUpdate(filter, update, { new: true });
    // return await this.chatModel.updateOne(filter, update, { new: true })
  }

  async updateManyChats(filter: any, update: any): Promise<any> {
    return await this.chatModel.updateMany(filter, update);
    // return await this.chatModel.updateOne(filter, update, { new: true })
  }

  async getChats(filter: any): Promise<any> {
    return await this.chatModel.find(filter).exec();
  }

  async findChatById(id: any): Promise<any> {
    return await this.chatModel.findById(id);
  }

  async getUserById(id: any) {
    return (await this.userModel.findById(id)) ?? null;
  }

  async createSyncInfo(data: object): Promise<object> {
    const inbox = new this.syncInfoModel(data);
    return await inbox.save();
  }

  async getSyncInfos(filter: any): Promise<any> {
    return await this.syncInfoModel.find(filter).exec();
  }

  async deleteSyncInfos(filter: any): Promise<any> {
    return await this.syncInfoModel.deleteMany(filter);
  }

  async getChatMessages(filter: any): Promise<any> {
    return await this.chatModel.aggregate(filter);
  }
  // async sendSuccess(req: Request, @Res() res: Response, data: any) {
  //   return data;
  // }

  // async sendError(req: Request, @Res() res: Response, data: any) {
  //   return data;
  // }
}

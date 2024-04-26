import { AppConstants } from "./appconstants";
// import moment from "moment";
const config = require("config")
// const crypto = require('crypto')
// const SERVER_ENCRYPTION_KEY = config.get('SERVER_ENCRYPTION_KEY');
// const SERVER_ENCRYPTION_IV = config.get('SERVER_ENCRYPTION_IV');
// import encryptedData from "../middleware/secure/encryptedData";
import commonutils from "../utils/commonutils";

function formatChatMessage(chatMessage: any, chat: any = null) {

    return {
        "mId": chatMessage._id,
        // "m_id": chatMessage.mId,
        // "chatId": chatMessage.chatId,
        "message": chatMessage?.messageData.text,
        "conv_type": chatMessage.conv_type, //conv type
        "receiverId": chatMessage.to,
        // "broadcastMessageId": chatMessage.broadcastMessageId,
        "senderId": chatMessage.from,
        "userName": (chatMessage?.sender?.data.first_name + " " + chatMessage?.sender?.data.last_name).trim() ?? "",
        "userPhoto": "", //chatMessage.userPhoto ?? "",
        "media": chatMessage.messageData?.media ?? null,
        // "mediaThumb": chatMessage.mediaThumb,
        // "mediaDuration": chatMessage.mediaDuration,
        "readStatus": chatMessage.status,
        "deletedStatus": chat?.deleteType ?? 0,
        "createdAt": chatMessage.createdAt,
        "updatedAt": chatMessage.updatedAt,
        'message_type': chatMessage.messageData?.message_type,
    };
}

function formatConversation(conv: any) {
    let userAvatar = "";
    // userAvatar = userData?.dataValues?.raw_image
    let user = conv.user
    return {
        "id": conv._id,
        // "chatId": conv.chatId,
        // "isOnline": AppConstants.userMap[conv.getDataValue('userId')?.toString() ?? ""] != null,
        "lastMessage": conv?.chats ? { ...conv?.chats.messageData, "lastMessageDate": conv?.chats.createdAt } : null, //conv.getDataValue("message") /* ? commonutils.decrypt(conv.getDataValue("message")) : "" */,
        "receiverId": conv.to,
        "senderId": conv.from,
        "user": {
            "image": userAvatar,
            // "name":(userData?.dataValues.userData.raw_full_name ?? ""),
            "name": (conv.user.data.first_name + " " + conv.user.data.last_name).trim(),
            "id": conv.user._id,
        },
        // "lastMessageDate": conv?.chats ? conv?.chats.createdAt : "",
        // "unreadCount": conv.getDataValue("unreadCount") ?? 0,
        // "blockedByMe": conv.blockByUserId == conv.getDataValue('loginId') ? 1 : 0,
        // "blockedByThem": conv.blockByUserId == conv.getDataValue('userId') ? 1 : 0,
        "conv_type": conv.conv_type ?? 1,
        "createdAt": conv.createdAt,
        "updatedAt": conv.updatedAt,
        // "lastSeen": userData?.lastSeen?.getDataValue('last_seen') ?? ""
    };
}

function broadcastConversation(userData: any, broadcast: any, broadcastCountOther: any) {
    return {
        "id": broadcastCountOther.id,
        "chatId": broadcastCountOther.chatId,
        "broadcastId": broadcastCountOther.broadcastId,
        "senderId": broadcastCountOther.getDataValue('loginId') ? Number(broadcastCountOther.getDataValue('loginId')) : "",
        "broadcast": {
            "name": broadcast.name,
            "id": broadcast.id,
            "image": "",
        },
        "broadCastMembers": userData,
        "type": broadcastCountOther.type,
        "createdAt": broadcastCountOther?.createdAt,
        "updatedAt": broadcastCountOther?.updatedAt,
    };
}

// function getCurrentUTC(format = 'YYYY-MM-DD HH:mm:ss', addMonth: any = null, addSeconds: number = 0) {
//     if (addMonth != null) {
//         return moment.utc(new Date()).add(addMonth, 'M').format(format);
//     } else if (addSeconds > 0) {
//         return moment.utc(new Date()).add(addSeconds, 'seconds').format(format);
//     } else {
//         return moment.utc(new Date()).add().format(format);
//     }
// }

// function formatDate(date: any, format = AppConstants.DATE_FORMAT) {
//     return moment(date).format(format)
// }


export default {
    formatChatMessage,
    formatConversation,
    // getCurrentUTC,
    // formatDate,
    broadcastConversation,
}
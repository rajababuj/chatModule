export class AppConstants {
    public static lastSeenMap: { [userKey: string]: string } = {}
    public static uniqueUserMap: { [userKey: string]: string } = {}
    public static connectedUsers: { [key: string]: string } = {}

    public static readonly SYNC_TYPE_MESSAGE = 1
    public static readonly SYNC_TYPE_DELIVERY = 2
    public static readonly SYNC_TYPE_READ = 3
    public static readonly SYNC_TYPE_DELETE = 4
    public static readonly SYNC_TYPE_EDIT = 5
    public static readonly SYNC_TYPE_MESSAGE_REPLY = 6


    // public static readonly SYNC_TYPE_DELETE_BROADCAST_MESSAGE = 21
    // public static readonly SYNC_TYPE_BLOCK_UNBLOCK = 5
    // public static readonly SYNC_TYPE_UNMATCH = 6
    // public static readonly SYNC_TYPE_REACTION = 7
    // public static readonly SYNC_TYPE_PROFILE = 8
    // public static readonly SYNC_TYPE_CALL = 9
    // public static readonly SYNC_TYPE_REAL_TIME = 10
    // public static readonly SYNC_TYPE_CONSULTATION_STATUS_UPDATE = 19
    // public static readonly SYNC_TYPE_CONSULTATION_STATUS_FEES = 20
    // public static readonly SYNC_TYPE_STORY = 22
    // public static readonly SYNC_TYPE_STORY_DELETE = 23
    // public static readonly SYNC_TYPE_CLOSE_CONV = 24
    // public static readonly SYNC_TYPE_DISPUTE_CHAT = 25
    // public static readonly SYNC_TYPE_REMOVE_MEMBER = 26
    // public static readonly SYNC_TYPE_COMPLETE_HIRING_MEMBER = 27
    // public static readonly SYNC_TYPE_COMPLETE_DISPUTE = 28

}
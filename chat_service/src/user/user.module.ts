import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity'; // Assuming you have a UserSchema defined
import { Inbox, InboxSchema } from './entities/inbox.entity';
import { Chat, ChatSchema } from './entities/chat.entity';
import { AuthGuard } from '../middleware/verifyToken.middleware';
import { Profile, ProfileSchema } from './entities/profile.entity';
import { MulterModule } from '@nestjs/platform-express';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SyncInfo, SyncInfoSchema } from './entities/syncinfo.entity';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }], 'authdb'),
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: Inbox.name, schema: InboxSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: SyncInfo.name, schema: SyncInfoSchema }], 'chatdb'),
  ],
  controllers: [ChatController],
  providers: [AuthGuard, ChatService],
})
export class UserModule { }

import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity'; // Assuming you have a UserSchema defined
import { AuthGuard } from '../middleware/verifyToken.middleware';
import { APP_FILTER } from '@nestjs/core';
import { Profile, ProfileSchema } from './entities/profile.entity';
import { ContactUs, ContactUsSchema } from './entities/contactus.entity';
import { Token, TokenSchema } from './entities/token.entity';
import { LoginHistory, LoginHistorySchema } from './entities/loginhistory.entity';
// import { AuthGuard } from './middleware/verifytoken.middleware';
// import { CustomExceptionFilter } from '../user/custom-exception.filter';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }], 'authdb'),
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: ContactUs.name, schema: ContactUsSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: LoginHistory.name, schema: LoginHistorySchema }], 'chatdb'),
  ],
  controllers: [UserController],
  providers: [UserService, AuthGuard],
})
export class UserModule { }

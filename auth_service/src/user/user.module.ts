import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity'; // Assuming you have a UserSchema defined
import { Olduser, OlduserSchema } from './entities/olduser.entity'; // Assuming you have a UserSchema defined
import { AuthGuard } from '../middleware/verifyToken.middleware';
import { APP_FILTER } from '@nestjs/core';
import { Profile, ProfileSchema } from './entities/profile.entity';
import { Country, CountrySchema } from './entities/country.entity';
import { LoginHistory, LoginHistorySchema } from './entities/loginhistory.entity';
import { ContactUs, ContactUsSchema } from './entities/contactus.entity';
import { Token, TokenSchema } from './entities/token.entity';
import { Cms, CmsSchema } from './entities/cms.entity';
import { Faq, FaqSchema } from './entities/faq.entity';
// import { AuthGuard } from './middleware/verifytoken.middleware';
// import { CustomExceptionFilter } from '../user/custom-exception.filter';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }], 'authdb'),
    MongooseModule.forFeature([{ name: Olduser.name, schema: OlduserSchema }], 'authdb'),
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: LoginHistory.name, schema: LoginHistorySchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: ContactUs.name, schema: ContactUsSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }], 'chatdb'),
    MongooseModule.forFeature([{ name: Cms.name, schema: CmsSchema }], 'commondb'),
    MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }], 'commondb'),

  ],
  controllers: [UserController],
  providers: [UserService, AuthGuard],
})
export class UserModule { }